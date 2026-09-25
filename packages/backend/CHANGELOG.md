# Changelog

## 0.1.0 (2026-01-05)

### Added
- Express.js API server
- GitHub OAuth authentication
- Notes CRUD endpoints with GitHub Contents API integration
- AI enrichment using GitHub Models
- Sync queue management
- Repository analysis (Level 2)
- Plan generation (Level 3)
- Rate limit handling and conditional requests
- Error handling and retry logic

### Technical Details
- Uses GitHub Contents API for file storage
- Implements conditional requests (ETag/If-None-Match) for caching
- Serializes write operations to avoid conflicts
- Supports offline-first sync queue

