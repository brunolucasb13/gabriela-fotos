# Fotos da Festa da Gabriela (Next.js + Supabase)

Aplicação web mobile-first para convidados enviarem fotos do aniversário de 1 ano da Gabriela via QR Code, com visual premium, upload privado e painel admin protegido.

## Stack

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres + Storage)
- Deploy pronto para Vercel

## Principais recursos

- Página pública elegante e simples para convidados leigos
- Upload múltiplo (até 10 fotos por envio)
- Compressão/redimensionamento no cliente para reduzir peso
- Suporte prático a HEIC/HEIF (tentativa de conversão para JPEG no navegador)
- Armazenamento privado no Supabase Storage
- Registro de metadados no banco (`uploads_evento`)
- Proteção básica antiabuso por fingerprint de requisição
- Área admin protegida por login (email/senha via Supabase Auth)
- Admin com miniatura, abrir, baixar, filtrar por convidado e excluir

---

## Estrutura de pastas

```text
.
|- app/
|  |- api/
|  |  |- upload/route.ts
|  |- admin/
|  |  |- login/page.tsx
|  |  |- actions.ts
|  |  |- layout.tsx
|  |  |- page.tsx
|  |- globals.css
|  |- layout.tsx
|  |- page.tsx
|- components/
|  |- admin/
|  |  |- admin-login-form.tsx
|  |  |- uploads-table.tsx
|  |- photo-upload-form.tsx
|- lib/
|  |- supabase/
|  |  |- admin.ts
|  |  |- browser.ts
|  |  |- public-env.ts
|  |  |- server.ts
|  |- constants.ts
|  |- server-env.ts
|  |- upload-validation.ts
|  |- utils.ts
|- sql/
|  |- supabase.sql
|- types/
|  |- database.ts
|  |- heic2any.d.ts
|  |- upload.ts
|- .env.example
|- middleware.ts
|- package.json
|- tailwind.config.ts
|- tsconfig.json
```

---

## 1) Instalação do projeto

Pré-requisitos:

- Node.js 20+
- npm 10+
- Conta no Supabase

No terminal:

```bash
npm install
```

Copie o arquivo de ambiente:

```bash
cp .env.example .env.local
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

---

## 2) Configurar Supabase

### 2.1 Criar projeto no Supabase

1. Crie um novo projeto em [Supabase](https://supabase.com).
2. Vá em `Project Settings > API` e copie:
   - `Project URL`
   - `anon public key`
   - `service_role key`

### 2.2 Criar tabela + bucket + políticas

1. Abra o SQL Editor do Supabase.
2. Execute todo o conteúdo de [`sql/supabase.sql`](./sql/supabase.sql).

Esse script cria:

- Tabela `public.uploads_evento`
- Índices e RLS
- Bucket privado `uploads-evento`
- Policies sugeridas para leitura/remoção autenticada no admin

### 2.3 Criar usuário admin

1. No Supabase, vá em `Authentication > Users`.
2. Clique em `Add user`.
3. Cadastre email/senha do administrador.

Esse usuário fará login em `/admin/login`.

---

## 3) Variáveis de ambiente

Preencha `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=uploads-evento
```

Observações:

- `SUPABASE_SERVICE_ROLE_KEY` é **sensível** e fica apenas no servidor.
- Nunca exponha essa chave no frontend.

---

## 4) Rodar localmente

```bash
npm run dev
```

Acesse:

- Página pública: `http://localhost:3000`
- Admin login: `http://localhost:3000/admin/login`

---

## 5) Publicar na Vercel

1. Suba o projeto para GitHub/GitLab/Bitbucket.
2. Importe o repositório na [Vercel](https://vercel.com).
3. Em `Project Settings > Environment Variables`, configure as mesmas variáveis do `.env.local`.
4. Faça deploy.
5. Teste:
   - envio de fotos pela rota pública
   - login admin
   - listagem/download/exclusão no painel

---

## 6) Gerar QR Code para os convidados

Após o deploy, pegue a URL pública (ex.: `https://seu-app.vercel.app`).

Opções simples:

1. Gerar em ferramentas online (Canva, QR Code Monkey, etc.) usando a URL.
2. Usar um app de QR no celular e apontar para a URL.

Dica prática:

- Use QR com alto contraste e tamanho grande no impresso da festa.
- Faça um teste real em iPhone e Android antes do evento.

---

## Decisões de arquitetura

- **Upload em 2 fases (`init` + `complete`)**: evita mandar arquivos grandes através da função da Vercel e usa URL assinada para upload direto ao Supabase Storage.
- **Validação dupla**:
  - no cliente (UX rápida, compressão e feedback)
  - no servidor (validação de metadados e verificação no storage antes de gravar no banco)
- **Sem galeria pública**: bucket privado e painel separado.
- **Admin protegido**: autenticação Supabase Auth + middleware em `/admin`.
- **Service role apenas no backend**: usada para assinar upload, listar, gerar links e excluir com segurança.

---

## Fluxo de upload (resumo)

1. Convidado seleciona fotos no celular.
2. Frontend valida quantidade/tamanho e tenta otimizar/comprimir.
3. Frontend chama `POST /api/upload` com `mode: "init"`.
4. Backend valida regras e devolve tokens/paths assinados.
5. Frontend envia cada arquivo direto para o Supabase Storage (URL assinada).
6. Frontend chama `POST /api/upload` com `mode: "complete"`.
7. Backend confirma objetos no storage, valida tipo/tamanho e grava metadados em `uploads_evento`.

---

## Pontos de segurança aplicados

- Sem exposição de `service_role` no frontend
- Bucket privado
- Sem listagem pública de arquivos
- Rota admin protegida
- Validação de MIME/extensão/tamanho no backend
- Controle de quantidade por envio
- Fingerprint antiabuso simples (IP + User-Agent hash)
- Exclusão no admin remove arquivo + registro

---

## Limitações atuais (V1)

- Sem vídeos (apenas imagens)
- Antiabuso básico (não substitui WAF/CAPTCHA avançado)
- Conversão HEIC depende do navegador e do dispositivo
- Não há galeria pública por design
- Sem paginação avançada no admin (lista até 300 registros por carregamento)

---

## Como personalizar depois

### Textos do evento

Edite [`lib/constants.ts`](./lib/constants.ts):

- nome da aniversariante
- título/subtítulo
- texto do botão
- mensagens de sucesso/rodapé

### Cores e estética

- Tokens de cor: [`tailwind.config.ts`](./tailwind.config.ts)
- Estilos globais e componentes visuais: [`app/globals.css`](./app/globals.css)
- Layout hero/página pública: [`app/page.tsx`](./app/page.tsx)

### Limites de upload

Edite [`lib/constants.ts`](./lib/constants.ts):

- `maxFilesPerRequest`
- `maxFileSizeBytes`
- limites antiabuso

### Bucket/storage

- Nome do bucket: `SUPABASE_STORAGE_BUCKET`
- Políticas: [`sql/supabase.sql`](./sql/supabase.sql)

---

## Melhorias futuras sugeridas

1. Adicionar paginação e ordenação no admin.
2. Criar tags/álbuns por momento da festa.
3. Incluir reCAPTCHA/Turnstile para endurecer anti-spam.
4. Adicionar exportação em lote (ZIP) no admin.
5. Implementar dashboard simples com métricas de uploads.
6. Personalização visual por tema de evento via arquivo de config.

---

## Observação de validação local

Neste ambiente não foi possível concluir `npm install` (timeout), então lint/build não foram executados aqui. O código foi estruturado para produção e pronto para validação local assim que as dependências forem instaladas no seu ambiente.
