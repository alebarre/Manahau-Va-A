import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminHash = await bcrypt.hash('Admin@2025', 12)
  const alunoHash = await bcrypt.hash('Aluno@2025', 12)

  await prisma.user.upsert({
    where: { email: 'admin@manahau.com.br' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@manahau.com.br',
      password: adminHash,
      role: 'super_admin',
      emailVerified: true,
    },
  })

  await prisma.user.upsert({
    where: { email: 'aluno@manahau.com.br' },
    update: {},
    create: {
      name: 'Aluno Teste',
      email: 'aluno@manahau.com.br',
      password: alunoHash,
      role: 'aluno',
      emailVerified: true,
    },
  })

  console.log('✅ Seed concluído:')
  console.log('   admin@manahau.com.br / Admin@2025  (super_admin)')
  console.log('   aluno@manahau.com.br / Aluno@2025  (aluno)')
}

main().catch(console.error).finally(() => prisma.$disconnect())
