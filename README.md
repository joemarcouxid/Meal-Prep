# Teen Sprinter Fuel Coach

A simple, static, GitHub Pages-ready web app for food-first fueling guidance for a high-school 100/200/400 sprinter.

## What is included

- Editable athlete profile
- Hard sprint, normal practice, lift + track, easy, rest, and meet-day modes
- Daily meal timing suggestions
- 7-day meal template
- Meet-day fueling guide
- Weekly grocery list
- Simple fueling/recovery check-in
- Local browser save using `localStorage`
- Print-friendly weekly plan
- Evidence/source section
- No backend, database, login, or API required

## Publish on GitHub Pages

1. Create a new GitHub repository, for example `teen-sprinter-fuel-coach`.
2. Upload these files into the **root** of the repository:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
3. Commit the files.
4. In the repository, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select the `main` branch and `/ (root)`.
7. Save.

GitHub will provide the public Pages URL after deployment.

## Customize

The starting athlete profile in `app.js` is:

- Age: 17
- Height: 5'6"
- Weight: 130 lb
- Events: 100 / 200 / 400
- Practice time: 3:30 PM

The user can change these fields in the app and save them locally.

## Evidence base

The app is educational and draws on guidance from:

- NCAA Sport Science Institute — Nutrition, Hydration & Sleep
- ACSM / NYSHSI — Optimal Nutrition for Youth Athletes
- ACSM — Adolescent Athlete consensus resources
- International Olympic Committee consensus on Relative Energy Deficiency in Sport (RED-S)
- NCAA supplement and banned-substance guidance

This is not a medical app and does not diagnose or treat conditions.

## Privacy

All editable profile information is stored only in the browser using local storage. Nothing is transmitted anywhere by this app.

## Files

```text
teen-sprinter-fuel-coach/
├── index.html
├── styles.css
├── app.js
└── README.md
```
