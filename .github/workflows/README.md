# GitHub Actions Workflows for Vercel Deployment

This directory contains GitHub Actions workflows that automatically deploy your apps to Vercel with preview deployments only.

## Overview

The workflows are designed to:

- **Only deploy preview deployments** (no production deployments)
- **Use path-based triggers** so each app only deploys when its specific files change
- **Leverage your existing Turbo monorepo setup** with pnpm

## Workflows

### 1. `deploy-web-preview.yml`

Deploys the web app when changes are made to:

- `apps/web/**` - Web app files
- `packages/**` - Shared packages
- `tooling/**` - Build tools
- Root configuration files

### 2. `deploy-landing-preview.yml`

Deploys the landing app when changes are made to:

- `apps/landing/**` - Landing app files
- `packages/**` - Shared packages
- `tooling/**` - Build tools
- Root configuration files

### 3. `deploy-api-preview.yml`

Deploys the API app when changes are made to:

- `apps/api/**` - API app files
- `packages/**` - Shared packages
- `tooling/**` - Build tools
- Root configuration files

## Setup Instructions

### 1. Create Vercel Projects

For each app, you need to create a separate Vercel project:

```bash
# For web app
cd apps/web
vercel link

# For landing app
cd apps/landing
vercel link

# For API app
cd apps/api
vercel link
```

### 2. Get Project IDs

After linking, check the `.vercel/project.json` file in each app directory to get the `projectId` and `orgId`.

### 3. Add GitHub Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

- `VERCEL_TOKEN` - Your Vercel access token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID_WEB` - Web app project ID
- `VERCEL_PROJECT_ID_LANDING` - Landing app project ID
- `VERCEL_PROJECT_ID_API` - API app project ID

### 4. Configure Vercel

Each app needs a `vercel.json` configuration file. Create one in each app directory:

**apps/web/vercel.json:**

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

**apps/landing/vercel.json:**

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

**apps/api/vercel.json:**

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "framework": null
}
```

## How It Works

1. **Path-based triggers**: Each workflow only runs when files in its specific app directory change
2. **Preview only**: All deployments are preview deployments (no production)
3. **Monorepo aware**: Uses Turbo to build only the specific app that changed
4. **Prebuilt deployment**: Builds locally and uploads artifacts to Vercel

## Benefits

- **Cost effective**: Only deploys what's necessary
- **Faster deployments**: Path-based triggers prevent unnecessary builds
- **Better control**: Full control over the CI/CD pipeline
- **Preview URLs**: Every PR gets a preview deployment automatically
- **No source code exposure**: Only build artifacts are uploaded to Vercel

## Troubleshooting

### Workflow not triggering

- Check that the file paths in your commit match the workflow's `paths` filter
- Ensure you're not pushing to `main` or `master` branches

### Build failures

- Verify that each app has the correct `vercel.json` configuration
- Check that the build command works locally: `pnpm build --filter=<app-name>`

### Deployment failures

- Verify all GitHub secrets are correctly set
- Check that the Vercel project IDs match the linked projects
- Ensure the Vercel token has the necessary permissions
