import { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../middlewares/authenticate'
import { prisma } from '../../lib/prisma'
import { uploadImage } from '../../lib/cloudinary'

export async function photoRoutes(app: FastifyInstance) {
  // Listagem pública (fotos em destaque ou todas)
  app.get('/', async (request) => {
    const { featured, limit } = request.query as { featured?: string; limit?: string }
    return prisma.beachPhoto.findMany({
      where: { ...(featured === 'true' && { featured: true }) },
      orderBy: { takenAt: 'desc' },
      take: limit ? parseInt(limit) : 20,
    })
  })

  // Rotas de upload (professor ou admin)
  app.register(async (protectedApp) => {
    protectedApp.addHook('onRequest', authenticate)
    protectedApp.addHook('onRequest', authorize('professor', 'super_admin'))

    protectedApp.post('/upload', async (request, reply) => {
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      const MAX_BYTES = 5 * 1024 * 1024

      // Lê todas as partes do multipart (arquivo + campos de texto)
      let fileBuffer: Buffer | null = null
      let fileMime = ''
      let caption = ''
      let takenAt = ''
      let featured = ''

      for await (const part of request.parts()) {
        if (part.type === 'file') {
          fileMime = part.mimetype
          if (!ALLOWED_TYPES.includes(fileMime)) {
            await part.toBuffer() // drena o stream
            return reply.status(400).send({
              message: 'Tipo de arquivo não permitido. Envie JPG, PNG, WebP ou GIF.',
            })
          }
          fileBuffer = await part.toBuffer()
          if (fileBuffer.length > MAX_BYTES) {
            return reply.status(400).send({
              message: 'Arquivo muito grande. Tamanho máximo: 5 MB.',
            })
          }
        } else {
          const val = (part as any).value as string ?? ''
          if (part.fieldname === 'caption')  caption  = val
          if (part.fieldname === 'takenAt')  takenAt  = val
          if (part.fieldname === 'featured') featured = val
        }
      }

      if (!fileBuffer) {
        return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })
      }

      const url = await uploadImage(fileBuffer, 'beach')

      const photo = await prisma.beachPhoto.create({
        data: {
          url,
          caption: caption || undefined,
          takenAt: takenAt ? new Date(takenAt) : undefined,
          featured: featured === 'true',
        },
      })
      return reply.status(201).send(photo)
    })

    protectedApp.patch('/:id/featured', async (request) => {
      const { id } = request.params as { id: string }
      const { featured } = request.body as { featured: boolean }
      return prisma.beachPhoto.update({ where: { id }, data: { featured } })
    })

    protectedApp.delete('/:id', { onRequest: [authorize('super_admin')] }, async (request) => {
      const { id } = request.params as { id: string }
      return prisma.beachPhoto.delete({ where: { id } })
    })
  })
}
