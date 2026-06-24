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
      include: { lesson: true },
      orderBy: { lesson: { date: 'desc' } },
    })
  })

  // Agendar OC6
  app.post('/', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { lessonId, notes } = createBookingSchema.parse(request.body)

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { _count: { select: { bookings: true } } },
    })

    if (!lesson || !lesson.active) {
      return reply.status(404).send({ message: 'Aula não encontrada ou inativa.' })
    }
    if (lesson.classType !== 'OC6') {
      return reply.status(400).send({ message: 'Use a rota de OC1 para aulas individuais.' })
    }
    if (lesson._count.bookings >= lesson.maxSpots) {
      return reply.status(409).send({ message: 'Aula sem vagas disponíveis.' })
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

    const booking = await prisma.booking.findUnique({ where: { id } })
    if (!booking) return reply.status(404).send({ message: 'Agendamento não encontrado.' })

    if (booking.userId !== sub && role === 'aluno') {
      return reply.status(403).send({ message: 'Sem permissão.' })
    }

    return prisma.booking.update({ where: { id }, data: { status: 'cancelled' } })
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
