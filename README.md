# Fuel — sprint day eating

A small static web app that tells a high school sprinter what to eat and when, built around the time practice actually starts. No build step, no dependencies, no backend, no accounts. Drop it on GitHub Pages and it works.

Written to be read by the athlete, not about her.

## What it does

- Six training modes: hard sprints, normal practice, lift + track, easy/drills, rest, meet
- A schedule with **real clock times** worked out from your practice start and length
- Highlights whichever meal or snack is up next right now
- Meet mode rebuilds the schedule around your first race time
- A one-week meal template you can swap items in and out of
- A tappable shopping list that remembers what you've crossed off
- A fueling check-in that flags when under-fueling might be the problem
- Print view for sticking on the fridge
- Sources for every principle the app is built on

## Deploy on GitHub Pages

1. Create a repository, e.g. `fuel`.
2. Put these four files in the **root**:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
3. Commit.
4. **Settings → Pages → Build and deployment**
5. Source: **Deploy from a branch**. Branch: `main`, folder: `/ (root)`. Save.

GitHub gives you the public URL a minute or two later. On a phone, use "Add to Home Screen" and it opens like an app.

## Setting it up

The Your setup section at the bottom takes four things:

| Field | Used for |
|---|---|
| Name | The line in the header |
| Events | The line in the header |
| Practice starts | Anchors the pre-practice snack (90 min before) |
| Practice runs about | Anchors recovery and dinner (after practice ends) |

Meet mode adds a first-race time and rebuilds around that instead.

Breakfast, mid-morning and lunch are shown as words rather than clock times, because school schedules vary too much for a made-up number to be useful.

## Notes on what changed and why

- **No weight or height field.** The old version collected both and never used either for anything. A weight box in a food app aimed at a teenage athlete is a downside with no upside, so it's gone.
- **No calorie or macro numbers anywhere.** Deliberate. The whole app is built around eating enough, not tracking.
- **The check-in never tells anyone to eat less.** Its worst-case output points at a doctor or a sports dietitian.

## Editing the content

All the food is plain data at the top of `app.js`:

- `plans` — the six training modes and their meals
- `ANCHORS` — when each slot happens (fixed word, or an offset from practice start / practice end / first race)
- `weekly` — the seven-day table
- `groceries` — the shopping list

Change the strings, refresh, done.

## Evidence base

- NCAA Sport Science Institute — nutrition, hydration and performance
- ACSM / NYSHSI — Optimal nutrition for youth athletes
- ACSM — adolescent athlete consensus statement
- IOC consensus statement on Relative Energy Deficiency in Sport (RED-S)
- NCAA supplement and banned-substance guidance

This is an educational planning tool. It does not diagnose or treat anything.

## Privacy

Everything typed in stays in the browser's local storage on that one device. There is no server, no analytics, and no network request of any kind except the Google Fonts stylesheet in `index.html`. Delete that one `<link>` if you'd rather have zero external requests; the app falls back to system fonts.

## Files

```text
fuel/
├── index.html
├── styles.css
├── app.js
└── README.md
```
