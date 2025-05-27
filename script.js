// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB8B5Saw8kArUOIL_m5NHFWDQwplR8HF_c", // Replace with your actual config if necessary
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
        icon: '🏅',
        check: () => vocabularyList.length >= 1
    },
    {
        id: 'ten_words',
        name: '10 Words Added',
        description: 'Add 10 vocabulary words.',
        icon: '🎖️',
        check: () => vocabularyList.length >= 10
    },
    {
        id: 'fifty_words',
        name: '50 Words Added',
        description: 'Add 50 vocabulary words.',
        icon: '🥉',
        check: () => vocabularyList.length >= 50
    },
    {
        id: 'ten_mastered',
        name: '10 Words Mastered',
        description: 'Master 10 vocabulary words.',
        icon: '🥇',
        check: () => vocabularyList.filter(w => w.status === PROGRESS_STATUS.MASTERED).length >= 10
    },
    {
        id: 'fifty_mastered',
        name: '50 Words Mastered',
        description: 'Master 50 vocabulary words.',
        icon: '🏆',
        check: () => vocabularyList.filter(w => w.status === PROGRESS_STATUS.MASTERED).length >= 50
    },
    {
        id: 'first_skill',
        name: 'First Skill Added',
        description: 'Add your first skill.',
        icon: '🏆',
        check: () => skills.length >= 1
    },
    {
        id: 'five_skills',
        name: '5 Skills Added',
        description: 'Add 5 skills.',
        icon: '🥈',
        check: () => skills.length >= 5
    },
    {
        id: 'ten_skills',
        name: '10 Skills Added',
        description: 'Add 10 skills.',
        icon: '🎯',
        check: () => skills.length >= 10
    },
    {
        id: 'all_categories',
        name: 'Explorer',
        description: 'Add vocabulary to 3 or more categories.',
        icon: '🌎',
        check: () => {
            const usedCategories = new Set(vocabularyList.map(w => w.category));
            return usedCategories.size >= 3;
        }
    }
];

// State variables
let vocabularyList = [];
let skills = [];
let categories = [];
let currentUser = null;
let earnedBadges = [];

// DOM Elements
const categorySelect = document.getElementById('categorySelect');
const newCategoryInput = document.getElementById('newCategoryInput');
const newCategoryName = document.getElementById('newCategoryName');
const vocabularyInput = document.getElementById('vocabularyInput');
const skillsInput = document.getElementById('skillsInput');
const vocabularyListEl = document.getElementById('vocabularyList');
const skillsList = document.getElementById('skillsList');
const deleteCategoryBtn = document.getElementById('deleteCategoryBtn');

// Firebase Authentication Logic
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        userEmail.textContent = `Logged in as: ${user.email}`;
        await loadUserData();
        await updateAchievementsVisibility();
    } else {
        window.location.href = 'login.html';
    }
});

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
        renderProgressMetrics(); // <<< ADDED: Render progress metrics after data load
    } catch (error) {
        console.error("Error loading data:", error);
    }
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
    if (!currentUser) return true; // Default ON
    try {
        const doc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').get();
        if (doc.exists && typeof doc.data().progressEnabled === 'boolean') {
            return doc.data().progressEnabled;
        }
    } catch (e) { }
    return true;
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
        renderProgressMetrics();
        await updateProgressVisibility();
    } catch (error) {
        console.error("Error loading data:", error);
    }
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

// Render skills list (no changes needed here)
function renderSkillsList() {
    skillsList.innerHTML = skills.length > 0 ? skills
        .map(skill => `
            <div class="skill-item flex items-center justify-between p-2 border rounded mb-2" data-id="${skill.id}"> <div class="font-medium">${skill.name}</div>
                <div class="flex items-center gap-2">
                    <button class="status-button p-1 rounded-full hover:bg-gray-100 transition-transform progress-button"> ${statusIcons[skill.status]}
                    </button>
                    <button class="delete-button p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-all"> <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('') : '<p class="text-sm text-gray-500">No skills added yet.</p>'; // Message if empty
}

// Render individual vocabulary item (no changes needed here)
function renderVocabItem(item) {
    return `
        <div class="vocab-item flex items-center justify-between p-2 border rounded mb-2" data-id="${item.id}"> <div class="font-medium">${item.word}</div>
            <div class="flex items-center gap-2">
                 <button class="status-button p-1 rounded-full hover:bg-gray-100 transition-transform progress-button"> ${statusIcons[item.status]}
                </button>
                <button class="delete-button p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-all"> <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
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
    if (words.length > 0) {
        try {
            const batch = db.batch();
            const vocabRef = db.collection('users').doc(currentUser.uid).collection('vocabulary');

            const newItems = words.map(word => ({
                word: word.trim(),
                category: categorySelect.value === 'new' ? 'General' : categorySelect.value, // Default to General if 'new' somehow selected
                status: PROGRESS_STATUS.NOT_STARTED,
                dateAdded: firebase.firestore.FieldValue.serverTimestamp()
            }));

            for (const item of newItems) {
                const newDocRef = vocabRef.doc();
                batch.set(newDocRef, item);
            }

            await batch.commit();
            vocabularyInput.value = '';
            await loadUserData(); // Reload data to show new items
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

// --- Delete Category Function (no changes needed here) ---
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
}

// Patch showToast to respect achievements toggle (now async-aware)
const _showToast = showToast;
showToast = async function (message) {
    if (window.achievementsEnabledCache === undefined) {
        window.achievementsEnabledCache = await getAchievementsEnabled();
    }
    if (window.achievementsEnabledCache) _showToast(message);
};

document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('bg-gray-200', 'text-gray-700');
            });

            document.getElementById(button.dataset.tab).classList.add('active');
            button.classList.remove('bg-gray-200', 'text-gray-700');
            button.classList.add('bg-blue-500', 'text-white');
        });
    });

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
    vocabularyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
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

    // --- SEARCH FEATURE ---
    const searchInput = document.getElementById('searchInput');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim().toLowerCase();
            filterVocabulary(query);
            filterSkills(query);
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
                        </svg>
                    </button>
                </div>
            </div>
        `).join('') || '<p class="text-sm text-gray-500">No skills found.</p>';
    }
});

// Update category select options (no changes needed here)
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