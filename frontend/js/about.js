// about.js — About page: renders static feature importance chart
document.addEventListener('DOMContentLoaded', () => {
  const ctx = document.getElementById('aboutFeatureChart');
  if (!ctx) return;

  // Static importance values from typical model output
  const importances = {
    'Study Time': 28.5, 'Past Failures': 22.1, 'Absences': 14.8,
    'Health': 9.4, 'Family Relations': 8.7, 'Free Time': 7.3,
    'Internet Access': 5.4, 'Paid Classes': 3.8
  };
  const sorted  = Object.entries(importances).sort((a,b) => b[1]-a[1]);
  const isDark  = document.documentElement.getAttribute('data-theme') !== 'light';
  const gridCol = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textCol = isDark ? '#9399b8' : '#4b5278';

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(([k]) => k),
      datasets: [{
        label: 'Importance (%)',
        data: sorted.map(([,v]) => v),
        backgroundColor: [
          'rgba(99,102,241,0.85)','rgba(139,92,246,0.85)','rgba(59,130,246,0.85)',
          'rgba(34,197,94,0.85)','rgba(245,158,11,0.85)','rgba(239,68,68,0.85)',
          'rgba(167,139,250,0.85)','rgba(96,165,250,0.85)'
        ],
        borderRadius: 6, borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.raw}%` } }
      },
      scales: {
        x: { grid: { color: gridCol }, ticks: { color: textCol, callback: v => v+'%' }, max: 35 },
        y: { grid: { display: false }, ticks: { color: textCol } }
      }
    }
  });
});
