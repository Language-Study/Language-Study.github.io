/**
 * Centralized Firebase Configuration
 * All Firebase setup is managed here to avoid duplication across files
 */

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB8B5Saw8kArUOIL_m5NHFWDQwplR8HF_c",
    authDomain: "language-study-tracker.firebaseapp.com",
    projectId: "language-study-tracker",
    storageBucket: "language-study-tracker.firebasestorage.app",
    messagingSenderId: "47054764584",
    appId: "1:47054764584:web:7c0b6597bc42aaf961131d"
};

// Initialize Firebase (called once at app startup)
function initializeFirebase() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    return {
        auth: firebase.auth(),
        db: firebase.firestore()
    };
}

// Export Firebase services
const { auth, db } = initializeFirebase();

// Constants
const PROGRESS_STATUS = {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    MASTERED: 'mastered',
};

// Status Icons HTML
const statusIcons = {
    [PROGRESS_STATUS.NOT_STARTED]: `<svg class="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/>
        </svg>`,

    [PROGRESS_STATUS.IN_PROGRESS]: `<svg class="w-5 h-5 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><path d="M12 6v6l4 4" stroke-width="2"/>
        </svg>`,

    [PROGRESS_STATUS.MASTERED]: `<svg class="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-width="2"/><path d="M22 4L12 14.01l-3-3" stroke-width="2"/>
        </svg>`
};

// Utility: Generate a random 5-character alphanumeric mentor code
function generateMentorCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
