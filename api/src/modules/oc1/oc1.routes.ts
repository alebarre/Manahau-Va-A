import { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../middlewares/authenticate'
import { prisma } from '../../lib/prisma'
import { z } from 'zod'

const requestSchema = z.object({
  lessonId: z.string(),
  notes: z.string().optional(),
})

export async function oc1Routes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // Solicitar aula OC1 (aguarda confirmação do professor)
  app.post('/request', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { lessonId, notes } = requestSchema.parse(request.body)

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } })
    if (!lesson || !lesson.active) {
      return reply.status(404).send({ message: 'Aula não encontrada.' })
    }

    const req = await prisma.oc1Request.create({
      data: { userId: sub, lessonId, notes },
    })
    return reply.status(201).send({ message: 'Solicitação enviada. Aguarde confirmação.', req })
  })

  // Minhas solicitações OC1
  app.get('/my', async (request) => {
    const { sub } = request.user as { sub: string }
    return prisma.oc1Request.findMany({
      where: { userId: sub },
      include: { lesson: true },
      orderBy: { createdAt: 'desc' },
    })
  })

  // Professor/Admin: listar solicitações pendentes
  app.get('/pending', { onRequest: [authorize('professor', 'super_admin')] }, async () => {
    return prisma.oc1Request.findMany({
      where: { status: 'pending' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        lesson: true,
      },
      orderBy: { createdAt: 'asc' },
    })
  })

  // Professor/Admin: confirmar ou recusar solicitação OC1
  app.patch('/:id/status', { onRequest: [authorize('professor', 'super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: 'confirmed' | 'cancelled' }

    if (!['confirmed', 'cancelled'].includes(status)) {
      return reply.status(400).send({ message: 'Status inválido.' })
    }

    return prisma.oc1Request.update({ where: { id }, data: { status } })
  })
}
