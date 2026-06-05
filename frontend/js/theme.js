// theme.js — Dark / Light mode toggle (runs on every page)
(function () {
  const STORAGE_KEY = 'spp-theme';
  const html = document.documentElement;
  const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
  html.setAttribute('data-theme', saved);

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.querySelector('.theme-icon').textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  applyTheme(saved);

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', () => {
        const current = html.getAttribute('data-theme');
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    }
  });
})();
