/**
 * Vocabulary Management Module
 * Handles all vocabulary-related CRUD operations and rendering
 */

let vocabularyList = [];
let categories = [];
const SRS_DEFAULT_EASE_FACTOR = 2.5;
const SRS_MIN_EASE_FACTOR = 1.3;

function mentorCanEditVocabularyStatus() {
    return window.isMentorView === true
        && typeof window.canMentorEditStatus === 'function'
        && window.canMentorEditStatus() === true;
}

function mentorCanEditVocabularyAll() {
    return window.isMentorView === true
        && typeof window.canMentorEditAll === 'function'
        && window.canMentorEditAll() === true;
}

function assertMentorCanEditAll() {
    if (window.isMentorView && !mentorCanEditVocabularyAll()) {
        throw new Error('Mentor access does not allow full edits.');
    }
}

function assertMentorCanEditStatus() {
    if (window.isMentorView && !mentorCanEditVocabularyStatus()) {
        throw new Error('Mentor access does not allow status updates.');
    }
}

/**
 * Load user vocabulary from Firestore
 * @async
 * @returns {Promise<void>}
 */
async function loadVocabulary() {
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('vocabulary').get();
        vocabularyList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            status: normalizeProgressStatus(doc.data().status)
        }));
    } catch (error) {
        console.error('Error loading vocabulary:', error);
    }
}

/**
 * Load user categories from Firestore
 * @async
 * @returns {Promise<void>}
 */
async function loadCategories() {
    try {
        const categoriesDoc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('categories').get();
        let loadedCategories = categoriesDoc.exists ? categoriesDoc.data().list : ['General'];

        // Ensure 'General' category exists
        if (!loadedCategories.includes('General')) {
            loadedCategories.unshift('General');
        }
        categories = loadedCategories;
    } catch (error) {
        console.error('Error loading categories:', error);
        categories = ['General'];
    }
}

/**
 * Save categories to Firestore
 * @async
 * @returns {Promise<void>}
 */
async function saveCategories() {
    try {
        // Ensure 'General' category is always present
        if (!categories.includes('General')) {
            categories.unshift('General');
        }
        await db.collection('users').doc(currentUser.uid).collection('metadata').doc('categories').set({
            list: categories
        });
    } catch (error) {
        console.error('Error saving categories:', error);
        throw error;
    }
}

/**
 * Add vocabulary words to Firestore
 * @async
 * @param {string} wordsText - Newline-separated vocabulary words
 * @param {string} translation - Translation or link for the words
 * @param {string} category - Category to add words to
 * @returns {Promise<void>}
 */
async function addVocabularyWords(wordsText, translation, category) {
    assertMentorCanEditAll();
    const words = wordsText.trim().split('\n').filter(word => word.trim());

    if (words.length === 0) {
        throw new Error('Please enter at least one vocabulary word.');
    }

    try {
        const normalizedTranslation = await normalizeTranslationLink(translation || '');
        const batch = db.batch();
        const vocabRef = db.collection('users').doc(currentUser.uid).collection('vocabulary');

        const newItems = words.map(word => ({
            word: word.trim(),
            translation: normalizedTranslation,
            category: category === 'new' ? 'General' : category,
            status: PROGRESS_STATUS.NOT_STARTED,
            reviewCount: 0,
            easeFactor: SRS_DEFAULT_EASE_FACTOR,
            intervalDays: 0,
            lastReviewedAt: null,
            nextReviewAt: firebase.firestore.FieldValue.serverTimestamp(),
            dateAdded: firebase.firestore.FieldValue.serverTimestamp()
        }));

        for (const item of newItems) {
            const newDocRef = vocabRef.doc();
            batch.set(newDocRef, item);
        }

        await batch.commit();
    } catch (error) {
        console.error('Error adding vocabulary:', error);
        throw error;
    }
}

/**
 * Delete vocabulary item from Firestore
 * @async
 * @param {string} itemId - Document ID of vocabulary item
 * @returns {Promise<void>}
 */
async function deleteVocabularyItem(itemId) {
    assertMentorCanEditAll();
    try {
        await db.collection('users').doc(currentUser.uid).collection('vocabulary').doc(itemId).delete();
    } catch (error) {
        console.error('Error deleting vocabulary item:', error);
        throw error;
    }
}

/**
 * Update vocabulary item status
 * @async
 * @param {string} itemId - Document ID of vocabulary item
 * @param {string} newStatus - New status (NOT_STARTED, IN_PROGRESS, PROFICIENT)
 * @returns {Promise<void>}
 */
async function updateVocabularyStatus(itemId, newStatus) {
    assertMentorCanEditStatus();
    try {
        const normalizedStatus = normalizeProgressStatus(newStatus);
        const currentItem = vocabularyList.find(item => item.id === itemId) || null;
        const scheduleUpdate = computeSrsScheduleUpdate(currentItem, normalizedStatus);
        const payload = {
            status: normalizedStatus,
            ...scheduleUpdate.firestore
        };

        await db.collection('users').doc(currentUser.uid).collection('vocabulary').doc(itemId).update(payload);

        if (currentItem) {
            Object.assign(currentItem, {
                status: normalizedStatus,
                ...scheduleUpdate.local
            });
            return currentItem;
        }

        return {
            id: itemId,
            status: normalizedStatus,
            ...scheduleUpdate.local
        };
    } catch (error) {
        console.error('Error updating vocabulary status:', error);
        throw error;
    }
}

/**
 * Update vocabulary word/translation
 * @async
 * @param {string} itemId - Document ID
 * @param {{word?: string, translation?: string}} updates - Fields to update
 * @returns {Promise<void>}
 */
async function updateVocabularyItem(itemId, updates) {
    assertMentorCanEditAll();
    const payload = {};

    if (updates.word !== undefined) {
        const trimmed = updates.word.trim();
        if (!trimmed) {
            throw new Error('Word cannot be empty.');
        }
        payload.word = trimmed;
    }

    if (updates.translation !== undefined) {
        payload.translation = await normalizeTranslationLink(updates.translation || '');
    }

    if (Object.keys(payload).length === 0) return;

    try {
        await db.collection('users').doc(currentUser.uid).collection('vocabulary').doc(itemId).update(payload);

        const idx = vocabularyList.findIndex(item => item.id === itemId);
        if (idx !== -1) {
            vocabularyList[idx] = { ...vocabularyList[idx], ...payload };
        }
    } catch (error) {
        console.error('Error updating vocabulary item:', error);
        throw error;
    }
}

/**
 * Delete entire category and associated vocabulary
 * @async
 * @param {string} categoryToDelete - Category name to delete
 * @returns {Promise<void>}
 */
async function deleteCategory(categoryToDelete) {
    assertMentorCanEditAll();
    const protectedCategories = ['General'];

    if (protectedCategories.includes(categoryToDelete)) {
        throw new Error('This category cannot be deleted.');
    }

    try {
        // Remove category from list
        categories = categories.filter(cat => cat !== categoryToDelete);
        await saveCategories();

        // Delete all vocabulary items in this category
        const itemsToDelete = vocabularyList.filter(item => item.category === categoryToDelete);
        const batch = db.batch();
        const vocabRef = db.collection('users').doc(currentUser.uid).collection('vocabulary');

        itemsToDelete.forEach(item => {
            batch.delete(vocabRef.doc(item.id));
        });

        await batch.commit();
    } catch (error) {
        console.error('Error deleting category:', error);
        throw error;
    }
}

/**
 * Add new category
 * @async
 * @param {string} newCategoryName - Name of new category
 * @returns {Promise<void>}
 */
async function addCategory(newCategoryName) {
    assertMentorCanEditAll();
    const trimmed = newCategoryName.trim();

    if (!trimmed) {
        throw new Error('Please enter a category name.');
    }

    if (categories.includes(trimmed)) {
        throw new Error('Category already exists.');
    }

    try {
        categories.push(trimmed);
        await saveCategories();
    } catch (error) {
        console.error('Error adding category:', error);
        throw error;
    }
}

/**
 * Render vocabulary list grouped by category
 * @returns {void}
 */
function renderVocabularyList() {
    const vocabularyListEl = document.getElementById('vocabularyList');
    if (!vocabularyListEl) return;

    // Remove selections that no longer exist (e.g., after deletions)
    const validIds = new Set(vocabularyList.map(item => item.id));

    const expandedCategories = new Set(
        Array.from(document.querySelectorAll('#vocabularyList .category-content'))
            .filter(content => content.classList.contains('expanded'))
            .map(content => content.closest('.category-container')?.querySelector('.category-header')?.dataset.categoryName)
    );

    const groupedVocab = categories.reduce((acc, category) => {
        acc[category] = vocabularyList.filter(item => item.category === category);
        return acc;
    }, {});

    vocabularyListEl.innerHTML = categories
        .map(category => {
            const items = groupedVocab[category] || [];
            if (items.length === 0 && category !== 'General') return '';

            const isExpanded = expandedCategories.has(category);
            const safeCategory = escapeHtml(category);
            const safeCategoryAttr = escapeHtmlAttr(category);
            return `
                <div class="mb-4 category-container">
                    <div class="flex items-center justify-between p-2 bg-gray-100 rounded cursor-pointer category-header hover:bg-gray-200 transition-colors" 
                         data-category-name="${safeCategoryAttr}" role="button" tabindex="0" aria-expanded="${isExpanded}">
                        <h3 class="font-bold">${safeCategory} (${items.length})</h3>
                        <svg class="w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}"
                             viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </div>
                    <div class="category-content space-y-2 mt-2 ml-2 ${isExpanded ? 'expanded' : ''}" 
                         style="${isExpanded ? '' : 'display: none;'}" role="region" aria-label="${safeCategoryAttr} vocabulary">
                        ${items.map(item => renderVocabItem(item)).join('')}
                        ${items.length === 0 ? '<p class="text-xs text-gray-500 pl-2">No items in this category yet.</p>' : ''}
                    </div>
                </div>
            `;
        }).join('');

    // Attach category header listeners
    document.querySelectorAll('#vocabularyList .category-header').forEach(header => {
        const clickHandler = () => {
            const content = header.nextElementSibling;
            const isExpanding = !content.classList.contains('expanded');
            content.classList.toggle('expanded');
            content.style.display = isExpanding ? 'block' : 'none';
            header.setAttribute('aria-expanded', isExpanding);
            const arrow = header.querySelector('svg');
            arrow.style.transform = isExpanding ? 'rotate(180deg)' : '';
        };

        header.addEventListener('click', clickHandler);
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                clickHandler();
            }
        });
    });
}

/**
 * Render individual vocabulary item
 * @param {Object} item - Vocabulary item
 * @returns {string} HTML string
 */
function renderVocabItem(item) {
    let translationHtml = '';
    const rawTranslation = typeof item.translation === 'string' ? item.translation : '';

    if (rawTranslation) {
        const ytRegex = /(?:youtube(?:-nocookie)?\.com\/(?:.*[?&]v=|(?:v|embed|shorts)\/)|youtu\.be\/)([\w-]{11})/;
        const scRegex = /^https?:\/\/(soundcloud\.com|snd\.sc|on\.soundcloud\.com)\//;
        const safeLink = sanitizeHttpUrl(rawTranslation);

        if (ytRegex.test(rawTranslation) && safeLink) {
            translationHtml = `<a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline" aria-label="YouTube link">YouTube Link</a>`;
        } else if (scRegex.test(rawTranslation) && safeLink) {
            translationHtml = `<a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline" aria-label="SoundCloud link">SoundCloud Link</a>`;
        } else {
            translationHtml = `<span class="text-gray-700 translation-text" role="note">${escapeHtml(rawTranslation)}</span>`;
        }
    }

    const canStatusEdit = !window.isMentorView || mentorCanEditVocabularyStatus();
    const canFullEdit = !window.isMentorView || mentorCanEditVocabularyAll();

    return `
        <div class="vocab-item flex items-center gap-3 p-2 border rounded mb-2" data-id="${item.id}">
            <div class="flex-1">
                <div class="font-medium">${escapeHtml(item.word)}</div>
                ${isVocabularyItemDue(item) ? '<div class="text-xs text-indigo-600 font-semibold mt-1">Due for review</div>' : ''}
                ${translationHtml ? `<div class="text-sm mt-1">${translationHtml}</div>` : ''}
            </div>
            <div class="flex items-center gap-2">
                ${canFullEdit ? `<button class="edit-button p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all" aria-label="Edit vocabulary item" title="Edit">
                    Edit
                </button>` : ''}
                ${canStatusEdit ? `<button class="status-button p-1 rounded-full hover:bg-gray-100 transition-transform progress-button" aria-label="Toggle status" title="Click to change status">
                    ${statusIcons[item.status]}
                </button>` : `<span class="inline-block px-2 py-1 rounded text-xs font-semibold ${item.status === PROGRESS_STATUS.PROFICIENT ? 'bg-green-200 text-green-800' : item.status === PROGRESS_STATUS.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'} cursor-not-allowed opacity-70" title="Status (view only)" aria-label="Status: ${item.status === PROGRESS_STATUS.PROFICIENT ? 'Proficient' : item.status === PROGRESS_STATUS.IN_PROGRESS ? 'In Progress' : 'Not Started'}">${statusIcons[item.status]}</span>`}
                ${canFullEdit ? `<button class="delete-button p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-all" aria-label="Delete vocabulary item" title="Delete">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>` : ''}
            </div>
        </div>
    `;
}

/**
 * Filter vocabulary by search query
 * @param {string} query - Search query
 * @returns {void}
 */
function filterVocabulary(query) {
    const vocabularyListEl = document.getElementById('vocabularyList');
    if (!vocabularyListEl) return;

    if (!query) {
        renderVocabularyList();
        return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = vocabularyList.filter(item =>
        item.word.toLowerCase().includes(lowerQuery) ||
        (item.category && item.category.toLowerCase().includes(lowerQuery))
    );

    const grouped = categories.reduce((acc, category) => {
        acc[category] = filtered.filter(item => item.category === category);
        return acc;
    }, {});

    const totalResults = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
    if (totalResults === 0) {
        vocabularyListEl.innerHTML = '<p class="text-sm text-gray-500">No vocabulary results found.</p>';
        return;
    }

    vocabularyListEl.innerHTML = categories
        .map(category => {
            const items = grouped[category] || [];
            if (items.length === 0) return '';
            const safeCategory = escapeHtml(category);
            return `
                <div class="mb-4 category-container">
                    <div class="flex items-center justify-between p-2 bg-gray-100 rounded category-header">
                        <h3 class="font-bold">${safeCategory} (${items.length})</h3>
                    </div>
                    <div class="category-content space-y-2 mt-2 ml-2 expanded" style="display: block;">
                        ${items.map(item => renderVocabItem(item)).join('')}
                    </div>
                </div>
            `;
        }).join('');
}

/**
 * Get vocabulary statistics
 * @returns {Object} Statistics object
 */
function getVocabularyStats() {
    const total = vocabularyList.length;
    const proficient = vocabularyList.filter(w => w.status === PROGRESS_STATUS.PROFICIENT).length;
    const inProgress = vocabularyList.filter(w => w.status === PROGRESS_STATUS.IN_PROGRESS).length;
    const notStarted = total - proficient - inProgress;

    return { total, proficient, inProgress, notStarted };
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function escapeHtmlAttr(text) {
    return escapeHtml(String(text ?? ''));
}

function sanitizeHttpUrl(url) {
    if (typeof url !== 'string') return null;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
    } catch (e) {
        return null;
    }
}

function toTimestampMillis(value) {
    if (!value) return null;
    if (value instanceof Date) return value.getTime();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
}

function getVocabularyDueTimestamp(item) {
    const dueMs = toTimestampMillis(item?.nextReviewAt);
    if (dueMs !== null) return dueMs;
    const addedMs = toTimestampMillis(item?.dateAdded);
    if (addedMs !== null) return addedMs;
    return 0;
}

function isVocabularyItemDue(item, nowMs = Date.now()) {
    if (!item) return false;
    if (item.status === PROGRESS_STATUS.NOT_STARTED) return true;
    const dueMs = getVocabularyDueTimestamp(item);
    return dueMs <= nowMs;
}

function roundToTwo(value) {
    return Math.round(value * 100) / 100;
}

function computeSrsScheduleUpdate(item, newStatus) {
    const now = new Date();
    const previousEase = Math.max(
        SRS_MIN_EASE_FACTOR,
        Number.isFinite(Number(item?.easeFactor)) ? Number(item.easeFactor) : SRS_DEFAULT_EASE_FACTOR
    );
    const previousInterval = Math.max(
        0,
        Number.isFinite(Number(item?.intervalDays)) ? Number(item.intervalDays) : 0
    );
    const previousReviewCount = Math.max(
        0,
        Number.isFinite(Number(item?.reviewCount)) ? Number(item.reviewCount) : 0
    );

    const qualityByStatus = {
        [PROGRESS_STATUS.NOT_STARTED]: 1,
        [PROGRESS_STATUS.IN_PROGRESS]: 3,
        [PROGRESS_STATUS.PROFICIENT]: 5
    };
    const quality = qualityByStatus[newStatus] || 1;

    let easeFactor = previousEase;
    let reviewCount = previousReviewCount;
    let intervalDays = previousInterval;

    if (newStatus === PROGRESS_STATUS.NOT_STARTED) {
        reviewCount = 0;
        intervalDays = 0;
        easeFactor = Math.max(SRS_MIN_EASE_FACTOR, previousEase - 0.2);
    } else if (quality < 3) {
        reviewCount = 0;
        intervalDays = 1;
        easeFactor = Math.max(SRS_MIN_EASE_FACTOR, previousEase - 0.2);
    } else {
        const adjustedEase = previousEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        easeFactor = Math.max(SRS_MIN_EASE_FACTOR, Math.min(3.2, adjustedEase));

        if (previousReviewCount <= 0) {
            intervalDays = 1;
        } else if (previousReviewCount === 1) {
            intervalDays = 3;
        } else {
            intervalDays = Math.max(1, Math.round(previousInterval * easeFactor));
        }

        if (newStatus === PROGRESS_STATUS.IN_PROGRESS) {
            intervalDays = Math.min(intervalDays, 3);
        }
        if (newStatus === PROGRESS_STATUS.PROFICIENT) {
            intervalDays = Math.max(intervalDays, 3);
        }

        reviewCount = previousReviewCount + 1;
    }

    const nextReviewAt = new Date(now.getTime() + (intervalDays * 24 * 60 * 60 * 1000));

    return {
        firestore: {
            reviewCount,
            easeFactor: roundToTwo(easeFactor),
            intervalDays,
            lastReviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
            nextReviewAt
        },
        local: {
            reviewCount,
            easeFactor: roundToTwo(easeFactor),
            intervalDays,
            lastReviewedAt: now,
            nextReviewAt
        }
    };
}

async function normalizeTranslationLink(translation) {
    let normalizedTranslation = translation || '';
    const scMatch = normalizedTranslation.match(/https?:\/\/[^\s]+/);

    if (scMatch) {
        const rawUrl = scMatch[0];
        let urlHost = '';
        try {
            urlHost = new URL(rawUrl).hostname;
        } catch (e) {
            urlHost = '';
        }

        const isSoundCloud = urlHost.includes('soundcloud.com') || urlHost.includes('snd.sc') || urlHost.includes('on.soundcloud.com');
        const needsResolve = urlHost.includes('snd.sc') || urlHost.includes('on.soundcloud.com');

        if (isSoundCloud && needsResolve) {
            const resolved = await resolveSoundCloudUrl(rawUrl);
            normalizedTranslation = normalizedTranslation.replace(rawUrl, resolved);
        }
    }

    return normalizedTranslation;
}

async function resolveSoundCloudUrl(rawUrl) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(rawUrl)}&iframe=true`, {
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) return rawUrl;

        const data = await response.json();
        if (!data?.html) return rawUrl;

        const srcMatch = data.html.match(/src="([^"]+)"/);
        if (srcMatch && srcMatch[1]) {
            const playerUrl = new URL(srcMatch[1]);
            const resolved = playerUrl.searchParams.get('url');
            if (resolved) return resolved;
        }

        return rawUrl;
    } catch (e) {
        return rawUrl;
    }
}
