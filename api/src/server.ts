import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { env } from './config/env'
import { authRoutes } from './modules/auth/auth.routes'
import { userRoutes } from './modules/users/user.routes'
import { lessonRoutes } from './modules/lessons/lesson.routes'
import { bookingRoutes } from './modules/bookings/booking.routes'
import { oc1Routes } from './modules/oc1/oc1.routes'
import { eventRoutes } from './modules/events/event.routes'
import { productRoutes } from './modules/products/product.routes'
import { photoRoutes } from './modules/photos/photo.routes'

const app = Fastify({ logger: true })

app.register(cors, {
  origin: env.FRONTEND_URL,
  credentials: true,
})

app.register(jwt, {
  secret: env.JWT_SECRET,
})

app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

app.register(authRoutes, { prefix: '/auth' })
app.register(userRoutes, { prefix: '/users' })
app.register(lessonRoutes, { prefix: '/lessons' })
app.register(bookingRoutes, { prefix: '/bookings' })
app.register(oc1Routes, { prefix: '/oc1' })
app.register(eventRoutes, { prefix: '/events' })
app.register(productRoutes, { prefix: '/products' })
app.register(photoRoutes, { prefix: '/photos' })

// Tratamento global de erros
app.setErrorHandler((error, _request, reply) => {
  app.log.error(error)

  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Dados inválidos.',
      errors: error.flatten().fieldErrors,
    })
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return reply.status(409).send({ message: 'Registro duplicado.' })
    }
    if (error.code === 'P2025') {
      return reply.status(404).send({ message: 'Registro não encontrado.' })
    }
    // Qualquer outro erro Prisma conhecido — não expor detalhes ao cliente
    return reply.status(500).send({ message: 'Erro interno no servidor.' })
  }

  if (
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError
  ) {
    return reply.status(500).send({ message: 'Erro interno no servidor.' })
  }

  const status = error.statusCode ?? 500
  return reply.status(status).send({ message: error.message || 'Erro interno no servidor.' })
})

app.get('/health', async () => ({ status: 'ok' }))

app.listen({ port: env.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
