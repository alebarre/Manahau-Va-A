import { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../middlewares/authenticate'
import { prisma } from '../../lib/prisma'
import { uploadImage } from '../../lib/cloudinary'
import { z } from 'zod'

const createProductSchema = z.object({
  name: z.string().min(2),
  category: z.enum(['vestuario', 'acessorio', 'equipamento', 'outro']),
  description: z.string().optional(),
  price: z.number().positive(),
  variants: z.array(z.object({
    size: z.string().optional(),
    color: z.string().optional(),
    stock: z.number().int().min(0).default(0),
    sku: z.string().optional(),
  })).optional(),
})

export async function productRoutes(app: FastifyInstance) {
  // Listagem pública
  app.get('/', async (request) => {
    const { category } = request.query as { category?: string }
    return prisma.product.findMany({
      where: {
        active: true,
        ...(category && { category: category as any }),
      },
      include: {
        variants: true,
        images: { orderBy: { order: 'asc' } },
      },
      orderBy: { name: 'asc' },
    })
  })

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: true, images: { orderBy: { order: 'asc' } } },
    })
    if (!product) return reply.status(404).send({ message: 'Produto não encontrado.' })
    return product
  })

  // Rotas admin
  app.register(async (adminApp) => {
    adminApp.addHook('onRequest', authenticate)
    adminApp.addHook('onRequest', authorize('super_admin'))

    adminApp.get('/all', async () => {
      return prisma.product.findMany({
        include: {
          variants: true,
          images: { orderBy: { order: 'asc' } },
        },
        orderBy: { name: 'asc' },
      })
    })

    adminApp.post('/', async (request, reply) => {
      const { variants, ...body } = createProductSchema.parse(request.body)
      const product = await prisma.product.create({
        data: {
          ...body,
          price: body.price,
          ...(variants && { variants: { create: variants } }),
        },
        include: { variants: true },
      })
      return reply.status(201).send(product)
    })

    adminApp.patch('/:id', async (request) => {
      const { id } = request.params as { id: string }
      const { variants, ...body } = createProductSchema.partial().parse(request.body)
      return prisma.product.update({
        where: { id },
        data: {
          ...body,
          ...(variants !== undefined && {
            variants: {
              deleteMany: {},
              create: variants,
            },
          }),
        },
        include: { variants: true, images: { orderBy: { order: 'asc' } } },
      })
    })

    adminApp.patch('/:id/status', async (request) => {
      const { id } = request.params as { id: string }
      const { active } = request.body as { active: boolean }
      return prisma.product.update({ where: { id }, data: { active } })
    })

    adminApp.post('/:id/images', async (request, reply) => {
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

      const url = await uploadImage(fileBuffer, 'products')
      const count = await prisma.productImage.count({ where: { productId: id } })
      const image = await prisma.productImage.create({
        data: { url, productId: id, order: count },
      })
      return reply.status(201).send(image)
    })

    adminApp.delete('/:id/images/:imageId', async (request) => {
      const { imageId } = request.params as { id: string; imageId: string }
      return prisma.productImage.delete({ where: { id: imageId } })
    })

    adminApp.delete('/:id', async (request) => {
      const { id } = request.params as { id: string }
      return prisma.product.update({ where: { id }, data: { active: false } })
    })
  })
}
