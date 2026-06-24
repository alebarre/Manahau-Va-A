# Instruções para o Claude — Projeto Manahau Va'A

## Regra obrigatória: atualização do README.md

**Após qualquer alteração majoritária no projeto, o `README.md` DEVE ser atualizado.**

Considere "alteração majoritária":
- Adição ou remoção de páginas/rotas no frontend (`/app`, `/auth`, `/admin`)
- Adição ou remoção de endpoints na API (`/modules/**`)
- Mudanças no schema do Prisma (novos models, campos, enums)
- Mudanças na stack ou dependências principais
- Adição de novos scripts utilitários
- Mudanças no fluxo de deploy ou variáveis de ambiente
- Mudanças na paleta de cores ou identidade visual
- Novas roles ou permissões

**O que atualizar no README conforme o caso:**
- Tabela de endpoints da API
- Estrutura de pastas (árvore)
- Tabela de models do banco
- Tabela de roles
- Paleta de cores
- Seção "Como rodar" se o processo mudar
- Seção "Scripts utilitários" se novos scripts forem adicionados

---

## Contexto do projeto

**Manahau Va'A** é um clube de canoa havaiana localizado na Praia de Itaipu, Niterói/RJ.

### Stack
- **Frontend:** Next.js 14 (App Router) + Tailwind CSS — deploy na Vercel
- **Backend:** Node.js + Fastify + Prisma + PostgreSQL — deploy no Render
- **Mobile:** PWA instalável (não é app nativo, não publicar na App Store)
- **Imagens:** Cloudinary
- **Auth:** JWT + Nodemailer (tokens por email)

### Identidade visual
- A paleta vem da logo: laranja `#F47B1A`, preto tribal `#1A1A1A`, branco
- **Não usar azul** — foi removido da paleta propositalmente
- Tokens Tailwind: `brand-orange`, `brand-dark`, `brand-orange-light`, `brand-cream`

### Regras de negócio importantes
- Aulas saem todos os dias da praia de Itaipu
- Horário das aulas é **livre** (campo `classTime` String no formato `HH:MM`) — não é fixo
- Chegada na praia = horário da aula − 30 minutos (calculado no frontend)
- OC6: 6 lugares, agendamento imediato
- OC1: individual, aguarda confirmação do professor (`pending → confirmed/cancelled`)
- Aluno pode agendar os dois horários do mesmo dia se quiser

### Roles
- `super_admin`: acesso total
- `professor`: cria aulas/eventos, confirma OC1, faz upload de fotos
- `aluno`: próprio perfil + agendamento

### Decisões arquiteturais tomadas
- Shop é vitrine apenas (sem carrinho/pagamento) — contato via WhatsApp
- Fotos: upload somente por professor e admin
- PWA em vez de app nativo para simplicidade de deploy
- Monorepo com npm workspaces (`/web` e `/api`)
