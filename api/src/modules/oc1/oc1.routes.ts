import { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../middlewares/authenticate'
import { prisma } from '../../lib/prisma'
import { z } from 'zod'

const requestSchema = z.object({
  lessonId: z.string(),
  notes: z.string().optional(),
})

const cancelSchema = z.object({
  justification: z.string(),
})

function arriveTime(classTime: string): string {
  const [h, m] = classTime.split(':').map(Number)
  const d = new Date(0, 0, 0, h, m - 30)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' })
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

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

    const existing = await prisma.oc1Request.findUnique({
      where: { userId_lessonId: { userId: sub, lessonId } },
    })

    if (existing) {
      if (existing.status === 'pending' || existing.status === 'confirmed') {
        return reply.status(409).send({ message: 'Você já tem uma solicitação ativa para esta aula.' })
      }
      const req = await prisma.oc1Request.update({
        where: { id: existing.id },
        data: { status: 'pending', notes },
      })
      return reply.status(200).send({ message: 'Solicitação reenviada. Aguarde confirmação.', req })
    }

    const req = await prisma.oc1Request.create({
      data: { userId: sub, lessonId, notes },
    })
    return reply.status(201).send({ message: 'Solicitação enviada. Aguarde confirmação.', req })
  })

  // Aluno: cancelar própria solicitação OC1 com justificativa
  app.patch('/:id/cancel', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    const { justification } = cancelSchema.parse(request.body)

    const words = wordCount(justification)
    if (words < 5)  return reply.status(400).send({ message: 'A justificativa deve ter no mínimo 5 palavras.' })
    if (words > 50) return reply.status(400).send({ message: 'A justificativa deve ter no máximo 50 palavras.' })

    const oc1 = await prisma.oc1Request.findUnique({
      where: { id },
      include: {
        lesson: true,
        user: { select: { id: true, name: true } },
      },
    })

    if (!oc1) return reply.status(404).send({ message: 'Solicitação não encontrada.' })
    if (oc1.userId !== sub) return reply.status(403).send({ message: 'Sem permissão.' })
    if (oc1.status === 'cancelled') return reply.status(400).send({ message: 'Solicitação já cancelada.' })

    await prisma.oc1Request.update({ where: { id }, data: { status: 'cancelled' } })

    const dateStr = formatDate(new Date(oc1.lesson.date))
    const message = `⚠️ ${oc1.user.name} cancelou a aula OC1 de ${dateStr} às ${oc1.lesson.classTime}. Justificativa: ${justification}`

    const staff = await prisma.user.findMany({
      where: { role: { in: ['professor', 'super_admin'] }, active: true },
      select: { id: true },
    })

    if (staff.length > 0) {
      await prisma.notification.createMany({
        data: staff.map((s) => ({ userId: s.id, message })),
      })
    }

    return reply.send({ message: 'Solicitação cancelada.' })
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

  // Professor/Admin: confirmar ou cancelar solicitação OC1
  app.patch('/:id/status', { onRequest: [authorize('professor', 'super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: 'confirmed' | 'cancelled' }

    if (!['confirmed', 'cancelled'].includes(status)) {
      return reply.status(400).send({ message: 'Status inválido.' })
    }

    const oc1 = await prisma.oc1Request.findUnique({
      where: { id },
      include: {
        lesson: true,
        user: { select: { id: true, name: true } },
      },
    })
    if (!oc1) return reply.status(404).send({ message: 'Solicitação não encontrada.' })

    const updated = await prisma.oc1Request.update({ where: { id }, data: { status } })

    const dateStr = formatDate(new Date(oc1.lesson.date))
    const arrive  = arriveTime(oc1.lesson.classTime)

    const message = status === 'confirmed'
      ? `✅ Sua aula OC1 em ${dateStr} às ${oc1.lesson.classTime} foi confirmada! Chegue à praia às ${arrive}.`
      : `❌ Sua aula OC1 em ${dateStr} às ${oc1.lesson.classTime} foi cancelada pelo professor.`

    await prisma.notification.create({ data: { userId: oc1.userId, message } })

    return updated
  })
}
