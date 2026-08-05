// ===== GESTION DU THÈME =====

const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// ===== CHARGER LE THÈME SAUVEGARDÉ =====
const savedTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

// ===== BASCOLER LE THÈME =====
themeToggle?.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

// ===== METTRE À JOUR L'ICÔNE =====
function updateThemeIcon(theme) {
    if (!themeToggle) return;
    themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
}
