# Contributing to Tutly

Thank you for your interest in contributing to Tutly! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Code Style and Quality](#code-style-and-quality)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [License](#license)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: >= 22.14.0
- **pnpm**: >= 9.6.0
- **Docker** and **Docker Compose**: For running local services (PostgreSQL and Localstack)

## Development Setup

1. **Fork the repository** on GitHub

2. **Clone your forked repository**:
   ```bash
   git clone https://github.com/yourusername/tutly.git
   cd tutly
   ```

3. **Set up the development environment**:
   ```bash
   make up
   ```
   
   This command will:
   - Copy the example environment file to `.env`
   - Install all dependencies
   - Set up local Docker services (PostgreSQL and Localstack for S3)
   - Initialize the database schema
   - Load initial dummy data

4. **Start the development server**:
   ```bash
   make dev
   ```
   
   The application will be available at `http://localhost:3000`

### Useful Commands

The project provides several Make commands for common tasks:

- `make dev` - Start the development server
- `make studio` - Open Prisma Studio for database management
- `make down` - Stop all services
- `make clean` - Clean all services, volumes, and .env
- `make init` - Re-initialize the project (after cleaning)

### Additional npm Scripts

- `pnpm dev` - Run all workspaces in development mode
- `pnpm dev:web` - Run only the web application
- `pnpm build` - Build all packages
- `pnpm lint` - Run ESLint on all packages
- `pnpm lint:fix` - Fix ESLint errors automatically
- `pnpm format` - Check code formatting with Prettier
- `pnpm format:fix` - Fix formatting issues
- `pnpm typecheck` - Run TypeScript type checking

## Development Workflow

1. **Create a new branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   or
   ```bash
   git checkout -b fix/your-bugfix-name
   ```

2. **Make your changes** following the code style guidelines

3. **Test your changes** locally:
   - Run the development server and verify your changes work
   - Run linting: `pnpm lint`
   - Run type checking: `pnpm typecheck`
   - Run formatting: `pnpm format`

4. **Commit your changes** with clear and descriptive commit messages

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** against the main repository

## Code Style and Quality

This project uses several tools to maintain code quality:

### ESLint
The project uses custom ESLint configurations.

Run ESLint:
```bash
pnpm lint
pnpm lint:fix  # To automatically fix issues
```

### Prettier
The project uses a shared Prettier configuration for consistent formatting.

Format your code:
```bash
pnpm format
pnpm format:fix  # To automatically format files
```

### TypeScript
The project uses shared TypeScript configurations.

Run type checking:
```bash
pnpm typecheck
```

## Commit Guidelines

- Write clear, concise commit messages
- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Reference issues and pull requests when relevant
- Keep commits focused on a single change

## Pull Request Process

1. **Ensure your code follows the project's code style** by running:
   ```bash
   pnpm lint:fix
   pnpm format:fix
   pnpm typecheck
   ```

2. **Update documentation** if you're adding new features or changing behavior

3. **Provide a clear PR description** that includes:
   - What changes you made
   - Why you made them
   - Any relevant issue numbers
   - Screenshots (if applicable for UI changes)

4. **Ensure your PR**:
   - Passes all checks
   - Doesn't introduce breaking changes (or clearly documents them)
   - Has been tested locally

5. **Be responsive** to feedback and make requested changes promptly

## Project Structure

The project follows a monorepo structure using Turborepo:

```
apps/
  ├─ web/          # Main Next.js application
  ├─ landing/      # Landing page
  ├─ docs/         # Documentation site
  └─ api/          # API services

packages/
  ├─ api/          # tRPC router definitions
  ├─ auth/         # Custom authentication
  ├─ db/           # Prisma database configuration
  ├─ ui/           # Shared UI components (shadcn-ui)
  └─ validators/   # Shared validation schemas

tooling/
  ├─ eslint/       # ESLint configurations
  ├─ prettier/     # Prettier configuration
  ├─ tailwind/     # Tailwind CSS configuration
  └─ typescript/   # TypeScript configurations
```

## License

This project is licensed under the **GNU Affero General Public License v3.0**.

By contributing to this project, you agree that your contributions will be licensed under the same license.

Key points:
- You are free to use and modify the software for personal use
- Distribution of the software is not permitted
- You must preserve the license and copyright notices
- You must state significant changes made to the code
- The license applies to the entire work, including all its parts

---

## Questions?

If you have any questions or need help, feel free to:
- Open an issue on GitHub
- Check the [documentation](https://docs.tutly.in)
- Visit the [project homepage](https://www.tutly.in)

Thank you for contributing to Tutly! 🎉
