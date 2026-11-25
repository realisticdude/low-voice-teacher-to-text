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
2. In **Authentication → Sign In / Providers**, enable **Anonymous sign-ins**. Each device signs in invisibly so the app can tell a classroom's teacher from its students.
3. In **Realtime → Settings**, disable **Allow public access**, so every channel is checked against the realtime policies.
4. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql) to create the `classrooms` and `participants` tables, indexes, lookup function, and RLS policies (including the ones for Realtime).
5. Grab your project's **Project URL** and **publishable key** (or legacy **anon public key**) from **Project Settings → API Keys**.

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

- Access control is intentionally code-based, not account-based: anyone who knows a classroom code can join it. Behind the scenes each device has an anonymous Supabase user, and RLS uses it so that only the teacher who created a classroom can end it or broadcast captions, only joined participants can receive them, and classrooms are looked up by exact code (they can't be listed). There is no delete access.
- Supabase recommends CAPTCHA or Cloudflare Turnstile for anonymous sign-ins in production, and anonymous users aren't cleaned up automatically.
- Expo APIs referenced in this codebase should match the [v57 docs](https://docs.expo.dev/versions/v57.0.0/) — the SDK has changed significantly across versions.
