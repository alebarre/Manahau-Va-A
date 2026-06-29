import { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../middlewares/authenticate'
import { prisma } from '../../lib/prisma'
import { z } from 'zod'

const createBookingSchema = z.object({
  lessonId: z.string(),
  notes: z.string().optional(),
})

export async function bookingRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // Meus agendamentos
  app.get('/my', async (request) => {
    const { sub } = request.user as { sub: string }
    return prisma.booking.findMany({
      where: { userId: sub },
      select: {
        id: true, status: true, notes: true, createdAt: true,
        lesson: { select: { id: true, date: true, classTime: true, classType: true, maxSpots: true } },
      },
      orderBy: { lesson: { date: 'desc' } },
    })
  })

  // Agendar OC6
  app.post('/', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { lessonId, notes } = createBookingSchema.parse(request.body)

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true, classType: true, maxSpots: true,
        _count: { select: { bookings: { where: { status: 'confirmed' } } } },
      },
    })

    if (!lesson) {
      return reply.status(404).send({ message: 'Aula não encontrada.' })
    }
    if (lesson.classType !== 'OC6') {
      return reply.status(400).send({ message: 'Use a rota de OC1 para aulas individuais.' })
    }
    if (lesson._count.bookings >= lesson.maxSpots) {
      return reply.status(409).send({ message: 'Aula sem vagas disponíveis.' })
    }

    const existing = await prisma.booking.findUnique({
      where: { userId_lessonId: { userId: sub, lessonId } },
    })

    if (existing) {
      if (existing.status === 'confirmed') {
        return reply.status(409).send({ message: 'Você já está agendado para esta aula.' })
      }
      const booking = await prisma.booking.update({
        where: { id: existing.id },
        data: { status: 'confirmed', notes },
      })
      return reply.status(200).send(booking)
    }

    const booking = await prisma.booking.create({
      data: { userId: sub, lessonId, notes },
    })
    return reply.status(201).send(booking)
  })

  // Cancelar agendamento
  app.patch('/:id/cancel', async (request, reply) => {
    const { sub, role } = request.user as { sub: string; role: string }
    const { id } = request.params as { id: string }
    const { justification } = (request.body ?? {}) as { justification?: string }

    const isStaff = role === 'professor' || role === 'super_admin'

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user:   { select: { id: true, name: true } },
        lesson: { select: { date: true, classTime: true } },
      },
    })
    if (!booking) return reply.status(404).send({ message: 'Agendamento não encontrado.' })

    const isOwnBooking = booking.userId === sub

    // Aluno só pode cancelar o próprio agendamento
    if (!isStaff && !isOwnBooking) {
      return reply.status(403).send({ message: 'Sem permissão.' })
    }

    const date = new Date(booking.lesson.date)
    const dd   = String(date.getUTCDate()).padStart(2, '0')
    const mm   = String(date.getUTCMonth() + 1).padStart(2, '0')

    if (isStaff && !isOwnBooking) {
      // Admin/professor cancela agendamento de um aluno
      await prisma.booking.update({
        where: { id },
        data: { status: 'cancelled', notes: 'admin_cancelled' },
      })
      // Notifica o aluno
      await prisma.notification.create({
        data: {
          userId:  booking.user.id,
          message: `⚠️ Sua remada OC6 de ${dd}/${mm} às ${booking.lesson.classTime} foi cancelada pelo administrador. Entre em contato para mais informações.`,
        },
      })
    } else {
      // Aluno (ou staff) cancela o próprio agendamento — justificativa obrigatória
      const words = (justification ?? '').trim().split(/\s+/).filter(Boolean).length
      if (words < 5 || words > 50) {
        return reply.status(400).send({ message: 'A justificativa deve ter entre 5 e 50 palavras.' })
      }

      await prisma.booking.update({ where: { id }, data: { status: 'cancelled' } })

      // Notifica professores e admins
      const staff = await prisma.user.findMany({
        where: { role: { in: ['professor', 'super_admin'] }, active: true },
        select: { id: true },
      })
      if (staff.length > 0) {
        await prisma.notification.createMany({
          data: staff.map((s) => ({
            userId:  s.id,
            message: `⚠️ ${booking.user.name} cancelou a remada OC6 de ${dd}/${mm} às ${booking.lesson.classTime}. Justificativa: ${justification}`,
          })),
        })
      }
    }

    return reply.status(200).send({ ok: true })
  })

  // Admin: listar agendamentos de uma aula
  app.get('/lesson/:lessonId', { onRequest: [authorize('professor', 'super_admin')] }, async (request) => {
    const { lessonId } = request.params as { lessonId: string }
    return prisma.booking.findMany({
      where: { lessonId },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
  })
}
