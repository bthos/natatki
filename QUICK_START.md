# Quick Start Guide

## ✅ Setup Completed

The automated setup steps have been completed successfully! Here's what's ready:

### Completed Steps

1. ✅ **Dependencies Installed** - All npm packages installed
2. ✅ **Shared Package Built** - TypeScript types compiled
3. ✅ **Backend Built** - Backend API compiled successfully
4. ✅ **Configuration Files Created**:
   - `packages/backend/.env` (needs your GitHub credentials)
   - `packages/web/.env.local` (configured)

### ⚠️ Manual Steps Required

Before you can run the application, complete these steps:

#### 1. GitHub OAuth Setup (5 minutes)

1. Go to: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: `natatki`
   - **Homepage URL**: `http://localhost:3001`
   - **Authorization callback URL**: `http://localhost:3001/api/auth/github/callback`
4. Click "Register application"
5. Copy the **Client ID**
6. Click "Generate a new client secret" and copy it

#### 2. Create Data Repository (2 minutes)

1. Go to: https://github.com/new
2. Create a **private** repository named `natatki-data`
3. (Optional) Initialize with a README

#### 3. Configure Backend (1 minute)

Edit `packages/backend/.env` and fill in:

```env
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
DEFAULT_DATA_REPO_OWNER=your_github_username
DEFAULT_DATA_REPO_NAME=natatki-data
SESSION_SECRET=generate-a-random-string-here
```

**Generate SESSION_SECRET**:
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### 🚀 Start the Application

#### Option 1: Web Client (Recommended for testing)

**Terminal 1 - Backend:**
```bash
cd packages/backend
npm run dev
```

**Terminal 2 - Web:**
```bash
cd packages/web
npm run dev
```

Then open: http://localhost:3000

#### Option 2: Mobile App

**Setup (first time only):**
```bash
cd packages/mobile
npm install
# Dependencies are automatically linked via postinstall script
# If you see linking errors, run: npm run setup:dependencies
```

**For iOS:**
```bash
cd packages/mobile
cd ios && pod install && cd ..
npm run ios
```

**For Android:**
```bash
cd packages/mobile
npm run android
```

**Note**: The mobile package uses symlinks to share dependencies from root `node_modules`. This is handled automatically, but if you encounter build errors, run `npm run setup:dependencies` to recreate the symlinks.

### 📋 First Run Checklist

- [ ] GitHub OAuth App created
- [ ] Data repository created
- [ ] Backend `.env` configured
- [ ] Backend running on http://localhost:3001
- [ ] Web client running on http://localhost:3000
- [ ] Authenticate with GitHub
- [ ] Create your first note!

### 🔍 Verify Setup

Check that everything is working:

1. **Backend Health**: http://localhost:3001/health
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Web Client**: http://localhost:3000
   - Should show login prompt

3. **Check Logs**: 
   - Backend terminal should show: `natatki backend server running on port 3001`
   - Web terminal should show: `Ready on http://localhost:3000`

### 🐛 Troubleshooting

**Backend won't start:**
- Check `.env` file exists and has all required values
- Verify port 3001 is not in use: `netstat -ano | findstr :3001` (Windows)

**Web client can't connect:**
- Verify backend is running
- Check `NEXT_PUBLIC_API_URL` in `packages/web/.env.local`

**GitHub OAuth fails:**
- Verify callback URL matches exactly
- Check Client ID and Secret are correct
- Ensure repository exists and is accessible

### 📚 Next Steps

- Read [SETUP.md](SETUP.md) for detailed setup instructions
- Check [SETUP_ISSUES_RESOLVED.md](SETUP_ISSUES_RESOLVED.md) for known issues
- Review [README.md](README.md) for architecture details

---

**Need Help?** Check the troubleshooting section in [SETUP.md](SETUP.md)

