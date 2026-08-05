// ========================================
// GESTION DU THÈME - VIOLET
// ========================================

const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// ===== CHARGER LE THÈME SAUVEGARDÉ =====
const savedTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

// ===== BASCULER LE THÈME =====
themeToggle?.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    // Animation de transition
    document.body.style.transition = 'background 0.5s ease';
});

// ===== METTRE À JOUR L'ICÔNE =====
function updateThemeIcon(theme) {
    if (!themeToggle) return;
    themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    themeToggle.title = theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair';
}
