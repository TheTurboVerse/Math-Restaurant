// ©Syed Ashaz Ahmed — Procreate-style drag & drop planner, presets, dish editor
const PASS_SLOTS = ['meal1', 'meal2', 'snacks1', 'meal3', 'meal4', 'snacks2', 'odd', 'later'];

function renderPass() {
  PASS_SLOTS.forEach(slot => {
    const zone = document.getElementById(`zone-${slot}`);
    if (!zone) return;
    zone.innerHTML = '';
    const list = state.dishes.filter(d => d.slot === slot);
    const countEl = document.getElementById(`count-${slot}`);
    if (countEl) countEl.textContent = `${list.length} ${slot.includes('snack') ? 'snacks' : 'dishes'}`;
    list.forEach(d => zone.appendChild(createDishCard(d)));
  });
  setupDragAndDrop();
  updateTopMetrics();
}

function createDishCard(dish) {
  const card = document.createElement('div');
  card.draggable = true;
  card.dataset.id = dish.id;

  let plate = 'plate-odd';
  if (dish.slot === 'meal1' || dish.slot === 'meal3') plate = 'plate-track-a';
  else if (dish.slot === 'meal2' || dish.slot === 'meal4') plate = 'plate-track-b';
  else if (dish.slot.includes('snack')) plate = 'plate-snack';

  const st = evaluateDishRichness(dish);
  let badge;
  if (isMastered(dish)) badge = `<span class="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-700 text-white rounded">★ In Pantry</span>`;
  else if (st.isRich && st.missingSoft.length === 0) badge = `<span class="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 rounded">🟢 Rich</span>`;
  else if (!st.isRich) badge = `<span class="px-2 py-0.5 text-[10px] font-bold uppercase bg-red-100 text-red-700 rounded">🔴 Poor</span>`;
  else badge = `<span class="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-100 text-amber-800 rounded">🟡 Soft Link</span>`;

  const alert = st.missingHard.length ? `
    <div class="bg-red-50 border border-red-200 rounded p-1.5 text-[11px] text-red-800 flex items-center justify-between gap-2">
      <span><strong>Needs:</strong> ${escapeHtml(st.missingHard.map(m => m.title).join(', '))}</span>
      <button onclick="pullPrereqAsSnack('${st.missingHard[0].id}')" class="px-2 py-0.5 bg-red-700 text-white rounded text-[10px] font-bold shrink-0 hover:bg-red-800">Eat Snack First</button>
    </div>` : '';

  card.className = `${plate} p-3 border border-stone-200 shadow-sm hover:shadow transition cursor-grab active:cursor-grabbing space-y-2`;
  card.innerHTML = `
    <div class="flex items-start justify-between gap-2">
      <div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-stone-500">${escapeHtml(dish.domain)}</span>
        <h5 class="font-bold text-xs text-stone-900 leading-snug">${escapeHtml(dish.title)}</h5>
      </div>
      <div class="flex items-center gap-1 shrink-0">${badge}
        <button onclick="openEditDishModal('${dish.id}')" title="Customize Layer" class="text-stone-400 hover:text-stone-900 text-xs px-1">⚙️</button>
      </div>
    </div>
    ${alert}
    <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/70 text-[11px]">
      <div class="flex items-center gap-2.5">
        <label class="flex items-center gap-1 cursor-pointer"><input type="checkbox" ${dish.lessonsDone ? 'checked' : ''} onchange="toggleDishCheck('${dish.id}','lessonsDone')" class="accent-[#C85A32]"><span>Lessons</span></label>
        <label class="flex items-center gap-1 cursor-pointer"><input type="checkbox" ${dish.pyqDone ? 'checked' : ''} onchange="toggleDishCheck('${dish.id}','pyqDone')" class="accent-[#C85A32]"><span>PYQ</span></label>
        <label class="flex items-center gap-1 cursor-pointer"><input type="checkbox" ${dish.journalDone ? 'checked' : ''} onchange="toggleDishCheck('${dish.id}','journalDone')" class="accent-[#C85A32]"><span>Journal</span></label>
      </div>
      <div class="flex items-center gap-1 mono text-[10px]">
        <button onclick="adjustDishSessions('${dish.id}',-1)" class="px-1.5 bg-stone-200 rounded hover:bg-stone-300">-</button>
        <span>${dish.sessions || 0} sess</span>
        <button onclick="adjustDishSessions('${dish.id}',1)" class="px-1.5 bg-stone-200 rounded hover:bg-stone-300">+</button>
      </div>
    </div>`;
  return card;
}

function toggleDishCheck(dishId, field) {
  const dish = state.dishes.find(d => d.id === dishId);
  if (!dish) return;
  dish[field] = !dish[field];
  saveState();
  renderPass();
}

function adjustDishSessions(dishId, delta) {
  const dish = state.dishes.find(d => d.id === dishId);
  if (!dish) return;
  dish.sessions = Math.max(0, (dish.sessions || 0) + delta);
  saveState();
  renderPass();
}

function pullPrereqAsSnack(prereqId) {
  const req = state.dishes.find(d => d.id === prereqId);
  if (!req) return;
  req.slot = 'snacks1';
  saveState();
  renderPass();
}

// Cards are rebuilt every render, so they are bound every time.
// Drop zones persist, so they are bound exactly once.
function setupDragAndDrop() {
  document.querySelectorAll('[draggable="true"]').forEach(card => {
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', card.dataset.id);
      setTimeout(() => card.classList.add('opacity-50'), 0);
    });
    card.addEventListener('dragend', () => card.classList.remove('opacity-50'));
  });

  document.querySelectorAll('.drop-zone').forEach(zone => {
    if (zone.dataset.bound) return;
    zone.dataset.bound = '1';
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const dish = state.dishes.find(d => d.id === e.dataTransfer.getData('text/plain'));
      if (dish && zone.dataset.slot) {
        dish.slot = zone.dataset.slot;
        saveState();
        renderPass();
      }
    });
  });
}

const PRESETS = {
  classic: {
    num_sys: 'meal1', logs: 'meal1', sets: 'meal1', lin_ineq: 'meal1', rel_func: 'meal1', seq_ser: 'meal1', pnc: 'meal1',
    trig: 'meal2', matrices: 'meal2', determinants: 'meal2', st_lines: 'meal2', vectors: 'meal2', intro_3d: 'meal2', geom_3d: 'meal2',
    limits_deriv: 'snacks1', binomial: 'meal3', probability: 'meal3', statistics: 'meal3',
    cont_diff: 'meal4', aod: 'meal4', itf: 'snacks2',
    complex_quad: 'odd', circles: 'odd', conics: 'odd', lpp: 'odd'
  },
  trigSnacks: {
    num_sys: 'meal1', logs: 'meal1', sets: 'meal1', pnc: 'meal1', binomial: 'meal1', probability: 'meal1', statistics: 'meal1',
    trig: 'snacks1', rel_func: 'snacks1', limits_deriv: 'snacks1',
    st_lines: 'meal2', matrices: 'meal2', determinants: 'meal2', vectors: 'meal2', intro_3d: 'meal2', geom_3d: 'meal2',
    lin_ineq: 'meal3', seq_ser: 'meal3', complex_quad: 'meal3', lpp: 'meal3',
    cont_diff: 'meal4', aod: 'meal4', itf: 'snacks2',
    circles: 'odd', conics: 'odd'
  }
};

function applyPreset(type) {
  const map = PRESETS[type];
  if (!map) return;
  state.dishes.forEach(d => { if (map[d.id]) d.slot = map[d.id]; });
  spawnFloatingText(450, 180, type === 'trigSnacks' ? 'Loaded Preset B: Trig Snacks + Early Comb!' : 'Loaded Preset A: Classic Menu!', '#D4AF37');
  saveState();
  renderPass();
}

function updateTopMetrics() {
  let rich = 0, poor = 0, sessions = 0;
  const pantry = state.dishes.filter(isMastered).length;
  state.dishes.forEach(d => {
    if (evaluateDishRichness(d).isRich) rich++; else poor++;
    sessions += d.sessions || 0;
  });
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('stat-rich-count', rich);
  set('stat-poor-count', poor);
  set('stat-pantry-count', `${pantry} / ${state.dishes.length}`);
  set('stat-sessions-count', sessions);
}

// ---------- dish editor modal ----------
function populatePrereqCheckboxes(selectedHard = [], selectedSoft = [], excludeId = null) {
  const row = (d, cls, checked) => `
    <label class="flex items-center gap-1.5 truncate">
      <input type="checkbox" value="${d.id}" ${checked ? 'checked' : ''} class="${cls}">
      <span class="truncate">${escapeHtml(d.title)}</span>
    </label>`;
  const others = state.dishes.filter(d => d.id !== excludeId);
  document.getElementById('edit-hard-prereqs').innerHTML = others.map(d => row(d, 'hard-chk accent-red-600', selectedHard.includes(d.id))).join('');
  document.getElementById('edit-soft-prereqs').innerHTML = others.map(d => row(d, 'soft-chk accent-amber-600', selectedSoft.includes(d.id))).join('');
}

function showModal(id) { const m = document.getElementById(id); m.classList.remove('hidden'); m.classList.add('flex'); }
function hideModal(id) { const m = document.getElementById(id); m.classList.add('hidden'); m.classList.remove('flex'); }

function openNewDishModal() {
  document.getElementById('modal-dish-header').textContent = 'Create New Custom Dish / Recipe';
  document.getElementById('edit-dish-id').value = '';
  document.getElementById('edit-dish-title').value = '';
  document.getElementById('edit-dish-domain').value = 'Custom Domain';
  document.getElementById('edit-dish-slot').value = 'meal1';
  document.getElementById('edit-dish-source').value = 'Own Source';
  document.getElementById('edit-dish-drive').value = '';
  document.getElementById('btn-delete-dish').classList.add('hidden');
  populatePrereqCheckboxes();
  showModal('modal-dish');
}

function openEditDishModal(dishId) {
  const dish = state.dishes.find(d => d.id === dishId);
  if (!dish) return;
  document.getElementById('modal-dish-header').textContent = `Customize Recipe: ${dish.title}`;
  document.getElementById('edit-dish-id').value = dish.id;
  document.getElementById('edit-dish-title').value = dish.title;
  document.getElementById('edit-dish-domain').value = dish.domain;
  document.getElementById('edit-dish-slot').value = dish.slot;
  document.getElementById('edit-dish-source').value = dish.source || '';
  document.getElementById('edit-dish-drive').value = dish.driveUrl || '';
  document.getElementById('btn-delete-dish').classList.remove('hidden');
  populatePrereqCheckboxes(dish.hardPrereqs, dish.softPrereqs, dish.id);
  showModal('modal-dish');
}

function closeDishModal() { hideModal('modal-dish'); }

function saveDishModal() {
  const id = document.getElementById('edit-dish-id').value;
  const fields = {
    title: document.getElementById('edit-dish-title').value.trim() || 'Untitled Dish',
    domain: document.getElementById('edit-dish-domain').value.trim() || 'Math',
    slot: document.getElementById('edit-dish-slot').value,
    source: document.getElementById('edit-dish-source').value.trim(),
    driveUrl: document.getElementById('edit-dish-drive').value.trim(),
    hardPrereqs: Array.from(document.querySelectorAll('.hard-chk:checked')).map(el => el.value),
    softPrereqs: Array.from(document.querySelectorAll('.soft-chk:checked')).map(el => el.value)
  };
  if (id) {
    const dish = state.dishes.find(d => d.id === id);
    if (dish) Object.assign(dish, fields);
  } else {
    const newId = 'custom_' + Date.now();
    state.dishes.push(Object.assign({ id: newId, lessonsDone: false, pyqDone: false, journalDone: false, sessions: 0 }, fields));
    state.selectedDishId = newId;
  }
  saveState();
  closeDishModal();
  renderPass();
}

function deleteCurrentDish() {
  const id = document.getElementById('edit-dish-id').value;
  if (!id || !confirm('Delete this dish? Sessions already logged on days will stay.')) return;
  state.dishes = state.dishes.filter(d => d.id !== id);
  state.dishes.forEach(d => {
    d.hardPrereqs = d.hardPrereqs.filter(x => x !== id);
    d.softPrereqs = d.softPrereqs.filter(x => x !== id);
  });
  if (state.selectedDishId === id) state.selectedDishId = state.dishes[0] ? state.dishes[0].id : null;
  saveState();
  closeDishModal();
  renderPass();
}
