# CoachCoo Mobile

CoachCoo is an Expo SDK 54 React Native app that pairs a parent dashboard with a guided child avatar routine plus an experimental AI chat with per-child memory. Everything runs locally-first: routines are JSON-authored, speech events stay in SQLite, and adapters are swappable.

## Quickstart

```bash
npm install
npm run lint       # optional sanity check
npm start -c       # launches Metro with cache clear
```

Routines still launch from the Parent screen. With no OpenAI key the chat path returns friendly stubs, but all turns and memories continue to log locally.

## Environment

1. Copy the sample env file and add your key:
   ```bash
   cp .env.example .env
   # set EXPO_PUBLIC_OPENAI_KEY=sk-...
   ```
2. The key is also readable from `app.json` → `extra.OPENAI_API_KEY` if you prefer configuring through Expo.
3. If the key is missing we automatically fall back to the stub listener/LLM and log a console warning.

## Run with the Xcode Dev Client

1. Install native-facing dependencies:
   ```bash
   npm install lottie-react-native lottie-ios openai
   expo install expo-speech expo-file-system expo-sharing expo-constants expo-sqlite
   ```
2. Generate native projects + install pods:
   ```bash
   npx expo prebuild
   cd ios && pod install && cd ..
   ```
3. Start Metro for the dev client:
   ```bash
   npm run start -- --dev-client
   ```
4. Build once to your simulator or device (or open the workspace directly in Xcode):
   ```bash
   npx expo run:ios --device
   # or: open ios/mobile.xcworkspace
   ```

After the first prebuild you can keep iterating in Xcode; just rerun `expo prebuild` when you tweak `app.json` or add native modules.

## Architecture Notes

- **Avatar Runtime**: `src/ui/avatar` implements a driver interface, with `AvatarView` handling Lottie playback, emotions, and speaking loops.
- **Engine**: `src/engine/stateMachine` + `src/engine/runtime/runner.ts` orchestrate routines without UI coupling.
- **Services**: adapters for speech, STT, VAD, DB, CSV export, OpenAI chat, and long-term memory live under `src/services/*`.
- **Memory**: per-child memory and conversation turns persist in SQLite (`memory` + `convo` tables) via `src/services/memory`.
- **Chat UI**: `src/ui/screens/ChildChat.tsx` exercises the AI path—avatar emotes, TTS reads replies, and state updates in real time.

## Data & Privacy

- No raw audio leaves the device; recordings are discarded after Whisper transcription (or skipped when stubbed).
- SQLite tables stay inside Expo's sandbox. Use the parent "Wipe local data" button or `npm run clean:dev` to reset dev caches.
- CSV exports sanitize JSON payloads and ISO timestamps for easy sharing.

Happy iterating!
