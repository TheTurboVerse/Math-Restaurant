// ©Syed Ashaz Ahmed — view switching & boot
function switchView(name) {
  saveCurrentDayLog(true);
  ['game', 'pass', 'quest', 'library'].forEach(v => {
    document.getElementById(`view-${v}`).classList.toggle('hidden', v !== name);
    document.getElementById(`tab-${v}`).className =
      `px-3 py-2 rounded text-xs font-semibold uppercase tracking-wider transition ${
        v === name ? 'bg-[#C85A32] text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`;
  });
  if (name === 'pass') renderPass();
  if (name === 'quest') selectDay(state.activeDay);
  if (name === 'library') renderDatabaseView();
  if (name === 'game') { renderGameInspector(); renderGameShelf(); updateDailyStomachHUD(); }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function init() {
  loadState();
  // Open on the real calendar day once the campaign has started
  if (new Date() >= new Date(2026, 9, 26)) state.activeDay = todayDayIndex();
  bindAutosave();
  renderPass();
  renderGameShelf();
  renderGameInspector();
  renderDaysGrid();
  updateTopMetrics();
  updateDailyStomachHUD();
  requestAnimationFrame(renderRestaurantFrame);
}

window.addEventListener('beforeunload', () => saveCurrentDayLog(true));
init();
