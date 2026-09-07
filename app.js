/* ---------------------------------------------------------
   Fuel — sprint day eating
   No frameworks, no build step, no network calls.
   Everything you type stays in this browser.
   --------------------------------------------------------- */

(() => {
  "use strict";

  const KEY_PROFILE = "fuelProfileV2";
  const KEY_DAY = "fuelDayV2";
  const KEY_CART = "fuelCartV2";

  const DEFAULT_PROFILE = {
    name: "",
    events: "100 / 200 / 400",
    practiceStart: "15:30",
    practiceLength: 90,
    raceTime: "10:00"
  };

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
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  };

  const clock = (mins) => {
    const wrapped = ((mins % 1440) + 1440) % 1440;
    let h = Math.floor(wrapped / 60);
    const m = wrapped % 60;
    const ampm = h < 12 ? "AM" : "PM";
    h = h % 12 || 12;
    return { text: `${h}:${String(m).padStart(2, "0")}`, ampm };
  };

  /* ---------- when each thing happens ---------- */
  // Fixed slots use a word, not a fake precise time — school schedules vary.
  // The hidden `about` value is only used to work out which slot is next.

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

  /* ---------- the day plans ---------- */

  const plans = {
    hard: {
      title: "Big day. Eat like it.",
      note: "Speed endurance and hard sprint work burn through the carbs stored in your muscles. Today is the day you eat the most, not the least.",
      meals: [
        ["breakfast", "Breakfast", "Two eggs, a bagel with jam, a banana, milk"],
        ["snack", "Snack", "Greek yogurt and granola"],
        ["lunch", "Lunch", "Chicken with a decent scoop of rice, fruit, milk or water"],
        ["pre", "Before practice", "Banana and pretzels, or applesauce and a granola bar", "Skipping this is why the last rep hurts"],
        ["post", "Right after", "Chocolate milk and a banana"],
        ["dinner", "Dinner", "Mac and cheese with chicken, plus fruit or a vegetable"]
      ]
    },
    normal: {
      title: "Standard fuel day",
      note: "The school-day gap is what gets people. Six hours between lunch and practice with nothing in between is why your legs feel dead at 4pm.",
      meals: [
        ["breakfast", "Breakfast", "Two eggs, toast or a bagel, fruit, milk"],
        ["snack", "Snack", "Yogurt and granola, or cheese and crackers"],
        ["lunch", "Lunch", "Chicken rice bowl, or a turkey sandwich and fruit"],
        ["pre", "Before practice", "Banana and a granola bar"],
        ["post", "Right after", "Chocolate milk, or yogurt and fruit"],
        ["dinner", "Dinner", "Chicken and rice, tacos, pasta, or mac and cheese built out"]
      ]
    },
    lift: {
      title: "Lift day is build day",
      note: "Lifting breaks muscle down on purpose. Carbs and protein spread across the whole day are what put it back together stronger.",
      meals: [
        ["breakfast", "Breakfast", "Two eggs, a bagel, a banana, yogurt"],
        ["snack", "Snack", "Greek yogurt and granola"],
        ["lunch", "Lunch", "Chicken, rice, fruit"],
        ["pre", "Before training", "Half a bagel, or a banana and pretzels"],
        ["post", "Right after", "Chocolate milk plus yogurt or a sandwich"],
        ["dinner", "Dinner", "Chicken or beef with rice or pasta, plus fruit or a vegetable"]
      ]
    },
    easy: {
      title: "Easy day, normal food",
      note: "Easy sessions are where your body actually absorbs the hard ones. That process runs on food. This is not a day to eat less.",
      meals: [
        ["breakfast", "Breakfast", "Two eggs, toast, fruit"],
        ["snack", "Snack", "Yogurt, or cheese and crackers"],
        ["lunch", "Lunch", "Turkey sandwich, or chicken and rice with fruit"],
        ["pre", "Before practice", "Fruit and crackers if you're hungry"],
        ["post", "Right after", "Milk or yogurt with fruit"],
        ["dinner", "Dinner", "Whatever the family is eating, with a carb, a protein and some produce"]
      ]
    },
    rest: {
      title: "Rest counts as training",
      note: "You might be a little less hungry today, and that's fine. But food isn't something you earn by working out. Recovery is the whole point of a rest day.",
      meals: [
        ["breakfast", "Breakfast", "Eggs, toast, fruit"],
        ["snack", "Snack", "Yogurt and fruit"],
        ["lunch", "Lunch", "Chicken rice bowl"],
        ["pre", "Afternoon", "Granola and milk, or cheese and crackers"],
        ["dinner", "Dinner", "Pasta, chicken and rice, tacos, or mac and cheese with protein"],
        ["evening", "If you're hungry later", "Cereal and milk, or yogurt"]
      ]
    },
    meet: {
      title: "Race day: nothing new",
      note: "Only eat things you've already eaten before a practice. Race day is the worst possible day to find out a food doesn't sit right with you.",
      meals: [
        ["raceMeal", "Real meal", "Bagel with jam, two eggs, a banana, yogurt, water"],
        ["raceSnack", "Small top-up", "Banana, applesauce, pretzels, or half a bagel", "Small and simple. You're not filling up."],
        ["shortGap", "Quick refuel", "Sports drink with applesauce, banana, crackers, or pretzels"],
        ["longGap", "Bigger refuel", "Small turkey sandwich, a bagel, or a modest chicken and rice"],
        ["afterLast", "Recover", "Chocolate milk and a banana"],
        ["fullMeal", "Full meal", "Carbs, protein, produce, fluids"]
      ]
    }
  };

  /* ---------- week template ---------- */

  const weekly = [
    ["Mon", "Eggs, bagel, banana", "Chicken and rice, fruit", "Banana and pretzels", "Chocolate milk", "Mac and cheese, chicken, fruit"],
    ["Tue", "Eggs, toast, fruit", "Turkey sandwich, yogurt", "Banana and crackers", "Yogurt and granola", "Chicken tacos and rice"],
    ["Wed", "Waffles, eggs, fruit", "Chicken and rice", "Half a bagel with jam", "Chocolate milk", "Spaghetti with meat sauce"],
    ["Thu", "Egg sandwich, banana", "Mac and cheese with chicken", "Applesauce and pretzels", "Chocolate milk", "Chicken, rice, vegetable"],
    ["Fri", "Eggs, toast, fruit", "Chicken quesadilla, fruit", "Granola bar and banana", "Yogurt and fruit", "Burger or chicken sandwich with potatoes"],
    ["Sat", "Meet or training breakfast", "Depends on race times", "Depends on race times", "Carbs and protein", "Big recovery dinner"],
    ["Sun", "Eggs, toast, fruit", "Chicken rice bowl", "Whenever you're hungry", "Whenever you're hungry", "Pasta, or mac and cheese built out"]
  ];

  /* ---------- shopping ---------- */

  const groceries = {
    "Protein": ["Eggs", "Chicken", "Greek yogurt", "Milk", "Chocolate milk", "Turkey", "Ground beef", "Cheese"],
    "Carbs": ["Rice", "Mac and cheese", "Pasta", "Bagels", "Bread", "Tortillas", "Cereal", "Granola"],
    "Grab and go": ["Bananas", "Applesauce pouches", "Granola bars", "Pretzels", "Grapes or berries", "Crackers"],
    "Meets and hot days": ["Sports drink", "Extra water bottle", "Easy snacks that travel"]
  };

  /* ---------- state ---------- */

  let profile = { ...DEFAULT_PROFILE, ...(store.get(KEY_PROFILE) || {}) };
  let currentDay = plans[store.get(KEY_DAY)] ? store.get(KEY_DAY) : "normal";
  let cart = store.get(KEY_CART) || {};

  /* ---------- profile plumbing ---------- */

  function fillProfileInputs() {
    $("name").value = profile.name;
    $("events").value = profile.events;
    $("practiceStart").value = profile.practiceStart;
    $("practiceLength").value = String(profile.practiceLength);
    $("raceTime").value = profile.raceTime;
  }

  function readProfileInputs() {
    return {
      name: $("name").value.trim().slice(0, 40),
      events: $("events").value.trim().slice(0, 40) || "100 / 200 / 400",
      practiceStart: toMinutes($("practiceStart").value) === null ? "15:30" : $("practiceStart").value,
      practiceLength: Number($("practiceLength").value) || 90,
      raceTime: toMinutes($("raceTime").value) === null ? "10:00" : $("raceTime").value
    };
  }

  function renderTopbar() {
    const bits = [];
    if (profile.name) bits.push(profile.name);
    if (profile.events) bits.push(profile.events);
    const start = toMinutes(profile.practiceStart);
    if (start !== null && currentDay !== "meet") {
      const c = clock(start);
      bits.push(`Practice ${c.text} ${c.ampm}`);
    }
    $("topbarWho").textContent = bits.join(" · ") || "Set up below";
  }

  /* ---------- the rail ---------- */

  function resolveTime(anchorKey) {
    const a = ANCHORS[anchorKey];
    if (!a) return { word: "", sort: 9999 };
    if (a.word) return { word: a.word, sort: a.about };

    const start = toMinutes(profile.practiceStart);
    const race = toMinutes(profile.raceTime);
    const len = Number(profile.practiceLength) || 90;

    let base = null;
    if (a.rel === "start") base = start;
    else if (a.rel === "end") base = start === null ? null : start + len;
    else if (a.rel === "race") base = race;

    if (base === null) return { word: "—", sort: 9999 };
    const mins = base + a.offset;
    return { ...clock(mins), sort: mins };
  }

  function renderRail() {
    const plan = plans[currentDay];
    const now = new Date().getHours() * 60 + new Date().getMinutes();

    const rows = plan.meals.map(([anchorKey, label, detail, tag]) => ({
      t: resolveTime(anchorKey),
      label, detail, tag
    }));

    // "Up next" = the first slot today whose time hasn't passed yet.
    let nextIndex = -1;
    if (currentDay !== "meet") {
      nextIndex = rows.findIndex((r) => r.t.sort >= now && r.t.sort < 9999);
    }

    $("rail").innerHTML = rows.map((r, i) => {
      const when = r.t.word
        ? `<div class="when worded">${esc(r.t.word)}</div>`
        : `<div class="when">${esc(r.t.text)}<span class="ampm">${esc(r.t.ampm)}</span></div>`;
      const tag = r.tag ? `<div class="tag">${esc(r.tag)}</div>` : "";
      return `
        <div class="slot${i === nextIndex ? " next" : ""}">
          ${when}
          <div class="what">
            <b>${esc(r.label)}</b>
            <span>${esc(r.detail)}</span>
            ${tag}
          </div>
        </div>`;
    }).join("");

    $("railNote").textContent = currentDay === "meet"
      ? "Times are built from your first race. Change it above."
      : "Times are built from your practice start. Change it in Your setup, at the bottom.";
  }

  function renderDay() {
    const plan = plans[currentDay];
    $("dayTitle").textContent = plan.title;
    $("dayNote").textContent = plan.note;
    $("raceBox").hidden = currentDay !== "meet";
    renderRail();
    renderTopbar();
  }

  function setDay(day) {
    currentDay = plans[day] ? day : "normal";
    store.set(KEY_DAY, currentDay);
    document.querySelectorAll("#dayButtons button").forEach((btn) => {
      const on = btn.dataset.day === currentDay;
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    renderDay();
  }

  /* ---------- other sections ---------- */

  function renderWeekly() {
    $("weeklyTable").innerHTML = weekly.map((row) => `
      <tr>${row.map((cell, i) => i === 0
        ? `<th scope="row">${esc(cell)}</th>`
        : `<td>${esc(cell)}</td>`).join("")}</tr>`).join("");
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

  function assess() {
    const energy = Number($("energy").value);
    const hunger = Number($("hunger").value);
    const sore = $("sore").checked;
    const cold = $("cold").checked;
    const cycle = $("cycle").checked;
    const slower = $("performanceDrop").checked;
    const box = $("assessment");

    box.className = "verdict";

    if (cycle || (slower && energy <= 4)) {
      box.classList.add("stop");
      box.textContent = "This is bigger than a snack fix. Keep eating normally — do not cut back — and tell a parent, your coach, or a doctor this week. Missed periods, ongoing tiredness, and times sliding backwards are things a doctor or a sports dietitian should actually look at.";
      return;
    }

    if (energy <= 4 || hunger >= 8 || sore || cold || slower) {
      box.classList.add("warn");
      box.textContent = "Sounds like you're running a bit behind on fuel. Add one more real snack today with a carb and a protein, and look back at yesterday: did you skip breakfast, rush lunch, or go straight from school to practice with nothing?";
      return;
    }

    box.textContent = "This looks alright. Keep the same rhythm of meals and snacks, and add more on your hard days rather than eating the same amount every day.";
  }

  /* ---------- wire it up ---------- */

  function init() {
    fillProfileInputs();
    renderWeekly();
    renderGroceries();
    setDay(currentDay);

    document.querySelectorAll("#dayButtons button").forEach((btn) => {
      btn.addEventListener("click", () => setDay(btn.dataset.day));
    });

    $("saveProfileBtn").addEventListener("click", () => {
      profile = readProfileInputs();
      const ok = store.set(KEY_PROFILE, profile);
      renderDay();
      $("saveStatus").textContent = ok
        ? "Saved on this device."
        : "Applied, but this browser won't let the app save. Private mode?";
      setTimeout(() => { $("saveStatus").textContent = ""; }, 3000);
    });

    // Live preview: changing a time updates the schedule without waiting for Save.
    ["practiceStart", "practiceLength"].forEach((id) => {
      $(id).addEventListener("change", () => {
        profile = { ...profile, ...readProfileInputs() };
        renderDay();
      });
    });

    $("raceTime").addEventListener("change", () => {
      profile = { ...profile, ...readProfileInputs() };
      renderDay();
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
