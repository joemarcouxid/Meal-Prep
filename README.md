# Fuel — track day eating

A small static web app that tells a high school runner what to eat and when, built around the time practice actually starts. Handles more than one athlete, with separate content for sprinters and middle distance runners. No build step, no dependencies, no backend, no accounts. Drop it on GitHub Pages and it works.

Written to be read by the athlete, not about them.

## What it does

- **Two or more athletes**, switched from the bar at the top, each with their own setup
- **Two disciplines.** Sprint mode has hard sprints, normal practice, lift + track, easy/drills, rest and meet. Middle distance mode has interval session, tempo, long run, easy miles, lift + run, rest and meet — with its own week template, its own meals and its own meet-day guide
- A schedule with **real clock times** worked out from that athlete's practice start and length
- Highlights whichever meal or snack is up next right now
- Meet mode rebuilds the schedule around the first race time
- **Portions in hand sizes**, changing by training day, framed as floors rather than targets
- A one-week meal template you can swap items in and out of
- A tappable shopping list, shared across athletes
- A fueling check-in covering energy, hunger, soreness, sleep, illness, bone pain, strength and performance
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

The app ships with two blank athletes, one sprint and one middle distance. Name them in the Setup section at the bottom, then switch between them with the bar at the top. **Add** creates another; **Remove this athlete** deletes the current one.

| Field | Used for |
|---|---|
| Name | The switcher tab and the Setup heading |
| Events | The line in the header |
| Type of runner | Swaps the whole day set, week template, meals, portions and meet guide |
| Practice starts | Anchors the pre-training snack, 90 min before |
| Practice runs about | Anchors recovery and dinner, from when practice ends |
| Include the period question | Shows or hides that one check-in question |

Meet mode adds a first-race time and rebuilds around that instead.

Breakfast, mid-morning and lunch are shown as words rather than clock times, because school schedules vary too much for a made-up number to be useful.

The app seeds two athletes on first load: Mia on sprints and Titus on middle distance. Those two names are in `app.js`, in the `seed()` function, which means they are visible in the public repo. Blank the two `name:` strings there if you'd rather they weren't — the app works identically, the tabs just read "Sprinter" and "Middle distance" until someone types a name in Setup.

Seeding only happens on a browser that has never run the app. Once local storage exists, editing `seed()` changes nothing on that device; rename in Setup instead. Bumping `KEY_ATHLETES` to a new version string resets every device back to the seed and discards whatever was saved.

## Portions

Portions are given in hand sizes — cupped hand, palm, fist, thumb — and change with the training day. Hands scale with the athlete, so the same instruction gives a 15-year-old and an 18-year-old different amounts without either of them counting anything.

Every portion is written as a **minimum**. The app never suggests eating less, and the check-in's worst-case output points at a doctor rather than at a smaller plate.

## Notes on what changed and why

- **No weight or height field.** The old version collected both and never used either for anything. A weight box in a food app aimed at a teenage athlete is a downside with no upside, so it's gone.
- **No calorie, gram or macro numbers anywhere.** Portions are hand sizes only. The whole app is built around eating enough, not tracking.
- **The check-in never tells anyone to eat less.** Its worst-case output points at a doctor or a sports dietitian.
- **Middle distance is not sprint content with the labels changed.** Different day types, different meals, different weekly template, higher carbohydrate portions, different meet-day structure for a prelim and final.

## Editing the content

All the food is plain data at the top of `app.js`:

- `SPRINT_DAYS` / `MIDDLE_DAYS` — the training modes, their copy, meals and portions
- `SPRINT_WEEK` / `MIDDLE_WEEK` — the seven-day tables
- `SPRINT_MEET` / `MIDDLE_MEET` — the meet-day guides
- `ANCHORS` — when each slot happens (a fixed word, or an offset from practice start / practice end / first race)
- `groceries` — the shopping list

To add a third discipline, add a day array, a week array and a meet array, then register them in `DISCIPLINES` and add an `<option>` to the `discipline` select in `index.html`.

Change the strings, refresh, done.

## Evidence base

- ACSM / NYSHSI — Optimal nutrition for youth athletes: food sources and fuel timing
- ACSM — The Adolescent Athlete and the Team Physician, 2026 consensus statement
- IOC 2023 consensus statement on Relative Energy Deficiency in Sport
- NCAA Sport Science Institute — training and performance
- NCAA banned substances and supplement warning

Two things worth knowing about the evidence. First, the REDs framework is the standard reference but is not uncontested — a 2024 review argues the empirical basis for REDs as a discrete syndrome is limited and that its symptoms are multifactorial. That does not change the underlying advice to avoid under-fueling, but it is why the check-in prompts a conversation with a doctor rather than presenting itself as a screening tool.

Second, the app recommends easily digested carbohydrate such as pretzels and applesauce 60–90 minutes before training, whereas the NYSHSI paper advises favouring lower-glycaemic foods pre-exercise. At that distance from the session digestibility matters more, but the divergence is deliberate rather than accidental.

**Not covered:** iron, calcium and vitamin D. These are where adolescent athletes most often actually run short, particularly menstruating athletes and anyone running real mileage. Worth adding.

This is an educational planning tool. It does not diagnose or treat anything.

## Privacy

Everything typed in stays in the browser's local storage on that one device. There is no server, no analytics, and no network request of any kind except the Google Fonts stylesheet in `index.html`. Delete that one `<link>` if you'd rather have zero external requests; the app falls back to system fonts.

## Files

```text
meal-prep/
├── index.html
├── styles.css
├── app.js
└── README.md
```
