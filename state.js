// ©Syed Ashaz Ahmed — Core state, default menu, persistence & prerequisite engine
const STORAGE_KEY = 'syed_ashaz_math_restaurant_67_v1';

const SLOT_RANK = { snacks1: 1, meal1: 1, meal2: 1, snacks2: 2, meal3: 2, meal4: 2, odd: 3, later: 4 };

const SLOT_LABELS = {
  meal1: 'Track A • Meal 1 (Phase 1)',
  meal2: 'Track B • Meal 2 (Phase 1)',
  snacks1: 'Phase 1 Snack Bar',
  meal3: 'Track A • Meal 3 (Phase 2)',
  meal4: 'Track B • Meal 4 (Phase 2)',
  snacks2: 'Phase 2 Snack Bar',
  odd: 'Odd Jobs Side Counter',
  later: 'Later Menu (Post-Dec 31)'
};

const isMastered = d => !!(d.lessonsDone && d.pyqDone && d.journalDone);

function mk(id, title, domain, slot, source, hard = [], soft = []) {
  return { id, title, domain, slot, source, driveUrl: '', hardPrereqs: hard, softPrereqs: soft,
           lessonsDone: false, pyqDone: false, journalDone: false, sessions: 0 };
}

function getDefaultDishes() {
  return [
    mk('num_sys', 'Number Systems & Basic Equations', 'Essential Math', 'meal1', 'Own Source'),
    mk('logs', 'Logarithms', 'Essential Math', 'meal1', 'Own Source', ['num_sys']),
    mk('sets', 'Sets', 'Algebra', 'meal1', 'Flexible'),
    mk('lin_ineq', 'Linear Inequalities', 'Algebra', 'meal1', 'Flexible', ['num_sys']),
    mk('seq_ser', 'Sequence and Series', 'Algebra', 'meal1', 'Flexible', ['num_sys', 'logs']),
    mk('pnc', 'Permutations & Combinations', 'Combinatorics', 'meal1', 'Flexible', ['sets', 'num_sys']),
    mk('rel_func', 'Relations & Functions', 'Bridge / Calculus Prereq', 'meal1', 'Flexible', ['sets', 'lin_ineq', 'logs'], ['trig']),
    mk('trig', 'Trigonometry (Core Link)', 'Trigonometry', 'meal2', 'Flexible', ['num_sys']),
    mk('st_lines', 'Straight Lines (Coordinate Geom)', 'Line Geometry', 'meal2', 'Flexible', ['trig'], ['lin_ineq']),
    mk('matrices', 'Matrices', 'Linear Algebra', 'meal2', 'Flexible', [], ['trig']),
    mk('determinants', 'Determinants', 'Linear Algebra', 'meal2', 'Flexible', ['matrices']),
    mk('vectors', 'Vector Algebra', 'Linear Algebra', 'meal2', 'Flexible', ['trig'], ['matrices']),
    mk('intro_3d', 'Introduction to 3D', 'Linear Algebra / 3D', 'meal2', 'Flexible', ['st_lines'], ['vectors']),
    mk('geom_3d', 'Three Dimensional Geometry', 'Linear Algebra / 3D', 'meal2', 'Flexible', ['vectors', 'intro_3d'], ['determinants']),
    mk('limits_deriv', 'Limits & Derivatives', 'Calculus Prerequisite Snack', 'snacks1', 'Snack Bite', ['rel_func', 'trig', 'logs'], ['seq_ser']),
    mk('itf', 'Inverse Trigonometric Functions', 'Calculus Prerequisite Snack', 'snacks2', 'Snack Bite', ['trig', 'rel_func']),
    mk('binomial', 'Binomial Theorem', 'Combinatorics / Algebra', 'meal3', 'Flexible', ['pnc'], ['seq_ser']),
    mk('probability', 'Probability (Class 12)', 'Combinatorics & Prob', 'meal3', 'Flexible', ['pnc', 'sets'], ['binomial']),
    mk('statistics', 'Statistics', 'Prob & Stats', 'meal3', 'Flexible', ['num_sys'], ['probability']),
    mk('cont_diff', 'Continuity & Differentiability', 'Calculus', 'meal4', 'Flexible', ['limits_deriv', 'itf', 'rel_func'], ['logs']),
    mk('aod', 'Applications of Derivatives (AOD)', 'Calculus', 'meal4', 'Flexible', ['cont_diff'], ['st_lines']),
    mk('complex_quad', 'Complex Numbers & Quadratic Eq', 'Algebra II/III', 'odd', 'Flexible', ['num_sys', 'trig'], ['st_lines']),
    mk('circles', 'Circles', 'Coordinate Geometry', 'odd', 'Flexible', ['st_lines'], ['complex_quad']),
    mk('conics', 'Conic Sections', 'Coordinate Geometry', 'odd', 'Flexible', ['st_lines', 'circles'], ['complex_quad']),
    mk('lpp', 'Linear Programming (LPP)', 'Algebra', 'odd', 'Flexible', ['lin_ineq', 'st_lines']),
    mk('integrals', 'Indefinite & Definite Integrals', 'Integral Calculus', 'later', 'Later Menu', ['cont_diff', 'aod', 'trig', 'itf']),
    mk('aoi', 'Applications of Integrals', 'Integral Calculus', 'later', 'Later Menu', ['integrals'], ['conics']),
    mk('diff_eq', 'Differential Equations', 'Integral Calculus', 'later', 'Later Menu', ['integrals'])
  ];
}

function generate67Days() {
  const days = {};
  const start = new Date(2026, 9, 26);
  for (let i = 1; i <= 67; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + (i - 1));
    days[i] = {
      dayNumber: i,
      dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      phase: i <= 37 ? 1 : 2,
      thought: '', driveFolder: '', chapterFolder: '',
      pyqs: '', notes: '', shortNotes: '', journal: '',
      sessions: [], resources: []
    };
  }
  return days;
}

let state = {
  dishes: getDefaultDishes(),
  days: generate67Days(),
  activeDay: 1,
  selectedDishId: 'pnc'
};

// Fill any missing fields so old saves / imported backups never crash the app
function migrateState() {
  const fresh = generate67Days();
  for (let i = 1; i <= 67; i++) {
    state.days[i] = Object.assign({}, fresh[i], state.days[i] || {});
    state.days[i].sessions = state.days[i].sessions || [];
    state.days[i].resources = state.days[i].resources || [];
  }
  state.dishes.forEach(d => {
    d.hardPrereqs = d.hardPrereqs || [];
    d.softPrereqs = d.softPrereqs || [];
    d.sessions = d.sessions || 0;
  });
  if (!state.dishes.some(d => d.id === state.selectedDishId)) state.selectedDishId = state.dishes[0] ? state.dishes[0].id : null;
  if (!state.days[state.activeDay]) state.activeDay = 1;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.dishes && parsed.days) state = parsed;
    }
  } catch (e) {
    console.error('State load error:', e);
  }
  migrateState();
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.error('Save failed (storage full or blocked):', e); }
  updateTopMetrics();
  renderGameInspector();
  renderGameShelf();
  updateDailyStomachHUD();
}

// Rich = every HARD prerequisite is either mastered or scheduled in an earlier-or-equal slot
function evaluateDishRichness(dish) {
  const myRank = SLOT_RANK[dish.slot] || 99;
  const missing = ids => (ids || [])
    .map(id => state.dishes.find(d => d.id === id))
    .filter(req => req && !isMastered(req) && (SLOT_RANK[req.slot] || 99) > myRank);
  const missingHard = missing(dish.hardPrereqs);
  return { isRich: missingHard.length === 0, missingHard, missingSoft: missing(dish.softPrereqs) };
}

// ---------- helpers ----------
function todayDayIndex() {
  const start = new Date(2026, 9, 26);
  const n = new Date();
  const diff = Math.floor((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - start) / 86400000) + 1;
  return Math.max(1, Math.min(67, diff));
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function dayHasBothMeals(day) {
  const s = day.sessions || [];
  return s.some(x => x.track.includes('Meal 1') || x.track.includes('Meal 3')) &&
         s.some(x => x.track.includes('Meal 2') || x.track.includes('Meal 4'));
}

function trackLabelForDish(dish) {
  if (dish.slot === 'meal2') return 'Meal 2 (Track B)';
  if (dish.slot === 'meal3') return 'Meal 3 (Track A)';
  if (dish.slot === 'meal4') return 'Meal 4 (Track B)';
  if (dish.slot.includes('snack')) return 'Snack';
  if (dish.slot === 'odd') return 'Odd Job';
  return 'Meal 1 (Track A)';
}
