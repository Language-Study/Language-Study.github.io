// Firebase Auth State Observer
const auth = firebase.auth();

auth.onAuthStateChanged((user) => {
    if (user) {
        // Update user email display
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.textContent = user.email;
        }
    } else {
        window.location.href = 'login.html';
    }
});

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            window.location.href = 'login.html';
        })
        .catch((error) => {
            console.error('Error signing out:', error);
        });
});

// Constants and initial state
const PROGRESS_STATUS = {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    MASTERED: 'mastered'
};

// Initialize data from localStorage
let vocabularyList = JSON.parse(localStorage.getItem('vocabularyList')) || [];
let skills = JSON.parse(localStorage.getItem('skills')) || [];
let categories = JSON.parse(localStorage.getItem('categories')) || ['General', 'Food', 'Jobs', 'Family'];

// DOM Elements
const categorySelect = document.getElementById('categorySelect');
const newCategoryInput = document.getElementById('newCategoryInput');
const newCategoryName = document.getElementById('newCategoryName');
const vocabularyInput = document.getElementById('vocabularyInput');
const skillsInput = document.getElementById('skillsInput');
const vocabularyListEl = document.getElementById('vocabularyList');
const skillsList = document.getElementById('skillsList');

// Save data to localStorage
function saveData() {
    localStorage.setItem('vocabularyList', JSON.stringify(vocabularyList));
    localStorage.setItem('skills', JSON.stringify(skills));
    localStorage.setItem('categories', JSON.stringify(categories));
}

// Update category select options
function updateCategorySelect() {
    categorySelect.innerHTML = categories
        .map(cat => `<option value="${cat}">${cat}</option>`)
        .join('') + '<option value="new">+ New Category</option>';
}

// Status Icons HTML
const statusIcons = {
    [PROGRESS_STATUS.NOT_STARTED]: `
        <svg class="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" stroke-width="2"/>
        </svg>
    `,
    [PROGRESS_STATUS.IN_PROGRESS]: `
        <svg class="w-5 h-5 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" stroke-width="2"/>
            <path d="M12 6v6l4 4" stroke-width="2"/>
        </svg>
    `,
    [PROGRESS_STATUS.MASTERED]: `
        <svg class="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-width="2"/>
            <path d="M22 4L12 14.01l-3-3" stroke-width="2"/>
        </svg>
    `
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize displays
    updateCategorySelect();
    renderVocabularyList();
    renderSkillsList();

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
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        const newCategory = newCategoryName.value.trim();
        if (newCategory && !categories.includes(newCategory)) {
            categories.push(newCategory);
            updateCategorySelect();
            categorySelect.value = newCategory;
            newCategoryInput.classList.add('hidden');
            newCategoryName.value = '';
            saveData();
        }
    });

    // Cancel new category
    document.getElementById('cancelCategoryBtn').addEventListener('click', () => {
        newCategoryInput.classList.add('hidden');
        newCategoryName.value = '';
        categorySelect.value = categories[0];
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

// Add vocabulary words
function addVocabularyWords() {
    const words = vocabularyInput.value.trim().split('\n').filter(word => word.trim());
    if (words.length > 0) {
        const newItems = words.map(word => ({
            id: Date.now() + Math.random(),
            word: word.trim(),
            category: categorySelect.value,
            status: PROGRESS_STATUS.NOT_STARTED,
            dateAdded: new Date().toISOString()
        }));

        vocabularyList = [...vocabularyList, ...newItems];
        vocabularyInput.value = '';
        renderVocabularyList();
        saveData();
    }
}

// Add skills
function addSkills() {
    const skillsList = skillsInput.value.trim().split('\n').filter(skill => skill.trim());
    if (skillsList.length > 0) {
        const newItems = skillsList.map(skill => ({
            id: Date.now() + Math.random(),
            name: skill.trim(),
            status: PROGRESS_STATUS.NOT_STARTED,
            dateAdded: new Date().toISOString()
        }));

        skills = [...skills, ...newItems];
        skillsInput.value = '';
        renderSkillsList();
        saveData();
    }
}

// Update item status
function updateStatus(id, isVocab) {
    const list = isVocab ? vocabularyList : skills;
    const item = list.find(item => item.id === Number(id) || item.id === id);
    
    if (item) {
        const statusOrder = [PROGRESS_STATUS.NOT_STARTED, PROGRESS_STATUS.IN_PROGRESS, PROGRESS_STATUS.MASTERED];
        const currentIndex = statusOrder.indexOf(item.status);
        item.status = statusOrder[(currentIndex + 1) % statusOrder.length];
        
        if (isVocab) {
            vocabularyList = [...list];
            renderVocabularyList();
        } else {
            skills = [...list];
            renderSkillsList();
        }
        saveData();
    }
}

// Delete item
function deleteItem(id, isVocab) {
    if (isVocab) {
        vocabularyList = vocabularyList.filter(item => item.id !== Number(id) && item.id !== id);
        renderVocabularyList();
    } else {
        skills = skills.filter(item => item.id !== Number(id) && item.id !== id);
        renderSkillsList();
    }
    saveData();
}

// Render vocabulary list
function renderVocabularyList() {
    // Store expanded categories before re-render
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

    // Re-add event listeners for category headers
    document.querySelectorAll('.category-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            content.classList.toggle('expanded');
            const arrow = header.querySelector('svg');
            arrow.style.transform = content.classList.contains('expanded') ? 'rotate(180deg)' : '';
        });
    });
}

// Render skills list
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

// Render vocabulary item
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
