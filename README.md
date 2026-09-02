# LiveClass Caption

Live speech-to-text captions for a classroom. A teacher speaks from their phone; students see a live, real-time transcript on theirs. No accounts — a student joins with a short classroom code.

## How it works

- **Speech-to-text** runs on the teacher's device via [`expo-speech-recognition`](https://www.npmjs.com/package/expo-speech-recognition) (native iOS/Android speech recognizers).
- **Transport** is [Supabase Realtime](https://supabase.com/docs/guides/realtime) — the teacher's device broadcasts caption text on a per-classroom channel (`classroom:<CODE>`); students subscribe to the same channel. Caption text is never written to the database, so it stays low-latency.
- **Classrooms and participants** are tracked in a small Postgres schema (via Supabase) — just enough to generate/validate join codes and mark a classroom active/inactive.

## Tech stack

- [Expo](https://docs.expo.dev/versions/v57.0.0/) 57 (React Native 0.86, React 19), TypeScript
- `expo-dev-client` — this app uses a native module not available in Expo Go, so it needs a custom dev client build
- `expo-speech-recognition` for on-device speech recognition
- `@supabase/supabase-js` for Realtime Broadcast/Presence and Postgres

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql) to create the `classrooms` and `participants` tables, indexes, and RLS policies.
3. Grab your project's **Project URL** and **anon public key** from **Project Settings → API**.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Build and run a dev client

Speech recognition requires native code, so you can't use Expo Go — build a dev client first:

```bash
npx expo prebuild
npm run android   # or: npm run ios
```

Then for subsequent runs:

```bash
npm start
```

## Project structure

```
App.tsx                        # role router: Home / Teacher / Student
src/
  components/                  # shared UI (Button, TextField, CaptionView, theme, ...)
  hooks/
    useSpeechRecognition.ts    # wraps expo-speech-recognition: permissions, auto-restart, backgrounding
    useClassroomChannel.ts     # wraps a Supabase Realtime channel: broadcast + presence
  lib/
    supabase.ts                # Supabase client
    id.ts                      # short random id generator
  services/
    classroomService.ts        # create/join classrooms, manage participants (Postgres)
    realtimeService.ts         # caption broadcast channel helpers
  screens/
    HomeScreen.tsx
    TeacherScreen.tsx
    StudentScreen.tsx
  types/                       # shared TypeScript types
supabase/
  schema.sql                   # Postgres schema + RLS policies
```

## Notes

- Access control is intentionally code-based, not account-based: anyone who knows a classroom code can join it. RLS policies scope the anon key to only the `classrooms` and `participants` tables, with no delete access.
- Expo APIs referenced in this codebase should match the [v57 docs](https://docs.expo.dev/versions/v57.0.0/) — the SDK has changed significantly across versions.
