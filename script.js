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

// Constants
const PROGRESS_STATUS = {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    MASTERED: 'mastered'
};

// State variables
let vocabularyList = [];
let skills = [];
let categories = [];
let currentUser = null;

// DOM Elements
const categorySelect = document.getElementById('categorySelect');
const newCategoryInput = document.getElementById('newCategoryInput');
const newCategoryName = document.getElementById('newCategoryName');
const vocabularyInput = document.getElementById('vocabularyInput');
const skillsInput = document.getElementById('skillsInput');
const vocabularyListEl = document.getElementById('vocabularyList');
const skillsList = document.getElementById('skillsList');

// Firebase Authentication Logic
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        userEmail.textContent = `Logged in as: ${user.email}`;
        await loadUserData();
    } else {
        window.location.href = 'login.html';
    }
});

// Load user data from Firestore
async function loadUserData() {
    try {
        // Load categories
        const categoriesDoc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('categories').get();
        categories = categoriesDoc.exists ? categoriesDoc.data().list : ['General', 'Food', 'Jobs', 'Family'];

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
        updateCategorySelect();
        renderVocabularyList();
        renderSkillsList();
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

// Save categories to Firestore
async function saveCategories() {
    try {
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
                category: categorySelect.value,
                status: PROGRESS_STATUS.NOT_STARTED,
                dateAdded: firebase.firestore.FieldValue.serverTimestamp()
            }));

            for (const item of newItems) {
                const newDocRef = vocabRef.doc();
                batch.set(newDocRef, item);
            }

            await batch.commit();
            vocabularyInput.value = '';
            await loadUserData();
        } catch (error) {
            console.error("Error adding vocabulary:", error);
        }
    }
}

// Add skills
async function addSkills() {
    const skillsList = skillsInput.value.trim().split('\n').filter(skill => skill.trim());
    if (skillsList.length > 0) {
        try {
            const batch = db.batch();
            const skillsRef = db.collection('users').doc(currentUser.uid).collection('skills');

            const newItems = skillsList.map(skill => ({
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
            await loadUserData();
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
            await loadUserData();
        }
    } catch (error) {
        console.error("Error updating status:", error);
    }
}

// Delete item
async function deleteItem(id, isVocab) {
    try {
        const collection = isVocab ? 'vocabulary' : 'skills';
        await db.collection('users').doc(currentUser.uid).collection(collection).doc(id).delete();
        await loadUserData();
    } catch (error) {
        console.error("Error deleting item:", error);
    }
}

// Event Listeners
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
        if (e.target.value === 'new') {
            newCategoryInput.classList.remove('hidden');
        } else {
            newCategoryInput.classList.add('hidden');
        }
    });

    // Add new category
    document.getElementById('addCategoryBtn').addEventListener('click', async () => {
        const newCategory = newCategoryName.value.trim();
        if (newCategory && !categories.includes(newCategory)) {
            categories.push(newCategory);
            await saveCategories();
            updateCategorySelect();
            categorySelect.value = newCategory;
            newCategoryInput.classList.add('hidden');
            newCategoryName.value = '';
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
            deleteItem(itemId, true);
        }
    });

    skillsList.addEventListener('click', (e) => {
        const statusButton = e.target.closest('.status-button');
        const deleteButton = e.target.closest('.delete-button');
        const itemId = e.target.closest('.skill-item')?.dataset.id;

        if (statusButton && itemId) {
            updateStatus(itemId, false);
        } else if (deleteButton && itemId) {
            deleteItem(itemId, false);
        }
    });
});

// Update category select options
function updateCategorySelect() {
    categorySelect.innerHTML = categories
        .map(cat => `<option value="${cat}">${cat}</option>`)
        .join('') + '<option value="new">+ New Category</option>';
}

// Status Icons HTML
const statusIcons = {
     [PROGRESS_STATUS.NOT_STARTED]: `<svg class="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/>
        </svg>`,

    [PROGRESS_STATUS.IN_PROGRESS]: `<svg class="w-5 h-5 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><path d="M12 6v6l4 4" stroke-width="2"/>
        </svg>`,

    [PROGRESS_STATUS.MASTERED]: `<svg class="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-width="2"/><path d="M22 4L12 14.01l-3-3" stroke-width="2"/>
        </svg>`
};

// Render functions remain largely the same, just using the new data structure
function renderVocabularyList() {
    const expandedCategories = new Set(
        Array.from(document.querySelectorAll('.category-content'))
        .filter(content => content.classList.contains('expanded'))
        .map(content => content.closest('.mb-4').querySelector('.category-header').textContent.trim().split(' (')[0])
    );

    const groupedVocab = categories.reduce((acc, category) => {
        acc[category] = vocabularyList.filter(item => item.category === category);
        return acc;
    }, {});

    vocabularyListEl.innerHTML = Object.entries(groupedVocab)
        .filter(([_, items]) => items.length > 0)
        .map(([category, items]) => {
            const isExpanded = expandedCategories.has(category);
            return `
                <div class="mb-4">
                    <div class="flex items-center justify-between p-2 bg-gray-100 rounded cursor-pointer category-header">
                        <h3 class="font-bold">${category} (${items.length})</h3>
                        <svg class="w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}" 
                             viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </div>
                    <div class="category-content space-y-2 mt-2 ml-2 ${isExpanded ? 'expanded' : ''}">
                        ${items.map(item => renderVocabItem(item)).join('')}
                    </div>
                </div>
            `;
        }).join('');

    document.querySelectorAll('.category-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            content.classList.toggle('expanded');
            const arrow = header.querySelector('svg');
            arrow.style.transform = content.classList.contains('expanded') ? 'rotate(180deg)' : '';
        });
    });
}

function renderSkillsList() {
    skillsList.innerHTML = skills
        .map(skill => `
            <div class="skill-item flex items-center justify-between p-2 border rounded" data-id="${skill.id}">
                <div class="font-medium">${skill.name}</div>
                <div class="flex items-center gap-2">
                    <button class="status-button p-2 rounded-full hover:bg-gray-100">
                        ${statusIcons[skill.status]}
                    </button>
                    <button class="delete-button p-2 text-red-500 hover:bg-red-50 rounded-full">
                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
}

function renderVocabItem(item) {
    return `
        <div class="vocab-item flex items-center justify-between p-2 border rounded" data-id="${item.id}">
            <div class="font-medium">${item.word}</div>
            <div class="flex items-center gap-2">
                <button class="status-button p-2 rounded-full hover:bg-gray-100">
                    ${statusIcons[item.status]}
                </button>
                <button class="delete-button p-2 text-red-500 hover:bg-red-50 rounded-full">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}
