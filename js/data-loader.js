/**
 * Data Loading & Caching Module
 * Centralized data loading with caching to reduce Firestore queries
 */

// Cache for user data
let dataCache = {
    vocabularyList: [],
    skills: [],
    categories: [],
    portfolioEntries: [],
    earnedBadges: [],
    lastLoadTime: null,
    isCached: false
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Check if cache is still valid
 * @returns {boolean}
 */
function isCacheValid() {
    if (!dataCache.isCached) return false;
    const now = Date.now();
    return (now - dataCache.lastLoadTime) < CACHE_DURATION;
}

/**
 * Clear data cache
 * @returns {void}
 */
function clearDataCache() {
    dataCache = {
        vocabularyList: [],
        skills: [],
        categories: [],
        portfolioEntries: [],
        earnedBadges: [],
        lastLoadTime: null,
        isCached: false
    };
}

/**
 * Load all user data from Firestore with caching
 * @async
 * @returns {Promise<void>}
 */
async function loadUserData() {
    if (!currentUser) return;

    try {
        showLoadingSpinner(true, 'Loading your data...');

        // Load in parallel for better performance
        await Promise.all([
            loadCategories(),
            loadVocabulary(),
            loadSkills(),
            loadPortfolio()
        ]);

        // Render UI
        updateCategorySelect();
        renderVocabularyList();
        renderSkillsList();
        renderPortfolio();
        await renderBadges();
        await updateAchievementsVisibility();
        await updateProgressVisibility();
        renderProgressMetrics();

        // Show welcome modal if first login
        const settingsDoc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').get();
        if (!settingsDoc.exists || settingsDoc.data().firstLogin !== false) {
            showWelcomeModal();
            await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').set(
                { firstLogin: false },
                { merge: true }
            );
        }

        // Mark cache as valid
        dataCache.isCached = true;
        dataCache.lastLoadTime = Date.now();

        showLoadingSpinner(false);
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Error loading your data. Please refresh the page.');
        showLoadingSpinner(false);
    }
}

/**
 * Refresh user data (cache invalidation)
 * @async
 * @returns {Promise<void>}
 */
async function refreshUserData() {
    clearDataCache();
    await loadUserData();
}

/**
 * Update category select dropdown
 * @returns {void}
 */
function updateCategorySelect() {
    const categorySelect = document.getElementById('categorySelect');
    const deleteCategoryBtn = document.getElementById('deleteCategoryBtn');

    if (!categorySelect) return;

    const currentSelection = categorySelect.value;

    // Ensure 'General' is first
    const generalIndex = categories.indexOf('General');
    if (generalIndex > 0) {
        categories.splice(generalIndex, 1);
        categories.unshift('General');
    } else if (generalIndex === -1) {
        categories.unshift('General');
    }

    categorySelect.innerHTML = categories
        .map(cat => `<option value="${cat}">${cat}</option>`)
        .join('') + '<option value="new">+ New Category</option>';

    // Restore selection or default
    if (categories.includes(currentSelection) && currentSelection !== 'new') {
        categorySelect.value = currentSelection;
    } else {
        categorySelect.value = 'General';
    }

    // Update delete button state
    const protectedCategories = ['General'];
    if (categorySelect.value === 'new' || protectedCategories.includes(categorySelect.value)) {
        if (deleteCategoryBtn) deleteCategoryBtn.disabled = true;
    } else {
        if (deleteCategoryBtn) deleteCategoryBtn.disabled = false;
    }
}

/**
 * Get statistics across all data
 * @returns {Object}
 */
function getOverallStats() {
    const vocab = getVocabularyStats();
    const skillsStats = getSkillsStats();

    return {
        vocabularyStats: vocab,
        skillsStats: skillsStats,
        badgeProgress: getBadgeProgress(),
        portfolioCount: portfolioEntries.length,
        categoryCount: categories.length
    };
}

/**
 * Batch update multiple items (vocab or skills)
 * @async
 * @param {Array<Object>} updates - Array of {id, collection, updates}
 * @returns {Promise<void>}
 */
async function batchUpdateItems(updates) {
    if (!currentUser || updates.length === 0) return;

    try {
        const batch = db.batch();

        updates.forEach(({ id, collection, data }) => {
            const docRef = db.collection('users').doc(currentUser.uid).collection(collection).doc(id);
            batch.update(docRef, data);
        });

        await batch.commit();
        clearDataCache();
        await refreshUserData();
    } catch (error) {
        console.error('Error batch updating items:', error);
        throw error;
    }
}

/**
 * Export user data as JSON
 * @returns {Object}
 */
function exportUserDataAsJSON() {
    return {
        exportDate: new Date().toISOString(),
        vocabulary: vocabularyList,
        skills: skills,
        categories: categories,
        portfolio: portfolioEntries,
        badges: earnedBadges
    };
}

/**
 * Download user data as JSON file
 * @returns {void}
 */
function downloadUserDataAsJSON() {
    const data = exportUserDataAsJSON();
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `language-study-backup-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Data downloaded successfully!');
}
