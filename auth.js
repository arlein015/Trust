import { auth } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "firebase/auth";

export let currentUser = null;

// ===== SUIVRE L'AUTHENTIFICATION =====
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        updateUI(user);
        console.log('✅ Connecté :', user.email);
    } else {
        currentUser = null;
        console.log('❌ Déconnecté');
        const page = window.location.pathname;
        if (!page.includes('login') && !page.includes('signup')) {
            window.location.href = 'login.html';
        }
    }
});

// ===== INSCRIPTION =====
export async function signup(email, password, displayName) {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        return { success: true, user: result.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ===== CONNEXION =====
export async function login(email, password) {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: result.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ===== DÉCONNEXION =====
export async function logout() {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Erreur déconnexion :', error);
    }
}

// ===== METTRE À JOUR L'UI =====
function updateUI(user) {
    const display = document.getElementById('userDisplay');
    if (display) {
        display.textContent = user.displayName || user.email || 'Utilisateur';
    }
    
    const btn = document.getElementById('logoutBtn');
    if (btn) {
        btn.onclick = logout;
    }
}
