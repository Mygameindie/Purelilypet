// ===========================================================
// 🛝 PLAYGROUND MODE
// Pets auto-walk and bounce. Drag the ball to kick it at them!
// ✅ 2 pets — uses normal base/fly/fall frames (no new art needed)
// ✅ Ball drawn on canvas (no image required)
// ===========================================================

(() => {
  if (typeof window._modeCleanup === 'function') {
    try { window._modeCleanup(); } catch (_) {}
  }
  window._modeName = 'playground';

  if (window.SoundManager) window.SoundManager.stopAll();

  // ==============================
  // Canvas
  // ==============================
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();

  const groundHeight = 100;
  let groundY = canvas.height - groundHeight;

  // ==============================
  // Images — normal base sets (fly0 / fly1 / fall / stand)
  // ==============================
  function loadImg(src) {
    const img = new Image();
    img._failed = false;
    img.onerror = () => { img._failed = true; };
    img.src = src;
    return img;
  }

  const baseSets = [
    { stand: loadImg('base.png'),   fly0: loadImg('base2.png'),   fly1: loadImg('base3.png'),   fall: loadImg('base4.png') },
    { stand: loadImg('base_2.png'), fly0: loadImg('base2_2.png'), fly1: loadImg('base3_2.png'), fall: loadImg('base4_2.png') },
  ];

  function safeDraw(img, x, y, w, h) {
    if (!img || img._failed || !img.complete || img.naturalWidth === 0) return;
    ctx.drawImage(img, x, y, w, h);
  }

  // ==============================
  // Pet state
  // ==============================
  const PET_W = 400;
  const PET_H = 450;
  const gravity = 1.2;
  const walkSpeed = 1.8;

  function makePet(xFrac, idx) {
    return {
      idx,
      x: canvas.width * xFrac,
      y: groundY - PET_H / 2,
      vy: 0,
      dir: idx === 0 ? 1 : -1,   // walk direction
      onGround: true,
      frame: 0,
      frameTimer: 0,
      jumpCooldown: 0,
    };
  }

  const pets = [makePet(0.3, 0), makePet(0.7, 1)];

  // ==============================
  // Ball
  // ==============================
  const BALL_R = 28;
  const ball = {
    x: canvas.width / 2,
    y: canvas.height * 0.3,
    vx: 0,
    vy: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
  };

  // ==============================
  // Drag
  // ==============================
  let offsetX = 0, offsetY = 0;

  function getPtr(e) {
    const r = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: cx - r.left, y: cy - r.top };
  }

  function onDown(e) {
    const p = getPtr(e);
    const dx = p.x - ball.x;
    const dy = p.y - ball.y;
    if (Math.sqrt(dx * dx + dy * dy) <= BALL_R + 12) {
      ball.dragging = true;
      ball.vx = 0;
      ball.vy = 0;
      offsetX = dx;
      offsetY = dy;
      ball.lastX = p.x;
      ball.lastY = p.y;
      e.preventDefault();
    }
  }

  function onMove(e) {
    if (!ball.dragging) return;
    const p = getPtr(e);
    ball.lastX = ball.x;
    ball.lastY = ball.y;
    ball.x = p.x - offsetX;
    ball.y = p.y - offsetY;
    if (e.touches) e.preventDefault();
  }

  function onUp() {
    if (!ball.dragging) return;
    ball.dragging = false;
    // fling based on last movement
    ball.vx = (ball.x - ball.lastX) * 1.4;
    ball.vy = (ball.y - ball.lastY) * 1.4;
  }

  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', onDown, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onUp);

  // ==============================
  // Resize
  // ==============================
  function onResize() {
    resizeCanvas();
    groundY = canvas.height - groundHeight;
  }
  window.addEventListener('resize', onResize);

  // ==============================
  // Physics update
  // ==============================
  function updateBall() {
    if (ball.dragging) return;

    ball.vy += gravity;
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Ground bounce
    if (ball.y + BALL_R >= groundY) {
      ball.y = groundY - BALL_R;
      ball.vy *= -0.55;
      ball.vx *= 0.85;
      if (Math.abs(ball.vy) < 1.5) ball.vy = 0;
    }

    // Wall bounce
    if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * 0.7; }
    if (ball.x + BALL_R > canvas.width) { ball.x = canvas.width - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.7; }
  }

  function updatePets() {
    for (const pet of pets) {
      if (pet.jumpCooldown > 0) pet.jumpCooldown--;

      // Walk back and forth
      pet.x += walkSpeed * pet.dir;
      if (pet.x > canvas.width * 0.75) pet.dir = -1;
      if (pet.x < canvas.width * 0.25) pet.dir = 1;

      // Gravity
      if (!pet.onGround) {
        pet.vy += gravity;
        pet.y += pet.vy;
        if (pet.y + PET_H / 2 >= groundY) {
          pet.y = groundY - PET_H / 2;
          pet.vy = 0;
          pet.onGround = true;
        }
      }

      // Ball collision → pet jumps
      const dx = ball.x - pet.x;
      const dy = ball.y - (pet.y - PET_H * 0.15);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < BALL_R + 80 && pet.onGround && pet.jumpCooldown === 0) {
        pet.vy = -18;
        pet.onGround = false;
        pet.jumpCooldown = 60;
        // bounce ball away
        ball.vx = dx > 0 ? Math.abs(ball.vx) + 4 : -(Math.abs(ball.vx) + 4);
        ball.vy = -10;
        if (window.PetStats && typeof window.PetStats.playground === 'function') {
          window.PetStats.playground(pet.idx);
        }
      }

      // Animate frames
      pet.frameTimer++;
      if (pet.frameTimer > 8) {
        pet.frameTimer = 0;
        pet.frame = (pet.frame + 1) % 2;
      }
    }
  }

  // ==============================
  // Draw
  // ==============================
  function drawGround() {
    // Grass
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(0, groundY, canvas.width, 14);
    // Dirt
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(0, groundY + 14, canvas.width, groundHeight - 14);
  }

  function drawBall() {
    ctx.save();
    // Shadow
    ctx.beginPath();
    ctx.ellipse(ball.x, groundY + 6, Math.max(8, BALL_R - Math.max(0, groundY - ball.y - BALL_R) * 0.3), 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();

    // Ball body
    const grad = ctx.createRadialGradient(ball.x - BALL_R * 0.3, ball.y - BALL_R * 0.3, BALL_R * 0.1, ball.x, ball.y, BALL_R);
    grad.addColorStop(0, '#fde68a');
    grad.addColorStop(0.5, '#f59e0b');
    grad.addColorStop(1, '#b45309');
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Stripe
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, -0.4, 0.4);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  function getPetState(pet) {
    if (!pet.onGround) {
      return pet.vy > 5 ? 'fall' : (pet.frame === 0 ? 'fly0' : 'fly1');
    }
    return 'stand';
  }

  function drawPets() {
    for (const pet of pets) {
      const i = pet.idx;
      const state = getPetState(pet);

      let set = baseSets[i];
      let img = set[state];

      const needsTint = i === 1 && (img?._failed || !img?.complete);
      if (needsTint) { set = baseSets[0]; img = set[state]; }

      ctx.save();
      if (needsTint) ctx.filter = 'hue-rotate(140deg) saturate(1.2)';

      // Flip when walking left
      if (pet.dir === -1) {
        ctx.translate(pet.x, 0);
        ctx.scale(-1, 1);
        safeDraw(img, -PET_W / 2, pet.y - PET_H / 2, PET_W, PET_H);
      } else {
        safeDraw(img, pet.x - PET_W / 2, pet.y - PET_H / 2, PET_W, PET_H);
      }

      ctx.restore();
    }
  }

  // ==============================
  // Loop
  // ==============================
  let running = true;
  let raf = 0;

  function loop() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updateBall();
    updatePets();

    drawGround();
    drawBall();
    drawPets();

    raf = requestAnimationFrame(loop);
  }

  loop();

  // ==============================
  // Cleanup
  // ==============================
  window._modeCleanup = function () {
    running = false;
    cancelAnimationFrame(raf);
    canvas.removeEventListener('mousedown', onDown);
    canvas.removeEventListener('mousemove', onMove);
    canvas.removeEventListener('mouseup', onUp);
    canvas.removeEventListener('touchstart', onDown);
    canvas.removeEventListener('touchmove', onMove);
    canvas.removeEventListener('touchend', onUp);
    window.removeEventListener('resize', onResize);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

})();
