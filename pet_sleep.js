// ===========================================================
// 😴 pet_sleep.js — Sleep Mode (2-canvas fix)
// ✅ FIX: blanket ALWAYS on top using separate canvas (#blanketCanvas z-index 99999)
// ===========================================================
(function () {
  // --- Base canvas (bed/pet/clothes) ---
  const baseCanvas = document.getElementById("canvas");
  const baseCtx = baseCanvas.getContext("2d");

  // --- Top canvas (blanket only) — must overlay game canvas ---
  let blanketCanvas = document.getElementById("blanketCanvas");
  if (!blanketCanvas) {
    blanketCanvas = document.createElement("canvas");
    blanketCanvas.id = "blanketCanvas";
    document.body.appendChild(blanketCanvas);
  }
  // Position it exactly over the game canvas
  blanketCanvas.style.position = "fixed";
  blanketCanvas.style.top = "0";
  blanketCanvas.style.left = "0";
  blanketCanvas.style.width = "100vw";
  blanketCanvas.style.height = "100vh";
  blanketCanvas.style.zIndex = "99";
  blanketCanvas.style.pointerEvents = "none"; // setBlanketPointerEvents toggles this
  const blanketCtx = blanketCanvas.getContext("2d");

  // ✅ CONFIG
  const BED_OFFSET = 450; // bigger number = higher bed
  const GROUND_OFFSET = 100;

  function resizeCanvas() {
    baseCanvas.width = window.innerWidth;
    baseCanvas.height = window.innerHeight;

    blanketCanvas.width = window.innerWidth;
    blanketCanvas.height = window.innerHeight;
  }
  resizeCanvas();

  // === Images ===
  function createImg(src) {
    const img = new Image();
    img._failed = false;
    img.onerror = () => { img._failed = true; };
    img.src = src;
    return img;
  }

  // Optional 2 art naming:
  //   base_2.png, base2_2.png, base3_2.png, base4_2.png
  function loadBaseSet(suffix) {
    return {
      stand: createImg(`base${suffix}.png`),
      fall: createImg(`base4${suffix}.png`),
      fly0: createImg(`base2${suffix}.png`),
      fly1: createImg(`base3${suffix}.png`),
    };
  }

  const baseSets = [
    loadBaseSet(''),
    loadBaseSet('_2'),
  ];

    const imgs = {
  bed: createImg("bed.png"),
  bedSleep1: [
    createImg("bed_sleep1.png"),     // pet1
    createImg("bed_sleep1_2.png"),   // pet2
  ],
  bedSleep2: [
    createImg("bed_sleep2.png"),     // pet1
    createImg("bed_sleep2_2.png"),   // pet2
  ],
  blanket1: createImg("blanket1.png"),
};


  // === Pets (2) ===
  function makePet(x, idx) {
    const p = {
      x,
      y: baseCanvas.height - 170 - 170,
      w: 400,
      h: 450,
      dragging: false,
      oldx: 0,
      oldy: 0,
      visible: true,
      drawFilter: idx === 1 ? "hue-rotate(140deg) saturate(1.2)" : "none",
    };
    p.oldx = p.x;
    p.oldy = p.y;
    return p;
  }

  const pets = [
    makePet(baseCanvas.width * 0.35, 0),
    makePet(baseCanvas.width * 0.65, 1),
  ];

  // === Beds (2) ===
  const beds = [
    {
      x: baseCanvas.width * 0.35,
      y: baseCanvas.height - BED_OFFSET,
      w: 400,
      h: 450,
      state: "normal", // "normal" | "preSleep" | "sleeping"
    },
    {
      x: baseCanvas.width * 0.65,
      y: baseCanvas.height - BED_OFFSET,
      w: 400,
      h: 450,
      state: "normal",
    },
  ];

  // === Blankets (2) — sized to cover the bed ===
  const blankets = [
    {
      x: beds[0].x,
      y: beds[0].y - 120,
      w: 400,
      h: 350,
      visible: false,
      dragging: false,
      locked: false,
    },
    {
      x: beds[1].x,
      y: beds[1].y - 120,
      w: 400,
      h: 350,
      visible: false,
      dragging: false,
      locked: false,
    },
  ];

  // === Physics ===
  const vy = [0, 0];
  const vx = [0, 0];
  const gravity = 1.0;
  const damping = 0.94;
  let groundY = baseCanvas.height - GROUND_OFFSET;
  const MIN_IMPACT = 1.5;

  // === Helpers ===
  function getPos(canvasEl, e) {
    const r = canvasEl.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x, y };
  }

  function snapBlanketToBed(i) {
    const bed = beds[i];
    const blanket = blankets[i];
    blanket.x = bed.x;
    blanket.y = bed.y - 40;  // center blanket over the bed area
  }

  function setBlanketPointerEvents() {
    // ✅ Only let top canvas intercept input when ANY blanket is interactable
    const anyInteractable = blankets.some(b => b.visible && !b.locked);
    blanketCanvas.style.pointerEvents = anyInteractable ? "auto" : "none";
  }

  // Active drag targets
  let activePetIndex = -1;
  let activeBlanketIndex = -1;

  // === Drag Start (PET) — on base canvas ===
  function startDragPet(e) {
    const p = getPos(baseCanvas, e);

    for (let i = pets.length - 1; i >= 0; i--) {
      const pet = pets[i];
      if (
        pet.visible &&
        p.x > pet.x - pet.w / 2 &&
        p.x < pet.x + pet.w / 2 &&
        p.y > pet.y - pet.h / 2 &&
        p.y < pet.y + pet.h / 2
      ) {
        pet.dragging = true;
        activePetIndex = i;
        vx[i] = 0;
        vy[i] = 0;
        if (typeof window.setActivePet === "function") window.setActivePet(i);
        e.preventDefault();
        return;
      }
    }
  }

  // === Drag Move (PET) — on base canvas ===
  function moveDragPet(e) {
    if (activePetIndex < 0) return;
    const pet = pets[activePetIndex];
    if (!pet.dragging) return;
    const p = getPos(baseCanvas, e);
    pet.x = p.x;
    pet.y = p.y;
  }

  // === Drag End (PET) — on base canvas ===
  function endDragPet() {
    if (activePetIndex < 0) return;
    const i = activePetIndex;
    const pet = pets[i];
    if (!pet.dragging) return;

    pet.dragging = false;
    pet.oldx = pet.x;
    pet.oldy = pet.y;

    const bed = beds[i];
    const blanket = blankets[i];

    const petBottom = pet.y + pet.h / 2;
    const bedTop = bed.y - bed.h / 2;

    const overlapX = Math.abs(pet.x - bed.x) < (pet.w / 2 + bed.w / 2) * 0.6;
    const overlapY = petBottom > bedTop && petBottom < bed.y + bed.h / 2;

    if (overlapX && overlapY) {
      bed.state = "preSleep";
      blanket.visible = true;
      blanket.locked = false;
      snapBlanketToBed(i);
      setBlanketPointerEvents();

      pet.visible = false;
      vy[i] = 0;
      vx[i] = 0;
    }

    activePetIndex = -1;
  }

  // === Drag Start (BLANKET) — on top canvas ===
  function startDragBlanket(e) {
    const p = getPos(blanketCanvas, e);
    for (let i = blankets.length - 1; i >= 0; i--) {
      const blanket = blankets[i];
      if (!blanket.visible || blanket.locked) continue;
      if (
        p.x > blanket.x - blanket.w / 2 &&
        p.x < blanket.x + blanket.w / 2 &&
        p.y > blanket.y - blanket.h / 2 &&
        p.y < blanket.y + blanket.h / 2
      ) {
        blanket.dragging = true;
        activeBlanketIndex = i;
        if (typeof window.setActivePet === "function") window.setActivePet(i);
        e.preventDefault();
        return;
      }
    }
  }

  // === Drag Move (BLANKET) — on top canvas ===
  function moveDragBlanket(e) {
    if (activeBlanketIndex < 0) return;
    const blanket = blankets[activeBlanketIndex];
    if (!blanket.dragging) return;
    const p = getPos(blanketCanvas, e);
    blanket.x = p.x;
    blanket.y = p.y;
  }

  // === Drag End (BLANKET) — on top canvas ===
  function endDragBlanket() {
    if (activeBlanketIndex < 0) return;
    const i = activeBlanketIndex;
    const blanket = blankets[i];
    if (!blanket.dragging) return;

    blanket.dragging = false;

    const bed = beds[i];
    const overlapX = Math.abs(blanket.x - bed.x) < (blanket.w / 2 + bed.w / 2) * 0.6;
    const overlapY = Math.abs(blanket.y - bed.y) < (blanket.h / 2 + bed.h / 2) * 0.6;

    if (overlapX && overlapY && bed.state === "preSleep") {
      blanket.visible = true;
      blanket.locked = true;
      snapBlanketToBed(i);

      bed.state = "sleeping";
      if (window.PetStats) window.PetStats.sleep(i);

      window._sleepClickBlocked = true;
      setTimeout(() => {
        window._sleepClickBlocked = false;
      }, 100);
    }

    setBlanketPointerEvents();
    activeBlanketIndex = -1;
  }

  function handleWakeClick(e, sourceCanvas) {
  if (window._sleepClickBlocked) return;

  const p = getPos(sourceCanvas, e);

  for (let i = 0; i < beds.length; i++) {
    const bed = beds[i];

    const bedLeft = bed.x - bed.w / 2;
    const bedRight = bed.x + bed.w / 2;
    const bedTop = bed.y - bed.h / 2;
    const bedBottom = bed.y + bed.h / 2;

    if (
      (bed.state === "preSleep" || bed.state === "sleeping") &&
      p.x > bedLeft &&
      p.x < bedRight &&
      p.y > bedTop &&
      p.y < bedBottom
    ) {
      // ✅ Reset bed
      bed.state = "normal";

      const pet = pets[i];
      const blanket = blankets[i];

      // ✅ Show pet again
      pet.visible = true;
      pet.x = bed.x;
      pet.y = bed.y - bed.h / 2 - pet.h / 2;

      // ✅ Hide blanket completely
      blanket.visible = false;
      blanket.locked = false;
      blanket.dragging = false;
      snapBlanketToBed(i);

      // Reset physics
      vx[i] = 0;
      vy[i] = 0;
      pet.oldx = pet.x;
      pet.oldy = pet.y;

      if (typeof window.setActivePet === "function") {
        window.setActivePet(i);
      }

      setBlanketPointerEvents();
      break;
    }
  }
}

  // === Event Listeners ===
  // Pet events
  baseCanvas.addEventListener("mousedown", startDragPet);
  baseCanvas.addEventListener("mousemove", moveDragPet);
  baseCanvas.addEventListener("mouseup", endDragPet);
  baseCanvas.addEventListener("touchstart", startDragPet, { passive: false });
  baseCanvas.addEventListener("touchmove", moveDragPet, { passive: false });
  baseCanvas.addEventListener("touchend", endDragPet);

  // Blanket events (top canvas)
  blanketCanvas.addEventListener("mousedown", startDragBlanket);
  blanketCanvas.addEventListener("mousemove", moveDragBlanket);
  blanketCanvas.addEventListener("mouseup", endDragBlanket);
  blanketCanvas.addEventListener("touchstart", startDragBlanket, { passive: false });
  blanketCanvas.addEventListener("touchmove", moveDragBlanket, { passive: false });
  blanketCanvas.addEventListener("touchend", endDragBlanket);

  // Wake click (both canvases)
  baseCanvas.addEventListener("click", (e) => handleWakeClick(e, baseCanvas));
  blanketCanvas.addEventListener("click", (e) => handleWakeClick(e, blanketCanvas));

  // === Resize ===
  function onResize() {
    resizeCanvas();
    beds[0].x = baseCanvas.width * 0.35;
    beds[1].x = baseCanvas.width * 0.65;
    beds.forEach(b => (b.y = baseCanvas.height - BED_OFFSET));
    groundY = baseCanvas.height - GROUND_OFFSET;

    blankets.forEach((bl, i) => {
      if (bl.visible) snapBlanketToBed(i);
    });
  }
  window.addEventListener("resize", onResize);

  // === Physics Update ===
  function update() {
    for (let i = 0; i < pets.length; i++) {
      const pet = pets[i];
      const bed = beds[i];
      if (!pet.visible || bed.state !== "normal") continue;
      if (pet.dragging) continue;

      const nx = pet.x;
      const ny = pet.y;
      vx[i] = (nx - pet.oldx) * damping;
      vy[i] = (ny - pet.oldy) * damping;
      pet.oldx = nx;
      pet.oldy = ny;

      vy[i] += gravity;
      pet.x += vx[i];
      pet.y += vy[i];

      if (pet.y + pet.h / 2 >= groundY) {
        pet.y = groundY - pet.h / 2;
        if (Math.abs(vy[i]) > MIN_IMPACT) vy[i] = -vy[i] * 0.25;
        else vy[i] = 0;
      }
    }
  }

  // === Draw Helpers ===
  function safeDraw(ctx, img, x, y, w, h) {
    if (!img || img._failed || !img.complete || img.naturalWidth === 0) return;
    try {
      ctx.drawImage(img, x, y, w, h);
    } catch (_) {}
  }

  function drawBed() {
  beds.forEach((bed, i) => {
    let img = imgs.bed;

    if (bed.state === "preSleep") {
      img = imgs.bedSleep1[i] || imgs.bedSleep1[0];
    } else if (bed.state === "sleeping") {
      img = imgs.bedSleep2[i] || imgs.bedSleep2[0];
    }

    safeDraw(baseCtx, img, bed.x - bed.w / 2, bed.y - bed.h / 2, bed.w, bed.h);
  });
}

  function drawPet() {
    pets.forEach((pet, i) => {
      if (!pet.visible) return;

      const state = pet.dragging ? "fly0" : vy[i] > 2 ? "fall" : "stand";
      let set = baseSets[i] || baseSets[0];
      let img = set[state];
      let useTintFallback = false;
      if (!img || img._failed) {
        set = baseSets[0];
        img = set[state];
        useTintFallback = (i === 1);
      }

      baseCtx.save();
      baseCtx.filter = useTintFallback ? (pet.drawFilter || "none") : "none";
      safeDraw(baseCtx, img, pet.x - pet.w / 2, pet.y - pet.h / 2, pet.w, pet.h);

      // Outfit overlay (per pet)
      if (window.drawOutfitOverlay) {
        window.drawOutfitOverlay(baseCtx, state, pet.x - pet.w / 2, pet.y - pet.h / 2, pet.w, pet.h, i);
      }

      baseCtx.restore();
    });
  }

  function drawSleepOutfit() {
    if (!window.drawOutfitOverlay) return;

    const SLEEP_OFF_X = 0;
    const SLEEP_OFF_Y = 0;

    for (let i = 0; i < beds.length; i++) {
      const bed = beds[i];
      if (bed.state === "normal") continue;

      const pet = pets[i];
      const ox = bed.x + SLEEP_OFF_X - pet.w / 2;
      const oy = bed.y + SLEEP_OFF_Y - pet.h / 2;

      // If 2 art is missing (fallback tint), tint sleep outfit too so everything matches.
      let set = baseSets[i] || baseSets[0];
      let base = set.stand;
      let needsTint = false;
      if (!base || base._failed) {
        needsTint = (i === 1);
      }

      baseCtx.save();
      baseCtx.filter = needsTint ? (pet.drawFilter || "none") : "none";
      const drawn = window.drawOutfitOverlay(baseCtx, "sleep", ox, oy, pet.w, pet.h, i);
      if (!drawn) window.drawOutfitOverlay(baseCtx, "stand", ox, oy, pet.w, pet.h, i);
      baseCtx.restore();
    }
  }

  function drawBlanketTopCanvas() {
    blanketCtx.clearRect(0, 0, blanketCanvas.width, blanketCanvas.height);
    for (let i = 0; i < blankets.length; i++) {
      const blanket = blankets[i];
      if (!blanket.visible) continue;
      safeDraw(
        blanketCtx,
        imgs.blanket1,
        blanket.x - blanket.w / 2,
        blanket.y - blanket.h / 2,
        blanket.w,
        blanket.h
      );
    }
  }

  // === Continuous energy restore while sleeping ===
  // Runs on a 1-second interval (not per-frame) to avoid spamming localStorage
  const ENERGY_PER_TICK = 3;   // energy gained every tick
  const sleepInterval = setInterval(() => {
    for (let i = 0; i < beds.length; i++) {
      if (beds[i].state === "sleeping" && window.PetStats) {
        window.PetStats.sleep(i, ENERGY_PER_TICK);
      }
    }
  }, 1000);

  // Tell pet_stats which pets are sleeping so decay pauses their energy
  function updateSleepingFlags() {
    window._petsSleeping = [];
    for (let i = 0; i < beds.length; i++) {
      window._petsSleeping[i] = (beds[i].state === "sleeping");
    }
  }

  // === Main Loop ===
  let raf = 0;
  function loop() {
    baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);

    update();
    updateSleepingFlags();

    // Base layer
    drawBed();
    drawPet();
    drawSleepOutfit();

    // Top layer (ALWAYS above everything)
    drawBlanketTopCanvas();

    raf = requestAnimationFrame(loop);
  }

  // init pointer-events state
  setBlanketPointerEvents();

  loop();

  // === Cleanup ===
  window._modeCleanup = function () {
    cancelAnimationFrame(raf);
    clearInterval(sleepInterval);
    window._petsSleeping = null;
    window.removeEventListener("resize", onResize);
    // Remove blanket canvas so it doesn't block other modes
    if (blanketCanvas && blanketCanvas.parentNode) {
      blanketCanvas.parentNode.removeChild(blanketCanvas);
    }
  };

  window._modeName = "sleep";
})();