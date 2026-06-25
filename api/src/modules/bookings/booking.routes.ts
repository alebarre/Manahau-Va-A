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
      include: { _count: { select: { bookings: { where: { status: 'confirmed' } } } } },
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

    // Verifica se já existe um booking (pode ser cancelado)
    const existing = await prisma.booking.findUnique({
      where: { userId_lessonId: { userId: sub, lessonId } },
    })

    if (existing) {
      if (existing.status === 'confirmed') {
        return reply.status(409).send({ message: 'Você já está agendado para esta aula.' })
      }
      // Re-ativar booking cancelado
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

    const words = (justification ?? '').trim().split(/\s+/).filter(Boolean).length
    if (words < 5 || words > 50) {
      return reply.status(400).send({ message: 'A justificativa deve ter entre 5 e 50 palavras.' })
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user:   { select: { id: true, name: true } },
        lesson: { select: { date: true, classTime: true } },
      },
    })
    if (!booking) return reply.status(404).send({ message: 'Agendamento não encontrado.' })
    if (booking.userId !== sub && role === 'aluno') {
      return reply.status(403).send({ message: 'Sem permissão.' })
    }

    await prisma.booking.update({ where: { id }, data: { status: 'cancelled' } })

    // Notificar professores e admins
    const date = new Date(booking.lesson.date)
    const dd   = String(date.getDate()).padStart(2, '0')
    const mm   = String(date.getMonth() + 1).padStart(2, '0')
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
