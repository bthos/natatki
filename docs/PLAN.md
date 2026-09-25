# Natatki: fix and development plan

Status: draft, 2026-09-25. Based on the two repos as they are on GitHub
(`bthos/natatki`, `bthos/natatki-data`) and the talaka kit added as a submodule.

## 0. What exists today

| Repo | Contents |
|------|----------|
| `bthos/natatki` | README, `.gitignore`, and now the `talaka/` submodule. **No application source is committed.** |
| `bthos/natatki-data` | The note store: `notes/*.md` (Markdown + YAML front matter), one GitHub Models prompt (`note-enricher.prompt.yaml`), 46 commits, mostly by the `natatki[bot]` GitHub App. |
| `bthos/talaka` (submodule) | The AI development pipeline (agents Bagnik, Cmok, Mokash, Veles, Yaga, Zlydni, plus 14 skills). Initialized with `init.sh`; see §5. |

The `.gitignore` (Expo, React Native iOS/Android, WatermelonDB, `*.pem` for a GitHub App
key, `web-build/`) and the data history suggest the app is:

- a **React Native / Expo** client (Android, iOS, web) with a local **WatermelonDB** store;
- a backend or serverless part that holds the **GitHub App private key** and commits to
  `natatki-data` as `natatki[bot]`;
- AI enrichment through **GitHub Models** (`openai/gpt-4o-mini`), which returns
  `{category, tags, summary, suggestedTitle}`.

**Blocker:** the source code has to be pushed to `bthos/natatki` before anything below
can be implemented or built in CI. Everything in §1 is inferred from the data it wrote.

## 1. Bugs found in the data history

Evidence comes from `git log -p` in `natatki-data`.

| # | Bug | Evidence | Severity |
|---|-----|----------|----------|
| B1 | **Editing a note drops `title`, `tags` and `category`.** Every "Update note" commit after an enrichment deletes those three keys and keeps only `aiSummary`. The next enrich writes them back with *different* values, so the metadata changes on every edit. | `357992b`, `4f6266d`, `9dd9fa6` (the diff removes `title/tags/category` and keeps `aiSummary`) | High, data loss |
| B2 | **File-name collisions.** The file name is `YYYY-MM-DD-` plus the first 8 digits of the ms timestamp, so all notes made within the same ~100 s get the same name. `note_1767876830012…` and `note_1767876844411…` both map to `2026-01-08-17678768.md`. | `48b2cd7`, `5603424` | High, a note can overwrite another |
| B3 | **The mobile client writes notes in a different format.** `notes/note_1767876830012_ikpxsaf` has no `.md` extension and no front matter, and it was committed with the user's own token rather than by the bot. This is a second serializer or a fallback path. | `5603424` | High |
| B4 | **One commit per autosave.** 10 "Update note" commits in 70 s for a single note (19:16:36 → 19:18:47). This is slow, can hit rate limits, clutters history, and makes SHA conflicts likely. | `d5cec32`…`8ee3ef9` | Medium |
| B5 | **Enrichment overwrites the user's title.** Every run replaces the title with `suggestedTitle`, even when a title is already set ("Note for Awesome BelLit" → "Updating Belarusian Literature Shelves" → "Scrap updates…"). The prompt asks for a title only "if the note doesn't have one", but the app still applies it. | `5c99fca`, `6bb2d31`, `e34cbf9` | Medium |
| B6 | **Metadata in the wrong language, with mistranslations.** Notes are in Belarusian or Russian, but titles, tags and summaries come back in English. "пампаваць" (to update or fill up) became "Scrap". | current `2026-01-06-17677239.md` | Medium |
| B7 | **Non-note files in `notes/`.** `note-enricher.prompt.yaml` sits among the notes, so any loader that reads the folder will try to parse it as a note. | `324b88a` | Low |
| B8 | **Inconsistent commit messages.** Update messages use the note ID sometimes and the title other times. | log | Low |
| B9 | **No trailing newline** in files; mixed local and UTC author times. | all notes | Cosmetic |
| B10 | **Enrichment is not idempotent.** Enriching the same text twice gives different tags and category. Needs `temperature: 0` or merging with existing tags. | `97e6dd9` vs `7a6aff3` | Low |

## 2. Phases

### Phase 0: repository hygiene (prerequisite, about 0.5 day)
1. Push the app source to `bthos/natatki` (monorepo, e.g. `apps/mobile`, `apps/server`,
   `packages/core`). Check that no `.pem`, `.env` or keystore gets committed. The
   `.gitignore` already covers them; also run secret scanning on the first push.
2. Add `package.json` scripts: `typecheck`, `lint`, `test` (these match `.tlk/PROJECT.md`).
3. Put the note format in writing as `docs/NOTE_FORMAT.md` (a small schema, see §3.1).
4. Protect `main`; do work on branches and open PRs.

### Phase 1: CI and cloud APK builds (no local Android compiling, about 1 day)
Goal: every PR and every push to `main` produces a downloadable APK. No Android SDK or
Gradle is needed on your machine.

- **`ci.yml`**: runs typecheck, lint and unit tests on every PR (Node only, about 1–2 minutes).
- **`android-apk.yml`**: runs `expo prebuild` and then `./gradlew assembleRelease` on
  `ubuntu-latest`, and uploads the APK with `actions/upload-artifact`. On a `v*` tag it
  also attaches the APK to a GitHub Release, which gives a stable download link you can
  open on the phone.
  - Caches: npm, Gradle (`gradle/actions/setup-gradle`).
  - Signing: a release keystore stored base64-encoded in repo secrets
    (`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
    `ANDROID_KEY_PASSWORD`). Without these secrets it falls back to a debug-signed APK,
    which is fine for sideloading tests. Keep one keystore so updates install over the
    previous build.
  - Size: build `arm64-v8a` only for test builds (`-PreactNativeArchitectures=arm64-v8a`),
    which is about a third of the size and time.
  - The JS bundle is embedded in the APK, so it runs without Metro.
- Optional: the **EAS Build** cloud (`eas build -p android --profile preview`) is an
  alternative with no runner setup, but its free tier has a queue and a monthly limit.
  GitHub Actions is free for public repos and is the default here.
- Optional: **EAS Update / OTA** for JS-only changes, so a new APK is needed only when
  native code changes.

Template (to be adjusted to the real app path once the source is pushed):

```yaml
# .github/workflows/android-apk.yml
name: Android APK
on:
  pull_request:
    paths: ["apps/mobile/**", "packages/**", ".github/workflows/android-apk.yml"]
  push:
    branches: [main]
    tags: ["v*"]
  workflow_dispatch:
concurrency: { group: apk-${{ github.ref }}, cancel-in-progress: true }
jobs:
  apk:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    env:
      HAS_KEYSTORE: ${{ secrets.ANDROID_KEYSTORE_B64 != '' }}
    defaults: { run: { working-directory: apps/mobile } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 17 }
      - uses: gradle/actions/setup-gradle@v4
      - run: npm ci
      - run: npx expo prebuild --platform android --no-install
      - name: Restore keystore
        if: env.HAS_KEYSTORE == 'true'
        env: { KEYSTORE_B64: "${{ secrets.ANDROID_KEYSTORE_B64 }}" }
        run: echo "$KEYSTORE_B64" | base64 -d > android/app/release.keystore
      - name: Build
        working-directory: apps/mobile/android
        env:
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon
      - uses: actions/upload-artifact@v4
        with:
          name: natatki-${{ github.sha }}
          path: apps/mobile/android/app/build/outputs/apk/release/*.apk
          retention-days: 14
      - if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        with: { files: apps/mobile/android/app/build/outputs/apk/release/*.apk }
```

(The release signing config in `build.gradle` — added via an Expo config plugin so it
survives `prebuild` — reads the env vars and falls back to the debug key when they are empty.)

### Phase 2: fix the data bugs (about 2–3 days)
3.1 **One shared serializer** (`packages/core/note.ts`) used by every client and by the
server. Tests for it come first (talaka flow: architecture-planning, then the Bagnik test
gate, then Cmok).
  - Canonical schema: `id, createdAt, updatedAt, title?, tags[], category?, aiSummary?,
    lang?, enrichedAt?` plus the body; a trailing newline; stable key order.
  - **Update = read, merge, write.** Unknown and AI keys are always kept (fixes B1).
    Add a round-trip test: `parse(serialize(n)) == n`.
  - File name = `notes/YYYY/MM/<id>.md` (or `YYYY-MM-DD-<full id>.md`), which is unique
    by construction (fixes B2). Keep old paths readable and add a one-off migration script.
  - The loader accepts only `*.md` under `notes/`, tolerates files without front matter
    (it builds an ID from the file name and keeps the body), and never overwrites them
    unless they are edited (B3, B7).
3.2 **Mobile path**: remove the second write path. All writes go through the same sync
queue (fixes B3).
3.3 **Sync batching**: debounce saves locally (WatermelonDB is the source of truth), then
push dirty notes every N seconds or when the app goes to the background. Several notes can
go in one commit through the Git Data API (tree + commit). Use optimistic concurrency on
the blob or commit SHA with retry-merge on 409/422 (fixes B4). Commit messages:
`note(<id>): update "<title>"` (B8).
3.4 **Enrichment rules**:
  - never overwrite a title the user set; show `suggestedTitle` as a suggestion (B5);
  - merge with the user's tags instead of replacing them; `temperature: 0`;
    skip enrichment if the body hash didn't change since `enrichedAt` (B10);
  - the prompt says "answer in the note's language" and returns `lang`; add Belarusian and
    Russian eval cases to `note-enricher.prompt.yaml` (B6).
3.5 **Data cleanup PR in `natatki-data`**: move `note-enricher.prompt.yaml` to
`.github/prompts/`, turn `note_1767876830012_ikpxsaf` into a proper `.md` with front
matter, run the file-name migration, and add a small `validate-notes` GitHub Action that
checks the schema on every push to the data repo.

### Phase 3: security and reliability (about 1–2 days)
- The GitHub App key lives only on the server or function. The mobile app gets a
  short-lived user token (GitHub App user-to-server OAuth, device flow) or talks to the
  backend. It never ships a PAT or the key in the APK.
- Offline-first: a queue of pending writes, visible sync status, conflict UI (keep both
  versions and show a diff).
- Error reporting (Sentry or similar) and a crash-free test build before release.

### Phase 4: product development (iterative; each item goes through the talaka pipeline)
Order is by value to effort:
1. **Search and filters** (full text, tag, category) over the local DB.
2. **Quick capture**: Android share-sheet target, home-screen widget, voice note with
   transcription.
3. **Markdown editor** with preview and checklists.
4. **Project linking**, the README promise: pick a GitHub repo, and the AI suggests how an
   idea applies to it and produces a Markdown change plan, stored next to the note and
   optionally opened as an issue in the target repo.
5. **Related notes** (embedding similarity) and automatic grouping.
6. Web/desktop parity; iOS builds later (a macOS runner or EAS), because iOS cannot be
   sideloaded like an APK.
7. Localization of the UI (be / ru / en).

## 3. Test strategy
- Unit tests (Jest): serializer round-trips, file naming, the merge logic, and enrichment
  merge rules. These run in `ci.yml` on every PR.
- Contract test against a fixture copy of `natatki-data` (all historical file shapes,
  including the extensionless one).
- Manual smoke test on the phone using the APK artifact from the PR. Add a PR checklist
  item: "installed APK from this run and created, edited and enriched a note".
- Later: Maestro E2E flows running on an Android emulator in Actions (nightly only, since
  it is slow).

## 4. Order of work / milestones
| Milestone | Contents | Done when |
|-----------|----------|-----------|
| M0 | Source pushed, scripts, NOTE_FORMAT.md | `npm test` runs in CI |
| M1 | `ci.yml` + `android-apk.yml` | APK downloadable from a PR run |
| M2 | Serializer, naming, merge (B1, B2, B3, B7, B9) | Round-trip tests green; migration applied to data repo |
| M3 | Sync batching + enrichment rules (B4, B5, B6, B8, B10) | One commit per sync burst; titles stable over edits |
| M4 | Security pass (Phase 3) | No secrets in APK (checked with `apktool` in CI) |
| M5+ | Phase 4 features | Per feature, via talaka |

## 5. How talaka is set up here
- Submodule: `talaka/` → `https://github.com/bthos/talaka`. After cloning natatki, run
  `git submodule update --init` and then `talaka/shared/lifecycle/tools/init.sh -n`
  (per developer).
- Committed: `.gitmodules`, the submodule pointer, the managed blocks in `CLAUDE.md`,
  `AGENTS.md` and `.gitignore`, and `.claude/settings.json` (statusline and output style).
- Per developer, git-ignored: `.tlk/` (PIPELINE.md, PROJECT.md, memory) and the copied
  agents and skills in `.claude/`.
- `.tlk/PROJECT.md` is filled with: test `npm test`, build `npm run typecheck && npm run lint`,
  version files `package.json, app.json`. Re-check these once the source lands.
- Suggested start: `/codebase-mapping` on the pushed source, then `/requirements-eliciting`
  for M2 ("note serializer and file naming").
