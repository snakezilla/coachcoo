# Architecture Map (No Code)

## Top-level modules
- apps/mobile: React Native app shell.
- packages/: Shared libraries, no app-specific code.
- plugins/: Optional add-ons you can plug into the app via dependency injection or feature flags.
- server/: Cloud components (post-pilot), optional.
- infra/: CI, release, and automation scripts.
- content/: Routine packs, voices, localization files.
- docs/: Specs, pilot runbooks, privacy notes.

## Plug-in points
- apps/mobile/src/services/tts/           → attach platform TTS adapters.
- apps/mobile/src/services/vad/           → attach VAD backends or heuristics.
- apps/mobile/src/services/db/            → swap SQLite/local stores, add exporters.
- apps/mobile/src/engine/stateMachine/    → extend avatar states and transitions.
- apps/mobile/src/engine/routineRunner/   → load and execute routine JSON packs.
- apps/mobile/src/components/Avatar/      → change avatar renderer, Lottie, Spine, Unity wrapper.
- packages/behavior-engine/src/           → FSM definitions, reward schedules (library only).
- packages/telemetry/src/                 → session/event schemas, CSV/JSON exporters.
- packages/audio-io/src/                  → mic capture interfaces, platform bridges.
- packages/ui-kit/src/                    → shared presentational components.
- packages/vad/src/                       → VAD algorithms, thresholds (no DSP here yet).
- plugins/camera-reactivity/              → face presence, wave heuristic (MediaPipe/Apple Vision).
- plugins/sr-provider/                    → ASR connector (Whisper, native, or cloud).
- plugins/cloud-sync/                     → Supabase/Firebase sync, RLS policies, queues.
- server/supabase/                        → SQL schema and policies when cloud is enabled.

## Data model placeholders (no SQL here)
- session, event, routine, child, config, consent_local.

## Content
- content/routines/                       → versioned JSON routine packs.
- content/voices/                         → voice selections and platform mappings.
- content/localization/*                  → i18n resource files.

## Privacy posture
- Default: local-only, no raw audio/video storage.
- One-tap purge control implemented in app later.

## Build & release
- infra/ci/                               → CI pipelines definitions.
- infra/release/                          → EAS/TestFlight/Play artifacts and notes.
- infra/scripts/                          → helper scripts (shell, node) to add later.
