// charts.js — Chart.js helpers for predictor page
window.SPPCharts = (() => {
  let featureChartInstance = null;
  let radarChartInstance   = null;

  const FEATURE_LABELS = {
    studytime: 'Study Time', failures: 'Past Failures', absences: 'Absences',
    internet: 'Internet Access', freetime: 'Free Time',
    health: 'Health', famrel: 'Family Relations', paid: 'Paid Classes'
  };

  function getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
      grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      text: isDark ? '#9399b8' : '#4b5278',
    };
  }

  function renderFeatureChart(importances) {
    const ctx = document.getElementById('featureChart');
    if (!ctx) return;
    if (featureChartInstance) featureChartInstance.destroy();

    const sorted = Object.entries(importances).sort((a,b) => b[1]-a[1]);
    const labels = sorted.map(([k]) => FEATURE_LABELS[k] || k);
    const values = sorted.map(([,v]) => (v * 100).toFixed(1));
    const c = getChartColors();

    featureChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Importance (%)',
          data: values,
          backgroundColor: [
            'rgba(99,102,241,0.8)','rgba(139,92,246,0.8)','rgba(59,130,246,0.8)',
            'rgba(34,197,94,0.8)','rgba(245,158,11,0.8)','rgba(239,68,68,0.8)',
            'rgba(167,139,250,0.8)','rgba(96,165,250,0.8)'
          ],
          borderRadius: 6, borderSkipped: false,
        }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw}%` } } },
        scales: {
          x: { grid: { color: c.grid }, ticks: { color: c.text, callback: v => v + '%' }, max: 40 },
          y: { grid: { display: false }, ticks: { color: c.text } }
        }
      }
    });
  }

  function renderRadarChart(formData) {
    const ctx = document.getElementById('radarChart');
    if (!ctx) return;
    if (radarChartInstance) radarChartInstance.destroy();

    const STUDY_MAP = { less_than_2:1, '2_to_5':2, '5_to_10':3, more_than_10:4 };
    const studyNorm = ((STUDY_MAP[formData.studytime] || 1) / 4) * 100;
    const failNorm  = Math.max(0, 100 - (formData.failures / 4) * 100);
    const absNorm   = Math.max(0, 100 - (formData.absences / 40) * 100);
    const freeNorm  = ((formData.freetime - 1) / 4) * 100;
    const healthNorm= ((formData.health    - 1) / 4) * 100;
    const famNorm   = ((formData.famrel    - 1) / 4) * 100;
    const c = getChartColors();

    radarChartInstance = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Study Time','No Failures','Attendance','Free Time','Health','Family'],
        datasets: [{
          label: 'Your Profile',
          data: [studyNorm, failNorm, absNorm, freeNorm, healthNorm, famNorm],
          backgroundColor: 'rgba(99,102,241,0.2)',
          borderColor: '#6366f1', pointBackgroundColor: '#6366f1',
          borderWidth: 2, pointRadius: 4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { r: { min: 0, max: 100, grid: { color: c.grid }, ticks: { display: false }, pointLabels: { color: c.text, font: { size: 11 } } } },
        plugins: { legend: { display: false } }
      }
    });
  }

  function destroyAll() {
    if (featureChartInstance) { featureChartInstance.destroy(); featureChartInstance = null; }
    if (radarChartInstance)   { radarChartInstance.destroy();   radarChartInstance   = null; }
  }

  return { renderFeatureChart, renderRadarChart, destroyAll };
})();
