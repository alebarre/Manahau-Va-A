import { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../middlewares/authenticate'
import { prisma } from '../../lib/prisma'
import { uploadImage } from '../../lib/cloudinary'
import { z } from 'zod'

const createEventSchema = z.object({
  name: z.string().min(2),
  location: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
  sponsors: z.array(z.object({
    name: z.string(),
    contact: z.string().optional(),
    socialMedia: z.string().optional(),
    whatsApp: z.string().optional(),
  })).optional(),
})

export async function eventRoutes(app: FastifyInstance) {
  // Listar eventos (público)
  app.get('/', async (request) => {
    const { upcoming } = request.query as { upcoming?: string }
    return prisma.event.findMany({
      where: {
        active: true,
        ...(upcoming === 'true' && { startAt: { gte: new Date() } }),
      },
      include: { sponsors: true },
      orderBy: { startAt: 'asc' },
    })
  })

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const event = await prisma.event.findUnique({
      where: { id },
      include: { sponsors: true },
    })
    if (!event) return reply.status(404).send({ message: 'Evento não encontrado.' })
    return event
  })

  // Rotas protegidas
  app.register(async (protectedApp) => {
    protectedApp.addHook('onRequest', authenticate)

    protectedApp.post('/', { onRequest: [authorize('professor', 'super_admin')] }, async (request, reply) => {
      const { sponsors, ...body } = createEventSchema.parse(request.body)
      const event = await prisma.event.create({
        data: {
          ...body,
          startAt: new Date(body.startAt),
          endAt: new Date(body.endAt),
          ...(sponsors && { sponsors: { create: sponsors } }),
        },
        include: { sponsors: true },
      })
      return reply.status(201).send(event)
    })

    protectedApp.patch('/:id', { onRequest: [authorize('professor', 'super_admin')] }, async (request) => {
      const { id } = request.params as { id: string }
      const body = createEventSchema.partial().parse(request.body)
      return prisma.event.update({
        where: { id },
        data: {
          ...body,
          ...(body.startAt && { startAt: new Date(body.startAt) }),
          ...(body.endAt && { endAt: new Date(body.endAt) }),
        },
      })
    })

    protectedApp.patch('/:id/status', { onRequest: [authorize('professor', 'super_admin')] }, async (request) => {
      const { id } = request.params as { id: string }
      const { active } = request.body as { active: boolean }
      return prisma.event.update({ where: { id }, data: { active } })
    })

    protectedApp.delete('/:id', { onRequest: [authorize('super_admin')] }, async (request) => {
      const { id } = request.params as { id: string }
      return prisma.event.update({ where: { id }, data: { active: false } })
    })

    protectedApp.post('/:id/image', { onRequest: [authorize('professor', 'super_admin')] }, async (request, reply) => {
      const { id } = request.params as { id: string }
      let fileBuffer: Buffer | null = null
      let mimeType = ''
      for await (const part of request.parts()) {
        if (part.type === 'file' && part.fieldname === 'file') {
          const chunks: Buffer[] = []
          for await (const chunk of part.file) chunks.push(chunk)
          fileBuffer = Buffer.concat(chunks)
          mimeType = part.mimetype
        }
      }
      if (!fileBuffer) return reply.status(400).send({ message: 'Arquivo obrigatório.' })
      const allowed = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowed.includes(mimeType)) return reply.status(400).send({ message: 'Formato inválido. Use JPG, PNG ou WebP.' })
      const url = await uploadImage(fileBuffer, 'events')
      const event = await prisma.event.update({
        where: { id },
        data: { imageUrl: url },
        include: { sponsors: true },
      })
      return reply.send(event)
    })
  })
}
