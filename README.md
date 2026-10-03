# Gym-Fitness-Calendar-Tracker

**GymCal** is a clean, professional workout calendar for a family. It has two screens: a clickable **Calendar** and **Progress**.

- 📅 **Calendar:** every date box starts blank. Click a date, type what you did (choose Strength, Cardio or Other) and close. The box then lists everything you added, with the date in its top-right corner. Done items show ✓ in green; unfinished items on past days show in red. Switch between **Month** (grid) and **List** (one large box per day).
- 🔒 **Past days are locked.** Once a day is over it opens read-only. To change it anyway, the user has to type their profile name three times (pasting is blocked). It locks again as soon as the window closes.
- 📊 **Progress:** monthly completion, streaks, a 12-week heatmap, weight and waist charts, and cardio charts (distance, weekly/monthly km, frequency, pace).
- 👨‍👩‍👧 **Family profiles:** tap your name at the top to switch, add a member, or open *Profile & settings* (PIN, metrics, theme, export/import).
- Nothing is pre-filled: no sample exercises, plans or demo data.
- The look follows the public U.S. Web Design System style (Public Sans, navy and blue, flat panels) with no government branding. Light and dark mode, installable, works offline.

## Deploy to GitHub Pages

The app is a static site (no build step). A workflow in `.github/workflows/pages.yml` publishes it on every push to `main`.

1. Push this repository to GitHub.
2. In the repo, open **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions** (one time).
3. Push to `main`, or run the workflow from the **Actions** tab. The site goes live at
   `https://<your-username>.github.io/Gym-Fitness-Calendar-Tracker/`.

Only the app files are published (`index.html`, `css/`, `js/`, `icon.svg`, `manifest.webmanifest`, `sw.js`).

## Keeping data permanently (GitHub sync)

GitHub Pages can only serve files, so by default data is saved in the browser. To keep it permanently and share it between phones and computers, turn on **GitHub sync**. The app then saves the whole family's data as one JSON file in a **private** repository you own.

1. Create a new **private** repository, for example `gymcal-data` (it can stay empty).
2. Create a token at **https://github.com/settings/personal-access-tokens/new**. (Or: **profile picture (top-right) → Settings → Developer settings** at the bottom of the left menu **→ Personal access tokens → Fine-grained tokens → Generate new token**. This is your *account* Settings, not the repository's Settings tab.)
   - Repository access: **Only select repositories** → your data repo.
   - Repository permissions: **Contents → Read and write**. Nothing else.
3. In the app, open **your name (top) → Profile & settings → Cloud sync → Set up** (or **Connect GitHub sync** on the welcome screen of a new device), and enter your username, the repo name and the token.
4. Do step 3 on every device. They all share the same data.

How it works:
- The browser copy is the working copy, so the app works offline. Changes sync about 2 seconds after you make them, when the app is opened or refocused, when you come back online, and every minute while it's open.
- Each profile's newest copy wins. If two devices save at the same moment, the app retries and merges, so nothing is overwritten.
- Clearing the browser loses nothing: reconnect and all data comes back. Deleting a profile removes it on every device.
- The token is stored only in that browser and is sent only to `api.github.com`. Because it is limited to the one data repo, it cannot touch anything else in your account. Anyone with access to an unlocked device could read it, so don't connect devices you don't trust.

## Run locally

It's a plain static site with no build step:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Data & privacy

Without sync, all data is stored **in the browser on each device** (`localStorage`):

- `gymcal.index.v1`: the profile directory (names, avatars, PIN hashes)
- `gymcal.user.<id>.v1`: one document per user (exercises, plan, history, measurements, metrics, settings)

Every profile is a separate document, so one person's changes never touch another's. The PIN only stops casual access on a shared device; it does not encrypt anything. Use **GitHub sync** (above) to keep data permanently across devices, or **Profile & settings → Export** for a one-off backup file.

## Structure

```
index.html          app shell
css/styles.css      white & blue design system (light + dark)
js/store.js         per-user storage layer (+ bundle/merge for sync)
js/sync.js          GitHub sync (private repo, newest-copy-wins merge)
js/logic.js         status / streak / stats rules
js/charts.js        dependency-free SVG charts
js/app.js           views, sheets, events
sw.js, manifest     offline + install support
.github/workflows/pages.yml   deploys the site to GitHub Pages on push
```
