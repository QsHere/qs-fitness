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

If you've already run `supabase/schema.sql` once on a live project, don't re-run the whole file for future schema changes - instead run the individual files in `supabase/migrations/` in order, in the Supabase SQL Editor. Right now there's one:

- `001_treadmill_incline.sql` - adds an incline (%) field to Treadmill.

## Changes in this update

- Removed the passcode gate entirely (deleted `middleware.ts`, `app/unlock/`, `app/api/unlock/`) - per your request, ship it open for now.
- Added a real app icon + `public/manifest.json`, generated from your logo, so Chrome can offer a proper Install rather than only a shortcut.
- Fixed the day-detail sheet not scrolling: the drag-to-dismiss gesture was capturing the same touch movement as scrolling. Dragging is now confined to the little handle bar at the top; the list below scrolls independently.
- You can now tap any exercise in the "added so far" list (mid-session) or in the review screen to reopen it and edit its sets/notes, not just delete it.
- Rebuilt the logger's navigation to use real browser history. Previously, going back mid-session (via the phone's back button/gesture) could exit the whole flow and silently drop everything you'd entered, because the in-app step tracking and the browser's own history had no way to stay in sync - some screens "had" a working back action and others didn't, which was a symptom of that mismatch. Now every step is a real history entry, so the hardware back button always steps back exactly one screen and never wipes your progress, no matter how many body parts/exercises you've added.
- Added Treadmill incline (%). See `supabase/migrations/001_treadmill_incline.sql` for your already-live database.
- Calendar dots are now 2 colours: red for upper body (Chest/Back/Shoulder/Arm/Abs), blue for Lower Body, with Cardio as a neutral grey (it doesn't cleanly belong to either - see `lib/constants.ts` if you want to change that mapping). The day-detail view and logger still show every body part's real, distinct colour - the simplification is calendar-only.
- Replaced the body-part tile icons with emoji that actually match: 🏋️ Chest, 🧗 Back, 🙆 Shoulder, 🔥 Abs, 💪 Arm, ❤️‍🔥 Cardio, 🦵 Lower Body.
- Added error boundaries (`app/error.tsx`, `app/log/error.tsx`) and `export const dynamic = "force-dynamic"` on the data-loading pages. This won't eliminate every possible transient Supabase hiccup, but it means a server-side error now shows a "Try again" button in-app instead of a hard crash that only a manual refresh could fix - and removing the static/cached rendering path removes one likely source of that class of error.

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
