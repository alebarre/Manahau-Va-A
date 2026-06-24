import { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../../middlewares/authenticate'
import { prisma } from '../../lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  birthDate: z.string().optional(),
  phones: z.array(z.object({ number: z.string(), label: z.string().optional() })).optional(),
})

export async function userRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // Perfil do próprio usuário
  app.get('/me', async (request) => {
    const { sub } = request.user as { sub: string }
    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: {
        id: true, name: true, email: true, role: true,
        birthDate: true, avatarUrl: true, emailVerified: true,
        phones: true,
        address: true,
      },
    })
    return user
  })

  app.patch('/me', async (request) => {
    const { sub } = request.user as { sub: string }
    const body = updateProfileSchema.parse(request.body)

    const { phones, ...rest } = body

    const user = await prisma.user.update({
      where: { id: sub },
      data: {
        ...rest,
        birthDate: rest.birthDate ? new Date(rest.birthDate) : undefined,
        ...(phones && {
          phones: {
            deleteMany: {},
            create: phones,
          },
        }),
      },
      select: { id: true, name: true, email: true, role: true },
    })
    return user
  })

  // Admin: listar todos os usuários
  app.get('/', { onRequest: [authorize('super_admin')] }, async (request) => {
    const { role, active } = request.query as { role?: string; active?: string }
    return prisma.user.findMany({
      where: {
        ...(role && { role: role as any }),
        ...(active !== undefined && { active: active === 'true' }),
      },
      select: {
        id: true, name: true, email: true, role: true,
        active: true, birthDate: true, phones: true,
      },
      orderBy: { name: 'asc' },
    })
  })

  // Admin: ativar/inativar usuário
  app.patch('/:id/status', { onRequest: [authorize('super_admin')] }, async (request) => {
    const { id } = request.params as { id: string }
    const { active } = request.body as { active: boolean }
    return prisma.user.update({
      where: { id },
      data: { active },
      select: { id: true, active: true },
    })
  })

  // Admin: promover role
  app.patch('/:id/role', { onRequest: [authorize('super_admin')] }, async (request) => {
    const { id } = request.params as { id: string }
    const { role } = request.body as { role: string }
    return prisma.user.update({
      where: { id },
      data: { role: role as any },
      select: { id: true, role: true },
    })
  })
}
