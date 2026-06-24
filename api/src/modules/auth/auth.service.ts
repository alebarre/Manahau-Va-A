import bcrypt from 'bcryptjs'
import { randomInt } from 'crypto'
import { prisma } from '../../lib/prisma'
import { sendEmailVerification, sendPasswordResetEmail } from '../../lib/mailer'
import type { RegisterInput, LoginInput } from './auth.schema'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  return Array.from({ length: 5 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('')
}

export async function registerUser(data: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) throw new Error('Email já cadastrado.')

  const hash = await bcrypt.hash(data.password, 12)
  const code = generateCode()

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hash,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      emailVerifyToken: code,
    },
    select: { id: true, name: true, email: true, role: true },
  })

  await sendEmailVerification(data.email, data.name, code)
  return user
}

export async function loginUser(data: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: data.email } })
  if (!user || !user.active) throw new Error('Credenciais inválidas.')

  const valid = await bcrypt.compare(data.password, user.password)
  if (!valid) throw new Error('Credenciais inválidas.')

  if (!user.emailVerified) throw new Error('Confirme seu email antes de entrar.')

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
  }
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return

  const code = generateCode()
  const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 min

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: code, passwordResetExpires: expires },
  })

  await sendPasswordResetEmail(email, user.name, code)
}

export async function resetPassword(email: string, code: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: {
      email,
      passwordResetToken: code.toUpperCase(),
      passwordResetExpires: { gt: new Date() },
    },
  })
  if (!user) throw new Error('Código inválido ou expirado.')

  const hash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash, passwordResetToken: null, passwordResetExpires: null },
  })
}

export async function verifyEmail(email: string, code: string) {
  const user = await prisma.user.findFirst({
    where: { email, emailVerifyToken: code.toUpperCase() },
  })
  if (!user) throw new Error('Código inválido.')

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerifyToken: null },
  })
}
