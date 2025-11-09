# Codeix

AI-powered code assistant with E2B sandbox integration.

## Prerequisites

This project uses [Bun](https://bun.sh) - make sure you have it installed:

```bash
curl -fsSL https://bun.sh/install | bash
```

## Setup

### 1. Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database (Required)
DATABASE_URL="your_database_url_here"

# Authentication (Required)
BETTER_AUTH_SECRET="any_random_string_here"
BETTER_AUTH_URL="http://localhost:3000"

# AI & E2B (Required)
AI_GATEWAY_API_KEY="your_ai_gateway_key_here"
E2B_API_KEY="your_e2b_api_key_here"
```

### 2. Database Setup

Push the database schema:

```bash
bun run db:push
```

### 3. Build E2B Template

Build the production E2B template:

```bash
bun run e2b:build:prod
```

### 4. Run Development Server

Start the development server:

```bash
bun run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run db:push` - Push database schema
- `bun run db:studio` - Open Prisma Studio
- `bun run e2b:build:dev` - Build E2B template for development
- `bun run e2b:build:prod` - Build E2B template for production

## Getting API Keys

- **DATABASE_URL**: Get from your database provider (e.g., [Neon](https://neon.tech), [PlanetScale](https://planetscale.com), [Supabase](https://supabase.com))
- **E2B_API_KEY**: Sign up at [e2b.dev](https://e2b.dev) and get your key from the [dashboard](https://e2b.dev/dashboard)
- **AI_GATEWAY_API_KEY**: Get from your AI provider

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Prisma (Database ORM)
- Better Auth (Authentication)
- E2B (Code Sandbox)
- Tailwind CSS
- Shadcn UI
- tRPC

