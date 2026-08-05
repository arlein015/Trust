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

const feedContainer = document.getElementById('feedContainer');
const postInput = document.getElementById('postInput');
const submitBtn = document.getElementById('submitPostBtn');
const imageBtn = document.getElementById('imageBtn');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');

let selectedImage = null;

// ========================================
// ICÔNES SVG POUR LE FEED
// ========================================
const ICONS = {
    like: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    liked: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    comment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
    share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`,
    delete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`
};

// ========================================
// CHARGER LE FEED
// ========================================
export function loadFeed() {
    if (!feedContainer) return;
    
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            feedContainer.innerHTML = `
                <div class="empty-feed">
                    <div class="empty-icon">📝</div>
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
            const isOwner = data
