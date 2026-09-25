# Setup Guide

This guide will help you set up and run the natatki application.

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **GitHub Account** - For authentication and repository storage
- **React Native Development Environment** (for mobile only):
  - **iOS**: macOS with Xcode
  - **Android**: Android Studio

## Step 1: Clone and Install

```bash
git clone <repository-url>
cd natatki
npm install
```

## Step 2: Create GitHub Application

You can use either a **GitHub App** (recommended) or an **OAuth App**. Both work, but GitHub Apps provide better permission management.

### Option A: GitHub App (Recommended)

GitHub Apps appear in "Installed GitHub Apps" and offer granular permissions:

1. Go to [GitHub Settings → Developer settings → GitHub Apps](https://github.com/settings/apps/new)
2. Fill in:
   - **GitHub App name**: natatki
   - **Homepage URL**: `http://localhost:3001`
   - **User authorization callback URL**: `http://localhost:3000/auth/callback`
   - **Webhook URL**: (leave empty for now)
3. Configure permissions:
   - **Repository permissions**: Contents (Read and write), Metadata (Read-only)
   - **Account permissions**: User: Email (Read-only) - optional
   - **GitHub AI Models**: Models (Read) - **required for AI features**
4. **Where can this GitHub App be installed?**: Select "Only on this account" or "Any account"
5. Click **"Create GitHub App"**
6. After creation:
   - Copy the **App ID**
   - Generate and copy a **Client Secret** (under "Client secrets")
   - Generate and download a **Private key** (PEM file) - save this securely
   - Note the **Client ID** (shown on the app page)

**Install the GitHub App:**
1. Go to your GitHub App settings → Click **"Install App"**
2. Select your account or organization
3. Choose repository access: **All repositories** or **Only select repositories** (select `natatki-data`)
4. Click **"Install"**

### Option B: OAuth App (Alternative)

OAuth Apps appear in "Authorized OAuth Apps":

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name**: natatki
   - **Homepage URL**: `http://localhost:3001`
   - **Authorization callback URL**: `http://localhost:3000/auth/callback`
4. Click **"Register application"**
5. Copy the **Client ID** and generate a **Client Secret**

**Configure OAuth App Permissions:**
1. Go to your OAuth App settings → Click on your app
2. Scroll to **"Permissions"** → Click **"Set up"** or **"Edit"**
3. Configure:
   - **Repository permissions**: Contents (Read and write), Metadata (Read-only)
   - **Account permissions**: User: Email (Read-only) - optional
   - **GitHub AI Models**: Models (Read) - **required for AI features**
4. Click **"Save"**

**Install OAuth App:**
- Installation happens automatically during first sign-in
- Or manually: Go to [GitHub Settings → Applications](https://github.com/settings/applications) → Find your app → Configure repository access

## Step 3: Create Data Repository

Create a GitHub repository to store your notes:

1. Go to GitHub and create a new repository:
   - **Name**: `natatki-data` (or any name)
   - **Visibility**: Private (recommended) or Public
   - **IMPORTANT**: Check **"Initialize this repository with a README"** - this creates the first commit (required!)
2. Click **"Create repository"**

**Note**: The repository must have at least one commit. If you have an empty repository, add a file through the web interface first.

## Step 4: Configure Backend

1. Navigate to backend directory:
   ```bash
   cd packages/backend
   ```

2. Create `.env` file (copy from `.env.example` if it exists):
   ```bash
   # Create .env file
   ```

3. Edit `.env` with your configuration:

   **For OAuth App (default):**
   ```env
   # Server
   PORT=3001
   NODE_ENV=development
   SESSION_SECRET=generate-a-random-string-here

   # GitHub OAuth App
   GITHUB_CLIENT_ID=your_oauth_client_id
   GITHUB_CLIENT_SECRET=your_oauth_client_secret
   GITHUB_CALLBACK_URL=http://localhost:3000/auth/callback
   GITHUB_APP_MODE=oauth

   # Data Repository
   DEFAULT_DATA_REPO_OWNER=your_github_username
   DEFAULT_DATA_REPO_NAME=natatki-data
   ```

   **For GitHub App:**
   ```env
   # Server
   PORT=3001
   NODE_ENV=development
   SESSION_SECRET=generate-a-random-string-here

   # GitHub OAuth App (still needed for user authorization)
   GITHUB_CLIENT_ID=your_github_app_client_id
   GITHUB_CLIENT_SECRET=your_github_app_client_secret
   GITHUB_CALLBACK_URL=http://localhost:3000/auth/callback

   # GitHub App (for installation-based access)
   GITHUB_APP_ID=your_app_id
   GITHUB_APP_MODE=app
   
   # Private Key - Option 1: File path (recommended)
   GITHUB_APP_PRIVATE_KEY_FILE=./github-app-private-key.pem
   
   # Private Key - Option 2: Environment variable (for development)
   # GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
   # Or base64 encoded:
   # GITHUB_APP_PRIVATE_KEY=LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLS0K...

   # Data Repository
   DEFAULT_DATA_REPO_OWNER=your_github_username
   DEFAULT_DATA_REPO_NAME=natatki-data
   ```

   **Private Key File Setup:**
   - Save your downloaded private key as `github-app-private-key.pem` in `packages/backend/`
   - Or use any path (absolute or relative to backend directory)
   - The file is automatically ignored by git (see `.gitignore`)

4. Install dependencies:
   ```bash
   npm install
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

The backend should now be running on `http://localhost:3001`

## Step 5: Configure Web Client

1. Navigate to web package:
   ```bash
   cd packages/web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` file:
   ```bash
   echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Step 6: Configure Mobile App (Optional)

1. Navigate to mobile package:
   ```bash
   cd packages/mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   
   **Note**: Dependencies are automatically linked via the `postinstall` script. The script creates symlinks from root `node_modules` to local `node_modules` for React Native dependencies that need to be accessible locally.

3. **Android Setup:**
   - Ensure Android Studio is installed
   - Set up Android SDK (usually done automatically by Android Studio)
   - Create `packages/mobile/android/local.properties` if needed:
     ```properties
     sdk.dir=C:/Users/YourUsername/AppData/Local/Android/Sdk
     ```
   - Build APK:
     ```bash
     npm run android:build
     ```

4. **iOS Setup (macOS only):**
   ```bash
   cd ios
   pod install
   cd ..
   npm run ios
   ```

**Troubleshooting Mobile Setup:**
- If symlink creation fails, run manually: `npm run setup:dependencies`
- On Windows, if symlinks fail, enable Developer Mode or run as administrator
- See "Mobile Issues" section below for more troubleshooting tips

## Step 7: First Run

1. **Start Backend**: `cd packages/backend && npm run dev`
2. **Start Web**: `cd packages/web && npm run dev`
3. **Open Browser**: Navigate to http://localhost:3000
4. **Sign In**: Click "Sign in with GitHub" and complete OAuth flow
5. **Create Note**: Click "+" button, write your note, and save

**Or use Mobile App:**
- **Android**: `cd packages/mobile && npm run android`
- **iOS**: `cd packages/mobile && npm run ios`

## Troubleshooting

### Authentication Issues

**"Repository not found" error:**
- Ensure repository exists and has at least one commit (not empty)
- Check `DEFAULT_DATA_REPO_OWNER` and `DEFAULT_DATA_REPO_NAME` in `.env`
- If private repo: Grant app access (GitHub Settings → Applications)

**"Bad credentials" or "Unauthorized":**
- Token may have expired - sign out and sign in again
- Verify Client ID and Secret are correct in `.env`
- Check app permissions (Contents: Read and write)

**"403 Forbidden" when using AI enrichment:**
- Token doesn't have "Models: Read" permission
- **Solution**: Re-authorize the app (sign out and sign in again)
- Make sure to grant **"GitHub AI Models: Models (Read)"** permission during authorization

**"GitHub App is not configured" error:**
- If using GitHub App mode (`GITHUB_APP_MODE=app`):
  - Set `GITHUB_APP_ID` in `.env`
  - Set `GITHUB_APP_PRIVATE_KEY_FILE` (path to PEM file) or `GITHUB_APP_PRIVATE_KEY` (key content)
  - Ensure the app is installed (GitHub Settings → Installed GitHub Apps)

### Backend Issues

**Port already in use:**
```bash
# Windows:
netstat -ano | findstr ":3001"
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:3001 | xargs kill
```

**Private key file not found:**
- Check that `GITHUB_APP_PRIVATE_KEY_FILE` path is correct
- Use absolute path or path relative to backend directory
- Ensure file exists and is readable

### Mobile Issues

**Metro bundler not starting:**
```bash
cd packages/mobile
npm start -- --reset-cache
```

**iOS build errors:**
```bash
cd ios
pod deintegrate
pod install
```

**Android build errors - dependencies not found:**
```bash
cd packages/mobile
npm run setup:dependencies
```

**Symlink creation fails on Windows:**
- Symlinks are automatically created via `postinstall` script
- If symlink creation fails, you may need:
  - **Option 1**: Run as administrator
  - **Option 2**: Enable Developer Mode:
    1. Open Windows Settings → Update & Security → For developers
    2. Enable "Developer Mode"
    3. Restart terminal and run `npm install` again
  - **Option 3**: The script will automatically use directory junctions (works without admin)

**Note**: The mobile package uses symlinks to share dependencies from root `node_modules`. This is handled automatically by the `postinstall` script. If you encounter issues, run `npm run setup:dependencies` manually.

## Development Workflow

- **Backend**: Auto-reloads on changes (`npm run dev`)
- **Web**: Hot-reloads on changes (`npm run dev`)
- **Shared package**: Rebuild after changes:
  ```bash
  npm run build --workspace=packages/shared
  ```

## Production Deployment

### Backend

1. Set `NODE_ENV=production`
2. Update `GITHUB_CALLBACK_URL` to production URL
3. Use secure `SESSION_SECRET`
4. Store private key securely (use `GITHUB_APP_PRIVATE_KEY_FILE` with secure file permissions)
5. Set up HTTPS
6. Deploy to your hosting provider

### Web

1. Update `NEXT_PUBLIC_API_URL` in `.env.local` to production backend URL
2. Build: `npm run build`
3. Start: `npm start`

## Next Steps

- Review [README.md](README.md) for architecture details
- Check [plans/](plans/) for feature roadmap
- See [research/](research/) for implementation details
