/* ---------------------------------------------------------
   Fuel — track day eating
   No frameworks, no build step, no network calls.
   Opens on "what do I eat next", picks today from the athlete's week.
   Everything typed in stays in this browser.
   --------------------------------------------------------- */

(() => {
  "use strict";

  const KEY_OLD = "fuelAthletesV4";      // earlier version; migrated on first load
  const KEY_ATHLETES = "fuelAthletesV5";
  const KEY_CART = "fuelCartV3";
  const KEY_MEETBAG = "fuelMeetBagV1";

  /* ---------- tiny helpers ---------- */

  const $ = (id) => document.getElementById(id);

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));

  // localStorage throws in private mode on some browsers. Never let that break the page.
  const store = {
    get(key) {
      try { return JSON.parse(localStorage.getItem(key)); }
      catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch { return false; }
    }
  };

  const toMinutes = (hhmm) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || "");
    if (!m) return null;
    const h = Number(m[1]), mi = Number(m[2]);
    return (h > 23 || mi > 59) ? null : h * 60 + mi;
  };

  const clock = (mins) => {
    const w = ((mins % 1440) + 1440) % 1440;
    let h = Math.floor(w / 60);
    const m = w % 60;
    const ampm = h < 12 ? "AM" : "PM";
    h = h % 12 || 12;
    return { text: `${h}:${String(m).padStart(2, "0")}`, ampm };
  };

  /* ---------- when each slot happens ---------- */
  // Fixed slots show a word, not a fake precise time — school schedules vary too much.
  // The hidden `about` value is only used to work out which slot is up next.

  const ANCHORS = {
    breakfast: { word: "Before school", about: 405 },
    snack:     { word: "Mid-morning",   about: 615 },
    lunch:     { word: "Lunch",         about: 720 },
    pre:       { rel: "start", offset: -90 },
    post:      { rel: "end",   offset: 20 },
    dinner:    { rel: "end",   offset: 105 },
    evening:   { rel: "end",   offset: 240 },

    raceMeal:  { rel: "race",  offset: -210 },
    raceSnack: { rel: "race",  offset: -75 },
    shortGap:  { word: "Under 90 min between races", about: 1 },
    longGap:   { word: "2+ hrs between races",       about: 2 },
    afterLast: { word: "After your last race",       about: 3 },
    fullMeal:  { word: "Within 2 hours",             about: 4 }
  };

  /* ---------- portion sets ---------- */
  // Hand sizes, because hands scale with the athlete. Always a floor, never a target.

  const P = (carb, protein, produce, fat, note) => ({ carb, protein, produce, fat, note });

  /* ---------- sprint ---------- */

  const SPRINT_DAYS = [
    {
      key: "hard", chip: "Hard sprints",
      title: "Big day. Eat like it.",
      note: "Speed endurance and hard sprint work burn through the carbs stored in your muscles. Today you eat the most, not the least.",
      portions: P("2–3 cupped hands", "1–2 palms", "1–2 fists", "1 thumb",
        "Put the extra carbs at lunch and dinner rather than trying to cram them in before practice."),
      meals: [
        ["breakfast", "Breakfast", "Two eggs, a bagel with jam, a banana, milk"],
        ["snack", "Snack", "Greek yogurt and granola"],
        ["lunch", "Lunch", "Chicken with a real scoop of rice, fruit, milk or water"],
        ["pre", "Before practice", "Banana and pretzels, or applesauce and a granola bar", "Skipping this is why the last rep hurts"],
        ["post", "Right after", "Chocolate milk and a banana"],
        ["dinner", "Dinner", "Mac and cheese with chicken, plus fruit or a vegetable"]
      ]
    },
    {
      key: "normal", chip: "Normal practice",
      title: "Standard fuel day",
      note: "The school-day gap is what gets people. Six hours between lunch and practice with nothing in between is why your legs feel dead at 4pm.",
      portions: P("2 cupped hands", "1 palm", "1–2 fists", "1 thumb",
        "The snack between lunch and practice matters more than the exact size of any meal."),
      meals: [
        ["breakfast", "Breakfast", "Two eggs, toast or a bagel, fruit, milk"],
        ["snack", "Snack", "Yogurt and granola, or cheese and crackers"],
        ["lunch", "Lunch", "Chicken rice bowl, or a turkey sandwich and fruit"],
        ["pre", "Before practice", "Banana and a granola bar"],
        ["post", "Right after", "Chocolate milk, or yogurt and fruit"],
        ["dinner", "Dinner", "Chicken and rice, tacos, pasta, or mac and cheese built out"]
      ]
    },
    {
      key: "lift", chip: "Lift + track",
      title: "Lift day is build day",
      note: "Lifting breaks muscle down on purpose. Carbs and protein spread across the whole day are what put it back together stronger.",
      portions: P("2 cupped hands", "2 palms", "1 fist", "1 thumb",
        "Protein spread across the day beats one enormous dinner. Aim for some at every meal."),
      meals: [
        ["breakfast", "Breakfast", "Two eggs, a bagel, a banana, yogurt"],
        ["snack", "Snack", "Greek yogurt and granola"],
        ["lunch", "Lunch", "Chicken, rice, fruit"],
        ["pre", "Before training", "Half a bagel, or a banana and pretzels"],
        ["post", "Right after", "Chocolate milk plus yogurt or a sandwich"],
        ["dinner", "Dinner", "Chicken or beef with rice or pasta, plus fruit or a vegetable"]
      ]
    },
    {
      key: "easy", chip: "Easy / drills",
      title: "Easy day, normal food",
      note: "Easy sessions are where your body actually absorbs the hard ones. That process runs on food. This is not a day to eat less.",
      portions: P("1–2 cupped hands", "1 palm", "1–2 fists", "1 thumb",
        "Smaller than a hard day, but not a different way of eating."),
      meals: [
        ["breakfast", "Breakfast", "Two eggs, toast, fruit"],
        ["snack", "Snack", "Yogurt, or cheese and crackers"],
        ["lunch", "Lunch", "Turkey sandwich, or chicken and rice with fruit"],
        ["pre", "Before practice", "Fruit and crackers if you're hungry"],
        ["post", "Right after", "Milk or yogurt with fruit"],
        ["dinner", "Dinner", "Whatever the family is eating, with a carb, a protein and some produce"]
      ]
    },
    {
      key: "rest", chip: "Rest",
      title: "Rest counts as training",
      note: "You might be a little less hungry today, and that's fine. But food isn't something you earn by working out. Recovery is the whole point of a rest day.",
      portions: P("1–2 cupped hands", "1 palm", "1–2 fists", "1 thumb",
        "Your body is still repairing yesterday. Rest days are when that work actually happens."),
      meals: [
        ["breakfast", "Breakfast", "Eggs, toast, fruit"],
        ["snack", "Snack", "Yogurt and fruit"],
        ["lunch", "Lunch", "Chicken rice bowl"],
        ["pre", "Afternoon", "Granola and milk, or cheese and crackers"],
        ["dinner", "Dinner", "Pasta, chicken and rice, tacos, or mac and cheese with protein"],
        ["evening", "If you're hungry later", "Cereal and milk, or yogurt"]
      ]
    },
    {
      key: "meet", chip: "Meet",
      title: "Race day: nothing new",
      note: "Only eat things you've already eaten before a practice. Race day is the worst possible day to find out a food doesn't sit right with you.",
      portions: P("2 cupped hands", "1 palm", "1 fist", "half a thumb",
        "That's the meal 3–4 hours out. Everything after it is small and simple — keep fat and fibre low so it clears your stomach."),
      meals: [
        ["raceMeal", "Real meal", "Bagel with jam, two eggs, a banana, yogurt, water"],
        ["raceSnack", "Small top-up", "Banana, applesauce, pretzels, or half a bagel", "Small and simple. You're not filling up."],
        ["shortGap", "Quick refuel", "Sports drink with applesauce, banana, crackers, or pretzels"],
        ["longGap", "Bigger refuel", "Small turkey sandwich, a bagel, or a modest chicken and rice"],
        ["afterLast", "Recover", "Chocolate milk and a banana"],
        ["fullMeal", "Full meal", "Carbs, protein, produce, fluids"]
      ]
    }
  ];

  const SPRINT_WEEK = [
    ["Mon", "Eggs, bagel, banana", "Chicken and rice, fruit", "Banana and pretzels", "Chocolate milk", "Mac and cheese, chicken, fruit"],
    ["Tue", "Eggs, toast, fruit", "Turkey sandwich, yogurt", "Banana and crackers", "Yogurt and granola", "Chicken tacos and rice"],
    ["Wed", "Waffles, eggs, fruit", "Chicken and rice", "Half a bagel with jam", "Chocolate milk", "Spaghetti with meat sauce"],
    ["Thu", "Egg sandwich, banana", "Mac and cheese with chicken", "Applesauce and pretzels", "Chocolate milk", "Chicken, rice, vegetable"],
    ["Fri", "Eggs, toast, fruit", "Chicken quesadilla, fruit", "Granola bar and banana", "Yogurt and fruit", "Burger or chicken sandwich with potatoes"],
    ["Sat", "Meet or training breakfast", "Depends on race times", "Depends on race times", "Carbs and protein", "Big recovery dinner"],
    ["Sun", "Eggs, toast, fruit", "Chicken rice bowl", "Whenever you're hungry", "Whenever you're hungry", "Pasta, or mac and cheese built out"]
  ];

  const SPRINT_MEET = [
    ["3–4 hours out", "Bagel with jam, two eggs, a banana, yogurt, water. Your real meal of the day."],
    ["60–90 min out", "Banana, applesauce, pretzels, or half a bagel. Small and simple."],
    ["Under 90 min between races", "Sports drink plus applesauce, banana, crackers, or pretzels. You are topping up, not eating a meal."],
    ["2+ hours between races", "Small turkey sandwich, a bagel, or a modest chicken and rice."],
    ["After your last race", "Chocolate milk and a banana, or anything with carbs and protein."],
    ["Within 2 hours", "A full meal. Carbs, protein, produce, fluids."]
  ];

  /* ---------- middle distance ---------- */

  const MIDDLE_DAYS = [
    {
      key: "workout", chip: "Interval session",
      title: "Interval day. Fuel it properly.",
      note: "Reps at race pace drain the carbs stored in your legs faster than anything else you do all week. Under-fuel this session and you get a worse workout, not a tougher one.",
      portions: P("3 cupped hands", "1–2 palms", "1–2 fists", "1 thumb",
        "This is the biggest carb day of your week. Breakfast and lunch both need to be real meals."),
      meals: [
        ["breakfast", "Breakfast", "Oatmeal or cereal with milk, two eggs, a banana"],
        ["snack", "Snack", "Greek yogurt and granola, or a bagel"],
        ["lunch", "Lunch", "Chicken with a real scoop of rice or pasta, fruit, milk"],
        ["pre", "Before the session", "Banana and pretzels, or applesauce and a granola bar", "Do not run reps on an empty stomach"],
        ["post", "Right after", "Chocolate milk and a banana"],
        ["dinner", "Dinner", "Pasta or rice with chicken or beef, plus fruit or a vegetable"]
      ]
    },
    {
      key: "tempo", chip: "Tempo",
      title: "Tempo day",
      note: "Sustained running at a real effort still uses a lot of stored carbohydrate, even though it doesn't feel as violent as intervals.",
      portions: P("2–3 cupped hands", "1 palm", "1–2 fists", "1 thumb",
        "Keep lunch substantial. A light lunch shows up two miles into a tempo."),
      meals: [
        ["breakfast", "Breakfast", "Oatmeal or toast with peanut butter, eggs, fruit"],
        ["snack", "Snack", "Yogurt and granola, or crackers and cheese"],
        ["lunch", "Lunch", "Chicken rice bowl, or a big turkey sandwich with fruit"],
        ["pre", "Before the run", "Banana and a granola bar"],
        ["post", "Right after", "Chocolate milk, or yogurt and fruit"],
        ["dinner", "Dinner", "Pasta, chicken and rice, tacos, or mac and cheese built out"]
      ]
    },
    {
      key: "long", chip: "Long run",
      title: "Long run day",
      note: "The longest run of the week costs the most energy of the week. It is also the run people most often do underfed, because it lands on a weekend morning.",
      portions: P("3 cupped hands", "1–2 palms", "1–2 fists", "1–2 thumbs",
        "Eat something before you go, even if it's small and even if it's early. Then eat properly again within an hour of finishing."),
      meals: [
        ["breakfast", "Before the run", "Toast with jam, or a bagel and a banana. Small, low fat, low fibre."],
        ["snack", "Right after", "Chocolate milk and a banana, or cereal with milk"],
        ["lunch", "Proper meal", "Eggs and potatoes, a sandwich with fruit, or leftovers from last night"],
        ["pre", "Afternoon", "Yogurt and granola, or crackers and cheese"],
        ["dinner", "Dinner", "Pasta, rice bowl, or anything with a serious carb portion"],
        ["evening", "If you're hungry later", "Cereal and milk, or toast and peanut butter"]
      ]
    },
    {
      key: "easy", chip: "Easy miles",
      title: "Easy day, normal food",
      note: "Easy mileage is where your body absorbs the hard sessions. It is still running, and it still costs energy. This is not a day to eat less.",
      portions: P("2 cupped hands", "1 palm", "1–2 fists", "1 thumb",
        "Easy days are still training days. The mileage adds up even when the effort doesn't."),
      meals: [
        ["breakfast", "Breakfast", "Cereal or oatmeal with milk, fruit, eggs"],
        ["snack", "Snack", "Yogurt, or cheese and crackers"],
        ["lunch", "Lunch", "Turkey sandwich, or chicken and rice with fruit"],
        ["pre", "Before the run", "Banana, or crackers if you're hungry"],
        ["post", "Right after", "Milk or yogurt with fruit"],
        ["dinner", "Dinner", "Whatever the family is eating, with a real carb portion"]
      ]
    },
    {
      key: "lift", chip: "Lift + run",
      title: "Lift day is build day",
      note: "Lifting breaks muscle down on purpose, and you're running on top of it. Carbs and protein spread across the whole day are what put it back together.",
      portions: P("2–3 cupped hands", "2 palms", "1 fist", "1 thumb",
        "Protein at every meal beats one huge dinner. Carbs stay high because you're still running."),
      meals: [
        ["breakfast", "Breakfast", "Two eggs, a bagel, a banana, yogurt"],
        ["snack", "Snack", "Greek yogurt and granola"],
        ["lunch", "Lunch", "Chicken, rice, fruit"],
        ["pre", "Before training", "Half a bagel, or a banana and pretzels"],
        ["post", "Right after", "Chocolate milk plus yogurt or a sandwich"],
        ["dinner", "Dinner", "Chicken or beef with rice or pasta, plus fruit or a vegetable"]
      ]
    },
    {
      key: "rest", chip: "Rest",
      title: "Rest counts as training",
      note: "You might be a little less hungry today, and that's fine. But food isn't something you earn by running. Rest days are when the adaptation from the hard days actually happens.",
      portions: P("2 cupped hands", "1 palm", "1–2 fists", "1 thumb",
        "Distance runners often under-eat on rest days and then wonder why Monday's session feels flat."),
      meals: [
        ["breakfast", "Breakfast", "Eggs, toast, fruit"],
        ["snack", "Snack", "Yogurt and fruit"],
        ["lunch", "Lunch", "Chicken rice bowl"],
        ["pre", "Afternoon", "Granola and milk, or cheese and crackers"],
        ["dinner", "Dinner", "Pasta, chicken and rice, tacos, or mac and cheese with protein"],
        ["evening", "If you're hungry later", "Cereal and milk, or yogurt"]
      ]
    },
    {
      key: "meet", chip: "Meet",
      title: "Race day: nothing new",
      note: "Only eat things you've already eaten before a workout. Race day is the worst possible day to find out a food doesn't sit right with you.",
      portions: P("2 cupped hands", "1 palm", "1 fist", "half a thumb",
        "That's the meal 3–4 hours out. Keep fat and fibre low so it clears your stomach before you warm up."),
      meals: [
        ["raceMeal", "Real meal", "Bagel with jam, two eggs, a banana, yogurt, water"],
        ["raceSnack", "Small top-up", "Banana, applesauce, pretzels, or half a bagel", "Small and simple. You're not filling up."],
        ["shortGap", "Prelim to final, short gap", "Sports drink with applesauce, banana, crackers, or pretzels"],
        ["longGap", "Prelim to final, 2+ hrs", "Small turkey sandwich, a bagel, or a modest bowl of rice"],
        ["afterLast", "After your last race", "Chocolate milk and a banana"],
        ["fullMeal", "Within 2 hours", "Carbs, protein, produce, fluids"]
      ]
    }
  ];

  const MIDDLE_WEEK = [
    ["Mon", "Oatmeal, eggs, banana", "Chicken and rice, fruit", "Banana and pretzels", "Chocolate milk", "Pasta with meat sauce, fruit"],
    ["Tue", "Cereal, eggs, fruit", "Turkey sandwich, yogurt", "Banana and crackers", "Yogurt and granola", "Chicken, rice, vegetable"],
    ["Wed", "Waffles or oatmeal, eggs", "Chicken rice bowl", "Half a bagel with jam", "Chocolate milk", "Tacos with rice and beans"],
    ["Thu", "Egg sandwich, banana", "Mac and cheese with chicken", "Applesauce and pretzels", "Chocolate milk", "Pasta, chicken, fruit"],
    ["Fri", "Toast with peanut butter, eggs", "Chicken quesadilla, fruit", "Granola bar and banana", "Yogurt and fruit", "Rice bowl or burger with potatoes"],
    ["Sat", "Small bagel before racing", "Depends on race times", "Depends on race times", "Chocolate milk and fruit", "Big recovery dinner"],
    ["Sun", "Toast and jam before the long run", "Real meal after: eggs, potatoes, fruit", "Yogurt and granola", "Whenever you're hungry", "Pasta or a loaded rice bowl"]
  ];

  const MIDDLE_MEET = [
    ["3–4 hours out", "Bagel with jam, two eggs, a banana, yogurt, water. Your real meal of the day."],
    ["60–90 min out", "Banana, applesauce, pretzels, or half a bagel. Low fat, low fibre."],
    ["Prelim and final on the same day, short gap", "Sports drink plus applesauce, a banana, or pretzels. Topping up, not a meal."],
    ["Prelim and final 2+ hours apart", "Small turkey sandwich, a bagel, or a modest bowl of rice."],
    ["After your last race", "Chocolate milk and a banana, or anything with carbs and protein."],
    ["Within 2 hours", "A full meal. Carbs, protein, produce, fluids."]
  ];

  const DISCIPLINES = {
    sprint: { label: "Sprinter", days: SPRINT_DAYS, week: SPRINT_WEEK, meet: SPRINT_MEET, events: "100 / 200 / 400" },
    middle: { label: "Middle distance", days: MIDDLE_DAYS, week: MIDDLE_WEEK, meet: MIDDLE_MEET, events: "800 / 1600" }
  };

  /* ---------- shopping ---------- */

  const groceries = {
    "Protein": ["Eggs", "Chicken", "Greek yogurt", "Milk", "Chocolate milk", "Turkey", "Ground beef", "Cheese"],
    "Carbs": ["Rice", "Mac and cheese", "Pasta", "Bagels", "Bread", "Tortillas", "Cereal", "Oatmeal", "Granola"],
    "Grab and go": ["Bananas", "Applesauce pouches", "Granola bars", "Pretzels", "Grapes or berries", "Crackers", "Peanut butter"],
    "Meets and hot days": ["Sports drink", "Extra water bottle", "Easy snacks that travel"]
  };

  /* ---------- what goes in the bag ---------- */
  // The athlete doesn't control dinner. They do control what's in the backpack.

  const SPRINT_BAG = {
    hard:   ["Mid-morning snack: yogurt and granola, or a bagel", "Before practice: banana and pretzels", "For right after: a shelf-stable chocolate milk", "Water bottle"],
    normal: ["A snack for between classes", "Before practice: banana and a granola bar", "For right after: chocolate milk or a yogurt", "Water bottle"],
    lift:   ["A snack for between classes", "Before training: half a bagel, or banana and pretzels", "For right after: chocolate milk and a sandwich", "Water bottle"],
    easy:   ["A snack for between classes", "Fruit and crackers in case you're hungry before practice", "Water bottle"],
    rest:   []
  };

  const MIDDLE_BAG = {
    workout: ["Mid-morning snack: yogurt and granola, or a bagel", "Before the session: banana and pretzels", "For right after: a shelf-stable chocolate milk", "Water bottle"],
    tempo:   ["A snack for between classes", "Before the run: banana and a granola bar", "For right after: chocolate milk or a yogurt", "Water bottle"],
    long:    ["Something small to eat before you head out, even if it's early", "Chocolate milk waiting for when you finish", "Water bottle"],
    easy:    ["A snack for between classes", "A banana or crackers in case you're hungry before the run", "Water bottle"],
    lift:    ["A snack for between classes", "Before training: half a bagel, or banana and pretzels", "For right after: chocolate milk and a sandwich", "Water bottle"],
    rest:    []
  };

  const MEET_BAG = [
    "Bagel or two", "Bananas", "Applesauce pouches", "Pretzels or crackers",
    "Sports drink", "Full water bottle", "Chocolate milk for after your last race",
    "Only foods you've eaten before a practice"
  ];

  // Index 0 is Sunday, to match Date.getDay().
  const DEFAULT_WEEK = {
    sprint: ["rest", "hard", "lift", "normal", "hard", "easy", "meet"],
    middle: ["rest", "workout", "easy", "lift", "tempo", "easy", "long"]
  };

  // Day types that mean an afternoon practice, for reminders.
  const NO_PRACTICE = new Set(["rest", "meet", "long"]);

  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
  const ICS_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

  /* ---------- athletes ---------- */

  const newAthlete = (discipline) => ({
    id: "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: "",
    events: DISCIPLINES[discipline].events,
    discipline,
    practiceStart: "15:30",
    practiceLength: 90,
    raceTime: "10:00",
    trackCycle: true,
    week: DEFAULT_WEEK[discipline].slice(),
    override: null,
    scheduleSet: false,
    remind: { snack: false, pre: true, post: true, pack: false }
  });

  // Fill in anything an older saved athlete is missing, and drop anything invalid.
  function normalise(a) {
    const disc = DISCIPLINES[a.discipline] ? a.discipline : "sprint";
    const keys = new Set(DISCIPLINES[disc].days.map((d) => d.key));
    const base = newAthlete(disc);
    const out = { ...base, ...a, discipline: disc };
    if (!Array.isArray(out.week) || out.week.length !== 7 || !out.week.every((k) => keys.has(k))) {
      out.week = DEFAULT_WEEK[disc].slice();
    }
    if (out.override && !keys.has(out.override.day)) out.override = null;
    out.remind = { ...base.remind, ...(a.remind || {}) };
    delete out.day;
    return out;
  }

  function seed() {
    const mia = { ...newAthlete("sprint"), name: "Mia" };
    const titus = { ...newAthlete("middle"), name: "Titus", trackCycle: false };
    return { list: [mia, titus], active: mia.id };
  }

  function loadState() {
    let s = store.get(KEY_ATHLETES);
    if (!s || !Array.isArray(s.list) || !s.list.length) {
      const old = store.get(KEY_OLD);
      s = (old && Array.isArray(old.list) && old.list.length) ? old : seed();
    }
    s.list = s.list.map(normalise);
    if (!s.list.some((a) => a.id === s.active)) s.active = s.list[0].id;
    return s;
  }

  let state = loadState();
  let cart = store.get(KEY_CART) || {};
  let meetBag = store.get(KEY_MEETBAG) || {};

  const persist = () => store.set(KEY_ATHLETES, state);

  const activeAthlete = () =>
    state.list.find((a) => a.id === state.active) || state.list[0];

  const disc = (a = activeAthlete()) => DISCIPLINES[a.discipline] || DISCIPLINES.sprint;

  const athleteLabel = (a) => a.name || DISCIPLINES[a.discipline].label;

  const isoDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  // Today's plan: a one-day change wins, otherwise the weekly schedule.
  function dayKeyFor(a, date) {
    if (a.override && a.override.date === isoDate(date)) return a.override.day;
    return a.week[date.getDay()];
  }

  const dayByKey = (a, key) => disc(a).days.find((x) => x.key === key) || disc(a).days[0];

  const bagFor = (a, key) => {
    if (key === "meet") return MEET_BAG;
    const table = a.discipline === "middle" ? MIDDLE_BAG : SPRINT_BAG;
    return table[key] || [];
  };

  const nowMinutes = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

  const fmt = (mins) => { const c = clock(mins); return `${c.text} ${c.ampm}`; };

  function until(mins, now) {
    const gap = mins - now;
    if (gap <= 0) return "now";
    const h = Math.floor(gap / 60), m = gap % 60;
    if (!h) return `in ${m} min`;
    return m ? `in ${h} hr ${m} min` : `in ${h} hr`;
  }

  /* ---------- times ---------- */

  function resolveTime(a, anchorKey, date) {
    const anc = ANCHORS[anchorKey];
    if (!anc) return { word: "", sort: 9999 };
    const weekend = date.getDay() === 0 || date.getDay() === 6;

    if (anc.word) {
      let word = anc.word;
      if (weekend && anchorKey === "breakfast") word = "Morning";
      if (weekend && anchorKey === "snack") word = "Late morning";
      return { word, sort: anc.about };
    }

    const start = toMinutes(a.practiceStart);
    const race = toMinutes(a.raceTime);
    const len = Number(a.practiceLength) || 90;

    let base = null;
    if (anc.rel === "start") base = start;
    else if (anc.rel === "end") base = start === null ? null : start + len;
    else if (anc.rel === "race") base = race;

    if (base === null) return { word: "—", sort: 9999 };
    const mins = base + anc.offset;
    return { ...clock(mins), sort: mins };
  }

  function buildRows(a, day, date) {
    return day.meals.map(([key, label, detail, tag]) => ({
      key, label, detail, tag, t: resolveTime(a, key, date)
    }));
  }

  // Which row is "up next". A slot stays current for 20 minutes after its time.
  function nextIndex(rows, now) {
    return rows.findIndex((r) => r.t.sort < 9999 && r.t.sort + 20 >= now);
  }

  /* ---------- rendering: shared ---------- */

  function renderAthleteTabs() {
    $("athleteTabs").innerHTML = state.list.map((a) => `
      <button type="button" data-id="${esc(a.id)}"
        class="${a.id === state.active ? "on" : ""}"
        aria-pressed="${a.id === state.active}">${esc(athleteLabel(a))}</button>
    `).join("");
  }

  function chipsHTML(a, current) {
    return disc(a).days.map((d) => `
      <button type="button" data-day="${esc(d.key)}"
        class="${d.key === current ? "on" : ""}"
        aria-pressed="${d.key === current}">${esc(d.chip)}</button>
    `).join("");
  }

  function setToday(a, key) {
    const today = new Date();
    a.override = key === a.week[today.getDay()] ? null : { date: isoDate(today), day: key };
    persist();
  }

  function listHTML(items) {
    return `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  }

  /* ---------- NOW ---------- */

  function renderNow() {
    const a = activeAthlete();
    const date = new Date();
    const now = nowMinutes(date);
    const key = dayKeyFor(a, date);
    const day = dayByKey(a, key);
    const changed = a.override && a.override.date === isoDate(date);

    $("nowDayline").innerHTML =
      `${esc(WEEKDAYS[date.getDay()])} · <b>${esc(day.chip)}</b>${changed ? ' <span class="pill">changed for today</span>' : ""}`;
    $("setupNudge").hidden = !!a.scheduleSet;
    $("nowChips").innerHTML = chipsHTML(a, key);

    if (key === "meet") return renderNowMeet(a, now);

    const rows = buildRows(a, day, date);
    const i = nextIndex(rows, now);
    const lastSort = Math.max(...rows.map((r) => r.t.sort).filter((s) => s < 9999));
    const evening = now >= 20 * 60 + 30 || i === -1 || now > lastSort + 20;

    if (evening) return renderNowTonight(a, date, now);

    const r = rows[i];
    const isNow = r.t.sort <= now;
    const when = r.t.word
      ? `<div class="nc-time worded">${esc(r.t.word)}</div>`
      : `<div class="nc-time">${esc(r.t.text)}<span>${esc(r.t.ampm)}</span></div>`;
    const countdown = r.t.word ? "" : `<div class="nc-count">${esc(isNow ? "Eat this now" : until(r.t.sort, now))}</div>`;

    $("nowCard").className = "nowcard" + (isNow ? " live" : "");
    $("nowCard").innerHTML = `
      <div class="nc-eyebrow">${isNow ? "Now" : "Up next"}</div>
      <div class="nc-head">${when}${countdown}</div>
      <h2 class="nc-label">${esc(r.label)}</h2>
      <p class="nc-food">${esc(r.detail)}</p>
      ${r.tag ? `<div class="tag">${esc(r.tag)}</div>` : ""}`;

    const later = rows.slice(i + 1, i + 3);
    $("nowAfter").innerHTML = later.length ? `
      <h3>After that</h3>
      ${later.map((x) => `
        <div class="after-row">
          <span class="after-when">${esc(x.t.word || `${x.t.text} ${x.t.ampm}`)}</span>
          <span>${x.t.word === x.label ? "" : `<b>${esc(x.label)}</b> `}${esc(x.detail)}</span>
        </div>`).join("")}` : "";

    // The bag only matters until practice starts.
    const bag = bagFor(a, key);
    const start = toMinutes(a.practiceStart);
    const showBag = bag.length && (start === null || now < start);
    $("nowBag").innerHTML = showBag ? `<h3>In your bag today</h3>${listHTML(bag)}` : "";
  }

  function renderNowTonight(a, date, now) {
    const tomorrow = addDays(date, 1);
    const tKey = dayKeyFor(a, tomorrow);
    const tDay = dayByKey(a, tKey);
    const first = tDay.meals[0];
    const late = now >= 20 * 60 + 30;

    $("nowCard").className = "nowcard";
    $("nowCard").innerHTML = `
      <div class="nc-eyebrow">${late ? "Tonight" : "Done with today's plan"}</div>
      <h2 class="nc-label">Still hungry? Eat.</h2>
      <p class="nc-food">Cereal and milk, yogurt, or toast and peanut butter. Being hungry at night after training is normal, not something to push through.</p>
      <div class="nc-tomorrow">Tomorrow is <b>${esc(tDay.chip)}</b>. First up: ${esc(first[2])}.</div>`;

    $("nowAfter").innerHTML = "";

    const bag = bagFor(a, tKey);
    $("nowBag").innerHTML = bag.length
      ? `<h3>Pack tonight for tomorrow</h3>${listHTML(bag)}`
      : `<h3>Nothing to pack for tomorrow</h3><p class="footnote">It's a ${esc(tDay.chip.toLowerCase())} day. Eat normally.</p>`;
  }

  function renderNowMeet(a, now) {
    const race = toMinutes(a.raceTime);
    const meal = race - 210, snack = race - 75;
    let eyebrow, time, label, food, tag = "";

    if (race === null) {
      eyebrow = "Meet day"; label = "Set your first race time"; food = "Go to the Meet tab and put in when you race. The times build from that.";
    } else if (now < meal + 30) {
      eyebrow = now >= meal ? "Now" : "Up next"; time = meal;
      label = "Real meal"; food = "Bagel with jam, two eggs, a banana, yogurt, water. Your proper meal of the day.";
    } else if (now < snack + 20) {
      eyebrow = now >= snack ? "Now" : "Up next"; time = snack;
      label = "Small top-up"; food = "Banana, applesauce, pretzels, or half a bagel."; tag = "Small and simple. You're not filling up.";
    } else if (now < race) {
      eyebrow = "Almost time"; time = race;
      label = "You're fueled"; food = "Sips of water or sports drink. Nothing new, nothing big. Go warm up.";
    } else {
      eyebrow = "Between races";
      label = "Top up, don't fill up";
      food = "Under 90 minutes until your next race: sports drink with applesauce, a banana or pretzels. Two hours or more: a small sandwich, a bagel, or some rice.";
      tag = "After your last race: chocolate milk and a banana, then a full meal within 2 hours.";
    }

    const head = time === undefined ? "" : (() => {
      const c = clock(time);
      const cd = time > now ? until(time, now) : (label === "You're fueled" ? "Race time" : "Eat this now");
      return `<div class="nc-head"><div class="nc-time">${esc(c.text)}<span>${esc(c.ampm)}</span></div><div class="nc-count">${esc(cd)}</div></div>`;
    })();

    $("nowCard").className = "nowcard" + (eyebrow === "Now" ? " live" : "");
    $("nowCard").innerHTML = `
      <div class="nc-eyebrow">${esc(eyebrow)}</div>
      ${head}
      <h2 class="nc-label">${esc(label)}</h2>
      <p class="nc-food">${esc(food)}</p>
      ${tag ? `<div class="tag">${esc(tag)}</div>` : ""}`;

    $("nowAfter").innerHTML = race !== null
      ? `<p class="footnote">Built from a first race at ${esc(fmt(race))}. <a href="#meet">Change it</a>.</p>` : "";
    $("nowBag").innerHTML = race !== null && now < race ? `<h3>Meet bag</h3>${listHTML(MEET_BAG)}` : "";
  }

  /* ---------- TODAY ---------- */

  function renderToday() {
    const a = activeAthlete();
    const date = new Date();
    const key = dayKeyFor(a, date);
    const day = dayByKey(a, key);
    const scheduled = dayByKey(a, a.week[date.getDay()]);

    $("dayButtons").innerHTML = chipsHTML(a, key);
    $("dayOverrideNote").innerHTML = key !== scheduled.key
      ? `Your week says <b>${esc(scheduled.chip)}</b>. Changed for today only. <button type="button" class="linkish" id="undoOverride">Undo</button>`
      : "";
    $("dayTitle").textContent = day.title;
    $("dayNote").textContent = day.note;
    $("raceBox").hidden = key !== "meet";
    $("raceTime").value = a.raceTime;

    const rows = buildRows(a, day, date);
    const ni = key === "meet" ? -1 : nextIndex(rows, nowMinutes(date));

    $("rail").innerHTML = rows.map((r, i) => {
      const when = r.t.word
        ? `<div class="when worded">${esc(r.t.word)}</div>`
        : `<div class="when">${esc(r.t.text)}<span class="ampm">${esc(r.t.ampm)}</span></div>`;
      return `
        <div class="slot${i === ni ? " next" : ""}">
          ${when}
          <div class="what">
            <b>${esc(r.label)}</b>
            <span>${esc(r.detail)}</span>
            ${r.tag ? `<div class="tag">${esc(r.tag)}</div>` : ""}
          </div>
        </div>`;
    }).join("");

    $("railNote").innerHTML = key === "meet"
      ? "Times are built from your first race. Change it above."
      : `Times are built from practice at ${esc(fmt(toMinutes(a.practiceStart) ?? 930))}. <a href="#week">Change it</a>.`;

    const p = day.portions;
    $("portionLede").textContent = key === "meet"
      ? "Race day portions are smaller and more frequent than a training day."
      : "Rough guide for each main meal today. Snacks are on top of this, not instead of it.";
    $("portions").innerHTML = [
      ["Carbs", p.carb, "Rice, pasta, bread, potatoes, cereal"],
      ["Protein", p.protein, "Chicken, beef, fish, eggs, yogurt"],
      ["Produce", p.produce, "Fruit and vegetables"],
      ["Fats", p.fat, "Butter, oil, peanut butter, cheese"]
    ].map(([label, amount, examples]) => `
      <div class="portion">
        <span class="portion-label">${esc(label)}</span>
        <span class="portion-amount">${esc(amount)}</span>
        <span class="portion-eg">${esc(examples)}</span>
      </div>`).join("") + `<p class="portion-note">${esc(p.note)}</p>`;
  }

  /* ---------- MEET ---------- */

  function renderMeet() {
    const a = activeAthlete();
    $("raceTime2").value = a.raceTime;
    $("meetTodayBtn").textContent = dayKeyFor(a, new Date()) === "meet" ? "Today is a meet day ✓" : "Make today a meet day";
    $("meetGuide").innerHTML = disc(a).meet.map(([when, what]) => `
      <li><b>${esc(when)}</b> ${esc(what)}</li>`).join("");
    $("meetBag").innerHTML = MEET_BAG.map((item) => `
      <button type="button" data-item="${esc(item)}" aria-pressed="${meetBag[item] ? "true" : "false"}">${esc(item)}</button>`).join("");
  }

  /* ---------- WEEK ---------- */

  function renderWeek() {
    const a = activeAthlete();
    const todayIdx = new Date().getDay();
    const opts = disc(a).days;
    // Seeing the week counts as setting it; the defaults may already be right.
    if (!a.scheduleSet) { a.scheduleSet = true; persist(); }

    $("weekSet").innerHTML = WEEK_ORDER.map((i) => `
      <label class="weekrow${i === todayIdx ? " is-today" : ""}">
        <span>${esc(WEEKDAYS[i].slice(0, 3))}${i === todayIdx ? ' <em>today</em>' : ""}</span>
        <select data-wd="${i}">
          ${opts.map((d) => `<option value="${esc(d.key)}"${a.week[i] === d.key ? " selected" : ""}>${esc(d.chip)}</option>`).join("")}
        </select>
      </label>`).join("");

    $("practiceStart").value = a.practiceStart;
    $("practiceLength").value = String(a.practiceLength);

    $("weeklyTable").innerHTML = disc(a).week.map((row) => `
      <tr>${row.map((cell, i) => i === 0
        ? `<th scope="row">${esc(cell)}</th>`
        : `<td>${esc(cell)}</td>`).join("")}</tr>`).join("");

    renderReminderOpts();
  }

  function practiceDays(a) {
    return [0, 1, 2, 3, 4, 5, 6].filter((i) => !NO_PRACTICE.has(a.week[i]));
  }

  function reminderTimes(a) {
    const start = toMinutes(a.practiceStart) ?? 930;
    const len = Number(a.practiceLength) || 90;
    return { snack: 615, pre: start - 90, post: start + len, pack: 20 * 60 + 30 };
  }

  function renderReminderOpts() {
    const a = activeAthlete();
    const t = reminderTimes(a);
    $("remSnack").checked = !!a.remind.snack;
    $("remPre").checked = !!a.remind.pre;
    $("remPost").checked = !!a.remind.post;
    $("remPack").checked = !!a.remind.pack;
    $("remSnackTime").textContent = fmt(t.snack);
    $("remPreTime").textContent = fmt(t.pre);
    $("remPostTime").textContent = `${fmt(t.post)}, when practice ends`;

    const days = practiceDays(a);
    $("remDays").textContent = days.length
      ? `Repeats every ${WEEK_ORDER.filter((i) => days.includes(i)).map((i) => WEEKDAYS[i].slice(0, 3)).join(", ")}, the practice days in your week.`
      : "Your week has no practice days set, so there's nothing to remind you about yet.";
    $("icsBtn").disabled = !days.length;
  }

  /* ---------- calendar file ---------- */

  const icsText = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  const icsStamp = (d, mins) => {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(Math.floor(mins / 60))}${p(mins % 60)}00`;
  };

  function firstOn(weekdays) {
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const x = addDays(d, i);
      if (weekdays.includes(x.getDay())) return x;
    }
    return d;
  }

  function buildICS(a) {
    const t = reminderTimes(a);
    const days = practiceDays(a);
    const who = athleteLabel(a);
    const normal = dayByKey(a, a.discipline === "middle" ? "tempo" : "normal");
    const find = (k) => (normal.meals.find((m) => m[0] === k) || [])[2] || "";
    const u = new Date();
    const dtstamp = `${u.getUTCFullYear()}${String(u.getUTCMonth() + 1).padStart(2, "0")}${String(u.getUTCDate()).padStart(2, "0")}T${String(u.getUTCHours()).padStart(2, "0")}${String(u.getUTCMinutes()).padStart(2, "0")}00Z`;

    const packDays = [...new Set([...days, ...[0, 1, 2, 3, 4, 5, 6].filter((i) => a.week[i] === "meet")]
      .map((i) => (i + 6) % 7))];

    const events = [];
    const add = (kind, mins, wds, title, body) => {
      if (!wds.length) return;
      events.push([
        "BEGIN:VEVENT",
        `UID:${a.id}-${kind}@fuel-app`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${icsStamp(firstOn(wds), mins)}`,
        "DURATION:PT10M",
        `RRULE:FREQ=WEEKLY;BYDAY=${wds.map((i) => ICS_DAYS[i]).join(",")}`,
        `SUMMARY:${icsText(title)}`,
        `DESCRIPTION:${icsText(body)}`,
        "TRANSP:TRANSPARENT",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${icsText(title)}`,
        "TRIGGER:PT0M",
        "END:VALARM",
        "END:VEVENT"
      ].join("\r\n"));
    };

    if (a.remind.snack) add("snack", t.snack, days, `Fuel: snack (${who})`, `Something with carbs and protein between classes. ${find("snack")}.`);
    if (a.remind.pre) add("pre", t.pre, days, `Fuel: eat before practice (${who})`, `${find("pre")}. Skipping this is why the last rep hurts.`);
    if (a.remind.post) add("post", t.post, days, `Fuel: eat right after (${who})`, `${find("post")}. Carbs and protein, soon.`);
    if (a.remind.pack) add("pack", t.pack, packDays, `Fuel: pack tomorrow's bag (${who})`, "Open Fuel to see what goes in it.");

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Fuel//Track day eating//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...events,
      "END:VCALENDAR",
      ""
    ].join("\r\n");
  }

  function downloadICS() {
    const a = activeAthlete();
    const ics = buildICS(a);
    if (!/BEGIN:VEVENT/.test(ics)) {
      $("weekStatus").textContent = "Tick at least one reminder first.";
      return;
    }
    const iOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (iOS) {
      // Safari on iPhone opens a data link straight into the "Add to Calendar" sheet.
      window.location.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
      return;
    }
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `fuel-reminders-${(athleteLabel(a) || "athlete").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /* ---------- MORE ---------- */

  function renderGroceries() {
    $("groceryList").innerHTML = Object.entries(groceries).map(([group, items]) => `
      <div class="grocery-group">
        <h3>${esc(group)}</h3>
        <div class="grocery-items">
          ${items.map((item) => `
            <button type="button" data-item="${esc(item)}" aria-pressed="${cart[item] ? "true" : "false"}">${esc(item)}</button>
          `).join("")}
        </div>
      </div>`).join("");
  }

  function renderSetup() {
    const a = activeAthlete();
    $("setupWho").textContent = athleteLabel(a);
    $("name").value = a.name;
    $("events").value = a.events;
    $("discipline").value = a.discipline;
    $("trackCycle").checked = !!a.trackCycle;
    $("cycleRow").hidden = !a.trackCycle;
    if (!a.trackCycle) $("cycle").checked = false;
    $("removeAthlete").disabled = state.list.length < 2;
  }

  function assess() {
    const energy = Number($("energy").value);
    const hunger = Number($("hunger").value);
    const flags = {
      sore: $("sore").checked,
      sleep: $("sleep").checked,
      sick: $("sick").checked,
      bone: $("bone").checked,
      strength: $("strength").checked,
      cycle: $("cycle").checked && !$("cycleRow").hidden,
      slower: $("performanceDrop").checked
    };
    const count = Object.values(flags).filter(Boolean).length;
    const box = $("assessment");
    box.className = "verdict";

    if (flags.cycle || flags.bone || count >= 3 || (flags.slower && energy <= 4)) {
      box.classList.add("stop");
      box.textContent = "This is bigger than a snack fix. Keep eating normally — do not cut back — and tell a parent, your coach, or a doctor this week. Bone pain that won't settle, missed periods, repeated illness and times sliding backwards are things a doctor or a sports dietitian should actually look at.";
      return;
    }
    if (energy <= 4 || hunger >= 8 || count >= 1) {
      box.classList.add("warn");
      box.textContent = "Sounds like you're running a bit behind on fuel. Add one more real snack today with a carb and a protein, and look back at yesterday: did you skip breakfast, rush lunch, or go straight from school to training with nothing?";
      return;
    }
    box.textContent = "This looks alright. Keep the same rhythm of meals and snacks, and add more on your hard days rather than eating the same amount every day.";
  }

  /* ---------- views ---------- */

  const VIEWS = ["now", "today", "meet", "week", "more"];
  let view = "now";

  function renderView() {
    if (view === "now") renderNow();
    else if (view === "today") renderToday();
    else if (view === "meet") renderMeet();
    else if (view === "week") renderWeek();
    else if (view === "more") renderSetup();
  }

  function renderAll() {
    renderAthleteTabs();
    renderView();
  }

  function show(name, scroll = true) {
    view = VIEWS.includes(name) ? name : "now";
    document.querySelectorAll(".view").forEach((s) => { s.hidden = s.dataset.view !== view; });
    document.querySelectorAll(".tabbar button").forEach((b) => {
      if (b.dataset.tab === view) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    renderView();
    if (scroll) window.scrollTo(0, 0);
  }

  const go = (name) => {
    if (location.hash === "#" + name) show(name);
    else location.hash = name;
  };

  /* ---------- install ---------- */

  let installEvent = null;

  function setupInstall() {
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (standalone) { $("installBlock").hidden = true; return; }

    const iOS = /iP(hone|ad|od)/.test(navigator.userAgent);
    if (iOS) {
      $("installText").innerHTML = "It opens like an app and works with no signal, which matters at meets. In Safari, tap the <b>Share</b> button, then <b>Add to Home Screen</b>.";
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      installEvent = e;
      $("installBtn").hidden = false;
    });

    $("installBtn").addEventListener("click", async () => {
      if (!installEvent) return;
      installEvent.prompt();
      await installEvent.userChoice.catch(() => null);
      installEvent = null;
      $("installBtn").hidden = true;
    });

    window.addEventListener("appinstalled", () => { $("installBlock").hidden = true; });

    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  /* ---------- wire it up ---------- */

  function init() {
    renderGroceries();
    renderAthleteTabs();
    show((location.hash || "#now").slice(1), false);
    setupInstall();

    window.addEventListener("hashchange", () => show(location.hash.slice(1)));

    document.addEventListener("click", (e) => {
      const goBtn = e.target.closest("[data-go]");
      if (goBtn) { go(goBtn.dataset.go); return; }
      const tab = e.target.closest(".tabbar button[data-tab]");
      if (tab) go(tab.dataset.tab);
    });

    $("athleteTabs").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-id]");
      if (!btn) return;
      state.active = btn.dataset.id;
      persist();
      $("nowChips").hidden = true;
      renderAll();
    });

    $("changeDayBtn").addEventListener("click", () => {
      $("nowChips").hidden = !$("nowChips").hidden;
    });

    const onChip = (e) => {
      const btn = e.target.closest("button[data-day]");
      if (!btn) return;
      setToday(activeAthlete(), btn.dataset.day);
      $("nowChips").hidden = true;
      renderView();
    };
    $("nowChips").addEventListener("click", onChip);
    $("dayButtons").addEventListener("click", onChip);

    $("dayOverrideNote").addEventListener("click", (e) => {
      if (e.target.id !== "undoOverride") return;
      activeAthlete().override = null;
      persist();
      renderToday();
    });

    const setRace = (id) => $(id).addEventListener("change", () => {
      if (toMinutes($(id).value) === null) return;
      activeAthlete().raceTime = $(id).value;
      persist();
      renderView();
    });
    setRace("raceTime");
    setRace("raceTime2");

    $("meetTodayBtn").addEventListener("click", () => {
      setToday(activeAthlete(), "meet");
      go("now");
    });

    $("meetBag").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-item]");
      if (!btn) return;
      meetBag[btn.dataset.item] = !meetBag[btn.dataset.item];
      btn.setAttribute("aria-pressed", String(!!meetBag[btn.dataset.item]));
      store.set(KEY_MEETBAG, meetBag);
    });

    $("resetMeetBag").addEventListener("click", () => {
      meetBag = {};
      store.set(KEY_MEETBAG, meetBag);
      renderMeet();
    });

    const flash = (id, msg) => {
      $(id).textContent = msg;
      clearTimeout(flash[id]);
      flash[id] = setTimeout(() => { $(id).textContent = ""; }, 2500);
    };

    $("weekSet").addEventListener("change", (e) => {
      const sel = e.target.closest("select[data-wd]");
      if (!sel) return;
      const a = activeAthlete();
      a.week[Number(sel.dataset.wd)] = sel.value;
      a.scheduleSet = true;
      persist();
      renderReminderOpts();
      flash("weekStatus", "Saved.");
    });

    $("practiceStart").addEventListener("change", () => {
      if (toMinutes($("practiceStart").value) === null) return;
      activeAthlete().practiceStart = $("practiceStart").value;
      persist();
      renderReminderOpts();
      flash("weekStatus", "Saved.");
    });

    $("practiceLength").addEventListener("change", () => {
      activeAthlete().practiceLength = Number($("practiceLength").value) || 90;
      persist();
      renderReminderOpts();
      flash("weekStatus", "Saved.");
    });

    [["remSnack", "snack"], ["remPre", "pre"], ["remPost", "post"], ["remPack", "pack"]].forEach(([id, k]) => {
      $(id).addEventListener("change", () => {
        activeAthlete().remind[k] = $(id).checked;
        persist();
      });
    });

    $("icsBtn").addEventListener("click", downloadICS);

    $("discipline").addEventListener("change", () => {
      const a = activeAthlete();
      const wasDefaultEvents = a.events === DISCIPLINES[a.discipline].events;
      a.discipline = $("discipline").value;
      if (wasDefaultEvents) a.events = DISCIPLINES[a.discipline].events;
      Object.assign(a, normalise(a));
      persist();
      renderAll();
    });

    $("trackCycle").addEventListener("change", () => {
      activeAthlete().trackCycle = $("trackCycle").checked;
      persist();
      renderSetup();
    });

    $("saveProfileBtn").addEventListener("click", () => {
      const a = activeAthlete();
      a.name = $("name").value.trim().slice(0, 40);
      a.events = $("events").value.trim().slice(0, 40);
      const ok = persist();
      renderAll();
      flash("saveStatus", ok ? "Saved on this device." : "Applied, but this browser won't let the app save. Private mode?");
    });

    $("addAthlete").addEventListener("click", () => {
      const a = newAthlete("sprint");
      state.list.push(a);
      state.active = a.id;
      persist();
      renderAll();
      $("name").focus();
    });

    $("removeAthlete").addEventListener("click", () => {
      if (state.list.length < 2) return;
      const a = activeAthlete();
      if (!confirm(`Remove ${athleteLabel(a)}? This can't be undone.`)) return;
      state.list = state.list.filter((x) => x.id !== a.id);
      state.active = state.list[0].id;
      persist();
      renderAll();
    });

    $("groceryList").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-item]");
      if (!btn) return;
      const item = btn.dataset.item;
      cart[item] = !cart[item];
      btn.setAttribute("aria-pressed", String(!!cart[item]));
      store.set(KEY_CART, cart);
    });

    $("resetGroceries").addEventListener("click", () => {
      cart = {};
      store.set(KEY_CART, cart);
      renderGroceries();
    });

    $("assessBtn").addEventListener("click", assess);

    $("printBtn").addEventListener("click", () => {
      renderToday();
      window.print();
    });

    $("energy").addEventListener("input", (e) => { $("energyValue").textContent = e.target.value; });
    $("hunger").addEventListener("input", (e) => { $("hungerValue").textContent = e.target.value; });

    // Keep "now" honest if the page is left open, and catch the day rolling over.
    setInterval(() => { if (view === "now" || view === "today") renderView(); }, 60000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") renderAll();
    });
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
