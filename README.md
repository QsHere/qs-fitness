# qs-fitness

Your personal gym log — calendar home screen, colour-coded by body part, with a guided flow for logging a session set-by-set. Built with Next.js 14 (App Router) + Supabase + Vercel, same stack shape as qs-wallet.

This is the **core tracking part only** (per the brief). Analytics, PRs, and nutrition are meant to come later as separate additions on top of this foundation.

## What's inside

- `app/` — pages: home (calendar), `/log` (the logging flow), `/unlock` (optional passcode gate)
- `components/` — calendar UI, the multi-step logger, shared inputs
- `lib/actions.ts` — all data access (server actions), talks to Supabase
- `lib/types.ts` — shared TypeScript types
- `supabase/schema.sql` — full database schema + seed data (your real exercise list from the spreadsheet)
- `middleware.ts` + `app/api/unlock` — optional passcode gate (see below)

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New project. Pick any name/region.
2. Once it's up, go to **SQL Editor → New query**, paste the entire contents of `supabase/schema.sql`, and run it. This creates all tables and seeds:
   - 3 gyms: Sg Long Ark Fitness (default), TARUMT, AIA
   - 7 body parts with the calendar legend colours
   - Your full exercise list per body part, exactly as you listed it, including Treadmill/Stair Climber with their own prompt fields
3. Go to **Project Settings → API**. You'll need the **Project URL** and the **anon public key**.

## 2. Run it locally

```bash
npm install
cp .env.local.example .env.local
# paste your Supabase URL + anon key into .env.local
npm run dev
```

Open http://localhost:3000 — you should see an empty calendar. Tap **Log workout** to add your first session.

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: qs-fitness core tracking"
gh repo create qs-fitness --private --source=. --push
# or create the repo on github.com first, then:
# git remote add origin <your-repo-url>
# git push -u origin main
```

## 4. Deploy to Vercel

1. [vercel.com](https://vercel.com) → New Project → import the `qs-fitness` GitHub repo.
2. Add the same two environment variables from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy. That's it — same flow as qs-wallet.

## Installing on your phone (Chrome)

The app now ships with a proper web manifest and icon set (built from your logo), so Chrome on Android should offer a real **"Install app"** option instead of only "Create shortcut" - that requires: a manifest with 192px/512px icons (done), `display: standalone` (done), and being served over **HTTPS**. Localhost also counts as secure, so it works there too, but if you were testing over `http://<lan-ip>:3000` on your phone (visiting your laptop's dev server from its local network address), that's not HTTPS and Chrome will only ever offer a shortcut. Once it's deployed to Vercel (which is HTTPS by default), Install should appear normally.

If you still only see "Create shortcut" after deploying: open Chrome's three-dot menu → make sure you're not already in an installed instance, and check `chrome://flags` hasn't got any PWA-related flag disabled (rare, but happens after some Chrome updates).

## Database migrations

If you've already run `supabase/schema.sql` once on a live project, don't re-run the whole file for future schema changes - instead run the individual files in `supabase/migrations/` in order, in the Supabase SQL Editor. Right now there are two:

- `001_treadmill_incline.sql` - adds an incline (%) field to Treadmill.
- `002_bodyweight_tracking.sql` - adds the `is_bodyweight` flag on exercises (flags Sit-Ups and Captain Chair by default) and a small `app_settings` table used to store your bodyweight. Needed for the Progress & PRs page below.

## Changes in this update

**Latest:**
- The rest timer button can now be moved: hold it down (not just tap) to drag it anywhere on screen, so it stops covering the home stats. Position is remembered.
- Fixed losing your in-progress log session when navigating to Progress & PRs mid-workout and back. The draft (date, gym, every exercise added so far) now persists to local storage continuously while you're logging, and restores automatically the moment you land back on `/log` - regardless of how you got there. Also added a direct shortcut to Progress & PRs right in the logging screen's top bar, so you don't need to back out to Home first.
- The day-detail sheet (tapping a calendar date) now groups exercises by body part into collapsible sections, all collapsed by default - so opening a date shows which parts you trained at a glance from the section headers alone, and you expand only the ones you want full detail on.
- Progress & PRs sections now start fully collapsed (previously the first one opened automatically), and follow a fixed order: Chest, Back, Shoulder, Arm, Abs, Cardio, Lower Body.

**Earlier:**
- "This month" on the home screen now follows whichever month the calendar is showing (swipe or arrows) instead of always meaning the real current month. "All time" and "this week" stay fixed to today regardless of what you're browsing.
- Fixed the week boundary: it was computing "today" from the server's clock, which runs in UTC on Vercel - so for roughly the first 8 hours of every Malaysia day (until UTC catches up), it would still think it was the previous day, occasionally making "this week" look like it hadn't reset yet on a Monday morning. Date math for these stats is now anchored to `Asia/Kuala_Lumpur` explicitly (see `APP_TIMEZONE` in `lib/actions.ts`).
- The calendar now supports swipe left/right to change months, not just the arrow buttons. It's a pure client-side gesture (no network wait before the animation starts), and rapid swipes are guarded against a race condition where an older month's data could arrive after a newer one and overwrite it.
- The Progress & PRs page's body-part sections are now collapsible (tap the header) instead of one long list - the most-trained section opens by default, the rest start collapsed.

**Earlier:**
- Removed the passcode gate entirely (deleted `middleware.ts`, `app/unlock/`, `app/api/unlock/`) - per your request, ship it open for now.
- Added a real app icon + `public/manifest.json`, generated from your logo, so Chrome can offer a proper Install rather than only a shortcut.
- Fixed the day-detail sheet not scrolling: the drag-to-dismiss gesture was capturing the same touch movement as scrolling. Dragging is now confined to the little handle bar at the top; the list below scrolls independently.
- You can now tap any exercise in the "added so far" list (mid-session) or in the review screen to reopen it and edit its sets/notes, not just delete it.
- Rebuilt the logger's navigation to use real browser history. Previously, going back mid-session (via the phone's back button/gesture) could exit the whole flow and silently drop everything you'd entered, because the in-app step tracking and the browser's own history had no way to stay in sync - some screens "had" a working back action and others didn't, which was a symptom of that mismatch. Now every step is a real history entry, so the hardware back button always steps back exactly one screen and never wipes your progress, no matter how many body parts/exercises you've added.
- Added Treadmill incline (%). See `supabase/migrations/001_treadmill_incline.sql` for your already-live database.
- Calendar dots are now 2 colours: red for upper body (Chest/Back/Shoulder/Arm/Abs), blue for Lower Body, with Cardio as a neutral grey (it doesn't cleanly belong to either - see `lib/constants.ts` if you want to change that mapping). The day-detail view and logger still show every body part's real, distinct colour - the simplification is calendar-only.
- Replaced the body-part tile icons with emoji that actually match: 🏋️ Chest, 🧗 Back, 🙆 Shoulder, 🔥 Abs, 💪 Arm, ❤️‍🔥 Cardio, 🦵 Lower Body.
- Added error boundaries (`app/error.tsx`, `app/log/error.tsx`) and `export const dynamic = "force-dynamic"` on the data-loading pages. This won't eliminate every possible transient Supabase hiccup, but it means a server-side error now shows a "Try again" button in-app instead of a hard crash that only a manual refresh could fix - and removing the static/cached rendering path removes one likely source of that class of error.

## Rest Timer

A small floating button (bottom-right, on every page) starts a rest timer without leaving whatever you're doing - tap it while logging a set, pick 1:00 / 1:30 / 2:00 or a custom time, and it keeps counting down as a live pill wherever you navigate in the app.

**Honest limits, since this matters for a rest timer specifically:** web browsers deliberately restrict what a backgrounded tab can do (battery saving), and there's no way for a web app to override that - only a native app gets guaranteed background execution. What's built in to get as close as realistically possible:

- The countdown is computed from an absolute end-timestamp, not a decrementing counter - so even if the browser throttles or briefly suspends it while you're in another app, the instant it gets CPU time again it shows the *exactly correct* remaining time rather than a drifted one.
- A near-silent looping tone plays while a timer is running - the same trick music/podcast apps use to stop the browser from fully suspending the tab in the background. It's best-effort (Android Chrome respects this more reliably than iOS Safari), not a guarantee.
- A real system notification fires via a tiny service worker (`public/sw.js`) when the timer completes, as a second channel alongside the in-page sound/vibration - useful if you've switched apps and might not hear the tab.
- Timer state is saved to local storage, so even if the OS fully reclaims the tab's memory while you're away (a harsher scenario than just switching apps), reopening it recovers the correct remaining time instead of losing the timer.

Realistic expectation: for a 1-2 minute rest, switching to one other app and back on Android Chrome should work well. Locking the phone screen or leaving it backgrounded for a long time increases the chance the alert arrives late (the moment you return) rather than exactly on time - this is a platform restriction, not a bug to report.

## Progress & PRs

Tap the trend icon on the home screen to open `/analytics`. This is deliberately **not** scored by volume (weight x reps) - two things you flagged make that unreliable:

- **Bodyweight exercises** (Sit-Ups, Captain Chair) are logged with `weight = 0` meaning "no added weight", not "no load" - volume would read zero forever even as your reps climb. These are flagged `is_bodyweight` on the exercise (toggle it when adding a new custom exercise too) and scored by **best reps** instead, unless you set your bodyweight (prompted on the page) - once set, your bodyweight is added to the logged weight so these get proper estimated-1RM tracking too, same as everything else.
- **Everything else** is scored by **estimated 1-rep-max** (Epley formula: `weight x (1 + reps/30)`, capped at the rep-12 term to avoid drift on high-rep sets), not volume - so going heavier for fewer reps correctly shows up as progress even when total volume drops.
- **Cardio** doesn't fit either model, so it's tracked separately: best distance/duration as headline stats, duration charted over time, full detail (speed, incline, steps) in the tooltip/session list.

Each exercise's card shows its current PR, a "vs last session" delta, and a "NEW PR" badge when your most recent session set the record. Tapping a card opens a chart of that exercise's whole history, with the all-time-best point highlighted.

Performance note: the whole PR list loads in one query on page load (server-rendered, no spinner) - tapping into a single exercise's chart is a second small, fast query. The one real cost is that this page pulls in a charting library (recharts) that the rest of the app doesn't need, so it's a heavier page than Home or the logger - code-split so it doesn't affect their load time, but worth knowing if `/analytics` itself feels slower to open on a poor connection.

## Data model notes

- **Sets are stored individually**, not grouped like the spreadsheet (e.g. "2 sets @ 50kg" becomes two separate set rows). You asked for true set-by-set input since reps often differ per set — this is that, and it also means volume/PR calculations later will be exact rather than approximated.
- A **session** = one visit to one gym on one date. If you train chest, back, and cardio in the same visit, they're all `session_exercises` under that one session — this is how "multiple training parts in a day" is handled.
- Cardio exercises store different fields depending on the machine (`cardio_fields` on the exercise row) — Treadmill prompts speed/distance/duration, Stair Climber prompts steps/speed level/duration. Adding a new cardio machine type currently defaults to a duration-only prompt; ask me to wire up a specific field set if you add one.
- The **last-record lookup** (`getLastExerciseRecord`) is what powers the auto-prefill when you pick an exercise — it pulls your most recent sets for that exact exercise, regardless of which gym.

## What's next (not built yet, by design)

- Analytics (progress charts, volume trends)
- Personal records (PR) tracking and celebration
- Nutrition / protein log (there's a `Protein` tab in your spreadsheet this could extend)
- Editing the date/gym of an already-saved session (currently you'd delete and re-log)
- Reordering exercises within a session

Happy to build any of these next — just say the word.
