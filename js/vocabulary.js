/**
 * Vocabulary Management Module
 * Handles all vocabulary-related CRUD operations and rendering
 */

let vocabularyList = [];
let categories = [];
let selectedVocabIds = new Set();

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
            ...doc.data()
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
    const words = wordsText.trim().split('\n').filter(word => word.trim());

    if (words.length === 0) {
        throw new Error('Please enter at least one vocabulary word.');
    }

    try {
        const batch = db.batch();
        const vocabRef = db.collection('users').doc(currentUser.uid).collection('vocabulary');

        const newItems = words.map(word => ({
            word: word.trim(),
            translation: translation || '',
            category: category === 'new' ? 'General' : category,
            status: PROGRESS_STATUS.NOT_STARTED,
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
 * @param {string} newStatus - New status (NOT_STARTED, IN_PROGRESS, MASTERED)
 * @returns {Promise<void>}
 */
async function updateVocabularyStatus(itemId, newStatus) {
    try {
        await db.collection('users').doc(currentUser.uid).collection('vocabulary').doc(itemId).update({
            status: newStatus
        });
    } catch (error) {
        console.error('Error updating vocabulary status:', error);
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
    selectedVocabIds = new Set([...selectedVocabIds].filter(id => validIds.has(id)));

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
            return `
                <div class="mb-4 category-container">
                    <div class="flex items-center justify-between p-2 bg-gray-100 rounded cursor-pointer category-header hover:bg-gray-200 transition-colors" 
                         data-category-name="${category}" role="button" tabindex="0" aria-expanded="${isExpanded}">
                        <h3 class="font-bold">${category} (${items.length})</h3>
                        <svg class="w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}"
                             viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </div>
                    <div class="category-content space-y-2 mt-2 ml-2 ${isExpanded ? 'expanded' : ''}" 
                         style="${isExpanded ? '' : 'display: none;'}" role="region" aria-label="${category} vocabulary">
                        ${items.map(item => renderVocabItem(item)).join('')}
                        ${items.length === 0 ? '<p class="text-xs text-gray-500 pl-2">No items in this category yet.</p>' : ''}
                    </div>
                </div>
            `;
        }).join('');

    updateBulkSelectionUI();

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
    if (item.translation) {
        const ytRegex = /(?:youtube(?:-nocookie)?\.com\/(?:.*[?&]v=|(?:v|embed|shorts)\/)|youtu\.be\/)([\w-]{11})/;
        const scRegex = /^https?:\/\/(soundcloud\.com|snd\.sc)\//;

        if (ytRegex.test(item.translation)) {
            translationHtml = `<a href="${item.translation}" target="_blank" class="text-blue-600 hover:underline" aria-label="YouTube link">YouTube Link</a>`;
        } else if (scRegex.test(item.translation)) {
            translationHtml = `<a href="${item.translation}" target="_blank" class="text-blue-600 hover:underline" aria-label="SoundCloud link">SoundCloud Link</a>`;
        } else {
            translationHtml = `<span class="text-gray-700 translation-text" role="note">${item.translation}</span>`;
        }
    }

    const isSelected = selectedVocabIds.has(item.id);
    const selectionBox = window.isMentorView ? '' : `
        <input type="checkbox" class="vocab-select-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded" data-id="${item.id}" aria-label="Select ${escapeHtml(item.word)}" ${isSelected ? 'checked' : ''}>
    `;

    return `
        <div class="vocab-item flex items-center gap-3 p-2 border rounded mb-2" data-id="${item.id}">
            ${selectionBox}
            <div class="flex-1">
                <div class="font-medium">${escapeHtml(item.word)}</div>
                ${translationHtml ? `<div class="text-sm mt-1">${translationHtml}</div>` : ''}
            </div>
            <div class="flex items-center gap-2">
                ${window.isMentorView ? `<span class="inline-block px-2 py-1 rounded text-xs font-semibold ${item.status === PROGRESS_STATUS.MASTERED ? 'bg-green-200 text-green-800' : item.status === PROGRESS_STATUS.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'} cursor-not-allowed opacity-70" title="Status (view only)" aria-label="Status: ${item.status}">${statusIcons[item.status]}</span>` : `<button class="status-button p-1 rounded-full hover:bg-gray-100 transition-transform progress-button" aria-label="Toggle status" title="Click to change status">
                    ${statusIcons[item.status]}
                </button>`}
                ${window.isMentorView ? '' : `<button class="delete-button p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-all" aria-label="Delete vocabulary item" title="Delete">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>`}
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
        updateBulkSelectionUI();
        return;
    }

    vocabularyListEl.innerHTML = categories
        .map(category => {
            const items = grouped[category] || [];
            if (items.length === 0) return '';
            return `
                <div class="mb-4 category-container">
                    <div class="flex items-center justify-between p-2 bg-gray-100 rounded category-header">
                        <h3 class="font-bold">${category} (${items.length})</h3>
                    </div>
                    <div class="category-content space-y-2 mt-2 ml-2 expanded" style="display: block;">
                        ${items.map(item => renderVocabItem(item)).join('')}
                    </div>
                </div>
            `;
        }).join('');

    updateBulkSelectionUI();
}

function updateBulkSelectionUI() {
    const countEl = document.getElementById('bulkSelectedCount');
    const selectAllEl = document.getElementById('bulkSelectAll');
    const bulkButtons = [
        document.getElementById('bulkMarkNotStarted'),
        document.getElementById('bulkMarkInProgress'),
        document.getElementById('bulkMarkMastered'),
        document.getElementById('bulkDelete')
    ].filter(Boolean);

    const visibleIds = Array.from(document.querySelectorAll('.vocab-item')).map(el => el.dataset.id).filter(Boolean);
    const count = selectedVocabIds.size;

    if (countEl) {
        countEl.textContent = `${count} selected`;
    }

    if (selectAllEl) {
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedVocabIds.has(id));
        selectAllEl.checked = allVisibleSelected;
        selectAllEl.indeterminate = !allVisibleSelected && count > 0 && visibleIds.some(id => selectedVocabIds.has(id));
    }

    // Sync visible checkboxes to current selection
    document.querySelectorAll('.vocab-select-checkbox').forEach(cb => {
        const id = cb.dataset.id;
        cb.checked = selectedVocabIds.has(id);
    });

    // Show bulk buttons only when selection exists
    const shouldShowActions = count > 0;
    bulkButtons.forEach(btn => {
        btn.classList.toggle('hidden', !shouldShowActions);
        btn.disabled = !shouldShowActions;
    });
}

/**
 * Get vocabulary statistics
 * @returns {Object} Statistics object
 */
function getVocabularyStats() {
    const total = vocabularyList.length;
    const mastered = vocabularyList.filter(w => w.status === PROGRESS_STATUS.MASTERED).length;
    const inProgress = vocabularyList.filter(w => w.status === PROGRESS_STATUS.IN_PROGRESS).length;
    const notStarted = total - mastered - inProgress;

    return { total, mastered, inProgress, notStarted };
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
