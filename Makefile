SHELL := /bin/bash

# Configuration & Paths
COMPOSE_FILE := docker-compose.local.yml
PNPM := pnpm
DOCKER := docker
DOCKER_COMPOSE := $(DOCKER) compose -f $(COMPOSE_FILE)

# Default target
.DEFAULT_GOAL := help

.PHONY: help setup init up install env build dev start stop down restart logs status clean \
        db-up db-down db-migrate db-seed db-reset studio db-studio services services-down check-deps check-env check-db

## help: Display available Make targets and descriptions
help:
	@echo ""
	@echo "  ========================================================"
	@echo "    Tutly Local Development Environment Makefile"
	@echo "  ========================================================"
	@echo ""
	@echo "  Usage: make [target]"
	@echo ""
	@echo "  Main Targets:"
	@echo "    setup       Run full local setup (env, install, db-up, db-migrate, db-seed)"
	@echo "    dev         Start the development server (Next.js app)"
	@echo "    start       Start infrastructure services and launch dev server"
	@echo "    stop        Stop local infrastructure services and dev background tasks"
	@echo "    restart     Restart local infrastructure containers"
	@echo "    status      Show status of infrastructure services and database"
	@echo "    logs        Stream logs from local infrastructure containers"
	@echo "    build       Build all monorepo packages and applications"
	@echo "    install     Install workspace dependencies via pnpm"
	@echo "    env         Create .env from .env.example if missing"
	@echo "    clean       Stop containers and clean Docker volumes"
	@echo ""
	@echo "  Database Targets:"
	@echo "    db-up       Start PostgreSQL, MinIO, Redis containers"
	@echo "    db-down     Stop PostgreSQL, MinIO, Redis containers"
	@echo "    db-migrate  Generate Prisma client and push schema to database"
	@echo "    db-seed     Load initial dummy data into database"
	@echo "    db-reset    Reset database schema and re-seed dummy data"
	@echo "    studio      Open Prisma Studio database management GUI"
	@echo ""
	@echo "  Aliases:"
	@echo "    up, init    Alias for 'make setup'"
	@echo "    down        Alias for 'make stop'"
	@echo "    services    Alias for 'make db-up'"
	@echo ""

## check-deps: Verify that required tools (node, pnpm, docker) are installed
check-deps:
	@command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required but not installed."; exit 1; }
	@command -v $(PNPM) >/dev/null 2>&1 || { echo "Error: pnpm is required but not installed."; exit 1; }
	@command -v $(DOCKER) >/dev/null 2>&1 || { echo "Error: Docker is required but not installed."; exit 1; }
	@$(DOCKER_COMPOSE) version >/dev/null 2>&1 || { echo "Error: Docker Compose is required but not installed."; exit 1; }

## env: Copy .env.example to .env if .env does not already exist
env:
	@if [ ! -f .env ]; then \
		echo "Creating .env from .env.example..."; \
		cp .env.example .env; \
		echo ".env created successfully."; \
	else \
		echo ".env already exists, skipping copy."; \
	fi

check-env: env

## install: Install all dependencies using pnpm
install: check-deps
	@echo "Installing workspace dependencies..."
	$(PNPM) install

## db-up: Start local infrastructure containers (PostgreSQL, MinIO, Redis)
db-up: check-deps
	@echo "Starting local infrastructure services..."
	$(DOCKER_COMPOSE) up -d
	@echo "All infrastructure services are started."

services: db-up

## db-down: Stop local infrastructure containers
db-down: check-deps
	@echo "Stopping infrastructure services..."
	$(DOCKER_COMPOSE) down

services-down: db-down

## db-migrate: Generate Prisma client and push schema to database
db-migrate: env check-deps
	@echo "Generating Prisma Client and pushing database schema..."
	$(PNPM) --filter @tutly/db db:generate
	$(PNPM) --filter @tutly/db db:push

## db-seed: Seed database with initial dummy data
db-seed: env check-deps
	@echo "Loading initial seed data into database..."
	$(PNPM) --filter @tutly/db db:seed

## db-reset: Force reset database schema and re-seed data
db-reset: env check-deps
	@echo "Resetting database schema and re-seeding..."
	$(PNPM) --filter @tutly/db exec prisma db push --force-reset
	$(PNPM) --filter @tutly/db db:seed

## studio: Start Prisma Studio for database browsing
studio: env check-deps
	@echo "Starting Prisma Studio..."
	$(PNPM) --filter @tutly/db db:studio

db-studio: studio

## setup: Perform complete local development environment setup
setup: check-deps env install db-up db-migrate db-seed
	@echo ""
	@echo "========================================================"
	@echo "  Tutly local setup completed successfully!"
	@echo "========================================================"
	@echo ""
	@echo "  Run 'make dev' to start the web application."
	@echo "  Run 'make studio' to open Prisma Studio."
	@echo ""

init: setup
up: setup

## dev: Start the web application in development mode
dev: check-deps env
	@echo "Starting development server..."
	$(PNPM) run dev:web

## start: Start infrastructure services and launch dev server
start: db-up dev

## stop: Stop infrastructure services and background studio processes
stop: db-down
	@pkill -f "prisma studio" 2>/dev/null || true
	@echo "All local services stopped."

down: stop

## restart: Restart infrastructure containers
restart: check-deps
	@echo "Restarting infrastructure containers..."
	$(DOCKER_COMPOSE) restart

## logs: View logs from infrastructure containers
logs: check-deps
	$(DOCKER_COMPOSE) logs -f

## check-db: Verify database connection and reporting status
check-db: env check-deps
	@echo "Checking database connection..."
	@if $(PNPM) --filter @tutly/db exec prisma db execute --stdin <<< "SELECT 1" >/dev/null 2>&1; then \
		echo "Database connection successful."; \
	else \
		echo "Database connection failed. Run 'make db-up' and 'make db-migrate'."; \
		exit 1; \
	fi

## status: Show status of infrastructure services and database
status: check-deps
	@echo "--- Container Status ---"
	@$(DOCKER_COMPOSE) ps
	@echo ""
	@echo "--- Database Status ---"
	@$(MAKE) check-db

## build: Build all monorepo workspace packages
build: check-deps
	@echo "Building all workspace packages..."
	$(PNPM) run build

## clean: Stop infrastructure containers and remove volumes
clean: check-deps
	@echo "Cleaning local infrastructure containers and volumes..."
	$(DOCKER_COMPOSE) down -v
	@rm -rf data/localstack
	@echo "Clean completed."