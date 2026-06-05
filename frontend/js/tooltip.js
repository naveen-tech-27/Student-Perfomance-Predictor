// tooltip.js — Hover tooltips for form fields
document.addEventListener('DOMContentLoaded', () => {
  const popup = document.getElementById('tooltipPopup');
  if (!popup) return;

  document.querySelectorAll('.tooltip-icon').forEach(icon => {
    icon.addEventListener('mouseenter', (e) => {
      popup.textContent = icon.dataset.tip || '';
      popup.classList.add('visible');
    });
    icon.addEventListener('mousemove', (e) => {
      const x = e.clientX + 12;
      const y = e.clientY + 12;
      const maxX = window.innerWidth  - popup.offsetWidth  - 16;
      const maxY = window.innerHeight - popup.offsetHeight - 16;
      popup.style.left = Math.min(x, maxX) + 'px';
      popup.style.top  = Math.min(y, maxY) + 'px';
    });
    icon.addEventListener('mouseleave', () => {
      popup.classList.remove('visible');
    });
  });
});
