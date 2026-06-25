import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/authenticate'
import { prisma } from '../../lib/prisma'

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/unread', async (request) => {
    const { sub } = request.user as { sub: string }
    return prisma.notification.findMany({
      where: { userId: sub, read: false },
      orderBy: { createdAt: 'desc' },
      select: { id: true, message: true, createdAt: true },
    })
  })

  app.post('/read-all', async (request) => {
    const { sub } = request.user as { sub: string }
    await prisma.notification.updateMany({
      where: { userId: sub, read: false },
      data: { read: true },
    })
    return { ok: true }
  })
}
