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
    PROFICIENT: 'proficient',
};

const LEGACY_PROGRESS_STATUS = {
    MASTERED: 'mastered'
};

function normalizeProgressStatus(status) {
    if (status === LEGACY_PROGRESS_STATUS.MASTERED) {
        return PROGRESS_STATUS.PROFICIENT;
    }

    if (Object.values(PROGRESS_STATUS).includes(status)) {
        return status;
    }

    return PROGRESS_STATUS.NOT_STARTED;
}

// Status Icons HTML
const statusIcons = {
    [PROGRESS_STATUS.NOT_STARTED]: `<svg class="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/>
        </svg>`,

    [PROGRESS_STATUS.IN_PROGRESS]: `<svg class="w-5 h-5 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><path d="M12 6v6l4 4" stroke-width="2"/>
        </svg>`,

    [PROGRESS_STATUS.PROFICIENT]: `<svg class="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-width="2"/><path d="M22 4L12 14.01l-3-3" stroke-width="2"/>
        </svg>`
};

statusIcons[LEGACY_PROGRESS_STATUS.MASTERED] = statusIcons[PROGRESS_STATUS.PROFICIENT];

// Utility: Generate a random 5-character alphanumeric mentor code
function generateMentorCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Utility: Generate a random portfolio share code (same format as mentor code)
function generatePortfolioShareCode() {
    return generateMentorCode(); // Reuse same format
}

function getRateLimitIdentity(uidOverride = null) {
    if (typeof uidOverride === 'string' && uidOverride.trim()) {
        return uidOverride.trim();
    }

    if (typeof currentUser !== 'undefined' && currentUser?.uid) {
        return currentUser.uid;
    }

    return 'anonymous';
}

function getRateLimitStorageKey(bucket, uidOverride = null) {
    return `ls_rate_limit:${getRateLimitIdentity(uidOverride)}:${bucket}`;
}

function readRateLimitTimestamps(storageKey) {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed.filter((value) => Number.isFinite(value));
    } catch (error) {
        console.warn('Unable to read rate limiter state:', error);
        return [];
    }
}

function writeRateLimitTimestamps(storageKey, timestamps) {
    try {
        localStorage.setItem(storageKey, JSON.stringify(timestamps));
    } catch (error) {
        console.warn('Unable to persist rate limiter state:', error);
    }
}

function formatRateLimitWait(ms) {
    const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes <= 0) return `${seconds}s`;
    if (seconds === 0) return `${minutes}m`;
    return `${minutes}m ${seconds}s`;
}

function consumeClientRateLimit({ bucket, limit, windowMs, uidOverride = null }) {
    if (typeof window === 'undefined' || !window.localStorage) {
        return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterMs: 0 };
    }

    if (!bucket || !Number.isFinite(limit) || !Number.isFinite(windowMs) || limit <= 0 || windowMs <= 0) {
        throw new Error('Invalid rate limiter configuration.');
    }

    const now = Date.now();
    const threshold = now - windowMs;
    const storageKey = getRateLimitStorageKey(bucket, uidOverride);
    const timestamps = readRateLimitTimestamps(storageKey).filter((ts) => ts > threshold);

    if (timestamps.length >= limit) {
        const oldestAllowedTs = timestamps[0];
        const retryAfterMs = Math.max(1000, oldestAllowedTs + windowMs - now);
        return { allowed: false, remaining: 0, retryAfterMs };
    }

    timestamps.push(now);
    writeRateLimitTimestamps(storageKey, timestamps);
    return {
        allowed: true,
        remaining: Math.max(0, limit - timestamps.length),
        retryAfterMs: 0
    };
}

function enforceClientRateLimit({ bucket, limit, windowMs, message, uidOverride = null }) {
    const result = consumeClientRateLimit({ bucket, limit, windowMs, uidOverride });

    if (!result.allowed) {
        const waitTime = formatRateLimitWait(result.retryAfterMs);
        if (message) {
            throw new Error(`${message} Try again in ${waitTime}.`);
        }
        throw new Error(`Rate limit reached. Try again in ${waitTime}.`);
    }

    return result;
}
