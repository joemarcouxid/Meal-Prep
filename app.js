/* ---------------------------------------------------------
   Fuel — track day eating
   No frameworks, no build step, no network calls.
   Everything typed in stays in this browser.
   --------------------------------------------------------- */

(() => {
  "use strict";

  const KEY_ATHLETES = "fuelAthletesV3";
  const KEY_CART = "fuelCartV3";

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
    day: DISCIPLINES[discipline].days[1].key
  });

  function seed() {
    const a = newAthlete("sprint");
    const b = newAthlete("middle");
    return { list: [a, b], active: a.id };
  }

  let state = store.get(KEY_ATHLETES);
  if (!state || !Array.isArray(state.list) || !state.list.length) state = seed();

  let cart = store.get(KEY_CART) || {};

  const activeAthlete = () =>
    state.list.find((a) => a.id === state.active) || state.list[0];

  const discipline = () => DISCIPLINES[activeAthlete().discipline] || DISCIPLINES.sprint;

  const activeDay = () => {
    const d = discipline();
    return d.days.find((x) => x.key === activeAthlete().day) || d.days[0];
  };

  const athleteLabel = (a) => a.name || DISCIPLINES[a.discipline].label;

  const persist = () => store.set(KEY_ATHLETES, state);

  /* ---------- rendering ---------- */

  function renderAthleteTabs() {
    $("athleteTabs").innerHTML = state.list.map((a) => `
      <button type="button" data-id="${esc(a.id)}"
        class="${a.id === state.active ? "on" : ""}"
        aria-pressed="${a.id === state.active}">${esc(athleteLabel(a))}</button>
    `).join("");
  }

  function renderTopbar() {
    const a = activeAthlete();
    const bits = [];
    if (a.events) bits.push(a.events);
    const start = toMinutes(a.practiceStart);
    if (start !== null && a.day !== "meet") {
      const c = clock(start);
      bits.push(`Practice ${c.text} ${c.ampm}`);
    }
    $("topbarWho").textContent = bits.join(" · ");
    $("setupWho").textContent = athleteLabel(a);
  }

  function renderDayChips() {
    const a = activeAthlete();
    $("dayButtons").innerHTML = discipline().days.map((d) => `
      <button type="button" data-day="${esc(d.key)}"
        class="${d.key === a.day ? "on" : ""}"
        aria-pressed="${d.key === a.day}">${esc(d.chip)}</button>
    `).join("");
  }

  function resolveTime(anchorKey) {
    const a = activeAthlete();
    const anc = ANCHORS[anchorKey];
    if (!anc) return { word: "", sort: 9999 };
    if (anc.word) return { word: anc.word, sort: anc.about };

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

  function renderRail() {
    const day = activeDay();
    const d = new Date();
    const now = d.getHours() * 60 + d.getMinutes();

    const rows = day.meals.map(([key, label, detail, tag]) => ({
      t: resolveTime(key), label, detail, tag
    }));

    const nextIndex = day.key === "meet"
      ? -1
      : rows.findIndex((r) => r.t.sort >= now && r.t.sort < 9999);

    $("rail").innerHTML = rows.map((r, i) => {
      const when = r.t.word
        ? `<div class="when worded">${esc(r.t.word)}</div>`
        : `<div class="when">${esc(r.t.text)}<span class="ampm">${esc(r.t.ampm)}</span></div>`;
      return `
        <div class="slot${i === nextIndex ? " next" : ""}">
          ${when}
          <div class="what">
            <b>${esc(r.label)}</b>
            <span>${esc(r.detail)}</span>
            ${r.tag ? `<div class="tag">${esc(r.tag)}</div>` : ""}
          </div>
        </div>`;
    }).join("");

    $("railNote").textContent = day.key === "meet"
      ? "Times are built from your first race. Change it above."
      : "Times are built from your practice start. Change it in Setup, at the bottom.";
  }

  function renderPortions() {
    const day = activeDay();
    const p = day.portions;

    $("portionLede").textContent = day.key === "meet"
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
      </div>`).join("") +
      `<p class="portion-note">${esc(p.note)}</p>`;
  }

  function renderDay() {
    const day = activeDay();
    $("dayTitle").textContent = day.title;
    $("dayNote").textContent = day.note;
    $("raceBox").hidden = day.key !== "meet";
    renderDayChips();
    renderRail();
    renderPortions();
    renderTopbar();
  }

  function renderWeekly() {
    $("weeklyTable").innerHTML = discipline().week.map((row) => `
      <tr>${row.map((cell, i) => i === 0
        ? `<th scope="row">${esc(cell)}</th>`
        : `<td>${esc(cell)}</td>`).join("")}</tr>`).join("");
  }

  function renderMeetGuide() {
    $("meetGuide").innerHTML = discipline().meet.map(([when, what]) => `
      <li><b>${esc(when)}</b> ${esc(what)}</li>`).join("");
  }

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

  function syncSetup() {
    const a = activeAthlete();
    $("name").value = a.name;
    $("events").value = a.events;
    $("discipline").value = a.discipline;
    $("practiceStart").value = a.practiceStart;
    $("practiceLength").value = String(a.practiceLength);
    $("raceTime").value = a.raceTime;
    $("trackCycle").checked = !!a.trackCycle;
    $("cycleRow").hidden = !a.trackCycle;
    if (!a.trackCycle) $("cycle").checked = false;
    $("removeAthlete").disabled = state.list.length < 2;
  }

  function renderAll() {
    renderAthleteTabs();
    syncSetup();
    renderWeekly();
    renderMeetGuide();
    renderDay();
  }

  /* ---------- check-in ---------- */

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

  /* ---------- wire it up ---------- */

  function init() {
    renderAll();
    renderGroceries();

    $("athleteTabs").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-id]");
      if (!btn) return;
      state.active = btn.dataset.id;
      persist();
      renderAll();
    });

    $("addAthlete").addEventListener("click", () => {
      const a = newAthlete("sprint");
      state.list.push(a);
      state.active = a.id;
      persist();
      renderAll();
      $("setup").scrollIntoView({ behavior: "smooth", block: "start" });
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

    $("dayButtons").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-day]");
      if (!btn) return;
      activeAthlete().day = btn.dataset.day;
      persist();
      renderDay();
    });

    $("discipline").addEventListener("change", () => {
      const a = activeAthlete();
      const wasDefaultEvents = a.events === DISCIPLINES[a.discipline].events;
      a.discipline = $("discipline").value;
      const d = DISCIPLINES[a.discipline];
      if (wasDefaultEvents) a.events = d.events;
      if (!d.days.some((x) => x.key === a.day)) a.day = d.days[1].key;
      persist();
      renderAll();
    });

    ["practiceStart", "practiceLength", "raceTime"].forEach((id) => {
      $(id).addEventListener("change", () => {
        const a = activeAthlete();
        if (id === "practiceLength") a.practiceLength = Number($(id).value) || 90;
        else if (toMinutes($(id).value) !== null) a[id] = $(id).value;
        persist();
        renderDay();
      });
    });

    $("trackCycle").addEventListener("change", () => {
      activeAthlete().trackCycle = $("trackCycle").checked;
      persist();
      syncSetup();
    });

    $("saveProfileBtn").addEventListener("click", () => {
      const a = activeAthlete();
      a.name = $("name").value.trim().slice(0, 40);
      a.events = $("events").value.trim().slice(0, 40);
      const ok = persist();
      renderAll();
      $("saveStatus").textContent = ok
        ? "Saved on this device."
        : "Applied, but this browser won't let the app save. Private mode?";
      setTimeout(() => { $("saveStatus").textContent = ""; }, 3000);
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
    $("printBtn").addEventListener("click", () => window.print());

    $("energy").addEventListener("input", (e) => { $("energyValue").textContent = e.target.value; });
    $("hunger").addEventListener("input", (e) => { $("hungerValue").textContent = e.target.value; });

    // Keep the "up next" highlight honest if the page is left open.
    setInterval(renderRail, 60000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
