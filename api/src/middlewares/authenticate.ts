import { FastifyRequest, FastifyReply } from 'fastify'
import { Role } from '@prisma/client'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ message: 'Token inválido ou expirado.' })
  }
}

export function authorize(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { role: Role }
    if (!roles.includes(user.role)) {
      reply.status(403).send({ message: 'Acesso não autorizado.' })
    }
  }
}
