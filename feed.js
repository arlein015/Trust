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
let firstLoad = true;
let hasRealPosts = false;

// ========================================
// ICÔNES SVG
// ========================================
const ICONS = {
    like: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    liked: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    comment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
    share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`,
    delete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`
};

// ========================================
// POSTS D'EXEMPLE (quand Firebase est vide)
// ========================================
const EXAMPLE_POSTS = [
    {
        id: 'ex1',
        displayName: 'Léa Martin',
        avatar: 'https://i.pravatar.cc/150?img=10',
        content: '🌅 Le coucher de soleil était incroyable ce soir ! Les couleurs étaient magnifiques. Qui veut venir avec moi la prochaine fois ?',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=400&fit=crop',
        timestamp: 'Il y a 2h',
        likes: 24,
        liked: false,
        isExample: true
    },
    {
        id: 'ex2',
        displayName: 'Thomas Dubois',
        avatar: 'https://i.pravatar.cc/150?img=20',
        content: '🏔️ Randonnée au sommet du Mont Blanc. L\'effort en valait vraiment la peine ! La vue est juste spectaculaire.',
        image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=800&fit=crop',
        timestamp: 'Il y a 5h',
        likes: 56,
        liked: true,
        isExample: true
    },
    {
        id: 'ex3',
        displayName: 'Sophie Laurent',
        avatar: 'https://i.pravatar.cc/150?img=30',
        content: '🍜 Nouveau restaurant découvert dans le quartier ! La cuisine est incroyable, je vous recommande le ramen au porc caramélisé.',
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=600&fit=crop',
        timestamp: 'Il y a 8h',
        likes: 89,
        liked: false,
        isExample: true
    },
    {
        id: 'ex4',
        displayName: 'Emma Petit',
        avatar: 'https://i.pravatar.cc/150?img=40',
        content: '💡 Réflexion du jour : "Le bonheur n\'est pas quelque chose de prêt. Il vient de vos propres actions." — Dalaï-Lama',
        image: null,
        timestamp: 'Il y a 12h',
        likes: 102,
        liked: true,
        isExample: true
    },
    {
        id: 'ex5',
        displayName: 'Julien Moreau',
        avatar: 'https://i.pravatar.cc/150?img=50',
        content: '🎬 Dernier court-métrage réalisé avec mon équipe ! On a bossé pendant 3 mois sur ce projet.',
        image: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&h=400&fit=crop',
        timestamp: 'Il y a 1j',
        likes: 67,
        liked: false,
        isExample: true,
        isVideo: true
    }
];

// ========================================
// AFFICHER UN POST (réel ou exemple)
// ========================================
function renderSinglePost(data, postId, append = false) {
    const isOwner = data.userId === currentUser?.uid && !data.isExample;
    const likes = data.likes || 0;
    const isLiked = data.liked || false;
    const isExample = data.isExample || false;
    const isVideo = data.isVideo || false;
    
    let html = `
        <div class="post-item" data-id="${postId}" ${isExample ? 'data-example="true"' : ''}>
            <div class="post-header">
                <img src="${data.avatar || 'assets/default-avatar.png'}" alt="Avatar" class="post-avatar" />
                <span class="post-author-name">${data.displayName || 'Anonyme'}</span>
                <span class="post-time">${data.timestamp || 'À l\'instant'}</span>
                ${isExample ? '<span style="font-size:0.55rem;color:var(--text-muted);background:var(--bg-input);padding:2px 10px;border-radius:9999px;">Exemple</span>' : ''}
            </div>
            <div class="post-content">${data.content || ''}</div>
            ${data.image ? `<img src="${data.image}" alt="Image" class="post-image" />` : ''}
            ${isVideo ? `
                <div style="display:flex;align-items:center;gap:8px;padding:4px 8px 12px;color:var(--text-muted);font-size:0.75rem;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Regarder la vidéo
                </div>
            ` : ''}
            <div class="post-actions-feed">
                <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${postId}" ${isExample ? 'data-example="true"' : ''}>
                    ${isLiked ? ICONS.liked : ICONS.like}
                    ${likes}
                </button>
                <button class="comment-btn" data-id="${postId}" ${isExample ? 'data-example="true"' : ''}>
                    ${ICONS.comment}
                    Commenter
                </button>
                <button class="share-btn" data-id="${postId}" ${isExample ? 'data-example="true"' : ''}>
                    ${ICONS.share}
                    Partager
                </button>
                ${isOwner && !isExample ? `
                    <button class="delete-btn" data-id="${postId}">
                        ${ICONS.delete}
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    if (append) {
        feedContainer.innerHTML += html;
    } else {
        feedContainer.innerHTML = html;
    }
}

// ========================================
// AFFICHER LES POSTS D'EXEMPLE
// ========================================
function displayExamplePosts() {
    if (!feedContainer) return;
    
    let html = '';
    EXAMPLE_POSTS.forEach((post) => {
        const isLiked = post.liked || false;
        const isVideo = post.isVideo || false;
        
        html += `
            <div class="post-item" data-id="${post.id}" data-example="true">
                <div class="post-header">
                    <img src="${post.avatar}" alt="Avatar" class="post-avatar" />
                    <span class="post-author-name">${post.displayName}</span>
                    <span class="post-time">${post.timestamp}</span>
                    <span style="font-size:0.55rem;color:var(--text-muted);background:var(--bg-input);padding:2px 10px;border-radius:9999px;">Exemple</span>
                </div>
                <div class="post-content">${post.content}</div>
                ${post.image ? `<img src="${post.image}" alt="Image" class="post-image" />` : ''}
                ${isVideo ? `
                    <div style="display:flex;align-items:center;gap:8px;padding:4px 8px 12px;color:var(--text-muted);font-size:0.75rem;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                        Regarder la vidéo
                    </div>
                ` : ''}
                <div class="post-actions-feed">
                    <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${post.id}" data-example="true">
                        ${isLiked ? ICONS.liked : ICONS.like}
                        ${post.likes}
                    </button>
                    <button class="comment-btn" data-id="${post.id}" data-example="true">
                        ${ICONS.comment}
                        Commenter
                    </button>
                    <button class="share-btn" data-id="${post.id}" data-example="true">
                        ${ICONS.share}
                        Partager
                    </button>
                </div>
            </div>
        `;
    });
    
    feedContainer.innerHTML = html;
    
    // Ajouter un petit message informatif
    const info = document.createElement('div');
    info.style.cssText = `
        text-align: center;
        padding: 16px;
        color: var(--text-muted);
        font-size: 0.75rem;
        border-top: 1px solid var(--border-color);
        margin-top: 4px;
    `;
    info.textContent = '📝 Ces posts sont des exemples. Publie ton premier post pour voir le tien ici !';
    feedContainer.appendChild(info);
}

// ========================================
// CHARGER LE FEED AVEC SCROLL INFINI
// ========================================
const POSTS_PER_PAGE = 10;

async function loadInitialFeed() {
    if (!feedContainer) return;
    
    try {
        const q = query(
            collection(db, "posts"),
            orderBy("timestamp", "desc"),
            limit(POSTS_PER_PAGE)
        );
        
        const snapshot = await getDocs(q);
        
        // Si pas de posts dans Firebase, afficher les exemples
        if (snapshot.empty) {
            displayExamplePosts();
            allPostsLoaded = true;
            hasRealPosts = false;
            return;
        }
        
        hasRealPosts = true;
        
        // Récupérer le dernier document pour la pagination
        lastVisible = snapshot.docs[snapshot.docs.length - 1];
        allPostsLoaded = snapshot.docs.length < POSTS_PER_PAGE;
        
        // Afficher les posts réels
        feedContainer.innerHTML = '';
        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            const postId = doc.id;
            const isOwner = data.userId === currentUser?.uid;
            const likes = data.likes || 0;
            
            const html = `
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
            feedContainer.innerHTML += html;
        });
        
        // Ajouter les écouteurs d'événements
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', () => handleLike(btn.dataset.id, btn));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => handleDelete(btn.dataset.id));
        });
        
        // Si on a exactement le nombre de posts par page, on peut charger plus
        if (!allPostsLoaded) {
            setupInfiniteScroll();
        }
        
        firstLoad = false;
        
    } catch (error) {
        console.error("Erreur chargement feed :", error);
        // En cas d'erreur, afficher les exemples
        displayExamplePosts();
    }
}

// ========================================
// SCROLL INFINI
// ========================================
function setupInfiniteScroll() {
    const trigger = document.createElement('div');
    trigger.className = 'scroll-trigger';
    trigger.style.cssText = `
        height: 20px;
        margin: 10px 0;
        display: flex;
        justify-content: center;
        align-items: center;
        color: var(--text-muted);
        font-size: 0.8rem;
    `;
    trigger.textContent = 'Chargement...';
    feedContainer.appendChild(trigger);
    
    const observer = new IntersectionObserver(async (entries) => {
        entries.forEach(async (entry) => {
            if (entry.isIntersecting && !isLoading && !allPostsLoaded && hasRealPosts) {
                await loadMorePosts();
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px 100px 0px',
        threshold: 0.1
    });
    
    observer.observe(trigger);
}

// ========================================
// CHARGER PLUS DE POSTS
// ========================================
async function loadMorePosts() {
    if (isLoading || allPostsLoaded || !lastVisible || !hasRealPosts) return;
    
    isLoading = true;
    const trigger = document.querySelector('.scroll-trigger');
    if (trigger) trigger.textContent = 'Chargement...';
    
    try {
        const q = query(
            collection(db, "posts"),
            orderBy("timestamp", "desc"),
            startAfter(lastVisible),
            limit(POSTS_PER_PAGE)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            allPostsLoaded = true;
            if (trigger) {
                trigger.textContent = '📭 Plus de posts';
                setTimeout(() => { if (trigger) trigger.remove(); }, 2000);
            }
            isLoading = false;
            return;
        }
        
        lastVisible = snapshot.docs[snapshot.docs.length - 1];
        allPostsLoaded = snapshot.docs.length < POSTS_PER_PAGE;
        
        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            const postId = doc.id;
            const isOwner = data.userId === currentUser?.uid;
            const likes = data.likes || 0;
            
            const html = `
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
            feedContainer.innerHTML += html;
        });
        
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', () => handleLike(btn.dataset.id, btn));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => handleDelete(btn.dataset.id));
        });
        
        if (allPostsLoaded && trigger) {
            trigger.textContent = '📭 C\'est tout pour le moment';
            setTimeout(() => { if (trigger) trigger.remove(); }, 2000);
        }
        
    } catch (error) {
        console.error("Erreur chargement plus de posts :", error);
        if (trigger) {
            trigger.textContent = '❌ Erreur, réessaie';
            setTimeout(() => { if (trigger) trigger.remove(); }, 3000);
        }
    }
    
    isLoading = false;
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
        
        // Recharger le feed
        feedContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Chargement...</p></div>';
        lastVisible = null;
        allPostsLoaded = false;
        isLoading = false;
        hasRealPosts = true;
        loadInitialFeed();
        
    } catch (error) {
        console.error("Erreur publication :", error);
        alert('Erreur lors de la publication.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
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
async function handleLike(postId, btn) {
    // Si c'est un post exemple, on fait juste une animation
    if (btn?.dataset?.example === 'true') {
        btn.classList.toggle('liked');
        const isLiked = btn.classList.contains('liked');
        btn.innerHTML = `
            ${isLiked ? ICONS.liked : ICONS.like}
            ${parseInt(btn.textContent.match(/\d+/)?.[0] || 0) + (isLiked ? 1 : -1)}
        `;
        return;
    }
    
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
// ÉCOUTE EN TEMPS RÉEL
// ========================================
function listenForNewPosts() {
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(1));
    
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            if (!hasRealPosts) {
                displayExamplePosts();
            }
            return;
        }
        
        // Si un nouveau post arrive et qu'on n'est pas en train de charger
        if (!firstLoad && !isLoading) {
            feedContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Chargement...</p></div>';
            lastVisible = null;
            allPostsLoaded = false;
            isLoading = false;
            hasRealPosts = true;
            loadInitialFeed();
        }
    });
}

// ========================================
// INIT
// ========================================
loadInitialFeed();
listenForNewPosts();
