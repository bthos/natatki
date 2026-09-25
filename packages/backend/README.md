# @natatki/backend

Backend API server for natatki application.

## Setup

1. Copy `.env.example` to `.env` and fill in your GitHub OAuth credentials
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Run: `npm run dev` (development) or `npm start` (production)

## API Endpoints

### Authentication
- `GET /api/auth/github` - Initiate GitHub OAuth flow
- `GET /api/auth/github/callback` - OAuth callback

### Notes
- `GET /api/notes` - Get all notes
- `POST /api/notes` - Create a new note
- `PUT /api/notes/:id` - Update a note

### AI Enrichment
- `POST /api/ai/enrich` - Enrich a note with AI-generated metadata

### Sync
- `GET /api/sync/status` - Get sync queue status

## Environment Variables

See `.env.example` for required configuration.

