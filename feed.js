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
    increment
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

// ========================================
// CHARGER LE FEED EN TEMPS RÉEL
// ========================================
export function loadFeed() {
    if (!feedContainer) return;
    
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            feedContainer.innerHTML = `
                <div class="empty-feed">
                    <div class="empty-icon">📝</div>
                    <h3>Aucun post pour le moment</h3>
                    <p>Sois le premier à partager quelque chose !</p>
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
                    <div class="post-author">
                        <img src="${data.avatar || 'assets/default-avatar.png'}" alt="Avatar" />
                        <span class="post-author-name">${data.displayName || 'Anonyme'}</span>
                        <span class="post-time">${formatTime(data.timestamp)}</span>
                    </div>
                    <div class="post-content">${data.content || ''}</div>
                    ${data.image ? `<img src="${data.image}" alt="Image" class="post-image" />` : ''}
                    <div class="post-actions-feed">
                        <button class="like-btn ${likes > 0 ? 'liked' : ''}" data-id="${postId}">
                            ❤️ ${likes}
                        </button>
                        <button class="comment-btn" data-id="${postId}">
                            💬 Commenter
                        </button>
                        ${isOwner ? `
                            <button class="delete-btn" data-id="${postId}">
                                🗑️ Supprimer
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        feedContainer.innerHTML = html;
        
        // Écouteurs d'événements
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', () => handleLike(btn.dataset.id));
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
    submitBtn.innerHTML = '⏳ Publication...';
    
    try {
        let imageUrl = null;
        if (selectedImage) {
            // Pour l'instant, on garde l'image en base64
            // Plus tard : upload vers Firebase Storage
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
        submitBtn.innerHTML = '<span class="icon">📤</span> Publier';
        
    } catch (error) {
        console.error("Erreur publication :", error);
        alert('Erreur lors de la publication. Réessaie.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="icon">📤</span> Publier';
    }
});

// ========================================
// GESTION DES IMAGES
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
async function handleLike(postId) {
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
// INIT
// ========================================
loadFeed();
