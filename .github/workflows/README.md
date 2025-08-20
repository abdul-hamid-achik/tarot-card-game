# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD and database management.

## Workflows

### 1. CI & Deploy to Vercel (`ci.yml`)

**Triggers:**
- Push to `main` branch
- Manual trigger via workflow dispatch

**What it does:**
- Installs dependencies
- Runs linting (`npm run lint`)
- Builds all packages (`npm run build:deps`)
- Runs tests (`npm run test`)
- Builds web and docs apps
- Runs web E2E tests (`npm run -w @tarot/web test`)
- Deploys both apps to Vercel

**Required Secrets:**
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_WEB_PROJECT_ID` - Vercel project ID for the web app
- `VERCEL_DOCS_PROJECT_ID` - Vercel project ID for the docs app

### 2. PR Preview Deployment (`pr.yml`)

**Triggers:**
- Pull request opened, reopened, or synchronized

**What it does:**
- Runs tests and builds both apps
- Creates Vercel preview deployments for both web and docs apps
- Comments on the PR with preview URLs
- Automatically updates previews when new changes are pushed

**Required Secrets:**
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_WEB_PROJECT_ID` - Vercel project ID for the web app
- `VERCEL_DOCS_PROJECT_ID` - Vercel project ID for the docs app
- `GITHUB_TOKEN` - GitHub token (automatically provided)

## Setup Instructions

### Vercel Setup

1. Go to [Vercel](https://vercel.com) and create two projects:
   - One for `apps/web` (main app)
   - One for `apps/docs` (documentation)

2. In GitHub repository settings, add the following secrets:
   - `VERCEL_TOKEN`: Get from Vercel → Settings → Tokens
   - `VERCEL_ORG_ID`: Get from Vercel → Settings → General → Team ID
   - `VERCEL_WEB_PROJECT_ID`: Get from your web project settings
   - `VERCEL_DOCS_PROJECT_ID`: Get from your docs project settings



## Workflow Features

- **Concurrency control** prevents multiple workflows from running simultaneously
- **Proper permissions** for PR comments and content access
- **Automatic preview deployments** for each PR with Vercel
- **PR comments** with direct links to preview environments
- **Monorepo support** with workspace-specific builds and deployments
