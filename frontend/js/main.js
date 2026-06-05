// main.js — Predictor page logic
const API_BASE = window.location.origin + '/api';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const form        = document.getElementById('predictForm');
const submitBtn   = document.getElementById('submitBtn');
const btnText     = submitBtn?.querySelector('.btn-text');
const btnLoader   = document.getElementById('btnLoader');
const resultCard  = document.getElementById('resultCard');
const chartCard   = document.getElementById('chartCard');
const radarCard   = document.getElementById('radarCard');
const emptyState  = document.getElementById('emptyState');
const errorToast  = document.getElementById('errorToast');
const toastMsg    = document.getElementById('toastMsg');
const toastClose  = document.getElementById('toastClose');

// ── Slider live update ─────────────────────────────────────────────────────────
function initSlider(id) {
  const slider = document.getElementById(id);
  const badge  = document.getElementById(id + '-val');
  if (!slider || !badge) return;
  function update() {
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.setProperty('--pct', pct + '%');
    badge.textContent = slider.value;
  }
  slider.addEventListener('input', update);
  update();
}
initSlider('failures');
initSlider('absences');

// ── Star / rating widgets ──────────────────────────────────────────────────────
function initStars(groupId, inputId, labelId) {
  const group  = document.getElementById(groupId);
  const input  = document.getElementById(inputId);
  const label  = document.getElementById(labelId);
  if (!group) return;
  function setRating(val) {
    input.value = val;
    label.textContent = val + ' / 5';
    group.querySelectorAll('.star').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.val) <= val);
    });
  }
  setRating(parseInt(input.value) || 3);
  group.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', () => setRating(parseInt(star.dataset.val)));
    star.addEventListener('mouseenter', () => {
      group.querySelectorAll('.star').forEach(s =>
        s.classList.toggle('active', parseInt(s.dataset.val) <= parseInt(star.dataset.val)));
    });
    star.addEventListener('mouseleave', () => setRating(parseInt(input.value)));
  });
}
initStars('freetime-stars','freetime','freetime-label');
initStars('health-stars','health','health-label');
initStars('famrel-stars','famrel','famrel-label');

// ── Toggle label updates ───────────────────────────────────────────────────────
function initToggle(id, labelId) {
  const el    = document.getElementById(id);
  const label = document.getElementById(labelId);
  if (!el || !label) return;
  function update() { label.textContent = el.checked ? 'Yes' : 'No'; }
  el.addEventListener('change', update);
  update();
}
initToggle('internet','internet-label');
initToggle('paid','paid-label');

// ── Autofill ─────────────────────────────────────────────────────────────────
document.getElementById('autofillBtn')?.addEventListener('click', async () => {
  try {
    const res  = await fetch(API_BASE + '/sample');
    const data = await res.json();
    document.getElementById('studytime').value   = data.studytime;
    document.getElementById('failures').value    = data.failures;
    document.getElementById('absences').value    = data.absences;
    document.getElementById('internet').checked  = !!data.internet;
    document.getElementById('paid').checked      = !!data.paid;
    initSlider('failures'); initSlider('absences');
    initToggle('internet','internet-label'); initToggle('paid','paid-label');
    const stars = { freetime: data.freetime, health: data.health, famrel: data.famrel };
    for (const [field, val] of Object.entries(stars)) {
      document.getElementById(field).value = val;
      initStars(field+'-stars', field, field+'-label');
    }
    clearErrors();
  } catch {
    // If backend not running, fill with defaults
    document.getElementById('studytime').value  = '2_to_5';
    document.getElementById('failures').value   = 1;
    document.getElementById('absences').value   = 4;
    document.getElementById('internet').checked = true;
    document.getElementById('paid').checked     = false;
    document.getElementById('freetime').value   = 3;
    document.getElementById('health').value     = 4;
    document.getElementById('famrel').value     = 4;
    initSlider('failures'); initSlider('absences');
    initToggle('internet','internet-label'); initToggle('paid','paid-label');
    ['freetime','health','famrel'].forEach(f => initStars(f+'-stars',f,f+'-label'));
    clearErrors();
  }
});

// ── Validation ────────────────────────────────────────────────────────────────
function setError(field, msg) {
  const fg  = document.getElementById('fg-' + field);
  const err = document.getElementById('err-' + field);
  if (fg)  fg.classList.add('has-error');
  if (err) err.textContent = msg;
}
function clearErrors() {
  document.querySelectorAll('.form-group').forEach(fg => fg.classList.remove('has-error'));
  document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
}
function validate(d) {
  let ok = true;
  if (!d.studytime) { setError('studytime','Please select a study time.'); ok=false; }
  if (d.failures < 0 || d.failures > 10) { setError('failures','Must be 0–10.'); ok=false; }
  if (d.absences < 0 || d.absences > 40) { setError('absences','Must be 0–40.'); ok=false; }
  return ok;
}

// ── Form submit ────────────────────────────────────────────────────────────────
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const payload = {
    studytime: document.getElementById('studytime').value,
    failures:  parseInt(document.getElementById('failures').value),
    absences:  parseInt(document.getElementById('absences').value),
    internet:  document.getElementById('internet').checked,
    freetime:  parseInt(document.getElementById('freetime').value),
    health:    parseInt(document.getElementById('health').value),
    famrel:    parseInt(document.getElementById('famrel').value),
    paid:      document.getElementById('paid').checked,
  };

  if (!validate(payload)) return;

  // loading state
  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');
  submitBtn.disabled = true;

  try {
    const res  = await fetch(API_BASE + '/predict', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Prediction failed');
    showResult(data, payload);
  } catch (err) {
    showToast(err.message || 'Could not connect to backend. Is Flask running?');
  } finally {
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
    submitBtn.disabled = false;
  }
});

// ── Show result ────────────────────────────────────────────────────────────────
function showResult(data, payload) {
  const score    = data.score;
  const category = data.category;
  const color    = data.category_color;
  const emoji    = data.category_emoji;

  // Unhide cards, hide empty state
  emptyState.classList.add('hidden');
  resultCard.classList.remove('hidden');
  chartCard.classList.remove('hidden');
  radarCard.classList.remove('hidden');

  // Score ring
  const ring = document.getElementById('ringFill');
  const circumference = 2 * Math.PI * 50; // 314
  const offset = circumference - (score / 100) * circumference;
  ring.style.strokeDashoffset = offset;
  ring.style.stroke = color;

  // Texts
  document.getElementById('scoreEmoji').textContent  = emoji;
  document.getElementById('scoreNumber').textContent = score;
  document.getElementById('perfLabel').textContent   = category;
  document.getElementById('scoreDetail').textContent = score + ' / 100';

  // Badge
  const badge = document.getElementById('categoryBadge');
  badge.textContent = category;
  badge.style.color = color;

  // Progress bar
  document.getElementById('progressBar').style.width = score + '%';
  document.getElementById('progressBar').style.background = color;

  // Highlight active band
  document.querySelectorAll('.band').forEach(b => b.classList.remove('active-band'));
  const bandMap = { Excellent:'band-excellent', Good:'band-good', Average:'band-average', Poor:'band-poor' };
  document.querySelector('.' + bandMap[category])?.classList.add('active-band');

  // Charts
  SPPCharts.renderFeatureChart(data.feature_importance);
  SPPCharts.renderRadarChart(payload);

  // Scroll to results on mobile
  if (window.innerWidth < 900) {
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  toastMsg.textContent = msg;
  errorToast.classList.remove('hidden');
  setTimeout(() => errorToast.classList.add('hidden'), 5000);
}
toastClose?.addEventListener('click', () => errorToast.classList.add('hidden'));
