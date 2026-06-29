import { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../middlewares/authenticate'
import { prisma } from '../../lib/prisma'
import { z } from 'zod'

const createLessonSchema = z.object({
  date: z.string(), // ISO date
  classTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  classType: z.enum(['OC6', 'OC1']),
  maxSpots: z.number().int().min(1).max(6).default(6),
  notes: z.string().optional(),
})

export async function lessonRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // Listar aulas por data (padrão: hoje em diante)
  app.get('/', async (request) => {
    const { from, to } = request.query as { from?: string; to?: string }
    const { sub, role } = request.user as { sub: string; role: string }
    const isStaff = role === 'professor' || role === 'super_admin'
    const todayUtc = new Date(); todayUtc.setUTCHours(0, 0, 0, 0)
    const dateFrom = from ? new Date(from) : todayUtc
    const dateTo = to ? new Date(to) : undefined

    return prisma.lesson.findMany({
      where: {
        date: { gte: dateFrom, ...(dateTo && { lte: dateTo }) },
        // Alunos não veem OC1 já solicitada por outro aluno
        ...(!isStaff && {
          OR: [
            { classType: 'OC6' },
            {
              classType: 'OC1',
              oc1Requests: {
                none: {
                  status: { in: ['pending', 'confirmed'] },
                  userId: { not: sub },
                },
              },
            },
          ],
        }),
      },
      include: {
        _count: { select: { bookings: { where: { status: 'confirmed' } } } },
        bookings: isStaff
          ? {
              where: { status: 'confirmed' },
              select: { id: true, user: { select: { id: true, name: true, avatarUrl: true } } },
              orderBy: { createdAt: 'asc' as const },
            }
          : {
              where: { status: 'confirmed', userId: sub },
              select: { id: true, status: true },
            },
        oc1Requests: isStaff
          ? {
              where: { status: { in: ['pending', 'confirmed'] } },
              select: { id: true, status: true, user: { select: { id: true, name: true, avatarUrl: true } } },
            }
          : {
              where: { userId: sub, status: { in: ['pending', 'confirmed'] } },
              select: { id: true, status: true },
            },
      },
      orderBy: [{ date: 'asc' }, { classTime: 'asc' }],
    })
  })

  // Detalhe de uma aula
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { sub, role } = request.user as { sub: string; role: string }
    const isStaff = role === 'professor' || role === 'super_admin'

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        _count: { select: { bookings: { where: { status: 'confirmed' } } } },
        bookings: isStaff
          ? { where: { status: 'confirmed' }, select: { id: true, status: true, user: { select: { id: true, name: true, avatarUrl: true } } } }
          : { where: { userId: sub }, select: { id: true, status: true } },
        oc1Requests: isStaff
          ? { select: { id: true, status: true, user: { select: { id: true, name: true } } } }
          : { where: { userId: sub }, select: { id: true, status: true } },
      },
    })
    if (!lesson) return reply.status(404).send({ message: 'Aula não encontrada.' })
    return lesson
  })

  // Criar aula (professor ou admin)
  app.post('/', { onRequest: [authorize('professor', 'super_admin')] }, async (request, reply) => {
    const body = createLessonSchema.parse(request.body)

    const existing = await prisma.lesson.findUnique({
      where: { date_classTime_classType: { date: new Date(body.date), classTime: body.classTime, classType: body.classType } },
      select: { id: true },
    })
    if (existing) {
      return reply.status(409).send({
        message: `Já existe uma aula ${body.classType} neste dia às ${body.classTime}.`,
      })
    }

    const lesson = await prisma.lesson.create({
      data: { ...body, date: new Date(body.date) },
    })
    return reply.status(201).send(lesson)
  })

  // Excluir aula definitivamente (admin) — cancela agendamentos, notifica alunos e remove do banco
  app.delete('/:id', { onRequest: [authorize('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const lesson = await prisma.lesson.findUnique({ where: { id }, select: { id: true, date: true, classTime: true } })
    if (!lesson) return reply.status(404).send({ message: 'Aula não encontrada.' })

    const date = new Date(lesson.date)
    const dd = String(date.getUTCDate()).padStart(2, '0')
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
    const msg = `⚠️ A remada de ${dd}/${mm} às ${lesson.classTime} foi cancelada pelo administrador. Entre em contato para mais informações.`

    const [bookings, oc1s] = await Promise.all([
      prisma.booking.findMany({
        where: { lessonId: id, status: 'confirmed' },
        select: { user: { select: { id: true } } },
      }),
      prisma.oc1Request.findMany({
        where: { lessonId: id, status: { in: ['pending', 'confirmed'] } },
        select: { user: { select: { id: true } } },
      }),
    ])

    const notifyUserIds = [...bookings.map((b) => b.user.id), ...oc1s.map((r) => r.user.id)]

    await prisma.$transaction(async (tx) => {
      if (notifyUserIds.length > 0) {
        await tx.notification.createMany({
          data: notifyUserIds.map((userId) => ({ userId, message: msg })),
        })
      }
      await tx.booking.deleteMany({ where: { lessonId: id } })
      await tx.oc1Request.deleteMany({ where: { lessonId: id } })
      await tx.lesson.delete({ where: { id } })
    })

    return reply.status(204).send()
  })
}
