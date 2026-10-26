// ©Syed Ashaz Ahmed — 67-day vault, Drive previewer, master database, context export & backup
let currentDayFilter = 'all';
// Which day the form currently shows. Saving always targets THIS day, so changing
// the game's active day can never overwrite another day's notes.
let formLoadedDay = null;

function filterDays(mode) { currentDayFilter = mode; renderDaysGrid(); }

function renderDaysGrid() {
  const grid = document.getElementById('days-grid');
  if (!grid) return;
  grid.innerHTML = '';
  let logged = 0;

  for (let i = 1; i <= 67; i++) {
    const day = state.days[i];
    const active = day.thought || day.pyqs || day.notes || day.shortNotes || day.journal || day.sessions.length || day.resources.length;
    if (active) logged++;
    if (currentDayFilter === 'p1' && i > 37) continue;
    if (currentDayFilter === 'p2' && i <= 37) continue;

    const sel = state.activeDay === i;
    const btn = document.createElement('button');
    btn.onclick = () => selectDay(i);
    btn.className = `p-2 rounded-lg border text-left transition flex flex-col justify-between h-16 ${
      sel ? 'bg-stone-900 text-white border-[#C85A32] ring-2 ring-[#C85A32]'
      : active ? 'bg-emerald-50 border-emerald-400 text-stone-900 hover:bg-emerald-100'
      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'}`;
    btn.innerHTML = `
      <div class="flex items-center justify-between w-full"><span class="font-bold text-xs">Day ${i}</span><span class="text-[10px] ${sel ? 'text-amber-300' : 'text-stone-400'}">${i <= 37 ? 'P1' : 'P2'}</span></div>
      <div class="text-[10px] mono truncate ${sel ? 'text-stone-300' : 'text-stone-500'}">${day.dateStr.replace(', 2026', '')}</div>`;
    grid.appendChild(btn);
  }
  document.getElementById('quest-completed-days').textContent = logged;
}

function saveCurrentDayLog(silent = false) {
  if (formLoadedDay === null) return;
  const day = state.days[formLoadedDay];
  if (!day) return;
  const val = id => document.getElementById(id).value;
  day.thought = val('day-thought');
  day.driveFolder = val('day-drive-folder');
  day.chapterFolder = val('day-chapter-folder');
  day.pyqs = val('day-pyqs');
  day.notes = val('day-notes');
  day.shortNotes = val('day-short-notes');
  day.journal = val('day-journal');
  saveState();
  if (!silent) {
    renderDaysGrid();
    spawnFloatingText(450, 200, `💾 Day ${day.dayNumber} saved`, '#4ade80');
  }
}

function selectDay(dayNum) {
  saveCurrentDayLog(true);
  state.activeDay = dayNum;
  formLoadedDay = dayNum;
  const day = state.days[dayNum];
  const set = (id, v) => { document.getElementById(id).value = v || ''; };

  document.getElementById('day-badge-phase').textContent = day.phase === 1 ? 'Phase 1 (Days 1–37)' : 'Phase 2 (Days 38–67)';
  document.getElementById('day-badge-date').textContent = day.dateStr;
  document.getElementById('day-title-heading').textContent = `Day ${day.dayNumber} (${day.dateStr}) — Vault & Journal`;
  set('day-thought', day.thought);
  set('day-drive-folder', day.driveFolder);
  set('day-chapter-folder', day.chapterFolder);
  set('day-pyqs', day.pyqs);
  set('day-notes', day.notes);
  set('day-short-notes', day.shortNotes);
  set('day-journal', day.journal);

  document.getElementById('sess-dish').innerHTML =
    state.dishes.map(d => `<option value="${d.id}">${escapeHtml(d.title)}</option>`).join('');

  closePreview();
  renderDaySessions();
  renderDayResources();
  renderDaysGrid();
  updateDailyStomachHUD();
}

let autosaveTimer = null;
function bindAutosave() {
  ['day-thought', 'day-drive-folder', 'day-chapter-folder', 'day-pyqs', 'day-notes', 'day-short-notes', 'day-journal']
    .forEach(id => document.getElementById(id).addEventListener('input', () => {
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => saveCurrentDayLog(true), 700);
    }));
}

// ---------- sessions ----------
function addSessionToDay() {
  saveCurrentDayLog(true);
  const dishId = document.getElementById('sess-dish').value;
  const dish = state.dishes.find(d => d.id === dishId);
  const day = state.days[state.activeDay];
  day.sessions.push({
    id: Date.now(),
    track: document.getElementById('sess-track').value,
    dishId,
    dishTitle: dish ? dish.title : 'Custom',
    when: document.getElementById('sess-when').value.trim() || 'Flexible Time',
    given: document.getElementById('sess-given').value.trim() || '1 Session'
  });
  if (dish) dish.sessions = (dish.sessions || 0) + 1;
  document.getElementById('sess-when').value = '';
  document.getElementById('sess-given').value = '';
  saveState();
  renderDaySessions();
  renderDaysGrid();
}

function removeSessionFromDay(sessId) {
  const day = state.days[state.activeDay];
  const s = day.sessions.find(x => x.id === sessId);
  if (s) {
    const dish = state.dishes.find(d => d.id === s.dishId);
    if (dish) dish.sessions = Math.max(0, (dish.sessions || 0) - 1);
  }
  day.sessions = day.sessions.filter(x => x.id !== sessId);
  saveState();
  renderDaySessions();
  renderDaysGrid();
}

function renderDaySessions() {
  const list = document.getElementById('day-sessions-list');
  const day = state.days[state.activeDay];
  if (!day.sessions.length) {
    list.innerHTML = `<p class="text-stone-400 italic">No meals or snacks eaten on Day ${day.dayNumber} yet.</p>`;
    return;
  }
  list.innerHTML = day.sessions.map(s => `
    <div class="flex items-center justify-between bg-stone-50 border border-stone-200 px-3 py-1.5 rounded">
      <div>
        <span class="font-bold text-[#C85A32]">[${escapeHtml(s.track)}]</span>
        <span class="font-semibold text-stone-900 ml-1">${escapeHtml(s.dishTitle)}</span>
        <span class="text-stone-500 mono ml-2">• Ate at: ${escapeHtml(s.when)}</span>
        <span class="text-emerald-700 font-semibold mono ml-2">• Effort: ${escapeHtml(s.given)}</span>
      </div>
      <button onclick="removeSessionFromDay(${s.id})" class="text-red-500 hover:text-red-700 font-bold" title="Remove">✕</button>
    </div>`).join('');
}

// ---------- Drive / local previewer ----------
function toEmbedUrl(url) {
  if (!url) return '';
  const file = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (file) return `https://drive.google.com/file/d/${file[1]}/preview`;
  const doc = url.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([\w-]+)/);
  if (doc) return `https://docs.google.com/${doc[1]}/d/${doc[2]}/preview`;
  return url;
}

function addResourceToDay() {
  saveCurrentDayLog(true);
  const title = document.getElementById('res-title').value.trim() || 'Drive Resource';
  const type = document.getElementById('res-type').value;
  const url = document.getElementById('res-url').value.trim();
  if (!/^https?:\/\//i.test(url)) {
    spawnFloatingText(450, 200, 'Paste a valid https:// link', '#ef4444');
    return;
  }
  state.days[state.activeDay].resources.push({ id: Date.now(), title, type, url });
  document.getElementById('res-title').value = '';
  document.getElementById('res-url').value = '';
  saveState();
  renderDayResources();
  previewResourceUrl(title, url);
}

function renderDayResources() {
  const box = document.getElementById('day-resources-list');
  const day = state.days[state.activeDay];
  if (!day.resources.length) {
    box.innerHTML = `<span class="text-xs text-stone-400 italic">No Drive files attached to this day yet.</span>`;
    return;
  }
  box.innerHTML = day.resources.map(r => `
    <div class="inline-flex items-center gap-2 bg-stone-100 border border-stone-300 px-2.5 py-1 rounded text-xs">
      <span class="px-1.5 py-0.5 bg-stone-800 text-white text-[10px] font-bold rounded">${escapeHtml(r.type)}</span>
      <button onclick="previewResourceById(${r.id})" class="font-semibold text-[#C85A32] hover:underline">👁️ ${escapeHtml(r.title)}</button>
      <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer" class="text-stone-500 hover:text-black">↗</a>
      <button onclick="removeResource(${r.id})" class="text-red-500 font-bold" title="Remove">✕</button>
    </div>`).join('');
}

function removeResource(resId) {
  const day = state.days[state.activeDay];
  day.resources = day.resources.filter(r => r.id !== resId);
  saveState();
  renderDayResources();
}

function previewResourceById(resId) {
  const r = state.days[state.activeDay].resources.find(x => x.id === resId);
  if (r) previewResourceUrl(r.title, r.url);
}

function previewResourceUrl(title, url) {
  closePreview();
  document.getElementById('preview-title').textContent = `Previewing: ${title}`;
  document.getElementById('preview-iframe').src = toEmbedUrl(url);
  document.getElementById('preview-container').classList.remove('hidden');
}

function previewLocalFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  closePreview();
  document.getElementById('preview-title').textContent = `Local File Preview: ${file.name}`;
  document.getElementById('preview-iframe').src = URL.createObjectURL(file);
  document.getElementById('preview-container').classList.remove('hidden');
  event.target.value = '';
}

function closePreview() {
  const iframe = document.getElementById('preview-iframe');
  if (iframe.src && iframe.src.startsWith('blob:')) URL.revokeObjectURL(iframe.src);
  iframe.src = 'about:blank';
  document.getElementById('preview-container').classList.add('hidden');
}

function openExternalDrive(inputId) {
  const url = document.getElementById(inputId).value.trim();
  if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener,noreferrer');
  else spawnFloatingText(450, 200, 'Paste a valid https:// link first', '#ef4444');
}

// ---------- master database ----------
function renderDatabaseView() {
  const q = (document.getElementById('db-search').value || '').toLowerCase().trim();
  const sel = document.getElementById('db-filter-dish');
  const prev = sel.value || 'all';
  sel.innerHTML = `<option value="all">All Chapters / Dishes</option>` +
    state.dishes.map(d => `<option value="${d.id}">${escapeHtml(d.title)}</option>`).join('');
  sel.value = state.dishes.some(d => d.id === prev) ? prev : 'all';
  const dishFilter = sel.value;

  const block = (label, text) => text
    ? `<div><div class="text-[10px] font-bold uppercase text-stone-500">${label}</div><div class="text-xs whitespace-pre-wrap text-stone-800">${escapeHtml(text)}</div></div>` : '';

  const out = [];
  for (let i = 1; i <= 67; i++) {
    const day = state.days[i];
    const { sessions, resources } = day;
    if (!(day.thought || day.pyqs || day.notes || day.shortNotes || day.journal || sessions.length || resources.length)) continue;
    if (dishFilter !== 'all' && !sessions.some(s => s.dishId === dishFilter)) continue;

    const hay = [day.thought, day.pyqs, day.notes, day.shortNotes, day.journal, day.dateStr,
      ...sessions.map(s => `${s.dishTitle} ${s.track} ${s.given} ${s.when}`),
      ...resources.map(r => `${r.title} ${r.type}`)].join(' ').toLowerCase();
    if (q && !hay.includes(q)) continue;

    out.push(`
      <div class="border border-stone-300 rounded-lg p-3.5 bg-stone-50 space-y-2">
        <div class="flex items-center justify-between">
          <div class="font-bold text-sm">Day ${i} <span class="mono text-xs text-stone-500">• ${day.dateStr} • Phase ${day.phase}</span></div>
          <button onclick="switchView('quest'); selectDay(${i});" class="text-xs font-bold text-[#C85A32] hover:underline">Open Day →</button>
        </div>
        ${day.thought ? `<div class="text-xs italic text-[#9E4220]">⚔️ “${escapeHtml(day.thought)}”</div>` : ''}
        ${sessions.length ? `<div class="flex flex-wrap gap-1">${sessions.map(s => `<span class="px-2 py-0.5 rounded bg-white border border-stone-300 text-[11px]"><b>${escapeHtml(s.track)}</b> · ${escapeHtml(s.dishTitle)} · ${escapeHtml(s.given)}</span>`).join('')}</div>` : ''}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">${block('🎯 PYQs', day.pyqs)}${block('📓 Notes', day.notes)}${block('⚡ Short Notes', day.shortNotes)}${block('🗺️ Journal', day.journal)}</div>
        ${resources.length ? `<div class="flex flex-wrap gap-1.5">${resources.map(r => `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer" class="px-2 py-0.5 bg-stone-800 text-white rounded text-[11px]">${escapeHtml(r.type)}: ${escapeHtml(r.title)} ↗</a>`).join('')}</div>` : ''}
      </div>`);
  }
  document.getElementById('db-results').innerHTML = out.length
    ? out.join('')
    : `<p class="text-sm text-stone-400 italic">Nothing matches yet. Log a day and it will appear here.</p>`;
}

// ---------- context snapshot, backup, restore, reset ----------
function buildContextSnapshot() {
  const day = state.days[state.activeDay];
  const mastered = state.dishes.filter(isMastered);
  const st = computeGameStats();
  const L = [];
  L.push('=== 67-DAY MATH CAMPAIGN SNAPSHOT ===');
  L.push(`Window: Oct 26 – Dec 31, 2026 | Active: Day ${day.dayNumber}/67 (${day.dateStr}), Phase ${day.phase}`);
  L.push(`Level ${st.level} (${st.title}) | XP ${st.xp} | Streak ${st.streak} day(s) | Best ${st.best}`);
  L.push(`Pantry mastered: ${mastered.length}/${state.dishes.length} → ${mastered.map(d => d.title).join(', ') || 'none yet'}`);
  L.push('');
  Object.keys(SLOT_LABELS).forEach(slot => {
    const ds = state.dishes.filter(d => d.slot === slot);
    if (!ds.length) return;
    L.push(`[${SLOT_LABELS[slot]}]`);
    ds.forEach(d => {
      const s = evaluateDishRichness(d);
      const status = isMastered(d) ? 'MASTERED' : s.isRich ? 'Rich' : `Poor (needs ${s.missingHard.map(m => m.title).join(', ')})`;
      L.push(`  - ${d.title} | ${status} | L:${d.lessonsDone ? 'Y' : 'N'} P:${d.pyqDone ? 'Y' : 'N'} J:${d.journalDone ? 'Y' : 'N'} | ${d.sessions || 0} sessions`);
    });
  });
  L.push('');
  L.push(`Active day's sessions: ${day.sessions.map(s => `${s.track}: ${s.dishTitle} (${s.given})`).join('; ') || 'none'}`);
  const thoughts = Object.values(state.days).filter(d => d.thought).slice(-3);
  if (thoughts.length) L.push('Recent thoughts: ' + thoughts.map(t => `Day ${t.dayNumber}: ${t.thought}`).join(' | '));
  L.push('Motto: Until Death All Defeat is Psychological — ©Syed Ashaz Ahmed');
  return L.join('\n');
}

function openContextExporter() {
  saveCurrentDayLog(true);
  document.getElementById('context-output').value = buildContextSnapshot();
  showModal('modal-context');
}
function closeContextExporter() { hideModal('modal-context'); }

async function copyContextText() {
  const ta = document.getElementById('context-output');
  try { await navigator.clipboard.writeText(ta.value); }
  catch (e) { ta.select(); document.execCommand('copy'); }
  spawnFloatingText(450, 200, '📋 Snapshot copied!', '#4ade80');
}

function exportFullJSON() {
  saveCurrentDayLog(true);
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `math_restaurant_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importFullJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.dishes || !parsed.days) throw new Error('Not a valid backup file');
      if (!confirm('Restore this backup? It replaces your current data.')) return;
      state = parsed;
      migrateState();
      formLoadedDay = null;
      saveState();
      renderPass(); renderDaysGrid(); renderDatabaseView();
      closeContextExporter();
      spawnFloatingText(450, 200, '⬆️ Backup restored!', '#4ade80');
    } catch (err) {
      alert('Restore failed: ' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function resetAllData() {
  if (!confirm('Reset EVERYTHING (all days, notes, progress) to default? This cannot be undone. Tip: take a JSON backup first.')) return;
  localStorage.removeItem(STORAGE_KEY);
  state = { dishes: getDefaultDishes(), days: generate67Days(), activeDay: todayDayIndex(), selectedDishId: 'pnc' };
  formLoadedDay = null;
  saveState();
  renderPass();
  renderDaysGrid();
}
