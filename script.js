// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB8B5Saw8kArUOIL_m5NHFWDQwplR8HF_c",
    authDomain: "language-study-tracker.firebaseapp.com",
    projectId: "language-study-tracker",
    storageBucket: "language-study-tracker.firebasestorage.app",
    messagingSenderId: "47054764584",
    appId: "1:47054764584:web:7c0b6597bc42aaf961131d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Get DOM elements
const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
const translationInput = document.getElementById('translationInput');

// Constants
const PROGRESS_STATUS = {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    MASTERED: 'mastered',
};

// Badge definitions
const BADGES = [
    {
        id: 'first_word',
        name: 'First Word Added',
        description: 'Add your first vocabulary word.',
        icon: '🥇', // gold medal
        check: () => vocabularyList.length >= 1
    },
    {
        id: 'ten_words',
        name: '10 Words Added',
        description: 'Add 10 vocabulary words.',
        icon: '🔟', // ten
        check: () => vocabularyList.length >= 10
    },
    {
        id: 'fifty_words',
        name: '50 Words Added',
        description: 'Add 50 vocabulary words.',
        icon: '🏅', // sports medal
        check: () => vocabularyList.length >= 50
    },
    {
        id: 'ten_mastered',
        name: '10 Words Mastered',
        description: 'Master 10 vocabulary words.',
        icon: '🏆', // trophy
        check: () => vocabularyList.filter(w => w.status === PROGRESS_STATUS.MASTERED).length >= 10
    },
    {
        id: 'fifty_mastered',
        name: '50 Words Mastered',
        description: 'Master 50 vocabulary words.',
        icon: '🥇', // gold medal
        check: () => vocabularyList.filter(w => w.status === PROGRESS_STATUS.MASTERED).length >= 50
    },
    {
        id: 'first_skill',
        name: 'First Skill Added',
        description: 'Add your first skill.',
        icon: '🎓', // graduation cap
        check: () => skills.length >= 1
    },
    {
        id: 'five_skills',
        name: '5 Skills Added',
        description: 'Add 5 skills.',
        icon: '✋', // hand (five)
        check: () => skills.length >= 5
    },
    {
        id: 'ten_skills',
        name: '10 Skills Added',
        description: 'Add 10 skills.',
        icon: '🔟', // ten
        check: () => skills.length >= 10
    },
    {
        id: 'five_mastered_skills',
        name: '5 Skills Mastered',
        description: 'Master 5 skills.',
        icon: '🏅', // sports medal
        check: () => skills.filter(s => s.status === PROGRESS_STATUS.MASTERED).length >= 5
    },
    {
        id: 'ten_mastered_skills',
        name: '10 Skills Mastered',
        description: 'Master 10 skills.',
        icon: '🏆', // trophy
        check: () => skills.filter(s => s.status === PROGRESS_STATUS.MASTERED).length >= 10
    },
    {
        id: 'all_categories',
        name: 'Explorer',
        description: 'Add vocabulary to 3 or more categories.',
        icon: '🌍', // globe
        check: () => {
            const usedCategories = new Set(vocabularyList.map(w => w.category));
            return usedCategories.size >= 3;
        }
    },
    {
        id: 'first_portfolio',
        name: 'First Portfolio Item',
        description: 'Add your first portfolio entry.',
        icon: '📁', // file folder
        check: () => Array.isArray(portfolioEntries) && portfolioEntries.length >= 1
    },
    {
        id: 'five_portfolio',
        name: '5 Portfolio Items',
        description: 'Add 5 portfolio entries.',
        icon: '⭐', // star
        check: () => Array.isArray(portfolioEntries) && portfolioEntries.length >= 5
    }
];

// State variables
let vocabularyList = [];
let skills = [];
let categories = [];
let currentUser = null;
let earnedBadges = [];
let portfolioEntries = [];

// DOM Elements
const categorySelect = document.getElementById('categorySelect');
const newCategoryInput = document.getElementById('newCategoryInput');
const newCategoryName = document.getElementById('newCategoryName');
const vocabularyInput = document.getElementById('vocabularyInput');
const skillsInput = document.getElementById('skillsInput');
const vocabularyListEl = document.getElementById('vocabularyList');
const skillsList = document.getElementById('skillsList');
const deleteCategoryBtn = document.getElementById('deleteCategoryBtn');
const languageSelect = document.getElementById('languageSelect');
const languageLinksContainer = document.getElementById('languageLinksContainer');

// Firebase Authentication Logic
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        if (window.isMentorView) {
            const params = new URLSearchParams(window.location.search);
            const mentorCode = params.get('mentor');
            userEmail.innerHTML = mentorCode
                ? `Mentor View: <b>(${mentorCode})</b>`
                : 'Mentor View';
        } else {
            userEmail.textContent = `Logged in as: ${user.email}`;
        }
        await loadUserData();
        await updateAchievementsVisibility();
        // Render ASL Club achievements if section is visible
        const section = document.getElementById('achievementsSection');
        if (section && section.style.display !== 'none' && typeof renderASLClubAchievements === 'function') {
            renderASLClubAchievements();
        }
        // --- Activate tab from URL parameter after data is loaded ---
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab') || 'vocabulary';
        if (['vocabulary', 'skills', 'portfolio'].includes(tabParam)) {
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => {
                if (typeof activateTab === 'function') {
                    activateTab(tabParam);
                }
            }, 100);
        }
        // --- Show welcome modal if first login ---
        const settingsDoc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').get();
        if (!settingsDoc.exists || settingsDoc.data().firstLogin !== false) {
            showWelcomeModal();
            await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').set({ firstLogin: false }, { merge: true });
        }
    } else {
        window.location.href = 'login.html';
    }
});

// Show the welcome modal for new users
function showWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    // Close modal on X or Continue
    const closeBtn = document.getElementById('closeWelcomeBtn');
    const continueBtn = document.getElementById('welcomeContinueBtn');
    function close() {
        modal.classList.add('hidden');
    }
    if (closeBtn) closeBtn.onclick = close;
    if (continueBtn) continueBtn.onclick = close;
}

// Load user data from Firestore
async function loadUserData() {
    try {
        // Load categories
        const categoriesDoc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('categories').get();
        // Ensure 'General' category exists if categories are empty or just loaded
        let loadedCategories = categoriesDoc.exists ? categoriesDoc.data().list : ['General'];
        if (!loadedCategories.includes('General')) {
            loadedCategories.unshift('General'); // Add 'General' if missing
        }
        categories = loadedCategories;


        // Load vocabulary
        const vocabularySnapshot = await db.collection('users').doc(currentUser.uid).collection('vocabulary').get();
        vocabularyList = vocabularySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Load skills
        const skillsSnapshot = await db.collection('users').doc(currentUser.uid).collection('skills').get();
        skills = skillsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Update UI
        updateCategorySelect(); // This now handles the delete button state too
        renderVocabularyList();
        renderSkillsList();
        renderBadges(); // Call badge rendering after loading user data
        await loadPortfolio(); // Load portfolio entries
    } catch (error) {
        console.error("Error loading data:", error);
    }
    // Ensure progress metrics visibility and rendering are updated after loading user data
    await updateProgressVisibility();
    renderProgressMetrics();
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 2500);
}

async function renderBadges() {
    const badgesContainer = document.getElementById('badgesContainer');
    if (!badgesContainer) return;
    // Fetch previously earned badges from Firestore
    let previouslyEarned = [];
    try {
        const doc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').get();
        if (doc.exists && Array.isArray(doc.data().earnedBadges)) {
            previouslyEarned = doc.data().earnedBadges;
        }
    } catch (e) { }
    const currentlyEarned = BADGES.filter(badge => badge.check()).map(b => b.id);
    // Show toast only for newly earned badges (not on every page load)
    BADGES.forEach(badge => {
        if (badge.check() && !previouslyEarned.includes(badge.id)) {
            showToast(`Badge earned: ${badge.name}!`);
        }
    });
    // Update Firestore with the latest earned badges
    await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').set({ earnedBadges: currentlyEarned }, { merge: true });
    earnedBadges = currentlyEarned;
    badgesContainer.innerHTML = BADGES.map(badge => `
        <div class="flex flex-col items-center p-2 rounded border ${earnedBadges.includes(badge.id) ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-200'} w-32">
            <div class="text-3xl mb-1">${badge.icon}</div>
            <div class="font-semibold text-center">${badge.name}</div>
            <div class="text-xs text-gray-500 text-center">${badge.description}</div>
            <div class="mt-1 text-xs ${earnedBadges.includes(badge.id) ? 'text-green-600' : 'text-gray-400'}">
                ${earnedBadges.includes(badge.id) ? 'Earned' : 'Locked'}
            </div>
        </div>
    `).join('');
}

// --- PROGRESS METRICS ---
function renderProgressMetrics() {
    if (window.progressEnabledCache === false) {
        const metricsEl = document.getElementById('progressMetrics');
        if (metricsEl) metricsEl.innerHTML = '';
        return;
    }
    const metricsEl = document.getElementById('progressMetrics');
    if (!metricsEl) return;
    // Vocabulary metrics
    const totalVocab = vocabularyList.length;
    const masteredVocab = vocabularyList.filter(w => w.status === PROGRESS_STATUS.MASTERED).length;
    const inProgressVocab = vocabularyList.filter(w => w.status === PROGRESS_STATUS.IN_PROGRESS).length;
    // Skills metrics
    const totalSkills = skills.length;
    const masteredSkills = skills.filter(s => s.status === PROGRESS_STATUS.MASTERED).length;
    const inProgressSkills = skills.filter(s => s.status === PROGRESS_STATUS.IN_PROGRESS).length;
    metricsEl.innerHTML = `
        <div class="flex flex-col items-center bg-gray-100 rounded p-3 min-w-[120px]">
            <div class="font-bold text-blue-700">Vocabulary</div>
            <div class="text-sm">${masteredVocab} / ${totalVocab} Mastered</div>
            <div class="text-xs text-gray-500">${inProgressVocab} In Progress</div>
        </div>
        <div class="flex flex-col items-center bg-gray-100 rounded p-3 min-w-[120px]">
            <div class="font-bold text-green-700">Skills</div>
            <div class="text-sm">${masteredSkills} / ${totalSkills} Mastered</div>
            <div class="text-xs text-gray-500">${inProgressSkills} In Progress</div>
        </div>
    `;
}

// --- PROGRESS METRICS TOGGLE LOGIC ---
async function getProgressEnabled() {
    if (!currentUser) return false;
    try {
        const doc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').get();
        if (doc.exists && typeof doc.data().progressEnabled === 'boolean') {
            return doc.data().progressEnabled;
        }
    } catch (e) { }
    return false;
}
async function setProgressEnabled(val) {
    if (!currentUser) return;
    await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').set({ progressEnabled: val }, { merge: true });
}
async function updateProgressVisibility() {
    const section = document.getElementById('progressMetrics');
    const toggle = document.getElementById('toggleProgress');
    const enabled = await getProgressEnabled();
    if (section) section.style.display = enabled ? '' : 'none';
    if (toggle) toggle.checked = enabled;
    window.progressEnabledCache = enabled;
}
// Patch renderProgressMetrics to respect toggle
const _renderProgressMetrics = renderProgressMetrics;
renderProgressMetrics = function () {
    if (window.progressEnabledCache === undefined) {
        getProgressEnabled().then(enabled => {
            window.progressEnabledCache = enabled;
            if (enabled) _renderProgressMetrics();
            else {
                const metricsEl = document.getElementById('progressMetrics');
                if (metricsEl) metricsEl.innerHTML = '';
            }
        });
    } else if (window.progressEnabledCache) {
        _renderProgressMetrics();
    } else {
        const metricsEl = document.getElementById('progressMetrics');
        if (metricsEl) metricsEl.innerHTML = '';
    }
};

// Load user data from Firestore
async function loadUserData() {
    try {
        // Load categories
        const categoriesDoc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('categories').get();
        // Ensure 'General' category exists if categories are empty or just loaded
        let loadedCategories = categoriesDoc.exists ? categoriesDoc.data().list : ['General'];
        if (!loadedCategories.includes('General')) {
            loadedCategories.unshift('General'); // Add 'General' if missing
        }
        categories = loadedCategories;


        // Load vocabulary
        const vocabularySnapshot = await db.collection('users').doc(currentUser.uid).collection('vocabulary').get();
        vocabularyList = vocabularySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Load skills
        const skillsSnapshot = await db.collection('users').doc(currentUser.uid).collection('skills').get();
        skills = skillsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Update UI
        updateCategorySelect(); // This now handles the delete button state too
        renderVocabularyList();
        renderSkillsList();
        renderBadges(); // Call badge rendering after loading user data
        // Do not call renderProgressMetrics here
        await loadPortfolio(); // Load portfolio entries
    } catch (error) {
        console.error("Error loading data:", error);
    }
    // Ensure progress metrics visibility and rendering are updated after loading user data
    await updateProgressVisibility();
    renderProgressMetrics();
}

function renderVocabularyList() {
    const expandedCategories = new Set(
        Array.from(document.querySelectorAll('#vocabularyList .category-content')) // Scope query
            .filter(content => content.classList.contains('expanded'))
            .map(content => content.closest('.category-container').querySelector('.category-header').dataset.categoryName) // Use data attribute
    );

    const groupedVocab = categories.reduce((acc, category) => {
        // Ensure category exists in the accumulator
        acc[category] = vocabularyList.filter(item => item.category === category);
        return acc;
    }, {});


    vocabularyListEl.innerHTML = categories // Iterate through the official categories list
        .map(category => {
            const items = groupedVocab[category] || []; // Get items for this category
            if (items.length === 0 && category !== 'General') return ''; // Don't render empty categories unless it's General (or keep based on preference)

            const isExpanded = expandedCategories.has(category);
            return `
                <div class="mb-4 category-container"> <div class="flex items-center justify-between p-2 bg-gray-100 rounded cursor-pointer category-header hover:bg-gray-200" data-category-name="${category}"> <h3 class="font-bold">${category} (${items.length})</h3>
                        <svg class="w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}"
                             viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </div>
                    <div class="category-content space-y-2 mt-2 ml-2 ${isExpanded ? 'expanded' : ''}" style="${isExpanded ? '' : 'display: none;'}"> ${items.map(item => renderVocabItem(item)).join('')}
                        ${items.length === 0 ? '<p class="text-xs text-gray-500 pl-2">No items in this category yet.</p>' : ''}
                    </div>
                </div>
            `;
        }).join('');

    // Re-attach listeners for category headers
    document.querySelectorAll('#vocabularyList .category-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const isExpanding = !content.classList.contains('expanded');
            content.classList.toggle('expanded');
            content.style.display = isExpanding ? 'block' : 'none'; // Toggle display
            const arrow = header.querySelector('svg');
            arrow.style.transform = isExpanding ? 'rotate(180deg)' : '';
        });
    });
}

// Render skills list (updated for mentor view)
function renderSkillsList() {
    skillsList.innerHTML = skills.length > 0 ? skills
        .map(skill => `
            <div class="skill-item flex items-center justify-between p-2 border rounded mb-2" data-id="${skill.id}"> <div class="font-medium">${skill.name}</div>
                <div class="flex items-center gap-2">
                    ${window.isMentorView ? `<span class="inline-block px-2 py-1 rounded text-xs font-semibold ${skill.status === PROGRESS_STATUS.MASTERED ? 'bg-green-200 text-green-800' : skill.status === PROGRESS_STATUS.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'} cursor-not-allowed opacity-70" title="Status (view only)">${statusIcons[skill.status]}</span>` : `<button class="status-button p-1 rounded-full hover:bg-gray-100 transition-transform progress-button"> ${statusIcons[skill.status]}
                    </button>`}
                    ${window.isMentorView ? '' : `<button class="delete-button p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-all"> <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>`}
                </div>
            </div>
        `).join('') : '<p class="text-sm text-gray-500">No skills added yet.</p>'; // Message if empty
}

// Render individual vocabulary item (updated for mentor view)
function renderVocabItem(item) {
    let translationHtml = '';
    if (item.translation) {
        const ytRegex = /(?:youtube(?:-nocookie)?\.com\/(?:.*[?&]v=|(?:v|embed|shorts)\/)|youtu\.be\/)([\w-]{11})/;
        const scRegex = /^https?:\/\/(soundcloud\.com|snd\.sc)\//;
        if (ytRegex.test(item.translation)) {
            translationHtml = `<a href="${item.translation}" target="_blank" class="text-blue-600 hover:underline">YouTube Link</a>`;
        } else if (scRegex.test(item.translation)) {
            translationHtml = `<a href="${item.translation}" target="_blank" class="text-blue-600 hover:underline">SoundCloud Link</a>`;
        } else {
            translationHtml = `<span class="text-gray-700 translation-text">${item.translation}</span>`;
        }
    }
    return `
        <div class="vocab-item flex items-center justify-between p-2 border rounded mb-2" data-id="${item.id}">
            <div class="flex-1">
                <div class="font-medium">${item.word}</div>
                ${translationHtml ? `<div class="text-sm mt-1">${translationHtml}</div>` : ''}
            </div>
            <div class="flex items-center gap-2">
                ${window.isMentorView ? `<span class="inline-block px-2 py-1 rounded text-xs font-semibold ${item.status === PROGRESS_STATUS.MASTERED ? 'bg-green-200 text-green-800' : item.status === PROGRESS_STATUS.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'} cursor-not-allowed opacity-70" title="Status (view only)">${statusIcons[item.status]}</span>` : `<button class="status-button p-1 rounded-full hover:bg-gray-100 transition-transform progress-button"> ${statusIcons[item.status]}
                </button>`}
                ${window.isMentorView ? '' : `<button class="delete-button p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-all"> <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>`}
            </div>
        </div>
    `;
}

// Save categories to Firestore
async function saveCategories() {
    try {
        // Ensure 'General' category is always present before saving
        if (!categories.includes('General')) {
            categories.unshift('General');
        }
        await db.collection('users').doc(currentUser.uid).collection('metadata').doc('categories').set({
            list: categories
        });
    } catch (error) {
        console.error("Error saving categories:", error);
    }
}

// Add vocabulary words
async function addVocabularyWords() {
    const words = vocabularyInput.value.trim().split('\n').filter(word => word.trim());
    const translation = translationInput.value.trim();
    if (words.length > 0) {
        try {
            const batch = db.batch();
            const vocabRef = db.collection('users').doc(currentUser.uid).collection('vocabulary');
            const newItems = words.map(word => ({
                word: word.trim(),
                translation: translation || '',
                category: categorySelect.value === 'new' ? 'General' : categorySelect.value,
                status: PROGRESS_STATUS.NOT_STARTED,
                dateAdded: firebase.firestore.FieldValue.serverTimestamp()
            }));
            for (const item of newItems) {
                const newDocRef = vocabRef.doc();
                batch.set(newDocRef, item);
            }
            await batch.commit();
            vocabularyInput.value = '';
            translationInput.value = '';
            await loadUserData();
        } catch (error) {
            console.error("Error adding vocabulary:", error);
        }
    }
}

// Add skills
async function addSkills() {
    const skillsToAdd = skillsInput.value.trim().split('\n').filter(skill => skill.trim());
    if (skillsToAdd.length > 0) {
        try {
            const batch = db.batch();
            const skillsRef = db.collection('users').doc(currentUser.uid).collection('skills');

            const newItems = skillsToAdd.map(skill => ({
                name: skill.trim(),
                status: PROGRESS_STATUS.NOT_STARTED,
                dateAdded: firebase.firestore.FieldValue.serverTimestamp()
            }));

            for (const item of newItems) {
                const newDocRef = skillsRef.doc();
                batch.set(newDocRef, item);
            }

            await batch.commit();
            skillsInput.value = '';
            await loadUserData(); // Reload data to show new items
        } catch (error) {
            console.error("Error adding skills:", error);
        }
    }
}

// Update item status
async function updateStatus(id, isVocab) {
    try {
        const collection = isVocab ? 'vocabulary' : 'skills';
        const docRef = db.collection('users').doc(currentUser.uid).collection(collection).doc(id);
        const doc = await docRef.get();

        if (doc.exists) {
            const statusOrder = [PROGRESS_STATUS.NOT_STARTED, PROGRESS_STATUS.IN_PROGRESS, PROGRESS_STATUS.MASTERED];
            const currentStatus = doc.data().status;
            const currentIndex = statusOrder.indexOf(currentStatus);
            const newStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

            await docRef.update({
                status: newStatus
            });
            await loadUserData(); // Reload data to update UI
        }
    } catch (error) {
        console.error("Error updating status:", error);
    }
}

// --- MODIFIED: Delete item (Vocabulary or Skill) ---
async function deleteItem(id, isVocab) {
    // Get the name/word for the confirmation message
    let itemName = '';
    let itemType = '';
    try {
        if (isVocab) {
            itemType = 'vocabulary word';
            // Find the item in the local list to get its name/word
            const item = vocabularyList.find(v => v.id === id);
            itemName = item ? `"${item.word}"` : 'this item';
        } else {
            itemType = 'skill';
            // Find the item in the local list to get its name
            const item = skills.find(s => s.id === id);
            itemName = item ? `"${item.name}"` : 'this item';
        }
    } catch (e) {
        // Fallback if item lookup fails for some reason
        itemName = 'this item';
        itemType = isVocab ? 'vocabulary word' : 'skill';
        console.warn("Could not find item name for delete confirmation.", e);
    }

    // <<< ADDED Confirmation >>>
    const confirmation = confirm(`Are you sure you want to delete the ${itemType} ${itemName}?`);

    if (confirmation) { // <<< Only proceed if confirmed
        try {
            const collection = isVocab ? 'vocabulary' : 'skills';
            await db.collection('users').doc(currentUser.uid).collection(collection).doc(id).delete();
            await loadUserData(); // Reload data to update UI
        } catch (error) {
            console.error(`Error deleting ${itemType}:`, error);
            alert(`Failed to delete ${itemType}. Please try again.`);
        }
    } // <<< End confirmation check
}

// --- Delete Category Function ---
async function deleteCategory() {
    const categoryToDelete = categorySelect.value;
    const protectedCategories = ['General']; // 'General' cannot be deleted

    if (!categoryToDelete || categoryToDelete === 'new' || protectedCategories.includes(categoryToDelete)) {
        alert("This category cannot be deleted.");
        return;
    }

    // Confirmation Dialog with Warning
    const confirmation = confirm(`Are you sure you want to delete the category "${categoryToDelete}"? This will also delete ALL vocabulary items within this category.`);

    if (confirmation) {
        try {
            // 1. Filter out the category locally
            categories = categories.filter(cat => cat !== categoryToDelete);

            // 2. Save updated categories list to Firestore
            await saveCategories(); // This now ensures 'General' persists if needed

            // 3. Find and delete vocabulary items associated with this category
            const itemsToDelete = vocabularyList.filter(item => item.category === categoryToDelete);
            const batch = db.batch();
            const vocabRef = db.collection('users').doc(currentUser.uid).collection('vocabulary');

            itemsToDelete.forEach(item => {
                batch.delete(vocabRef.doc(item.id));
            });
            await batch.commit(); // Commit the batch delete

            // 4. Refresh user data (which includes re-rendering lists)
            await loadUserData();

            // 5. Reset selection and disable button explicitly after load
            categorySelect.value = 'General'; // Reset to default
            deleteCategoryBtn.disabled = true;

            console.log(`Category "${categoryToDelete}" and its items deleted successfully.`);

        } catch (error) {
            console.error("Error deleting category:", error);
            alert("Failed to delete category. Please try again.");
            // Optionally reload data to revert UI changes if the Firestore operation failed
            await loadUserData();
        }
    }
}

// Show/hide settings modal
function openSettingsModal() {
    document.getElementById('settingsModal').classList.remove('hidden');
}
function closeSettingsModal() {
    document.getElementById('settingsModal').classList.add('hidden');
}

// Achievements toggle state (default OFF, persisted in Firestore per user)
async function getAchievementsEnabled() {
    if (!currentUser) return false;
    try {
        const doc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').get();
        if (doc.exists && typeof doc.data().achievementsEnabled === 'boolean') {
            return doc.data().achievementsEnabled;
        }
    } catch (e) { }
    return false;
}
async function setAchievementsEnabled(val) {
    if (!currentUser) return;
    await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').set({ achievementsEnabled: val }, { merge: true });
}

// Show/hide achievements section and toasts based on setting
async function updateAchievementsVisibility() {
    const section = document.getElementById('achievementsSection');
    const toggle = document.getElementById('toggleAchievements');
    const enabled = await getAchievementsEnabled();
    if (section) section.style.display = enabled ? '' : 'none';
    if (toggle) toggle.checked = enabled;
    window.achievementsEnabledCache = enabled;
    if (section && section.style.display !== 'none' && typeof renderASLClubAchievements === 'function') {
        renderASLClubAchievements();
    }
}

// Patch showToast to respect achievements toggle (now async-aware)
const _showToast = showToast;
showToast = async function (message) {
    if (window.achievementsEnabledCache === undefined) {
        window.achievementsEnabledCache = await getAchievementsEnabled();
    }
    if (window.achievementsEnabledCache) _showToast(message);
};

// --- MENTOR CODE GENERATION & SHARING ---
async function getMentorCodeEnabled() {
    if (!currentUser) return false;
    try {
        const doc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').get();
        if (doc.exists && typeof doc.data().mentorCodeEnabled === 'boolean') {
            return doc.data().mentorCodeEnabled;
        }
    } catch (e) { }
    return false;
}
async function setMentorCodeEnabled(val) {
    if (!currentUser) return;
    await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').set({ mentorCodeEnabled: val }, { merge: true });
    if (!val) {
        // Delete mentor code if disabling mentor access
        const codeDoc = await db.collection('mentorCodes').where('uid', '==', currentUser.uid).get();
        if (!codeDoc.empty) {
            // There should only be one code per user
            await db.collection('mentorCodes').doc(codeDoc.docs[0].id).delete();
        }
    }
}
async function getOrCreateMentorCode(forceRegenerate = false) {
    if (!currentUser) return null;
    const codeDoc = await db.collection('mentorCodes').where('uid', '==', currentUser.uid).get();
    if (!codeDoc.empty && !forceRegenerate) {
        return codeDoc.docs[0].id;
    }
    // If regenerating, delete old code
    if (!codeDoc.empty && forceRegenerate) {
        await db.collection('mentorCodes').doc(codeDoc.docs[0].id).delete();
    }
    // Generate a new unique 5-digit alphanumeric code
    let code, exists, attempts = 0;
    do {
        code = generateMentorCode();
        const doc = await db.collection('mentorCodes').doc(code).get();
        exists = doc.exists;
        attempts++;
    } while (exists && attempts < 10);
    if (exists) throw new Error('Could not generate a unique mentor code. Please try again.');
    await db.collection('mentorCodes').doc(code).set({ uid: currentUser.uid });
    return code;
}
async function showMentorCode(forceRegenerate = false) {
    const enabled = await getMentorCodeEnabled();
    const codeDiv = document.getElementById('mentorCodeDiv');
    const regenBtn = document.getElementById('regenerateMentorCodeBtn');
    const infoDiv = document.getElementById('mentorCodeInfo');
    if (!enabled) {
        if (codeDiv) codeDiv.innerHTML = '';
        if (regenBtn) regenBtn.classList.add('hidden');
        if (infoDiv) infoDiv.classList.add('hidden');
        return;
    }
    const code = await getOrCreateMentorCode(forceRegenerate);
    if (codeDiv) {
        codeDiv.innerHTML = `<b>Mentor Share Code:</b> <span class='font-mono text-lg select-all'>${code}</span>`;
    }
    if (regenBtn) regenBtn.classList.remove('hidden');
    if (infoDiv) infoDiv.classList.remove('hidden');
}
// Add mentor code display when opening settings
const _openSettingsModal = openSettingsModal;
openSettingsModal = function () {
    _openSettingsModal();
    updateMentorCodeToggle();
};
async function updateMentorCodeToggle() {
    const toggle = document.getElementById('toggleMentorCode');
    const regenBtn = document.getElementById('regenerateMentorCodeBtn');
    if (!toggle) return;
    const enabled = await getMentorCodeEnabled();
    toggle.checked = enabled;
    showMentorCode();
    toggle.onchange = async (e) => {
        await setMentorCodeEnabled(e.target.checked);
        showMentorCode();
    };
    if (regenBtn) {
        regenBtn.onclick = async () => {
            await showMentorCode(true);
        };
    }
}

// --- Ensure mentor view is detected before auth state logic ---
(async function detectMentorViewEarly() {
    const params = new URLSearchParams(window.location.search);
    const mentorCode = params.get('mentor');
    if (mentorCode) {
        // Set isMentorView to true immediately if mentor param is present
        window.isMentorView = true;
    }
    // Do not load data here, just set the flag for UI
})();

function addMentorBackButton() {
    // Only show in mentor view
    if (!window.isMentorView) return;
    // Hide the logout button
    if (logoutBtn) logoutBtn.style.display = 'none';
    // Prevent duplicate mentor back button
    if (document.getElementById('mentorBackBtn')) return;
    // Create a new button for going back to mentor's account
    const btn = document.createElement('button');
    btn.id = 'mentorBackBtn';
    btn.textContent = 'Go back to my account';
    // Use the same classes as the logout button for position and style
    btn.className = logoutBtn ? logoutBtn.className : 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700';
    // Place the button in the same parent and position as the logout button
    if (logoutBtn && logoutBtn.parentNode) {
        logoutBtn.parentNode.insertBefore(btn, logoutBtn.nextSibling);
    } else {
        document.body.appendChild(btn);
    }
    btn.onclick = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('mentor');
        let newUrl = url.pathname;
        if (url.searchParams.toString()) {
            newUrl += '?' + url.searchParams.toString();
        }
        window.location.replace(newUrl);
    };
}

async function tryMentorView() {
    const params = new URLSearchParams(window.location.search);
    const mentorCode = params.get('mentor');
    if (!mentorCode) return;
    // Lookup code in Firestore
    const code = mentorCode.toUpperCase();
    const doc = await db.collection('mentorCodes').doc(code).get();
    if (!doc.exists) {
        alert('Invalid mentor code.');
        return;
    }
    window.isMentorView = true;
    window.mentorUid = doc.data().uid;
    // Load data for mentorUid instead of currentUser
    await loadUserDataForMentor(window.mentorUid);
    // Disable all editing features
    disableEditingUI();
    addMentorBackButton();
    // Activate tab from URL parameter for mentor view
    const tabParam = params.get('tab') || 'vocabulary';
    if (['vocabulary', 'skills', 'portfolio'].includes(tabParam)) {
        setTimeout(() => {
            if (typeof activateTab === 'function') {
                activateTab(tabParam);
            }
        }, 100);
    }
}

function showMentorExitButton() {
    // Only add if not already present
    if (document.getElementById('mentorExitBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'mentorExitBtn';
    btn.textContent = 'Go back to my account';
    btn.className = 'fixed top-4 right-4 z-50 px-4 py-2 bg-blue-600 text-white rounded shadow-lg hover:bg-blue-700';
    btn.addEventListener('click', function () {
        window.location.href = 'login.html';
    });
    document.body.appendChild(btn);
}

// Mentor view logic (no changes needed here)
async function loadUserDataForMentor(uid) {
    // ...same as loadUserData, but use uid instead of currentUser.uid and do not allow editing
    // (You can refactor loadUserData to accept a uid and a readOnly flag)
    // For brevity, call loadUserData with a global override
    window.forceReadOnly = true;
    currentUser = { uid };
    await loadUserData();
}

function disableEditingUI() {
    // Only disable editing actions, not tab navigation or content display
    // Hide add/delete/status buttons and forms, but keep tab buttons and content visible
    document.querySelectorAll('.delete-button, .status-button, .feature-button, #addVocabBtn, #addSkillBtn, #addCategoryBtn, #deleteCategoryBtn, #portfolioForm, #openSettingsBtn, #deleteAccountBtn, #newCategoryInput, #vocabularyInput, #skillsInput, #portfolioTitle, #portfolioLink, #toggleLanguageSection, #openPrintPdfModalBtn').forEach(el => {
        if (el) {
            if (el.tagName === 'FORM' || el.tagName === 'BUTTON') {
                el.style.display = 'none';
            } else {
                el.disabled = true;
            }
        }
    });
    // Hide settings modal if open
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('hidden');
    // Ensure logoutBtn is visible and enabled in mentor view
    if (window.isMentorView && logoutBtn) {
        logoutBtn.style.display = '';
        logoutBtn.disabled = false;
    }
    // Show all tab buttons and tab content (vocabulary, skills, portfolio)
    document.querySelectorAll('.tab-button, .tab-content').forEach(el => {
        el.style.display = '';
        el.disabled = false;
    });
}

// On page load, check for mentor view
window.addEventListener('DOMContentLoaded', tryMentorView);

// Unified tab activation function
function activateTab(tabId) {
    // Handle data-tab-target system (primary system)
    const tabButtons = document.querySelectorAll("[data-tab-target]");
    const tabContents = document.querySelectorAll("[data-tab-content]");

    if (tabButtons && tabContents) {
        const activeButton = document.querySelector(`[data-tab-target="#${tabId}"]`);
        const activeContent = document.querySelector(`#${tabId}`);

        if (activeButton && activeContent) {
            tabButtons.forEach(btn => btn.classList.remove("active"));
            tabContents.forEach(content => content.classList.add("hidden"));

            activeButton.classList.add("active");
            activeContent.classList.remove("hidden");
        }
    }

    // Handle main tab button system (.tab-button)
    const mainTabButtons = document.querySelectorAll(".tab-button");
    const mainTabContents = document.querySelectorAll(".tab-content");

    if (mainTabButtons && mainTabContents) {
        const activeMainButton = document.querySelector(`[data-tab="${tabId}"]`);
        const activeMainContent = document.getElementById(tabId);

        if (activeMainButton && activeMainContent) {
            mainTabButtons.forEach(btn => {
                btn.classList.remove("bg-blue-500", "text-white");
                btn.classList.add("bg-gray-200", "text-gray-700");
            });

            mainTabContents.forEach(content => {
                content.classList.remove("active");
            });

            activeMainButton.classList.add("bg-blue-500", "text-white");
            activeMainButton.classList.remove("bg-gray-200", "text-gray-700");
            activeMainContent.classList.add("active");
        }
    }

    // Update URL parameter
    if (['vocabulary', 'skills', 'portfolio'].includes(tabId)) {
        const url = new URL(window.location);
        url.searchParams.set('tab', tabId);
        window.history.pushState({}, '', url);
    }
}

// Handle browser back/forward navigation
window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') || 'vocabulary';
    if (['vocabulary', 'skills', 'portfolio'].includes(tabParam)) {
        activateTab(tabParam);
    }
});

// Helper function to get current active tab
function getCurrentActiveTab() {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'vocabulary';
}

// Helper function to navigate to a tab (can be called from anywhere)
function navigateToTab(tabId) {
    if (['vocabulary', 'skills', 'portfolio'].includes(tabId)) {
        activateTab(tabId);
    } else {
        console.warn('Invalid tab ID:', tabId);
    }
}

// Generalized tab toggling functionality using unified activateTab function
const tabButtons = document.querySelectorAll("[data-tab-target]");

if (tabButtons) {
    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const tabId = button.dataset.tabTarget.replace('#', '');
            // Only use unified function for main tabs, not modals
            if (['vocabulary', 'skills', 'portfolio'].includes(tabId)) {
                activateTab(tabId);
            } else {
                // Handle modal tabs separately
                const target = document.querySelector(button.dataset.tabTarget);
                const modalTabContents = document.querySelectorAll("[data-tab-content]");
                const modalTabButtons = document.querySelectorAll("[data-tab-target]");

                modalTabContents.forEach(content => {
                    content.classList.add("hidden");
                });

                modalTabButtons.forEach(btn => {
                    btn.classList.remove("active");
                });

                if (target) {
                    target.classList.remove("hidden");
                }
                button.classList.add("active");
            }
        });
    });
}

// Tab toggling functionality for main sections using unified activateTab function
const mainTabButtons = document.querySelectorAll(".tab-button");

if (mainTabButtons) {
    mainTabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetId = button.dataset.tab;
            if (targetId) {
                activateTab(targetId);
            }
        });
    });
}

// Category select change
categorySelect.addEventListener('change', (e) => {
    const selectedValue = e.target.value;
    if (selectedValue === 'new') {
        newCategoryInput.classList.remove('hidden');
        deleteCategoryBtn.disabled = true; // Disable delete when adding new
    } else {
        newCategoryInput.classList.add('hidden');
        // Enable delete button only if it's not 'General'
        const protectedCategories = ['General'];
        if (protectedCategories.includes(selectedValue)) {
            deleteCategoryBtn.disabled = true;
        } else {
            deleteCategoryBtn.disabled = false;
        }
    }
});

// Add new category
document.getElementById('addCategoryBtn').addEventListener('click', async () => {
    const newCategory = newCategoryName.value.trim();
    if (newCategory && !categories.includes(newCategory)) {
        categories.push(newCategory);
        await saveCategories();
        updateCategorySelect(); // Refresh dropdown
        categorySelect.value = newCategory; // Select the newly added category
        newCategoryInput.classList.add('hidden');
        newCategoryName.value = '';
        deleteCategoryBtn.disabled = false; // Enable delete for the new category
    } else if (!newCategory) {
        alert("Please enter a category name.");
    } else {
        alert("Category already exists.");
    }
});

// Cancel Add New Category
document.getElementById('cancelCategoryBtn').addEventListener('click', () => {
    newCategoryInput.classList.add('hidden');
    newCategoryName.value = '';
    // Re-enable delete button based on current selection if needed
    const protectedCategories = ['General'];
    if (categorySelect.value !== 'new' && !protectedCategories.includes(categorySelect.value)) {
        deleteCategoryBtn.disabled = false;
    } else {
        deleteCategoryBtn.disabled = true;
    }
});

// Add vocabulary
document.getElementById('addVocabBtn').addEventListener('click', addVocabularyWords);
vocabularyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addVocabularyWords();
    }
});
translationInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addVocabularyWords();
    }
});

// Add skills
document.getElementById('addSkillBtn').addEventListener('click', addSkills);
skillsInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addSkills();
    }
});

// Event Listener for Delete Category Button
deleteCategoryBtn.addEventListener('click', deleteCategory);

// Logout functionality
logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error("Logout error: ", error.message);
    }
});

// Delegate event listeners for status updates and deletions
vocabularyListEl.addEventListener('click', (e) => {
    const statusButton = e.target.closest('.status-button');
    const deleteButton = e.target.closest('.delete-button');
    const itemId = e.target.closest('.vocab-item')?.dataset.id;

    if (statusButton && itemId) {
        updateStatus(itemId, true);
    } else if (deleteButton && itemId) {
        deleteItem(itemId, true); // Now includes confirmation
    }
});

skillsList.addEventListener('click', (e) => {
    const statusButton = e.target.closest('.status-button');
    const deleteButton = e.target.closest('.delete-button');
    const itemId = e.target.closest('.skill-item')?.dataset.id;

    if (statusButton && itemId) {
        updateStatus(itemId, false);
    } else if (deleteButton && itemId) {
        deleteItem(itemId, false); // Now includes confirmation
    }
});

// Delete Account functionality
deleteAccountBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    const confirmed = confirm('Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.');
    if (!confirmed) return;
    try {
        // Delete all user data from Firestore
        const userDocRef = db.collection('users').doc(currentUser.uid);
        // Delete subcollections (vocabulary, skills, metadata)
        const vocabSnapshot = await userDocRef.collection('vocabulary').get();
        const skillsSnapshot = await userDocRef.collection('skills').get();
        const metadataSnapshot = await userDocRef.collection('metadata').get();
        const batch = db.batch();
        vocabSnapshot.forEach(doc => batch.delete(doc.ref));
        skillsSnapshot.forEach(doc => batch.delete(doc.ref));
        metadataSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        // Delete mentor code if it exists
        const codeDoc = await db.collection('mentorCodes').where('uid', '==', currentUser.uid).get();
        if (!codeDoc.empty) {
            await db.collection('mentorCodes').doc(codeDoc.docs[0].id).delete();
        }
        // Delete user document
        await userDocRef.delete();
        // Delete auth user
        await currentUser.delete();
        alert('Your account has been deleted.');
        window.location.href = 'login.html';
    } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
            alert('Please log out and log in again, then try deleting your account.');
        } else {
            alert('Error deleting account: ' + error.message);
        }
    }
});

// Settings modal logic
document.getElementById('openSettingsBtn').addEventListener('click', openSettingsModal);
document.getElementById('closeSettingsBtn').addEventListener('click', closeSettingsModal);
document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('settingsModal')) closeSettingsModal();
});
// Achievements toggle logic
const toggle = document.getElementById('toggleAchievements');
if (toggle) {
    toggle.addEventListener('change', async (e) => {
        await setAchievementsEnabled(e.target.checked);
        await updateAchievementsVisibility();
        // Render ASL Club achievements if section is visible
        const section = document.getElementById('achievementsSection');
        if (section && section.style.display !== 'none' && typeof renderASLClubAchievements === 'function') {
            renderASLClubAchievements();
        }
    });
    updateAchievementsVisibility();
}
// Progress metrics toggle logic
const toggleProgress = document.getElementById('toggleProgress');
if (toggleProgress) {
    toggleProgress.addEventListener('change', async (e) => {
        await setProgressEnabled(e.target.checked);
        await updateProgressVisibility();
        renderProgressMetrics();
    });
    updateProgressVisibility();
}

// Mentor code toggle confirmation
const mentorToggle = document.getElementById('toggleMentorCode');
if (mentorToggle) {
    let lastMentorChecked = mentorToggle.checked;
    mentorToggle.addEventListener('change', async (e) => {
        if (!mentorToggle.checked) {
            const confirmed = confirm('Are you sure you want to disable Mentor Access? Your mentor will no longer be able to view your progress.');
            if (!confirmed) {
                mentorToggle.checked = true;
                return;
            }
        }
        lastMentorChecked = mentorToggle.checked;
    });
}
// Regenerate code confirmation
const regenBtn = document.getElementById('regenerateMentorCodeBtn');
if (regenBtn) {
    regenBtn.addEventListener('click', async (e) => {
        const confirmed = confirm('Are you sure you want to regenerate your mentor code? Your old code will no longer work.');
        if (!confirmed) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        // If you have a handler for regeneration, let it proceed
    }, true);
}
// --- SEARCH FEATURE ---
const searchInput = document.getElementById('searchInput');

if (searchInput) {
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        filterVocabulary(query);
        filterSkills(query);
        filterPortfolio(query); // Add this line to include portfolio titles in search
    });
}

function filterVocabulary(query) {
    if (!query) {
        renderVocabularyList();
        return;
    }
    const filtered = vocabularyList.filter(item =>
        item.word.toLowerCase().includes(query) ||
        (item.category && item.category.toLowerCase().includes(query))
    );
    // Group by category for display
    const grouped = categories.reduce((acc, category) => {
        acc[category] = filtered.filter(item => item.category === category);
        return acc;
    }, {});
    // If no results at all, show a single message
    const totalResults = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
    if (totalResults === 0) {
        vocabularyListEl.innerHTML = '<p class="text-sm text-gray-500">No vocabulary results found.</p>';
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
}

function filterSkills(query) {
    if (!query) {
        renderSkillsList();
        return;
    }
    skillsList.innerHTML = skills.filter(skill =>
        skill.name.toLowerCase().includes(query)
    ).map(skill => `
        <div class="skill-item flex items-center justify-between p-2 border rounded mb-2" data-id="${skill.id}">
            <div class="font-medium">${skill.name}</div>
            <div class="flex items-center gap-2">
                <button class="status-button p-1 rounded-full hover:bg-gray-100 transition-transform progress-button">${statusIcons[skill.status]}</button>
                <button class="delete-button p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-all">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </button>
            </div>
        </div>
    `).join('') || '<p class="text-sm text-gray-500">No skills found.</p>';
}

function filterPortfolio(query) {
    if (!query) {
        renderPortfolio();
        return;
    }
    const lowerQuery = query.toLowerCase();
    // Only filter by title, not by link
    const filtered = portfolioEntries.filter(item =>
        item.title && item.title.toLowerCase().includes(lowerQuery)
    );
    // Split into top3 and rest as in renderPortfolio
    const top3 = filtered.filter(e => e.isTop).slice(0, 3);
    const rest = filtered.filter(e => !e.isTop);
    const topCount = top3.length;
    portfolioTop3.innerHTML = top3.length > 0 ? top3.map(e => {
        let embedHtml = '';
        if (e.type === 'youtube' || (!e.type && getYouTubeId(e.link))) {
            let videoId = getYouTubeId(e.link) || e.videoId;
            if (videoId) {
                embedHtml = `<iframe class="w-full h-48 rounded" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
            } else {
                embedHtml = `<a href="${e.link}" target="_blank" class="text-blue-600 text-xs hover:underline">${e.link}</a>`;
            }
        } else if (e.type === 'soundcloud') {
            embedHtml = `<iframe class="w-full h-48 rounded" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(e.link)}&color=%230066cc&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>`;
        } else {
            embedHtml = `<a href="${e.link}" target="_blank" class="text-blue-600 text-xs hover:underline">${e.link}</a>`;
        }
        return (
            `<div class=\"flex flex-col items-center bg-gray-50 rounded p-2 border relative\">` +
            `<div class=\"w-full aspect-w-16 aspect-h-9 mb-2\">` +
            embedHtml +
            `</div>` +
            `<div class=\"font-semibold text-center mb-1\">${e.title}</div>` +
            `<div class=\"flex gap-2\">` +
            `<button class=\"feature-button px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300\" data-action=\"toggleTop\" data-id=\"${e.id}\">Unfeature</button>` +
            `<button class=\"delete-button px-2 py-1 text-xs text-red-600 bg-gray-100 rounded hover:bg-red-100\" data-action=\"delete\" data-id=\"${e.id}\">Delete</button>` +
            `</div>` +
            `</div>`
        );
    }).join('') : '<div class="text-gray-400 col-span-3">No top portfolio entries selected.</div>';
    if (rest.length > 0) {
        portfolioList.innerHTML = rest.map(e => `
            <div class="flex items-center justify-between p-2 border rounded">
                <div class="flex flex-col">
                    <span class="font-medium">${e.title}</span>
                    <a href="${e.link}" target="_blank" class="text-blue-600 text-xs hover:underline">${e.link}</a>
                </div>
                <div class="flex gap-2">
                    <button class="feature-button px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 ${topCount >= 3 ? 'opacity-50 cursor-not-allowed' : ''}" data-action="toggleTop" data-id="${e.id}" ${topCount >= 3 ? 'disabled title=\"You can only feature 3 items\"' : ''}>Feature</button>
                    <button class="delete-button px-2 py-1 text-xs text-red-600 bg-gray-100 rounded hover:bg-red-100" data-action="delete" data-id="${e.id}">Delete</button>
                </div>
            </div>
        `).join('');
    } else {
        portfolioList.innerHTML = '<div class="text-sm text-gray-500">No portfolio results found.</div>';
    }
}

// --- PORTFOLIO TAB LOGIC ---
const portfolioForm = document.getElementById('portfolioForm');
const portfolioTitle = document.getElementById('portfolioTitle');
const portfolioLink = document.getElementById('portfolioLink');
const portfolioTop3 = document.getElementById('portfolioTop3');
const portfolioList = document.getElementById('portfolioList');

// Helper: Extract YouTube video ID (robust for all YouTube URLs)
function getYouTubeId(url) {
    // Handles: youtu.be, youtube.com/watch?v=, youtube.com/embed/, youtube.com/v/, youtube.com/shorts/
    const regex = /(?:youtube(?:-nocookie)?\.com\/(?:.*[?&]v=|(?:v|embed|shorts)\/)|youtu\.be\/)([\w-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}
// Helper: Extract SoundCloud track URL (basic validation)
function isSoundCloudUrl(url) {
    return /^https?:\/\/(soundcloud\.com|snd\.sc)\//.test(url);
}
// Helper: Get portfolio type
function getPortfolioType(url) {
    if (getYouTubeId(url)) return 'youtube';
    if (isSoundCloudUrl(url)) return 'soundcloud';
    return null;
}

// Load portfolio entries from Firestore
async function loadPortfolio() {
    if (!currentUser) return;
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('portfolio').orderBy('dateAdded').get();
    portfolioEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderPortfolio();
}

// Save a new portfolio entry
async function addPortfolioEntry(e) {
    e.preventDefault();
    const title = portfolioTitle.value.trim();
    const link = portfolioLink.value.trim();
    if (!title || !link) return;
    const type = getPortfolioType(link);
    if (!type) {
        alert('Please enter a valid YouTube or SoundCloud link.');
        return;
    }
    let videoId = null;
    if (type === 'youtube') videoId = getYouTubeId(link);
    await db.collection('users').doc(currentUser.uid).collection('portfolio').add({
        title,
        link,
        type,
        videoId,
        isTop: false,
        dateAdded: firebase.firestore.FieldValue.serverTimestamp()
    });
    portfolioTitle.value = '';
    portfolioLink.value = '';
    await loadPortfolio();
}

// Delete a portfolio entry
async function deletePortfolioEntry(id) {
    if (!confirm('Delete this portfolio entry?')) return;
    await db.collection('users').doc(currentUser.uid).collection('portfolio').doc(id).delete();
    await loadPortfolio();
}

// Toggle top 3 selection
async function toggleTopPortfolio(id) {
    // Count current top 3
    const topCount = portfolioEntries.filter(e => e.isTop).length;
    const entry = portfolioEntries.find(e => e.id === id);
    if (!entry) return;
    if (!entry.isTop && topCount >= 3) {
        alert('You can only select up to 3 top portfolio entries.');
        return;
    }
    await db.collection('users').doc(currentUser.uid).collection('portfolio').doc(id).update({ isTop: !entry.isTop });
    await loadPortfolio();
}

// Render portfolio UI
function renderPortfolio() {
    if (!portfolioTop3 || !portfolioList) return;
    const top3 = portfolioEntries.filter(e => e.isTop).slice(0, 3);
    const rest = portfolioEntries.filter(e => !e.isTop);
    const topCount = top3.length;
    portfolioTop3.innerHTML = top3.length > 0 ? top3.map(e => {
        let embedHtml = '';
        if (e.type === 'youtube' || (!e.type && getYouTubeId(e.link))) {
            let videoId = getYouTubeId(e.link) || e.videoId;
            if (videoId) {
                embedHtml = `<iframe class="w-full h-48 rounded" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
            } else {
                embedHtml = `<a href="${e.link}" target="_blank" class="text-blue-600 text-xs hover:underline">${e.link}</a>`;
            }
        } else if (e.type === 'soundcloud') {
            embedHtml = `<iframe class="w-full h-48 rounded" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(e.link)}&color=%230066cc&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>`;
        } else {
            embedHtml = `<a href="${e.link}" target="_blank" class="text-blue-600 text-xs hover:underline">${e.link}</a>`;
        }
        return (
            `<div class=\"flex flex-col items-center bg-gray-50 rounded p-2 border relative\">` +
            `<div class=\"w-full aspect-w-16 aspect-h-9 mb-2\">` +
            embedHtml +
            `</div>` +
            `<div class=\"font-semibold text-center mb-1\">${e.title}</div>` +
            `<div class=\"flex gap-2\">` +
            `<button class=\"feature-button px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300\" data-action=\"toggleTop\" data-id=\"${e.id}\">Unfeature</button>` +
            `<button class=\"delete-button px-2 py-1 text-xs text-red-600 bg-gray-100 rounded hover:bg-red-100\" data-action=\"delete\" data-id=\"${e.id}\">Delete</button>` +
            `</div>` +
            `</div>`
        );
    }).join('') : '<div class="text-gray-400 col-span-3">No top portfolio entries selected.</div>';
    portfolioList.innerHTML = rest.length > 0 ? rest.map(e => `
        <div class="flex items-center justify-between p-2 border rounded">
            <div class="flex flex-col">
                <span class="font-medium">${e.title}</span>
                <a href="${e.link}" target="_blank" class="text-blue-600 text-xs hover:underline">${e.link}</a>
            </div>
            <div class="flex gap-2">
                <button class="feature-button px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 ${topCount >= 3 ? 'opacity-50 cursor-not-allowed' : ''}" data-action="toggleTop" data-id="${e.id}" ${topCount >= 3 ? 'disabled title=\"You can only feature 3 items\"' : ''}>Feature</button>
                <button class="delete-button px-2 py-1 text-xs text-red-600 bg-gray-100 rounded hover:bg-red-100" data-action="delete" data-id="${e.id}">Delete</button>
            </div>
        </div>
    `).join('') : (portfolioEntries.length === 0 ? '<div class="text-gray-400">No portfolio entries yet.</div>' : '');
}

// Portfolio form submit
if (portfolioForm) portfolioForm.addEventListener('submit', addPortfolioEntry);
// Portfolio actions (feature/unfeature/delete)
if (portfolioTop3) portfolioTop3.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    if (btn.getAttribute('data-action') === 'toggleTop') toggleTopPortfolio(id);
    if (btn.getAttribute('data-action') === 'delete') deletePortfolioEntry(id);
});
if (portfolioList) portfolioList.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    if (btn.getAttribute('data-action') === 'toggleTop') toggleTopPortfolio(id);
    if (btn.getAttribute('data-action') === 'delete') deletePortfolioEntry(id);
});

// Load portfolio after user data
auth.onAuthStateChanged(user => {
    if (user) {
        loadPortfolio();
    }
});

// Mentor View Form Logic
const mentorViewForm = document.getElementById('mentorViewForm');
if (mentorViewForm) {
    mentorViewForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const codeInput = document.getElementById('mentorCodeInput');
        const errorDiv = document.getElementById('mentorViewError');
        const code = codeInput.value.trim().toUpperCase();
        if (!/^[A-Z0-9]{5}$/.test(code)) {
            errorDiv.textContent = 'Please enter a valid 5-digit code.';
            errorDiv.classList.remove('hidden');
            return;
        }
        // Check Firestore for code validity before redirecting
        errorDiv.classList.add('hidden');
        try {
            const doc = await db.collection('mentorCodes').doc(code).get();
            if (!doc.exists) {
                errorDiv.textContent = 'Invalid mentor code.';
                errorDiv.classList.remove('hidden');
                return;
            }
            // Valid code, redirect
            window.location.href = window.location.pathname + '?mentor=' + code;
        } catch (err) {
            errorDiv.textContent = 'Error checking code. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    });
}

// Change Email functionality
const changeEmailBtn = document.getElementById('changeEmailBtn');
const changeEmailInput = document.getElementById('changeEmailInput');
const changeEmailMsg = document.getElementById('changeEmailMsg');
if (changeEmailBtn && changeEmailInput && changeEmailMsg) {
    changeEmailBtn.addEventListener('click', async () => {
        if (!currentUser) return;
        const newEmail = changeEmailInput.value.trim();
        changeEmailMsg.textContent = '';
        if (!newEmail) {
            changeEmailMsg.textContent = 'Please enter an email address.';
            changeEmailMsg.className = 'text-sm mt-2 text-red-600';
            return;
        }
        if (newEmail === currentUser.email) {
            changeEmailMsg.textContent = 'You entered your current email. Please enter a different email address.';
            changeEmailMsg.className = 'text-sm mt-2 text-red-600';
            return;
        }
        try {
            await currentUser.verifyBeforeUpdateEmail(newEmail);
            changeEmailMsg.textContent = 'A verification link has been sent to your new email address. Please check your inbox and click the link to complete the email change.';
            changeEmailMsg.className = 'text-sm mt-2 text-blue-600';
        } catch (error) {
            let msg = 'Error: ' + (error.message || error);
            if (error.code) msg += ` (code: ${error.code})`;
            if (error.code === 'auth/requires-recent-login') {
                msg = 'Please log out and log in again, then try changing your email.';
            } else if (error.code === 'auth/email-already-in-use') {
                msg = 'This email is already in use by another account.';
            } else if (error.code === 'auth/invalid-email') {
                msg = 'The email address is not valid.';
            } else if (error.code === 'auth/operation-not-allowed') {
                msg = 'Email change is not allowed. Check your Firebase Authentication settings.';
            }
            changeEmailMsg.textContent = msg;
            changeEmailMsg.className = 'text-sm mt-2 text-red-600';
        }
    });
}

// Toggle between Change Email and Reset Password sections
const toggleChangeEmail = document.getElementById("toggleChangeEmail");
const toggleResetPassword = document.getElementById("toggleResetPassword");
const changeEmailSection = document.getElementById("changeEmailSection");
const resetPasswordSection = document.getElementById("resetPasswordSection");

// Event listeners for toggling
if (toggleChangeEmail && toggleResetPassword && changeEmailSection && resetPasswordSection) {
    toggleChangeEmail.addEventListener("click", () => {
        changeEmailSection.classList.remove("hidden");
        resetPasswordSection.classList.add("hidden");
    });

    toggleResetPassword.addEventListener("click", () => {
        resetPasswordSection.classList.remove("hidden");
        changeEmailSection.classList.add("hidden");
    });
}

// Disable translation input box for mentor mode
if (window.isMentorView) {
    translationInput.disabled = true;
}

// Disable mentor code input and button for mentor mode
if (window.isMentorView) {
    const mentorCodeInput = document.getElementById('mentorCodeInput');
    const viewAsMentorBtn = document.querySelector('#mentorViewForm button[type="submit"]');
    if (mentorCodeInput) mentorCodeInput.disabled = true;
    if (viewAsMentorBtn) viewAsMentorBtn.disabled = true;
}

// Logic to toggle Google Sign-In
const toggleGoogleSignIn = document.getElementById('toggleGoogleSignIn');
if (toggleGoogleSignIn) {
    toggleGoogleSignIn.addEventListener('change', (event) => {
        const isEnabled = event.target.checked;
        if (isEnabled) {
            console.log('Google Sign-In enabled');
            // Add logic to enable Google Sign-In
        } else {
            console.log('Google Sign-In disabled');
            // Add logic to disable Google Sign-In
        }
    });
}

// Logic to link or unlink Google Sign-In
const googleSignInToggleBtn = document.getElementById('googleSignInToggleBtn');
if (googleSignInToggleBtn) {
    googleSignInToggleBtn.addEventListener('click', async () => {
        const user = auth.currentUser;

        const providerData = user.providerData;
        const googleProvider = providerData.find(provider => provider.providerId === 'google.com');

        if (googleProvider) {
            // Unlink Google Sign-In
            try {
                await user.unlink('google.com');

                googleSignInToggleBtn.textContent = 'Link Google Sign-In';
                console.log('Google Sign-In unlinked');
            } catch (error) {
                console.error('Error unlinking Google Sign-In:', error);
            }
        } else {
            // Link Google Sign-In
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                await user.linkWithPopup(provider);
                googleSignInToggleBtn.textContent = 'Unlink Google Sign-In';
                console.log('Google Sign-In linked');
            } catch (error) {
                console.error('Error linking Google Sign-In:', error);
            }
        }
    });
}

// Update button text based on Google Sign-In status
const updateGoogleSignInButton = async () => {

    const providerData = user.providerData;
    const googleProvider = providerData.find(provider => provider.providerId === 'google.com');

    if (googleProvider) {
        googleSignInToggleBtn.textContent = 'Unlink Google Sign-In';
    } else {
        googleSignInToggleBtn.textContent = 'Link Google Sign-In';
    }
};

// Ensure user is initialized before updating the button
firebase.auth().onAuthStateChanged((authUser) => {
    if (authUser) {
        const user = authUser; // Assign the authenticated user

        // Update button text based on Google Sign-In status
        const updateGoogleSignInButton = async () => {
            const providerData = user.providerData;
            const googleProvider = providerData.find(provider => provider.providerId === 'google.com');

            if (googleProvider) {
                googleSignInToggleBtn.textContent = 'Unlink Google Sign-In';
            } else {
                googleSignInToggleBtn.textContent = 'Link Google Sign-In';
            }
        };

        if (googleSignInToggleBtn) {
            updateGoogleSignInButton();
        }
    }
});

// Add language selection dropdown logic
if (languageSelect) {
    languageSelect.addEventListener('change', async (e) => {
        const selectedLanguage = e.target.value;
        if (!currentUser) return;

        try {
            // Save selected language to Firebase
            await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').set({
                languageLearning: selectedLanguage
            }, { merge: true });

            // Fetch and display links for the selected language
            const linksSnapshot = await db.collection('languageLinks').doc(selectedLanguage).get();
            if (linksSnapshot.exists) {
                const links = linksSnapshot.data().links;
                languageLinksContainer.innerHTML = links.map(link => `
                    <a href="${link.url}" target="_blank" class="text-blue-600 hover:underline">${link.name}</a>
                `).join('<br>');
            } else {
                languageLinksContainer.innerHTML = '<p class="text-sm text-gray-500">No links available for this language.</p>';
            }
        } catch (error) {
            console.error('Error updating language or fetching links:', error);
        }
    });
}

// Update logic to restore user's language selection
auth.onAuthStateChanged(async (user) => {
    if (!user) return;

    try {
        // Fetch user's language from Firestore
        const settingsDoc = await db.collection('users').doc(user.uid).collection('metadata').doc('settings').get();
        if (settingsDoc.exists) {
            const userData = settingsDoc.data();
            if (userData.languageLearning) {
                const languageSelect = document.getElementById('languageSelect');
                const languageLinksContainer = document.getElementById('languageLinksContainer');

                if (languageSelect) {
                    languageSelect.value = userData.languageLearning;

                    // Trigger change event to load links
                    const event = new Event('change');
                    languageSelect.dispatchEvent(event);
                }

                if (languageLinksContainer) {
                    // Fetch and display links for the selected language
                    const linksSnapshot = await db.collection('languageLinks').doc(userData.languageLearning).get();
                    if (linksSnapshot.exists) {
                        const links = linksSnapshot.data().links;
                        languageLinksContainer.innerHTML = links.map(link => `
                            <a href="${link.url}" target="_blank" class="text-blue-600 hover:underline">${link.name}</a>
                        `).join('<br>');
                    } else {
                        languageLinksContainer.innerHTML = '<p class="text-sm text-gray-500">No links available for this language.</p>';
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error restoring user language and links:', error);
    }
});


// Update category select options
function updateCategorySelect() {
    const currentSelection = categorySelect.value; // Store current selection

    // Ensure 'General' is always first if it exists
    const generalIndex = categories.indexOf('General');
    if (generalIndex > 0) {
        categories.splice(generalIndex, 1);
        categories.unshift('General');
    } else if (generalIndex === -1) {
        categories.unshift('General'); // Add if missing entirely
    }

    categorySelect.innerHTML = categories

        .map(cat => `<option value="${cat}">${cat}</option>`)
        .join('') + '<option value="new">+ New Category</option>';

    // Restore selection or default to 'General'
    if (categories.includes(currentSelection) && currentSelection !== 'new') {
        categorySelect.value = currentSelection;
    } else {
        categorySelect.value = 'General'; // Default if previous selection was deleted or invalid
    }

    // Update delete button state after options are rebuilt
    const protectedCategories = ['General'];
    if (categorySelect.value === 'new' || protectedCategories.includes(categorySelect.value)) {
        deleteCategoryBtn.disabled = true;
    } else {
        deleteCategoryBtn.disabled = false;
    }
}


// Status Icons HTML (no changes needed)
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

document.addEventListener('DOMContentLoaded', () => {
    // Tab switching logic for blue active tab
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            tabButtons.forEach(b => {
                b.classList.remove('active', 'bg-blue-500', 'text-white');
                b.classList.add('bg-gray-200', 'text-gray-700');
            });
            this.classList.add('active', 'bg-blue-500', 'text-white');
            this.classList.remove('bg-gray-200', 'text-gray-700');
        });
    });
});