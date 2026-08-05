import { db, auth } from './firebase-config.js';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    deleteDoc,
    doc,
    updateDoc,
    increment,
    limit,
    startAfter,
    getDocs
} from "firebase/firestore";
import { currentUser } from './auth.js';

// ========================================
// RÉFÉRENCES
// ========================================
const feedContainer = document.getElementById('feedContainer');
const postInput = document.getElementById('postInput');
const submitBtn = document.getElementById('submitPostBtn');
const imageBtn = document.getElementById('imageBtn');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');

let selectedImage = null;
let lastVisible = null;
let isLoading = false;
let allPostsLoaded = false;

// ========================================
// ICÔNES SVG
// ========================================
const ICONS = {
    like: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    liked: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    comment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
    share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`,
    delete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`
};

// ========================================
// CHARGER LE FEED EN TEMPS RÉEL
// ========================================
const POSTS_PER_PAGE = 10;

function loadFeed() {
    if (!feedContainer) return;
    
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            feedContainer.innerHTML = `
                <div class="empty-feed">
                    <div class="icon">📝</div>
                    <h3>Aucun post</h3>
                    <p>Sois le premier à partager !</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        snapshot.forEach((doc) => {
            const data = doc.data();
            const postId = doc.id;
            const isOwner = data.userId === currentUser?.uid;
            const likes = data.likes || 0;
            
            html += `
                <div class="post-item" data-id="${postId}">
                    <div class="post-header">
                        <img src="${data.avatar || 'assets/default-avatar.png'}" alt="Avatar" class="post-avatar" />
                        <span class="post-author-name">${data.displayName || 'Anonyme'}</span>
                        <span class="post-time">${formatTime(data.timestamp)}</span>
                    </div>
                    <div class="post-content">${data.content || ''}</div>
                    ${data.image ? `<img src="${data.image}" alt="Image" class="post-image" />` : ''}
                    <div class="post-actions-feed">
                        <button class="like-btn" data-id="${postId}">
                            ${ICONS.like}
                            ${likes}
                        </button>
                        <button class="comment-btn" data-id="${postId}">
                            ${ICONS.comment}
                            Commenter
                        </button>
                        <button class="share-btn" data-id="${postId}">
                            ${ICONS.share}
                            Partager
                        </button>
                        ${isOwner ? `
                            <button class="delete-btn" data-id="${postId}">
                                ${ICONS.delete}
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        feedContainer.innerHTML = html;
        
        // Ajouter les écouteurs
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', () => handleLike(btn.dataset.id, btn));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => handleDelete(btn.dataset.id));
        });
    });
}

// ========================================
// PUBLIER UN POST
// ========================================
submitBtn?.addEventListener('click', async () => {
    const content = postInput.value.trim();
    if (!content && !selectedImage) {
        alert('Écris quelque chose ou ajoute une image !');
        return;
    }
    
    if (!currentUser) {
        alert('Connecte-toi pour publier !');
        window.location.href = 'login.html';
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`;
    
    try {
        let imageUrl = null;
        if (selectedImage) {
            // Pour l'instant, on garde l'image en base64
            imageUrl = selectedImage;
        }
        
        await addDoc(collection(db, "posts"), {
            content: content,
            image: imageUrl,
            userId: currentUser.uid,
            displayName: currentUser.displayName || currentUser.email,
            avatar: currentUser.photoURL || 'assets/default-avatar.png',
            timestamp: serverTimestamp(),
            likes: 0
        });
        
        postInput.value = '';
        selectedImage = null;
        imagePreview.classList.add('hidden');
        imagePreview.innerHTML = '';
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
        
    } catch (error) {
        console.error("Erreur publication :", error);
        alert('Erreur lors de la publication. Réessaie.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
    }
});

// ========================================
// IMAGES
// ========================================
imageBtn?.addEventListener('click', () => fileInput.click());

fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            selectedImage = event.target.result;
            imagePreview.innerHTML = `<img src="${selectedImage}" alt="Aperçu" />`;
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// ========================================
// LIKE
// ========================================
async function handleLike(postId, btn) {
    if (!currentUser) {
        alert('Connecte-toi pour liker !');
        return;
    }
    
    try {
        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, {
            likes: increment(1)
        });
    } catch (error) {
        console.error("Erreur like :", error);
    }
}

// ========================================
// SUPPRIMER
// ========================================
async function handleDelete(postId) {
    if (!confirm('Supprimer ce post ?')) return;
    try {
        await deleteDoc(doc(db, "posts", postId));
    } catch (error) {
        console.error("Erreur suppression :", error);
    }
}

// ========================================
// FORMATER LE TEMPS
// ========================================
function formatTime(timestamp) {
    if (!timestamp) return 'À l\'instant';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return `Il y a ${diff}s`;
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`;
    return date.toLocaleDateString('fr-FR');
}

// ========================================
// DÉMARRER
// ========================================
loadFeed();
