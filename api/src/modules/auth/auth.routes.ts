import { FastifyInstance } from 'fastify'
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schema'
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
} from './auth.service'
import { env } from '../../config/env'

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body)
    const user = await registerUser(body)
    return reply.status(201).send({ message: 'Conta criada. Verifique seu email.', user })
  })

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body)
    const user = await loginUser(body)
    const token = app.jwt.sign(
      { sub: user.id, role: user.role },
      { expiresIn: env.JWT_EXPIRES_IN }
    )
    return reply.send({ token, user })
  })

  app.post('/forgot-password', async (request, reply) => {
    const { email } = forgotPasswordSchema.parse(request.body)
    await forgotPassword(email)
    return reply.send({ message: 'Se o email existir, você receberá o código em breve.' })
  })

  app.post('/reset-password', async (request, reply) => {
    const { email, code, password } = resetPasswordSchema.parse(request.body)
    await resetPassword(email, code, password)
    return reply.send({ message: 'Senha redefinida com sucesso.' })
  })

  app.post('/verify-email', async (request, reply) => {
    const { email, code } = verifyEmailSchema.parse(request.body)
    await verifyEmail(email, code)
    return reply.send({ message: 'Email confirmado com sucesso.' })
  })
}
