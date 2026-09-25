# Natatki

Note-taking application designed to help users capture, organize, and enhance their ideas and notes. Leveraging AI models, the app automatically categorizes notes. It integrates with GitHub repositories to suggest practical applications of ideas and generates actionable change plans in Markdown format.

## Architecture

This is a monorepo containing:

- **`packages/shared`** - Shared TypeScript types and utilities
- **`packages/backend`** - Express.js API server for GitHub integration and AI enrichment
- **`packages/mobile`** - React Native mobile app (iOS/Android) with offline-first support
- **`packages/web`** - Next.js web client with modern UI

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- For mobile: React Native development environment (Xcode for iOS, Android Studio for Android)
- GitHub OAuth App credentials

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Backend setup:**
   ```bash
   cd packages/backend
   cp .env.example .env
   # Edit .env with your GitHub OAuth credentials
   npm run dev
   ```

3. **Web client setup:**
   ```bash
   cd packages/web
   npm install
   # Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:3001/api
   npm run dev
   ```

4. **Mobile app setup:**
   ```bash
   cd packages/mobile
   npm install
   # Dependencies are automatically linked via postinstall script
   # If linking fails, run: npm run setup:dependencies
   # For iOS:
   cd ios && pod install && cd ..
   npm run ios
   # For Android:
   npm run android
   ```

## Features

### Level 1: Basic Functionality ✅
- Create, edit, and list notes
- Offline-first storage (WatermelonDB)
- Sync with GitHub repository
- AI-powered categorization and enrichment
- Tags and categories

### Level 2: Repository Integration (Planned)
- Analyze existing GitHub repositories
- Suggest where notes can be applied
- Repository recommendations

### Level 3: Plan Generation (Planned)
- Generate Markdown plans for target repositories
- Commit plans to repositories
- Pull Request automation

## Project Structure

```
natatki/
├── packages/
│   ├── shared/          # Shared types and utilities
│   ├── backend/         # Express API server
│   ├── web/             # Next.js web client
│   └── mobile/          # React Native app
├── plans/               # Project planning documents
└── research/            # Research notes
```

## Development

### Building

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=backend
npm run build --workspace=shared
```

### Running

```bash
# Backend
npm run dev --workspace=backend

# Mobile
npm run start --workspace=mobile
npm run ios --workspace=mobile
npm run android --workspace=mobile
```

## Configuration

### Backend Environment Variables

See `packages/backend/.env.example` for required configuration:
- `GITHUB_CLIENT_ID` - GitHub OAuth App Client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth App Client Secret
- `DEFAULT_DATA_REPO_OWNER` - GitHub username for data repository
- `DEFAULT_DATA_REPO_NAME` - Name of the data repository (default: `natatki-data`)

### Mobile Configuration

Update `packages/mobile/src/api/client.ts` to set the backend API URL:
- Development: `http://localhost:3001/api`
- Production: Your production API URL

## Implementation Status

- [x] Chunk 0: Foundations (schemas, types, API contracts)
- [x] Chunk 1: Mobile Offline Notes (basic CRUD)
- [x] Chunk 2: Sync Engine v1 (GitHub Contents API integration)
- [x] Chunk 3: AI Enrichment v1 (GitHub Models integration)
- [ ] Chunk 4: Level 2 Repo Analysis
- [ ] Chunk 5: Level 3 Plan Generation
- [ ] Chunk 6: Hardening (conflicts, attachments, observability)

## License

MIT
