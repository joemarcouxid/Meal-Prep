# Fuel — track day eating

A small static web app that tells a high school runner what to eat and when, built around the time practice actually starts. Handles more than one athlete, with separate content for sprinters and middle distance runners. No build step, no dependencies, no backend, no accounts. Drop it on GitHub Pages and it works.

Written to be read by the athlete, not about them.

## What it does

- **Opens on "Now".** One big card: what to eat next, when, and how long until then. Below it, the next two slots and what should be in the bag today. After 8:30 PM it flips to "pack tonight for tomorrow".
- **Set the week once.** Each athlete has a Mon–Sun schedule (hard, lift, easy, rest, meet…). The app picks today's plan from it automatically. A one-day change ("Different training today?") lasts only for that day.
- **Phone reminders.** The Week tab builds a calendar file with repeating alarms on practice days: mid-morning snack, before practice, right after, and "pack tomorrow's bag". No server needed.
- **Installs to the home screen and works offline**, so it opens at meets with no signal.
- Five tabs: Now, Today (full timeline + hand-size portions), Meet (race-time plan + tickable meet bag), Week (schedule, reminders, menu ideas), More (check-in, shopping list, setup, sources).
- **Seasons.** Off-season, track season and summer, each with its own starting week. A new athlete gets the season that matches the month. Summer drops the school-day wording.
- **Foods you won't eat.** Each athlete taps foods they skip. Every suggestion, bag, meet guide and calendar reminder swaps them out automatically.
- **"Plan fell through?"** Best picks at the cafeteria, gas station, fast food, vending machine, an empty fridge, meet concessions or a coffee shop.
- **Family view** (button in the top bar). Tomorrow's bag for each kid, a 7-day grid for everyone, and a shopping list built from the next 7 days with counts for snacks.
- Two disciplines (sprint, middle distance) with separate day types, meals, bags and meet guides. Any number of athletes.
- Print view prints today's plan for the fridge.

## Deploy on GitHub Pages

1. Create a repository, e.g. `fuel`.
2. Put everything in the **root**: `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `sw.js` and the `icons/` folder.
3. Commit.
4. **Settings → Pages → Build and deployment**
5. Source: **Deploy from a branch**. Branch: `main`, folder: `/ (root)`. Save.

GitHub gives you the public URL a minute or two later. On a phone, use "Add to Home Screen" (iPhone: Safari → Share) and it opens like an app.

**When you change any file, bump `VERSION` in `sw.js`** (e.g. `fuel-v5.1`). Installed phones keep a cached copy for offline use; the new version string is what tells them to refresh it.

## Setting it up

The app ships with two blank athletes, one sprint and one middle distance. Name them in the Setup section at the bottom, then switch between them with the bar at the top. **Add** creates another; **Remove this athlete** deletes the current one.

| Field | Used for |
|---|---|
| Name | The switcher tab and the Setup heading |
| Events | The line in the header |
| Type of runner | Swaps the whole day set, week template, meals, portions and meet guide |
| Your week (Week tab) | Which plan each day of the week gets |
| Practice starts (Week tab) | Anchors the pre-training snack, 90 min before |
| Practice runs about (Week tab) | Anchors recovery and dinner, from when practice ends |
| Include the period question | Shows or hides that one check-in question |

Meet mode adds a first-race time and rebuilds around that instead.

Breakfast, mid-morning and lunch are shown as words rather than clock times, because school schedules vary too much for a made-up number to be useful.

The app seeds two athletes on first load: Mia on sprints and Titus on middle distance. Those two names are in `app.js`, in the `seed()` function, which means they are visible in the public repo. Blank the two `name:` strings there if you'd rather they weren't — the app works identically, the tabs just read "Sprinter" and "Middle distance" until someone types a name in Setup.

Seeding only happens on a browser that has never run the app. Once local storage exists, editing `seed()` changes nothing on that device; rename in Setup instead. Saved data from the previous version (`fuelAthletesV4`) is migrated automatically on first load, so names and practice times carry over.

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
- `SPRINT_BAG` / `MIDDLE_BAG` / `MEET_BAG` — what goes in the bag for each day type
- `SEASON_WEEK` / `SEASONS` — the starting schedule for each season
- `FOODS` — foods an athlete can swap out, and what replaces them (in order of preference)
- `GRAB` — the "Plan fell through?" places
- `COUNTED` / `STAPLES` / `ALWAYS` — how the family shopping list is built
- `ANCHORS` — when each slot happens (a fixed word, or an offset from practice start / practice end / first race)

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

Everything typed in stays in the browser's local storage on that one device. There is no server, no analytics, and no external network request of any kind. Fonts are the phone's own.

## Files

```text
meal-prep/
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest   home-screen install
├── sw.js                  offline cache (bump VERSION on every change)
├── icons/
└── README.md
```
