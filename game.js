// ©Syed Ashaz Ahmed — 2D sprite restaurant engine, recipe inspector, XP/streaks, sound
const canvas = document.getElementById('restaurant-canvas');
const ctx = canvas.getContext('2d');

const chef = { x: 450, y: 260, targetX: 450, targetY: 260, speed: 4.2, dir: 1, walkFrame: 0, holdingDish: null };
const keysPressed = {};
let dishHotspots = [];
let floatingTexts = [];
let particles = [];

// ---------- input ----------
const isTyping = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
const gameVisible = () => !document.getElementById('view-game').classList.contains('hidden');

window.addEventListener('keydown', e => {
  if (isTyping() || !gameVisible()) return;
  const k = e.key.toLowerCase();
  keysPressed[k] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (k === 'e') {
    if (Math.hypot(chef.x - 450, chef.y - 340) < 150) eatSelectedDishInGame();
    else spawnFloatingText(chef.x, chef.y - 45, 'Walk to the Dining Table, then press E', '#fca5a5');
  }
  if (k === 'm') {
    soundOn = !soundOn;
    spawnFloatingText(chef.x, chef.y - 45, soundOn ? '🔊 Sound on' : '🔇 Sound off', '#D4AF37');
  }
}, { passive: false });
window.addEventListener('keyup', e => { keysPressed[e.key.toLowerCase()] = false; });

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
  for (const spot of dishHotspots) {
    if (Math.hypot(cx - spot.x, cy - spot.y) <= spot.r) {
      selectDishInGame(spot.dishId);
      chef.targetX = Math.max(60, Math.min(840, spot.x));
      chef.targetY = Math.max(130, Math.min(410, spot.y + 38));
      return;
    }
  }
  chef.targetX = Math.max(50, Math.min(850, cx));
  chef.targetY = Math.max(125, Math.min(420, cy));
});

function selectDishInGame(dishId) {
  state.selectedDishId = dishId;
  const dish = state.dishes.find(d => d.id === dishId);
  if (dish) {
    chef.holdingDish = dish;
    spawnFloatingText(chef.x, chef.y - 35, `Inspecting: ${dish.title.slice(0, 18)}`, '#D4AF37');
  }
  renderGameInspector();
  renderGameShelf();
}

function spawnFloatingText(x, y, text, color = '#4ade80') {
  floatingTexts.push({ x, y, text, color, alpha: 1, dy: -1.1 });
}

function spawnEatParticles(x, y, color) {
  for (let i = 0; i < 18; i++) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.8) * 5, size: 3 + Math.random() * 4, color, life: 1 });
  }
}

// ---------- sprites ----------
function drawPixelDishSprite(x, y, dish, isSelected, time) {
  const pantry = isMastered(dish);
  const status = evaluateDishRichness(dish);
  ctx.save();
  ctx.translate(x, y);

  if (isSelected) {
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 18 + Math.sin(time * 0.008) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (dish.slot === 'meal1' || dish.slot === 'meal3') {
    ctx.fillStyle = '#C85A32';
    ctx.beginPath(); ctx.arc(0, 2, 13, 0, Math.PI, false); ctx.fill();
    ctx.fillStyle = '#F9F6F0';
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pantry ? '#10b981' : (status.isRich ? '#ea580c' : '#ef4444');
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  } else if (dish.slot === 'meal2' || dish.slot === 'meal4') {
    ctx.fillStyle = '#3B6E5C'; ctx.fillRect(-13, -9, 26, 18);
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(-10, -6, 9, 12);
    ctx.fillStyle = pantry ? '#10b981' : (status.isRich ? '#059669' : '#ef4444');
    ctx.fillRect(1, -6, 9, 12);
  } else if (dish.slot.includes('snack')) {
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#78350f'; ctx.fillRect(-5, -3, 10, 6);
  } else {
    ctx.fillStyle = '#6366f1';
    ctx.beginPath(); ctx.arc(0, 3, 11, Math.PI, 0, false); ctx.fill();
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(-13, 3, 26, 3);
  }

  if (status.isRich) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.2;
    const wave = Math.sin(time * 0.005 + x) * 2;
    ctx.beginPath();
    ctx.moveTo(-4, -8); ctx.quadraticCurveTo(-4 + wave, -13, -4, -18);
    ctx.moveTo(4, -8); ctx.quadraticCurveTo(4 - wave, -13, 4, -18);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(10, -9, 4.5, 0, Math.PI * 2); ctx.fill();
  }

  if (pantry) {
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 10px Inter';
    ctx.fillText('★', -4, -10);
  }
  ctx.restore();
}

function drawChefSprite(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 18, 14, 6, 0, 0, Math.PI * 2); ctx.fill();

  const bounce = Math.sin(chef.walkFrame * 0.35) * 2.5;
  ctx.fillStyle = '#C85A32'; ctx.fillRect(-10, -6 + bounce, 20, 20);
  ctx.fillStyle = '#F9F6F0'; ctx.fillRect(-7, -2 + bounce, 14, 16);
  ctx.fillStyle = '#fbd38d'; ctx.fillRect(-9, -20 + bounce, 18, 14);
  ctx.fillStyle = '#1E1E1C';
  const eo = chef.dir >= 0 ? 2 : -2;
  ctx.fillRect(-4 + eo, -15 + bounce, 3, 3);
  ctx.fillRect(3 + eo, -15 + bounce, 3, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-11, -30 + bounce, 22, 10);
  ctx.fillRect(-8, -35 + bounce, 16, 6);
  ctx.fillStyle = '#D4AF37'; ctx.fillRect(-11, -22 + bounce, 22, 2);

  ctx.fillStyle = 'rgba(20,20,18,0.85)'; ctx.fillRect(-34, 22, 68, 13);
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 8px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CHEF ASHAZ', 0, 31);
  ctx.restore();
}

function drawStation(x, y, w, h, fill, stroke, label, labelColor) {
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = labelColor;
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 10, y + 17);
}

function placeDishes(dishes, startX, stepX, py, time) {
  dishes.forEach((d, idx) => {
    const px = startX + idx * stepX;
    drawPixelDishSprite(px, py, d, state.selectedDishId === d.id, time);
    dishHotspots.push({ x: px, y: py, r: 20, dishId: d.id });
  });
}

function renderRestaurantFrame(time) {
  // movement
  let dx = 0, dy = 0;
  if (keysPressed['arrowleft'] || keysPressed['a']) dx -= 1;
  if (keysPressed['arrowright'] || keysPressed['d']) dx += 1;
  if (keysPressed['arrowup'] || keysPressed['w']) dy -= 1;
  if (keysPressed['arrowdown'] || keysPressed['s']) dy += 1;

  if (dx || dy) {
    chef.x = Math.max(50, Math.min(850, chef.x + dx * chef.speed));
    chef.y = Math.max(125, Math.min(420, chef.y + dy * chef.speed));
    chef.targetX = chef.x; chef.targetY = chef.y;
    if (dx) chef.dir = dx > 0 ? 1 : -1;
    chef.walkFrame++;
  } else {
    const dist = Math.hypot(chef.targetX - chef.x, chef.targetY - chef.y);
    if (dist > 3) {
      chef.x += ((chef.targetX - chef.x) / dist) * chef.speed;
      chef.y += ((chef.targetY - chef.y) / dist) * chef.speed;
      chef.dir = (chef.targetX - chef.x) >= 0 ? 1 : -1;
      chef.walkFrame++;
    }
  }

  // floor
  const tile = 45;
  for (let r = 0; r < canvas.height / tile; r++)
    for (let c = 0; c < canvas.width / tile; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#2b2623' : '#231f1c';
      ctx.fillRect(c * tile, r * tile, tile, tile);
    }

  // wall
  ctx.fillStyle = '#181513'; ctx.fillRect(0, 0, 900, 95);
  ctx.strokeStyle = '#C85A32'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 95); ctx.lineTo(900, 95); ctx.stroke();

  const dayObj = state.days[state.activeDay] || state.days[1];
  const p1 = dayObj.phase === 1;
  dishHotspots = [];

  // Track A
  drawStation(25, 45, 395, 78, '#5c2816', '#C85A32', p1 ? '🍲 TRACK A COUNTER: MEAL 1 (DAYS 1–37)' : '🍲 TRACK A COUNTER: MEAL 3 (DAYS 38–67)', '#F9F6F0');
  placeDishes(state.dishes.filter(d => d.slot === (p1 ? 'meal1' : 'meal3')).slice(0, 8), 55, 46, 95, time);

  // Track B
  drawStation(450, 45, 425, 78, '#1d3b31', '#3B6E5C', p1 ? '🍱 TRACK B COUNTER: MEAL 2 (DAYS 1–37)' : '🍱 TRACK B COUNTER: MEAL 4 (DAYS 38–67)', '#F9F6F0');
  placeDishes(state.dishes.filter(d => d.slot === (p1 ? 'meal2' : 'meal4')).slice(0, 8), 480, 48, 95, time);

  // Snack bar
  drawStation(30, 320, 250, 115, '#423311', '#D4AF37', '🥨 PREREQUISITE SNACK BAR (3-4x/WK)', '#fde047');
  placeDishes(state.dishes.filter(d => d.slot === 'snacks1' || d.slot === 'snacks2').slice(0, 5), 62, 45, 385, time);

  // Dining table
  ctx.fillStyle = '#3e2723';
  ctx.beginPath(); ctx.roundRect(330, 305, 240, 135, 16); ctx.fill();
  ctx.strokeStyle = '#D4AF37'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#F9F6F0'; ctx.fillRect(355, 330, 190, 85);
  ctx.fillStyle = '#1E1E1C';
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`🍽️ DAY ${state.activeDay} DINING TABLE`, 382, 322);

  const sess = dayObj.sessions || [];
  const ateA = sess.some(s => s.track.includes('Meal 1') || s.track.includes('Meal 3'));
  const ateB = sess.some(s => s.track.includes('Meal 2') || s.track.includes('Meal 4'));
  const ateS = sess.some(s => s.track.includes('Snack'));
  ctx.font = 'bold 9px "JetBrains Mono", monospace';
  ctx.fillStyle = '#57534e';
  ctx.fillText('MEAL 1', 372, 350); ctx.fillText('MEAL 2', 435, 350); ctx.fillText('SNACK', 498, 350);
  [[390, ateA, '#C85A32', '🍲'], [452, ateB, '#3B6E5C', '🍱'], [512, ateS, '#D4AF37', '🥨']].forEach(([px, ate, col, em]) => {
    ctx.fillStyle = ate ? col : '#d6d3d1';
    ctx.beginPath(); ctx.arc(px, 380, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '12px Inter';
    ctx.fillText(ate ? em : '○', px - 7, 385);
  });

  // Odd jobs
  drawStation(620, 320, 255, 115, '#1e1b4b', '#6366f1', '🛎️ ODD JOBS & SIDE ORDERS', '#c7d2fe');
  placeDishes(state.dishes.filter(d => d.slot === 'odd').slice(0, 5), 652, 45, 385, time);

  drawChefSprite(chef.x, chef.y);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.life -= 0.03;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
  }

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.dy; ft.alpha -= 0.018;
    if (ft.alpha <= 0) { floatingTexts.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = ft.alpha;
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillStyle = ft.color;
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }

  requestAnimationFrame(renderRestaurantFrame);
}

// ---------- recipe inspector ----------
function dishIcon(d) {
  if (d.slot === 'meal1' || d.slot === 'meal3') return '🍲';
  if (d.slot === 'meal2' || d.slot === 'meal4') return '🍱';
  if (d.slot.includes('snack')) return '🥨';
  return '🛎️';
}

function renderGameInspector() {
  const dish = state.dishes.find(d => d.id === state.selectedDishId) || state.dishes[0];
  if (!dish) return;
  const $ = id => document.getElementById(id);

  $('recipe-slot-badge').textContent = SLOT_LABELS[dish.slot] || dish.slot;
  $('recipe-dish-title').textContent = dish.title;
  $('recipe-domain-tag').textContent = dish.domain;
  $('recipe-sessions-count').textContent = `${dish.sessions || 0} Sessions Eaten`;
  $('recipe-sprite-icon').textContent = dishIcon(dish);

  const st = evaluateDishRichness(dish);
  const box = $('recipe-richness-box');
  if (isMastered(dish)) {
    box.className = 'p-3 rounded-xl border border-emerald-400 bg-emerald-50 text-emerald-900 text-xs space-y-1';
    box.innerHTML = `<div class="font-bold">★ MASTERED IN PANTRY</div><div>All 3 steps (Lessons, PYQ, Journal) completed. This dish now unlocks downstream recipes.</div>`;
  } else if (st.isRich) {
    box.className = 'p-3 rounded-xl border border-emerald-300 bg-emerald-50/70 text-emerald-900 text-xs space-y-1';
    box.innerHTML = `<div class="font-bold">🟢 YOU ARE "RICH" FOR THIS DISH</div><div>All hard prerequisites are in your Pantry or scheduled earlier. Eat freely.</div>`;
  } else {
    box.className = 'p-3 rounded-xl border border-red-300 bg-red-50 text-red-900 text-xs space-y-2';
    box.innerHTML = `
      <div class="font-bold">🔴 YOU ARE "POOR" (MISSING INGREDIENT)</div>
      <div>Missing hard prerequisite: <strong>${escapeHtml(st.missingHard.map(m => m.title).join(', '))}</strong></div>
      <button onclick="pullPrereqAsSnack('${st.missingHard[0].id}')" class="px-2.5 py-1 bg-red-700 text-white font-bold rounded text-[11px] hover:bg-red-800">🥨 Move "${escapeHtml(st.missingHard[0].title)}" to Snacks First</button>`;
  }

  const chips = (ids, cls, doneCls) => ids.map(id => {
    const r = state.dishes.find(d => d.id === id);
    if (!r) return '';
    return `<button onclick="selectDishInGame('${r.id}')" class="px-2 py-0.5 rounded border text-[11px] font-medium ${doneCls && isMastered(r) ? doneCls : cls}">${doneCls && isMastered(r) ? '✓ ' : ''}${escapeHtml(r.title)}</button>`;
  }).join('');

  $('recipe-hard-list').innerHTML = dish.hardPrereqs.length
    ? chips(dish.hardPrereqs, 'bg-white border-stone-300 text-stone-800', 'bg-emerald-100 border-emerald-400 text-emerald-900')
    : `<span class="text-stone-400 italic">None (Base Ingredient)</span>`;
  $('recipe-soft-list').innerHTML = dish.softPrereqs.length
    ? chips(dish.softPrereqs, 'border-amber-300 bg-amber-50 text-amber-900')
    : `<span class="text-stone-400 italic">None</span>`;

  const unlocks = state.dishes.filter(d => d.hardPrereqs.includes(dish.id) || d.softPrereqs.includes(dish.id));
  $('recipe-unlocks-list').innerHTML = unlocks.length
    ? unlocks.map(u => `<button onclick="selectDishInGame('${u.id}')" class="px-2 py-0.5 rounded bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px]">→ ${escapeHtml(u.title)}</button>`).join('')
    : `<span class="text-stone-400 italic">Final Boss Dish</span>`;

  $('chk-recipe-lessons').checked = !!dish.lessonsDone;
  $('chk-recipe-pyq').checked = !!dish.pyqDone;
  $('chk-recipe-journal').checked = !!dish.journalDone;
}

function toggleSelectedDishCheck(field) {
  const dish = state.dishes.find(d => d.id === state.selectedDishId);
  if (!dish) return;
  dish[field] = !dish[field];
  if (isMastered(dish)) {
    spawnEatParticles(chef.x, chef.y - 20, '#D4AF37');
    spawnFloatingText(chef.x, chef.y - 45, `★ PANTRY MASTERED: ${dish.title}!`, '#fde047');
    playChime();
  }
  saveState();
  renderPass();
}

function eatSelectedDishInGame() {
  const dish = state.dishes.find(d => d.id === state.selectedDishId);
  if (!dish) return;
  const day = state.days[state.activeDay];
  const wasPerfect = dayHasBothMeals(day);
  const levelBefore = computeGameStats().level;

  const when = document.getElementById('eat-when').value.trim() || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const given = document.getElementById('eat-given').value.trim() || '1 Full Session';

  day.sessions.push({ id: Date.now(), track: trackLabelForDish(dish), dishId: dish.id, dishTitle: dish.title, when, given });
  dish.sessions = (dish.sessions || 0) + 1;

  chef.targetX = 450; chef.targetY = 285;
  spawnEatParticles(450, 350, '#C85A32');
  spawnFloatingText(450, 295, `🍽️ ATE ${dish.title.toUpperCase()}! (+1 SESSION)`, '#4ade80');
  playCrunch();

  document.getElementById('eat-when').value = '';
  document.getElementById('eat-given').value = '';
  saveState();
  renderPass();

  const after = computeGameStats();
  if (!wasPerfect && dayHasBothMeals(day)) {
    spawnEatParticles(450, 340, '#fde047');
    spawnFloatingText(450, 260, '🏅 DAILY 2 MEALS COMPLETE! +25 XP', '#fde047');
    playChime();
  }
  if (after.level > levelBefore) {
    spawnFloatingText(450, 230, `⬆ LEVEL UP → ${after.title}!`, '#D4AF37');
    playChime();
  }
}

function changeGameDay(delta) {
  state.activeDay = Math.max(1, Math.min(67, state.activeDay + delta));
  updateDailyStomachHUD();
  spawnFloatingText(450, 200, `Switched to Day ${state.activeDay} (${state.days[state.activeDay].dateStr})`, '#D4AF37');
}

function openSelectedDishEditor() {
  if (state.selectedDishId) openEditDishModal(state.selectedDishId);
}

// ---------- HUD ----------
function updateDailyStomachHUD() {
  const day = state.days[state.activeDay] || state.days[1];
  document.getElementById('hud-day-badge').textContent = `DAY ${day.dayNumber} / 67`;
  document.getElementById('hud-date-text').textContent = `${day.dateStr} • Phase ${day.phase} (${day.phase === 1 ? 'Days 1–37' : 'Days 38–67'})`;

  const s = day.sessions || [];
  const A = s.filter(x => x.track.includes('Meal 1') || x.track.includes('Meal 3'));
  const B = s.filter(x => x.track.includes('Meal 2') || x.track.includes('Meal 4'));
  const S = s.filter(x => x.track.includes('Snack'));
  const fmt = (arr, empty) => arr.length ? `${arr.length}x (${arr[arr.length - 1].dishTitle})` : empty;
  document.getElementById('stomach-meal-a').textContent = fmt(A, 'Hungry (0 Eaten)');
  document.getElementById('stomach-meal-b').textContent = fmt(B, 'Hungry (0 Eaten)');
  document.getElementById('stomach-snack').textContent = fmt(S, '0 Bite Sessions');
  document.getElementById('stomach-pantry').textContent = `${state.dishes.filter(isMastered).length} / ${state.dishes.length} Dishes`;
  refreshGamification();
}

function renderGameShelf() {
  const grid = document.getElementById('game-shelf-grid');
  if (!grid) return;
  grid.innerHTML = state.dishes.map(d => {
    const sel = d.id === state.selectedDishId;
    const pantry = isMastered(d);
    const st = evaluateDishRichness(d);
    return `
      <button onclick="selectDishInGame('${d.id}')" class="p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${sel ? 'border-[#C85A32] ring-2 ring-[#C85A32] bg-orange-50/60' : 'border-stone-200 bg-stone-50 hover:bg-white'}">
        <div class="flex items-center justify-between w-full mb-1">
          <span class="text-base">${dishIcon(d)}</span>
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${pantry ? 'bg-emerald-700 text-white' : st.isRich ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}">${pantry ? '★ Pantry' : st.isRich ? 'Rich' : 'Poor'}</span>
        </div>
        <div class="font-bold text-xs text-stone-900 leading-tight">${escapeHtml(d.title)}</div>
        <div class="text-[10px] mono text-stone-500 mt-1 flex items-center justify-between"><span>${d.slot.toUpperCase()}</span><span>${d.sessions || 0} sess</span></div>
      </button>`;
  }).join('');
}

// ---------- XP, levels, streaks ----------
const LEVEL_TITLES = ['Dishwasher', 'Prep Cook', 'Line Cook', 'Sous Chef', 'Chef de Partie', 'Head Chef', 'Executive Chef', 'Michelin Master'];

function computeGameStats() {
  const sessions = state.dishes.reduce((n, d) => n + (d.sessions || 0), 0);
  const pantry = state.dishes.filter(isMastered).length;
  let perfectDays = 0;
  for (let i = 1; i <= 67; i++) if (dayHasBothMeals(state.days[i])) perfectDays++;

  const xp = sessions * 10 + pantry * 50 + perfectDays * 25;
  const level = Math.floor(xp / 100) + 1;

  const today = todayDayIndex();
  let streak = 0;
  let i = state.days[today].sessions.length ? today : today - 1;
  while (i >= 1 && state.days[i].sessions.length) { streak++; i--; }
  let best = 0, run = 0;
  for (let k = 1; k <= 67; k++) {
    if (state.days[k].sessions.length) { run++; best = Math.max(best, run); } else run = 0;
  }
  return { xp, level, into: xp % 100, streak, best, perfectDays, title: LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 2))] };
}

function refreshGamification() {
  if (!document.getElementById('hud-xp-box')) {
    const box = document.createElement('div');
    box.id = 'hud-xp-box';
    box.className = 'mt-1.5';
    box.innerHTML = `
      <div class="flex items-center gap-2 text-[11px]">
        <span id="hud-level" class="pixel-font text-[9px] text-[#D4AF37]">LV 1</span>
        <div class="w-32 h-2 bg-stone-700 rounded overflow-hidden"><div id="hud-xp-bar" class="h-full bg-[#C85A32]" style="width:0%"></div></div>
        <span id="hud-xp-text" class="mono text-stone-300">0 XP</span>
        <span id="hud-streak" class="mono text-amber-300">🔥 0</span>
      </div>`;
    document.getElementById('hud-date-text').parentElement.appendChild(box);
  }
  const s = computeGameStats();
  document.getElementById('hud-level').textContent = `LV ${s.level} ${s.title.toUpperCase()}`;
  document.getElementById('hud-xp-bar').style.width = s.into + '%';
  document.getElementById('hud-xp-text').textContent = `${s.xp} XP`;
  document.getElementById('hud-streak').textContent = `🔥 ${s.streak}-day streak (best ${s.best})`;
}

// ---------- 8-bit sound (WebAudio, no files) ----------
let audioCtx = null;
let soundOn = true;
function getAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { soundOn = false; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playCrunch() {
  if (!soundOn) return;
  const ac = getAudio(); if (!ac) return;
  const len = Math.floor(ac.sampleRate * 0.12);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = ac.createBufferSource(); src.buffer = buf;
  const g = ac.createGain(); g.gain.value = 0.25;
  src.connect(g); g.connect(ac.destination); src.start();
}
function playChime() {
  if (!soundOn) return;
  const ac = getAudio(); if (!ac) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'square'; o.frequency.value = f;
    const t = ac.currentTime + i * 0.09;
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + 0.2);
  });
}
