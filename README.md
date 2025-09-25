# CoachCoo MVP

CoachCoo is an **Expo React Native app** that provides a cheerful avatar companion for kids.  
The MVP demonstrates two guided routines with basic interaction logging.

---

## Features
- **Parent Home screen**
  - Create and save a child profile
  - Start one of two routines (Morning, Greetings)
  - Export session data as CSV
  - Wipe all local data

- **Child Avatar screen**
  - Avatar delivers routine prompts with TTS
  - Parent can confirm or timeout each step
  - Configurable listen window and auto-confirm cadence
  - Events logged locally to SQLite

- **Routines**
  - `morning_v1.json` (simple morning flow)
  - `greetings_v1.json` (entryway greetings flow)

- **Data**
  - Stored locally in SQLite
  - Exportable CSV with prompts, confirmations, timeouts, timestamps

---

## Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/snakezilla/coachcoo.git
cd coachcoo


## Run locally

Clone the repo and install dependencies:

```bash
git clone https://github.com/snakezilla/coachcoo.git
cd coachcoo

# install dependencies
npm install

# start the Expo dev server
npx expo start