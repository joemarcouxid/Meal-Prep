(() => {
  const STORAGE_KEY = "teenSprinterFuelCoachProfileV1";
  const DEFAULT_PROFILE = {
    name: "Athlete",
    age: 17,
    height: "5'6\"",
    weight: 130,
    events: "100 / 200 / 400",
    practiceTime: "3:30 PM"
  };

  const plans = {
    hard: {
      title: "Fuel high today",
      note: "Speed endurance and hard sprint work deserve the strongest carbohydrate support of the week.",
      meals: [
        ["Breakfast", "2 eggs + bagel with jam + banana + milk"],
        ["School snack", "Greek yogurt + granola"],
        ["Lunch", "Chicken + 1–2 cups rice + fruit + milk or water"],
        ["60–90 min pre-practice", "Banana + pretzels, or applesauce + granola bar"],
        ["Recovery", "Chocolate milk + banana, then dinner"],
        ["Dinner", "Mac & cheese + 4–5 oz chicken + fruit or vegetable"]
      ]
    },
    normal: {
      title: "Steady fuel today",
      note: "The goal is to prevent a long school-day energy gap before afternoon practice.",
      meals: [
        ["Breakfast", "2 eggs + toast or bagel + fruit + milk"],
        ["School snack", "Yogurt + granola, or cheese + crackers"],
        ["Lunch", "Chicken rice bowl or turkey sandwich + fruit"],
        ["60–90 min pre-practice", "Banana + granola bar"],
        ["Recovery", "Chocolate milk, or yogurt + fruit"],
        ["Dinner", "Chicken + rice, tacos, pasta, or completed mac & cheese"]
      ]
    },
    lift: {
      title: "Carbs + protein matter today",
      note: "Lifting adds recovery demand. Keep carbohydrate in and spread protein across the day.",
      meals: [
        ["Breakfast", "2 eggs + bagel + banana + yogurt"],
        ["School snack", "Greek yogurt + granola"],
        ["Lunch", "Chicken + rice + fruit"],
        ["Pre-training", "Bagel or banana + pretzels"],
        ["Recovery", "Chocolate milk + yogurt or sandwich"],
        ["Dinner", "Chicken or beef + rice or pasta + fruit or vegetable"]
      ]
    },
    easy: {
      title: "Still fuel the athlete",
      note: "An easier day supports adaptation and recovery. It is not a reason for aggressive food restriction.",
      meals: [
        ["Breakfast", "2 eggs + toast + fruit"],
        ["School snack", "Yogurt or cheese + crackers"],
        ["Lunch", "Turkey sandwich or chicken + rice + fruit"],
        ["Pre-practice", "Fruit + crackers if hungry"],
        ["Recovery", "Milk or yogurt + fruit"],
        ["Dinner", "Normal family meal with carbohydrate + protein + produce"]
      ]
    },
    rest: {
      title: "Recovery is training too",
      note: "Eat normally. Portions may naturally be a little smaller, but food does not need to be earned with exercise.",
      meals: [
        ["Breakfast", "Eggs + toast + fruit"],
        ["Snack", "Yogurt + fruit"],
        ["Lunch", "Chicken rice bowl"],
        ["Afternoon", "Granola + milk, or cheese + crackers"],
        ["Dinner", "Pasta, chicken + rice, tacos, or mac & cheese + protein"],
        ["Evening", "Cereal + milk or yogurt if hungry"]
      ]
    },
    meet: {
      title: "Familiar food wins",
      note: "Race day is for foods already tested in practice. Emphasize carbohydrate, fluids, and easy digestion.",
      meals: [
        ["3–4 hours before", "Bagel + jam, 2 eggs, banana, yogurt, water"],
        ["60–90 min before", "Banana, applesauce, pretzels, or half a bagel"],
        ["Between races <90 min", "Sports drink + applesauce, banana, crackers, or pretzels"],
        ["Between races 2+ hours", "Small turkey sandwich, bagel, or modest chicken + rice"],
        ["After final race", "Chocolate milk + banana"],
        ["Within ~2 hours", "Full meal: carbohydrate + protein + produce + fluids"]
      ]
    }
  };

  const weekly = [
    ["Mon", "Eggs + bagel + banana", "Chicken + rice + fruit", "Banana + pretzels", "Chocolate milk", "Mac & cheese + chicken + fruit"],
    ["Tue", "Eggs + toast + fruit", "Turkey sandwich + yogurt", "Banana + crackers", "Yogurt + granola", "Chicken tacos + rice"],
    ["Wed", "Waffles + eggs + fruit", "Chicken + rice", "Half bagel + jam", "Chocolate milk", "Spaghetti + meat sauce"],
    ["Thu", "Egg sandwich + banana", "Mac & cheese + chicken", "Applesauce + pretzels", "Chocolate milk", "Chicken + rice + vegetable"],
    ["Fri", "Eggs + toast + fruit", "Chicken quesadilla + fruit", "Granola bar + banana", "Yogurt + fruit", "Burger/chicken sandwich + potatoes"],
    ["Sat", "Meet or training breakfast", "Meet timing / normal lunch", "Meet timing", "Carb + protein", "Full recovery dinner"],
    ["Sun", "Eggs + toast + fruit", "Chicken rice bowl", "As hungry", "As hungry", "Pasta or completed mac & cheese"]
  ];

  const groceries = {
    Protein: "Eggs • chicken • Greek yogurt • milk/chocolate milk • turkey • ground beef • cheese",
    Carbohydrate: "Rice • mac & cheese • pasta • bagels • bread • tortillas • cereal • granola",
    "Grab & go": "Bananas • applesauce pouches • granola bars • pretzels • grapes/berries • crackers",
    "Meet / hot days": "Sports drink or electrolyte drink when appropriate • easy-to-digest carbohydrate snacks"
  };

  let currentDay = "normal";

  const $ = (id) => document.getElementById(id);

  function loadProfile() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return { ...DEFAULT_PROFILE, ...(saved || {}) };
    } catch {
      return { ...DEFAULT_PROFILE };
    }
  }

  function putProfile(profile) {
    $("name").value = profile.name;
    $("age").value = profile.age;
    $("height").value = profile.height;
    $("weight").value = profile.weight;
    $("events").value = profile.events;
    $("practiceTime").value = profile.practiceTime;
  }

  function readProfile() {
    return {
      name: $("name").value.trim() || "Athlete",
      age: Math.max(13, Math.min(19, Number($("age").value) || 17)),
      height: $("height").value.trim() || "5'6\"",
      weight: Math.max(80, Math.min(250, Number($("weight").value) || 130)),
      events: $("events").value.trim() || "100 / 200 / 400",
      practiceTime: $("practiceTime").value
    };
  }

  function saveProfile() {
    const profile = readProfile();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    $("saveStatus").textContent = "Saved.";
    setTimeout(() => $("saveStatus").textContent = "", 1800);
  }

  function renderPlan() {
    const plan = plans[currentDay];
    $("dayMessage").innerHTML = `<strong>${plan.title}</strong><span>${plan.note}</span>`;
    $("mealTimeline").innerHTML = plan.meals
      .map(([time, meal]) => `
        <div class="timeline-item">
          <strong>${time}</strong>
          <span>${meal}</span>
        </div>
      `)
      .join("");
  }

  function renderWeekly() {
    $("weeklyTable").innerHTML = weekly.map(row => `
      <tr>${row.map((cell, index) => index === 0 ? `<th scope="row">${cell}</th>` : `<td>${cell}</td>`).join("")}</tr>
    `).join("");
  }

  function renderGroceries() {
    $("groceryList").innerHTML = Object.entries(groceries)
      .map(([group, items]) => `
        <div class="grocery-group">
          <strong>${group}</strong>
          <span>${items}</span>
        </div>
      `).join("");
  }

  function setDay(day) {
    currentDay = plans[day] ? day : "normal";
    document.querySelectorAll("#dayButtons button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.day === currentDay);
    });
    renderPlan();
  }

  function assessFueling() {
    const energy = Number($("energy").value);
    const hunger = Number($("hunger").value);
    const sore = $("sore").checked;
    const cycle = $("cycle").checked;
    const performanceDrop = $("performanceDrop").checked;
    const box = $("assessment");

    box.className = "assessment";

    if (cycle || (performanceDrop && energy <= 4)) {
      box.classList.add("danger");
      box.textContent = "This combination deserves more than a meal tweak. Keep fueling adequate and involve her pediatrician or a sports dietitian, especially if menstrual changes, fatigue, injury, or declining performance persist.";
      return;
    }

    if (energy <= 4 || hunger >= 8 || sore || performanceDrop) {
      box.classList.add("warning");
      box.textContent = "Fueling or recovery may be lagging. Add an extra carbohydrate + protein snack today and check whether breakfast, lunch, pre-practice fuel, or recovery food was missed.";
      return;
    }

    box.textContent = "Fueling signals look generally okay today. Keep the regular meal + snack rhythm and adjust upward on harder training days.";
  }

  function init() {
    putProfile(loadProfile());
    renderWeekly();
    renderGroceries();
    renderPlan();

    document.querySelectorAll("#dayButtons button").forEach(btn => {
      btn.addEventListener("click", () => setDay(btn.dataset.day));
    });

    $("saveProfileBtn").addEventListener("click", saveProfile);
    $("assessBtn").addEventListener("click", assessFueling);
    $("printBtn").addEventListener("click", () => window.print());

    $("energy").addEventListener("input", e => {
      $("energyValue").textContent = e.target.value;
    });

    $("hunger").addEventListener("input", e => {
      $("hungerValue").textContent = e.target.value;
    });
  }

  init();
})();
