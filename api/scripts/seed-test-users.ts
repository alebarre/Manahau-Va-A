import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const users = [
  { name: 'Ana Teste',     email: 'ana.teste@manahau.test',     password: 'Teste@123' },
  { name: 'Bruno Teste',   email: 'bruno.teste@manahau.test',   password: 'Teste@123' },
  { name: 'Carla Teste',   email: 'carla.teste@manahau.test',   password: 'Teste@123' },
  { name: 'Diego Teste',   email: 'diego.teste@manahau.test',   password: 'Teste@123' },
  { name: 'Elisa Teste',   email: 'elisa.teste@manahau.test',   password: 'Teste@123' },
  { name: 'Felipe Teste',  email: 'felipe.teste@manahau.test',  password: 'Teste@123' },
  { name: 'Gabi Teste',    email: 'gabi.teste@manahau.test',    password: 'Teste@123' },
  { name: 'Hugo Teste',    email: 'hugo.teste@manahau.test',    password: 'Teste@123' },
  { name: 'Iris Teste',    email: 'iris.teste@manahau.test',    password: 'Teste@123' },
  { name: 'João Teste',    email: 'joao.teste@manahau.test',    password: 'Teste@123' },
]

async function main() {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12)
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        password: hash,
        role: 'aluno',
        emailVerified: true,
        active: true,
      },
    })
    console.log(`✓ ${u.email}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
