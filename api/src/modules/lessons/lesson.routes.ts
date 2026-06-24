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
    const dateFrom = from ? new Date(from) : new Date()
    const dateTo = to ? new Date(to) : undefined

    return prisma.lesson.findMany({
      where: {
        active: true,
        date: { gte: dateFrom, ...(dateTo && { lte: dateTo }) },
      },
      include: {
        _count: { select: { bookings: true } },
        bookings: {
          where: { status: 'confirmed', userId: (request.user as { sub: string }).sub },
          select: { id: true, status: true },
        },
      },
      orderBy: [{ date: 'asc' }, { classTime: 'asc' }],
    })
  })

  // Detalhe de uma aula com vagas
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        bookings: {
          select: { id: true, status: true, user: { select: { id: true, name: true } } },
        },
        oc1Requests: {
          select: { id: true, status: true, user: { select: { id: true, name: true } } },
        },
      },
    })
    if (!lesson) return reply.status(404).send({ message: 'Aula não encontrada.' })
    return lesson
  })

  // Criar aula (professor ou admin)
  app.post('/', { onRequest: [authorize('professor', 'super_admin')] }, async (request, reply) => {
    const body = createLessonSchema.parse(request.body)
    const lesson = await prisma.lesson.create({
      data: { ...body, date: new Date(body.date) },
    })
    return reply.status(201).send(lesson)
  })

  // Desativar aula (admin)
  app.patch('/:id/status', { onRequest: [authorize('super_admin')] }, async (request) => {
    const { id } = request.params as { id: string }
    const { active } = request.body as { active: boolean }
    return prisma.lesson.update({ where: { id }, data: { active } })
  })
}
