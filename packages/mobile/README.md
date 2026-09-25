# @natatki/mobile

React Native mobile app for natatki.

## Setup

1. Install dependencies: `npm install`
2. For iOS: `cd ios && pod install && cd ..`
3. Run: `npm run ios` or `npm run android`

## Features

- Offline-first note storage using WatermelonDB
- Sync with GitHub repository via backend API
- Create, edit, and list notes
- Tag and categorize notes
- AI enrichment (via backend)

## Configuration

Update `src/api/client.ts` to set the correct backend API URL.

