# Manahau Va'A — App de Agendamento de Canoa Havaiana

App PWA para agendamento de remadas e gestão do **Clube Manahau Va'A**, localizado na Praia de Itaipu, Niterói/RJ.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Node.js + Fastify + Prisma ORM |
| Banco de dados | PostgreSQL |
| Autenticação | JWT (`@fastify/jwt`) + Nodemailer (código de 5 chars via email) |
| Upload de imagens | Cloudinary |
| Deploy — Frontend | Vercel |
| Deploy — Backend + Banco | Render |
| Mobile | PWA instalável (manifest + next-pwa) |

---

## Estrutura do monorepo

```
manahau/
├── web/                        # Next.js 14 — frontend PWA
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Splash screen (3s) → redirect
│   │   │   ├── (auth)/               # Rotas públicas
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   └── forgot-password/
│   │   │   └── (app)/                # Rotas protegidas (JWT)
│   │   │       ├── home/             # Fotos recentes + cards de navegação
│   │   │       ├── remadas/          # Lista todas as remadas abertas (com booking inline)
│   │   │       ├── schedule/         # Agendamento OC6 e solicitação OC1 por dia
│   │   │       ├── profile/          # Perfil + histórico de remadas + OC1
│   │   │       ├── events/           # Listagem e detalhe de eventos
│   │   │       ├── shop/             # Vitrine de produtos por categoria
│   │   │       ├── gallery/          # Fotos das remadas (lightbox)
│   │   │       └── admin/            # Painel admin (professor + super_admin)
│   │   │           ├── lessons/      # CRUD de aulas
│   │   │           ├── oc1/          # Confirmação de solicitações OC1
│   │   │           ├── users/        # Gestão de usuários
│   │   │           ├── events/       # CRUD de eventos + patrocinadores
│   │   │           ├── products/     # CRUD de produtos + variações + imagens
│   │   │           └── photos/       # Upload de fotos para a galeria
│   │   ├── components/
│   │   │   ├── splash-screen.tsx
│   │   │   ├── app-header.tsx        # Header sticky: logo/título + voltar + sair + loading bar
│   │   │   ├── app-footer.tsx        # Footer: redes sociais do clube + crédito dev
│   │   │   ├── bottom-nav.tsx        # Nav condicional (admin aparece para professor+)
│   │   │   ├── protected-route.tsx
│   │   │   └── providers.tsx         # QueryClient + AuthProvider
│   │   ├── contexts/auth-context.tsx
│   │   ├── hooks/use-auth.ts
│   │   └── lib/
│   │       ├── api.ts                # Axios com interceptor JWT + redirect 401
│   │       └── utils.ts              # cn() helper
│   └── public/
│       ├── logo.png                  # Logo original (com fundo laranja)
│       ├── logo-transparent.png      # Logo sem fundo (gerada via scripts/remove-bg.mjs)
│       └── manifest.json             # PWA manifest
│
├── api/                        # Node.js + Fastify — backend REST
│   ├── prisma/
│   │   ├── schema.prisma             # Todos os models
│   │   └── seed.ts                   # Cria super_admin inicial
│   └── src/
│       ├── server.ts                 # Entry point — registra plugins e rotas
│       ├── config/env.ts             # Validação de variáveis de ambiente (Zod)
│       ├── lib/
│       │   ├── prisma.ts             # PrismaClient singleton
│       │   ├── mailer.ts             # Nodemailer (reset de senha + verificação de email)
│       │   └── cloudinary.ts         # Upload/delete de imagens
│       ├── middlewares/
│       │   └── authenticate.ts       # authenticate() + authorize(...roles)
│       └── modules/
│           ├── auth/                 # register, login, forgot/reset password, verify email
│           ├── users/                # perfil próprio, listagem admin, ativar/inativar, roles
│           ├── lessons/              # CRUD de aulas (OC6 e OC1), horário livre HH:MM
│           ├── bookings/             # Agendamento OC6 com controle de vagas
│           ├── oc1/                  # Solicitação OC1 — fluxo pending → confirmed/cancelled
│           ├── events/               # CRUD de eventos + patrocinadores
│           ├── products/             # Shop — vitrine por categoria, variantes, imagens
│           └── photos/               # Upload Cloudinary, destaque (featured), exclusão
│
├── scripts/
│   └── remove-bg.mjs                 # Remove fundo laranja da logo (jimp)
├── docker-compose.yml                # PostgreSQL local para desenvolvimento
├── package.json                      # Workspace root (npm workspaces)
└── .gitignore
```

---

## Models do banco (Prisma)

| Model | Descrição |
|---|---|
| `User` | Alunos e professores unificados por `role` |
| `Phone` | Telefones do usuário (1:N) |
| `Address` | Endereço reutilizável |
| `Lesson` | Aula com data, horário livre (HH:MM), tipo OC6/OC1 e vagas |
| `Booking` | Agendamento OC6 (confirmado automaticamente) |
| `Oc1Request` | Solicitação OC1 — aguarda confirmação do professor |
| `Event` | Eventos com local, datas e patrocinadores |
| `Sponsor` | Patrocinadores vinculados a um evento |
| `Product` | Produto do shop com categoria, preço e variantes |
| `ProductVariant` | Tamanho/cor/estoque de um produto |
| `ProductImage` | Imagens de um produto (Cloudinary) |
| `BeachPhoto` | Fotos das remadas com suporte a destaque (featured) |

---

## Roles de acesso

| Role | Permissões |
|---|---|
| `super_admin` | Tudo: cadastra, inativa, muda roles, gerencia produtos, upload de fotos |
| `professor` | Cria aulas e eventos, confirma OC1, faz upload de fotos |
| `aluno` | Próprio cadastro, agendamento OC6, solicitação OC1 |

---

## Paleta de cores (logo Manahau Va'A)

| Token | Hex | Uso |
|---|---|---|
| `brand-orange` | `#F47B1A` | Cor primária — botões, active states, splash |
| `brand-orange-dark` | `#D4660E` | Hover / pressed |
| `brand-orange-light` | `#FDE8CC` | Fundos suaves |
| `brand-dark` | `#1A1A1A` | Preto tribal — OC1, textos, ícones secundários |
| `brand-dark-muted` | `#3D3D3D` | Texto secundário escuro |
| `brand-cream` | `#FFF8F2` | Fundo levíssimo quente |

---

## Como rodar localmente

### Pré-requisitos
- Node.js 20+
- Docker Desktop

### 1. Clonar e instalar

```bash
git clone <repo>
cd manahau
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env
# Edite api/.env com suas credenciais SMTP e Cloudinary
```

### 3. Subir o banco de dados

```bash
docker compose up -d
```

### 4. Aplicar migrations e seed

```bash
cd api
npx prisma migrate dev
npx prisma db seed
cd ..
```

O seed cria dois usuários iniciais:

| Usuário | Email | Senha | Role |
|---|---|---|---|
| Super Admin | `admin@manahau.com.br` | `Admin@2025` | `super_admin` |
| Aluno Teste | `aluno@manahau.com.br` | `Aluno@2025` | `aluno` |

### 5. Rodar o projeto

```bash
npm run dev          # inicia api (porta 3001) e web (porta 3000) juntos
npm run dev:api      # somente API
npm run dev:web      # somente frontend
```

---

## Endpoints da API

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/register` | — | Criar conta (envia email de verificação) |
| POST | `/auth/login` | — | Login, retorna JWT |
| POST | `/auth/forgot-password` | — | Solicita reset de senha por email |
| POST | `/auth/reset-password` | — | Redefine senha via código `{ email, code, password }` |
| POST | `/auth/verify-email` | — | Confirma email via código `{ email, code }` |
| GET | `/users/me` | JWT | Perfil do usuário logado |
| PATCH | `/users/me` | JWT | Atualiza perfil |
| POST | `/users/me/avatar` | JWT | Upload de avatar (multipart, max 2MB, JPG/PNG/WebP) |
| GET | `/users` | admin | Lista todos os usuários |
| PATCH | `/users/:id/status` | admin | Ativa/inativa usuário |
| PATCH | `/users/:id/role` | admin | Altera role do usuário |
| GET | `/lessons` | JWT | Lista aulas (filtro por data) |
| GET | `/lessons/:id` | JWT | Detalhe da aula com vagas |
| POST | `/lessons` | prof/admin | Cria aula |
| PATCH | `/lessons/:id/status` | admin | Ativa/inativa aula |
| POST | `/bookings` | JWT | Agendar OC6 |
| GET | `/bookings/my` | JWT | Meus agendamentos |
| PATCH | `/bookings/:id/cancel` | JWT | Cancelar agendamento |
| GET | `/bookings/lesson/:id` | prof/admin | Agendamentos de uma aula |
| POST | `/oc1/request` | JWT | Solicitar aula OC1 |
| GET | `/oc1/my` | JWT | Minhas solicitações OC1 |
| GET | `/oc1/pending` | prof/admin | Solicitações OC1 pendentes |
| PATCH | `/oc1/:id/status` | prof/admin | Confirmar ou recusar OC1 |
| GET | `/events` | — | Lista eventos (param: `upcoming=true`) |
| GET | `/events/:id` | — | Detalhe de evento com patrocinadores |
| POST | `/events` | prof/admin | Criar evento |
| PATCH | `/events/:id` | prof/admin | Editar evento |
| PATCH | `/events/:id/status` | prof/admin | Ativar/inativar evento |
| DELETE | `/events/:id` | admin | Inativar evento (soft delete) |
| GET | `/products` | — | Lista produtos ativos (param: `category`) |
| GET | `/products/all` | admin | Lista todos os produtos (incluindo inativos) |
| GET | `/products/:id` | — | Detalhe do produto |
| POST | `/products` | admin | Criar produto com variações |
| PATCH | `/products/:id` | admin | Editar produto (substitui variações) |
| PATCH | `/products/:id/status` | admin | Ativar/inativar produto |
| POST | `/products/:id/images` | admin | Adicionar imagem ao produto |
| DELETE | `/products/:id/images/:imageId` | admin | Remover imagem do produto |
| DELETE | `/products/:id` | admin | Inativar produto (soft delete) |
| GET | `/photos` | — | Lista fotos (param: featured, limit) |
| POST | `/photos/upload` | prof/admin | Upload de foto (multipart) |
| PATCH | `/photos/:id/featured` | prof/admin | Destacar/remover destaque |
| DELETE | `/photos/:id` | admin | Excluir foto |
| GET | `/health` | — | Health check da API |

---

## Deploy

### Backend (Render)
1. Criar Web Service apontando para `/api`
2. Build command: `npm install && npx prisma generate && npm run build`
3. Start command: `node dist/server.js`
4. Adicionar as variáveis de ambiente do `api/.env.example`
5. Criar PostgreSQL no Render e copiar a `DATABASE_URL`

### Frontend (Vercel)
1. Importar o repositório no Vercel
2. Root directory: `web`
3. Adicionar `NEXT_PUBLIC_API_URL` apontando para a URL do Render
4. Adicionar `NEXT_PUBLIC_WHATSAPP` com o número do shop

---

## Scripts utilitários

```bash
# Remover fundo laranja da logo (gera logo-transparent.png)
node scripts/remove-bg.mjs

# Visualizar banco de dados
cd api && npx prisma studio

# Resetar banco (dev)
cd api && npx prisma migrate reset --force
```

---

## Contato e créditos

Desenvolvido por **[Alexandre Barreto]**  
Clube **Manahau Va'A** — Canoa Havaiana, Praia de Itaipu, Niterói/RJ
