# Tutly

Learning Management System (LMS) with attendance tracking, assignment management, interactive code playgrounds, real-time notifications, and many more.

## Links

- 🏠 Landing Page: [https://www.tutly.in](https://www.tutly.in)
- 📚 Learning Platform: [https://learn.tutly.in](https://learn.tutly.in)
- 📄 Documentation: [https://docs.tutly.in](https://docs.tutly.in)
- 📊 Status: [https://tutly.statuspage.io/](https://tutly.statuspage.io/)

## Project Structure

```text
.github
  └─ workflows
        └─ CI with pnpm cache setup
.vscode
  └─ Recommended extensions and settings for VSCode users
apps
  └─ web
      ├─ Next.js 15
      ├─ React 19
      └─ Tailwind CSS v4
packages
  ├─ api
  |   └─ tRPC v11 router definition
  ├─ auth
  |   └─ Custom authentication
  ├─ db
  |   └─ Typesafe db calls using Prisma
  ├─ ui
  |   └─ UI components using shadcn-ui
  └─ validators
      └─ Shared validation schemas
tooling
  ├─ eslint
  |   └─ shared, fine-grained, eslint presets
  ├─ prettier
  |   └─ shared prettier configuration
  ├─ tailwind
  |   └─ shared tailwind configuration
  └─ typescript
      └─ shared tsconfig you can extend from
```

## Getting Started

### Prerequisites

- **Node.js**: v22.x (specified in `.nvmrc`)
- **pnpm**: >= 9.6.0 (or `corepack enable pnpm`)
- **Docker** & **Docker Compose**: For running local services (PostgreSQL 17, MinIO, Redis)

### Installation and Development Setup

1. Fork and clone the repository:

```bash
git clone https://github.com/yourusername/tutly.git
cd tutly
```

2. Set up the development environment:

```bash
make setup
```

This will:
- Check required system tools (`node`, `pnpm`, `docker`)
- Copy `.env.example` to `.env` (if not already present)
- Install workspace dependencies (`pnpm install`)
- Start local Docker infrastructure services (PostgreSQL, MinIO for S3, Redis)
- Generate Prisma client & push database schema
- Seed initial development data

3. Start the development server:

```bash
make dev
```

The web application will be available at `http://localhost:3000`.

### Useful Commands

| Command | Description |
| ------- | ----------- |
| `make help` | Display available Make targets and descriptions |
| `make setup` | Run full local environment setup |
| `make dev` | Start web application development server |
| `make start` | Start infrastructure services and launch dev server |
| `make stop` | Stop local infrastructure services and dev background tasks |
| `make restart` | Restart infrastructure services |
| `make status` | View container status and database connection health |
| `make logs` | Stream logs from local infrastructure containers |
| `make studio` | Open Prisma Studio GUI for database management |
| `make db-up` | Start local Docker services (PostgreSQL, MinIO, Redis) |
| `make db-down` | Stop local Docker services |
| `make db-migrate` | Generate Prisma client and push schema updates |
| `make db-seed` | Load initial dummy data into database |
| `make db-reset` | Force reset database schema and re-seed |
| `make build` | Build all monorepo packages |
| `make clean` | Stop containers and remove local Docker volumes |

## License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

The GNU Affero General Public License is a free, copyleft license for software and other kinds of works, specifically designed to ensure cooperation with the community in the case of network server software.

Key points of the license:

- You are free to use and modify the software for personal use
- Distribution of the software is not permitted
- You must preserve the license and copyright notices
- You must state significant changes made to the code
- The license applies to the entire work, including all its parts

For more information about the license, visit [https://www.gnu.org/licenses/agpl-3.0.html](https://www.gnu.org/licenses/agpl-3.0.html)
