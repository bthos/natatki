# Natatki: fix and development plan

Status: 2026-09-25. Based on the source pushed to `bthos/natatki` (`ae65e35`), the note
history in `bthos/natatki-data`, and the PRD in `plans/initial-requirements-for-natatki-app.md`.
Line references are to the code as of this plan.

## 0. What the code is

npm-workspaces monorepo:

| Package | Stack | Role |
|---------|-------|------|
| `packages/shared` | TypeScript | Note types, Markdown/front-matter (de)serializer, API types |
| `packages/backend` | Express, axios | `/api/notes`, `/api/ai/enrich`, `/api/repos/analyze`, `/api/plans`, OAuth; writes to the data repo through the GitHub Contents API, in either `oauth` mode (user token) or `app` mode (GitHub App installation token = `natatki[bot]`) |
| `packages/web` | Next.js 14, zustand | Notes list/editor, repo suggestions, GitHub OAuth login |
| `packages/mobile` | **bare React Native 0.74.5** (not Expo), WatermelonDB, react-navigation | Offline notes list/editor, sync service, repo suggestions |

AI calls go to GitHub Models (`models.github.ai`) and always use the **user's** token.

## 1. Done in this branch (`claude/wonderful-tesla-jxk3ff`)

- **APK built on GitHub.** `.github/workflows/android-apk.yml` builds a standalone release
  APK (JS bundled, Hermes, arm64) on every push that touches mobile or shared code, on PRs,
  on `v*` tags (attached to the Release) and manually (*Actions → Android APK → Run
  workflow*, where you can pick the ABIs). You download it from the run's **Artifacts**.
  - Repo **variable** `NATATKI_API_URL`: the backend URL baked into the APK. Without it the
    release build points at `https://api.natatki.app/api` (`src/api/client.ts`).
  - Repo **secrets** `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`,
    `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`: an optional real release key. Without
    them the committed debug key signs, which is fine for sideloading. `versionCode` is
    the run number, so each APK installs over the previous one.
- **`.github/workflows/ci.yml`** runs typecheck (all 4 packages), tests, and the backend and
  web builds on PRs and on `main`.
- Things that blocked a CI build:
  - `gradle.properties` hard-coded a Windows `org.gradle.java.home`;
  - `gradlew` was not executable;
  - the `android:build` scripts called `gradlew.bat`;
  - `shared` must be built before bundling (`npm run build:shared`).
- **Web build fixed:** there were two Reacts in the tree (web wanted 18.3.1, mobile hoisted
  18.2.0), so `next build` crashed while prerendering. Web is pinned to 18.2.0.
- **Type errors fixed:**
  - backend `Note` import (`routes/notes.ts`) and a null check (`routes/repos.ts`);
  - web: `UpdateNoteRequest` now allows `null` to clear a field;
  - mobile: `experimentalDecorators` was missing. `Note.syncStatus` shadowed WatermelonDB
    `Model.syncStatus` and is renamed to `localSyncStatus` (same DB column).
- **Removed debug instrumentation** in `index.js`, `App.tsx` and `database/index.ts`. It
  POSTed to `127.0.0.1:7245` on every start.

## 2. Bugs still open (ranked)

| # | Bug | Where | Effect |
|---|-----|-------|--------|
| **B1** | **Mobile has no login.** `apiClient.setAccessToken` is never called, so every request goes out without `Authorization`. In `oauth` mode everything returns 401. In `app` mode notes work, but `/ai/enrich` and repo analysis still return 401 (`getAIAccessToken` needs a user token). | `mobile/src/api/client.ts`, `backend/src/utils/auth-helper.ts` | The mobile app can't sync in oauth mode and can never enrich |
| **B2** | **In `app` mode the backend has no authentication.** Anyone who can reach the server can read, write and delete notes with the installation token. | `auth-helper.ts:getAccessToken` | Security: data exposure once deployed |
| **B3** | **Lost updates drop title, tags and category.** Clients send every field from their own copy. After a server-side enrichment that copy is stale, so saving writes `title: null, tags: [...old]` over the enriched values. This matches natatki-data commits `357992b`, `4f6266d`, `9dd9fa6`. There's no version check (sha or `updatedAt`). | `web/.../NoteEditor.tsx:48`, `mobile/.../sync-service.ts:95`, `backend/routes/notes.ts` PUT | Data loss |
| **B4** | **Enrichment always replaces the title** (`title: enrichment.suggestedTitle \|\| note.title`). It also uses `temperature 0.7`, and two different models (`gpt-5-mini` and `gpt-4o-mini`). | `backend/routes/ai.ts:96`, `services/ai-service.ts:37,119` | Titles change on every run |
| **B5** | **File-name collisions.** The name uses the first 8 digits of the ms timestamp (about 100 s resolution), so two notes created close together get the same path. It already happened on 2026-01-08. | `shared/utils/note-utils.ts:generateNoteFilename` | A create fails, or a note is overwritten |
| **B6** | **Mobile creates duplicates.** The server generates a new `id` on create, but the local note keeps its own `noteId`. The next pull inserts the server copy as a second note, and `githubPath` is set to a wrong path (`notes/<id>.md`). | `mobile/services/sync-service.ts:101-110` | Every mobile-created note appears twice |
| **B7** | **Pull overwrites unsynced local edits** and marks them `synced`. Notes deleted on the server are never removed locally. WatermelonDB also rewrites `updated_at` on every update, so server timestamps are lost. | `sync-service.ts:pullNotes` | Offline edits lost |
| **B8** | **Every update and delete reads every note.** PUT and DELETE list `notes/` and GET each file until the id matches: N+1 API calls per save. Worse, a file without front matter falls back to the *requested* id (`markdownToNote(content, noteId)`), so a stray file can "match" and be overwritten or deleted. | `backend/routes/notes.ts:300-325, 420-440` | Rate limits; possibly deleting the wrong file |
| **B9** | **The serializer isn't safe.** Strings are wrapped in `"…"` without escaping, so a `"` or a newline in a title or summary corrupts the front matter. The parser needs exactly `---\n…\n---\n\n` (no CRLF, no missing blank line). Files without front matter get `createdAt = now` on every read. | `shared/utils/note-utils.ts` | Corrupt or re-dated notes |
| **B10** | **Mobile errors lose their code.** `handleError` is never used, so `error.code === 'RATE_LIMIT_EXCEEDED'` never matches. The token is loaded asynchronously in the constructor, so early requests race it. | `mobile/src/api/client.ts` | No rate-limit backoff |
| **B11** | **Server state lives in memory** (`notesCache`, `SyncQueue`, OAuth sessions), and `SESSION_SECRET` defaults to `change-me-in-production`. | backend | Lost on restart; weak default |
| **B12** | **Android project drift:** Flipper (removed in RN 0.74) is still wired in; `@react-native/babel-preset` and `metro-config` are at 0.76 while RN is 0.74; `prepare-build.sh` and the postinstall symlink script are workarounds for hoisting; `debug.keystore` is tracked although `.gitignore` excludes it. | `packages/mobile/android`, `package.json` | Fragile builds |
| **B13** | **No tests and no ESLint config.** `eslint .` fails because there's no config, and `next lint` prompts interactively. | all | No safety net |
| B14 | Data repo hygiene: a prompt YAML inside `notes/`, an extensionless note (`notes/note_1767876830012_ikpxsaf`), and one commit per autosave (10 in 70 s). | natatki-data | Clutter |

## 3. Milestones

Each milestone goes through the talaka pipeline: `/requirements-eliciting` →
`/architecture-planning` → `@bagnik` test gate → `@cmok` → `@bagnik` code QA → `@zlydni`.
Every PR gets an installable APK from the Android APK workflow.

### M1: an APK you can use on the phone (next)
1. Decide where the backend runs for testing (see open question Q1), then set `NATATKI_API_URL`.
2. **Mobile login (B1):** GitHub OAuth device flow, or an app-link redirect to
   `/api/auth/github/callback`, with the token stored in Keychain. Add a server-URL
   override on a small Settings screen, so one APK can point at different backends.
3. **Backend auth in app mode (B2):** require a user token on every route, check that the
   user can access `owner/repo`, then use the installation token for writes.
4. Smoke test on the phone: log in, create, edit, enrich, delete.

### M2: note format and storage correctness
1. Test the `shared` serializer first: round-trips, quotes and newlines, CRLF, and every
   historical file shape in natatki-data (B9). Emit JSON-quoted strings (valid YAML), put
   `createdAt` in front matter, and keep unknown keys.
2. Unique file names `YYYY-MM-DD-<full id>.md`, plus a migration script for existing files (B5).
3. The id-to-path map comes from `metadata.json` or a cached listing. PUT and DELETE take
   `path + sha` from the client. Never fall back to the requested id when matching (B8).
4. **Optimistic concurrency (B3):** the client sends `baseSha`. The server returns 409 on
   a mismatch, and the client merges only the fields that actually changed (a PATCH-style
   request with only dirty fields).
5. **Enrichment rules (B4):** never overwrite a title the user set (show it as a
   suggestion instead); merge tags; one model, `temperature: 0`; answer in the note's
   language (notes are be/ru/en); skip when the body hash is unchanged.

### M3: mobile offline sync that doesn't lose data
1. **Client-generated ids are authoritative:** the server accepts the `id` from the client
   when creating (B6).
2. Pull respects local `pending` and `error` notes (conflict → keep both), removes
   tombstoned notes, and stores server timestamps in their own columns (B7).
3. Debounce and batch pushes, so there's one commit per sync burst (B14), using the Git
   Data API (tree + commit) for multi-note writes.
4. Route errors through `handleError` and add retry/backoff on `retryAfter` (B10).

### M4: hardening
- Persist server state (a SQLite or KV store) and require `SESSION_SECRET` in production (B11).
- Android cleanup (B12): remove Flipper, align `@react-native/*` to 0.74, drop the symlink
  scripts where possible, and put a real release keystore in secrets.
- ESLint configs for all packages, and add lint to CI (B13).
- Security review of the backend (token handling, CORS `*`, input validation with zod).

### M5+: PRD features (by value)
1. Quick capture: Android share-sheet target and a home-screen widget (PRD level 1).
2. Photo and audio attachments (the schema and types already exist, nothing uses them).
3. Search and filters over the local DB (partly exists in `NotesListScreen`).
4. Repo matching and plan generation on mobile (PRD levels 2–3). The backend routes exist;
   they need auth and caching.
5. Push notifications (FCM), and opening a PR from a plan.
6. iOS builds via a macOS runner (later; iOS can't be sideloaded like an APK).

## 4. Testing APKs
1. Push to any branch (or open a PR) that touches `packages/mobile` or `packages/shared`.
2. *Actions → Android APK →* the run *→ Artifacts →* `natatki-<version>-<sha>.apk`
   (downloads as a zip; unzip it on the phone or PC).
3. For a stable link, push a tag `vX.Y.Z`. The APK is attached to that GitHub Release and
   can be opened directly on the phone.

## 5. Open questions
- **Q1** Where will the backend run for phone testing? Options: a small always-on host
  (Fly.io, Render or a VPS), or a tunnel to your PC (cloudflared or ngrok). The APK only
  needs the URL.
- **Q2** Which mode: keep `app` mode (bot commits, needs B2 fixed), or move to
  user-token-only `oauth` mode (simpler, and commits show as you)?
- **Q3** Is iOS in scope soon, or Android-only for now?

## 6. Talaka
- The submodule is at `talaka/`. After cloning, run `git submodule update --init` and then
  `talaka/shared/lifecycle/tools/init.sh -n`.
- `.tlk/PROJECT.md`: test `npm test`, build `npm run typecheck`, version files
  `package.json, packages/mobile/package.json`.
