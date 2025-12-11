/**
 * Portfolio & Skills Management Module
 * Handles portfolio entries and skills management
 */

let portfolioEntries = [];
let skills = [];

/**
 * Load portfolio entries from Firestore
 * @async
 * @returns {Promise<void>}
 */
async function loadPortfolio() {
    try {
        if (!currentUser) return;
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('portfolio').orderBy('dateAdded').get();
        portfolioEntries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error loading portfolio:', error);
    }
}

/**
 * Load skills from Firestore
 * @async
 * @returns {Promise<void>}
 */
async function loadSkills() {
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('skills').get();
        skills = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error loading skills:', error);
    }
}

/**
 * Add portfolio entry
 * @async
 * @param {string} title - Portfolio entry title
 * @param {string} link - Portfolio entry link (YouTube or SoundCloud)
 * @returns {Promise<void>}
 */
async function addPortfolioEntry(title, link) {
    const trimmedTitle = title.trim();
    const trimmedLink = link.trim();

    if (!trimmedTitle || !trimmedLink) {
        throw new Error('Please enter both title and link.');
    }

    const type = getPortfolioType(trimmedLink);
    if (!type) {
        throw new Error('Please enter a valid YouTube or SoundCloud link.');
    }

    try {
        let videoId = null;
        if (type === 'youtube') {
            videoId = getYouTubeId(trimmedLink);
        }

        await db.collection('users').doc(currentUser.uid).collection('portfolio').add({
            title: trimmedTitle,
            link: trimmedLink,
            type,
            videoId,
            isTop: false,
            dateAdded: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error adding portfolio entry:', error);
        throw error;
    }
}

/**
 * Delete portfolio entry
 * @async
 * @param {string} id - Portfolio entry ID
 * @returns {Promise<void>}
 */
async function deletePortfolioEntry(id) {
    try {
        await db.collection('users').doc(currentUser.uid).collection('portfolio').doc(id).delete();
    } catch (error) {
        console.error('Error deleting portfolio entry:', error);
        throw error;
    }
}

/**
 * Toggle portfolio entry as top featured item
 * @async
 * @param {string} id - Portfolio entry ID
 * @returns {Promise<void>}
 */
async function toggleTopPortfolio(id) {
    try {
        const topCount = portfolioEntries.filter(e => e.isTop).length;
        const entry = portfolioEntries.find(e => e.id === id);

        if (!entry) {
            throw new Error('Portfolio entry not found.');
        }

        if (!entry.isTop && topCount >= 3) {
            throw new Error('You can only select up to 3 top portfolio entries.');
        }

        await db.collection('users').doc(currentUser.uid).collection('portfolio').doc(id).update({
            isTop: !entry.isTop
        });
    } catch (error) {
        console.error('Error toggling top portfolio:', error);
        throw error;
    }
}

/**
 * Add skills to user collection
 * @async
 * @param {string} skillsText - Newline-separated skills
 * @returns {Promise<void>}
 */
async function addSkills(skillsText) {
    const skillsToAdd = skillsText.trim().split('\n').filter(skill => skill.trim());

    if (skillsToAdd.length === 0) {
        throw new Error('Please enter at least one skill.');
    }

    try {
        const batch = db.batch();
        const skillsRef = db.collection('users').doc(currentUser.uid).collection('skills');

        const newItems = skillsToAdd.map(skill => ({
            name: skill.trim(),
            status: PROGRESS_STATUS.NOT_STARTED,
            subtasks: [],
            dateAdded: firebase.firestore.FieldValue.serverTimestamp()
        }));

        for (const item of newItems) {
            const newDocRef = skillsRef.doc();
            batch.set(newDocRef, item);
        }

        await batch.commit();
    } catch (error) {
        console.error('Error adding skills:', error);
        throw error;
    }
}

/**
 * Delete skill
 * @async
 * @param {string} itemId - Skill document ID
 * @returns {Promise<void>}
 */
async function deleteSkill(itemId) {
    try {
        await db.collection('users').doc(currentUser.uid).collection('skills').doc(itemId).delete();
    } catch (error) {
        console.error('Error deleting skill:', error);
        throw error;
    }
}

/**
 * Update skill status
 * @async
 * @param {string} itemId - Skill document ID
 * @param {string} newStatus - New status
 * @returns {Promise<void>}
 */
async function updateSkillStatus(itemId, newStatus) {
    try {
        await db.collection('users').doc(currentUser.uid).collection('skills').doc(itemId).update({
            status: newStatus
        });
    } catch (error) {
        console.error('Error updating skill status:', error);
        throw error;
    }
}

/**
 * Add subtask to a skill
 * @async
 * @param {string} skillId - Skill document ID
 * @param {string} subtaskText - Subtask text/goal
 * @returns {Promise<void>}
 */
async function addSubtask(skillId, subtaskText) {
    const trimmedText = subtaskText.trim();
    if (!trimmedText) {
        throw new Error('Please enter a subtask.');
    }

    try {
        const skill = skills.find(s => s.id === skillId);
        if (!skill) {
            throw new Error('Skill not found.');
        }

        const subtasks = skill.subtasks || [];
        const newSubtask = {
            id: Date.now().toString(),
            text: trimmedText,
            status: PROGRESS_STATUS.NOT_STARTED,
            dateAdded: new Date().toISOString()
        };

        subtasks.push(newSubtask);

        await db.collection('users').doc(currentUser.uid).collection('skills').doc(skillId).update({
            subtasks: subtasks
        });

        skill.subtasks = subtasks;
    } catch (error) {
        console.error('Error adding subtask:', error);
        throw error;
    }
}

/**
 * Delete subtask from a skill
 * @async
 * @param {string} skillId - Skill document ID
 * @param {string} subtaskId - Subtask ID
 * @returns {Promise<void>}
 */
async function deleteSubtask(skillId, subtaskId) {
    try {
        const skill = skills.find(s => s.id === skillId);
        if (!skill) {
            throw new Error('Skill not found.');
        }

        const subtasks = (skill.subtasks || []).filter(st => st.id !== subtaskId);

        await db.collection('users').doc(currentUser.uid).collection('skills').doc(skillId).update({
            subtasks: subtasks
        });

        skill.subtasks = subtasks;
    } catch (error) {
        console.error('Error deleting subtask:', error);
        throw error;
    }
}

/**
 * Update subtask status
 * @async
 * @param {string} skillId - Skill document ID
 * @param {string} subtaskId - Subtask ID
 * @param {string} newStatus - New status
 * @returns {Promise<void>}
 */
async function updateSubtaskStatus(skillId, subtaskId, newStatus) {
    try {
        const skill = skills.find(s => s.id === skillId);
        if (!skill) {
            throw new Error('Skill not found.');
        }

        const subtasks = skill.subtasks || [];
        const subtask = subtasks.find(st => st.id === subtaskId);
        if (!subtask) {
            throw new Error('Subtask not found.');
        }

        subtask.status = newStatus;

        await db.collection('users').doc(currentUser.uid).collection('skills').doc(skillId).update({
            subtasks: subtasks
        });

        skill.subtasks = subtasks;
    } catch (error) {
        console.error('Error updating subtask status:', error);
        throw error;
    }
}

/**
 * Render portfolio UI
 * @returns {void}
 */
function renderPortfolio() {
    const portfolioTop3 = document.getElementById('portfolioTop3');
    const portfolioList = document.getElementById('portfolioList');

    if (!portfolioTop3 || !portfolioList) return;

    const top3 = portfolioEntries.filter(e => e.isTop).slice(0, 3);
    const rest = portfolioEntries.filter(e => !e.isTop);
    const topCount = top3.length;

    portfolioTop3.innerHTML = top3.length > 0 ? top3.map(e => renderPortfolioCard(e, true)).join('')
        : '<div class="text-gray-400 col-span-3">No top portfolio entries selected.</div>';

    portfolioList.innerHTML = rest.length > 0 ? rest.map(e => renderPortfolioListItem(e, topCount)).join('')
        : (portfolioEntries.length === 0 ? '<div class="text-gray-400">No portfolio entries yet.</div>' : '');
}

/**
 * Render portfolio card (featured)
 * @param {Object} entry - Portfolio entry
 * @param {boolean} isFeatured - Is featured
 * @returns {string} HTML
 */
function renderPortfolioCard(entry, isFeatured) {
    let embedHtml = '';

    if (entry.type === 'youtube' || (!entry.type && getYouTubeId(entry.link))) {
        let videoId = getYouTubeId(entry.link) || entry.videoId;
        if (videoId) {
            embedHtml = `<iframe class="w-full h-48 rounded" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen title="${escapeHtml(entry.title)}"></iframe>`;
        } else {
            embedHtml = `<a href="${entry.link}" target="_blank" class="text-blue-600 text-xs hover:underline">${entry.link}</a>`;
        }
    } else if (entry.type === 'soundcloud') {
        embedHtml = `<iframe class="w-full h-48 rounded" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(entry.link)}&color=%230066cc&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true" title="${escapeHtml(entry.title)}"></iframe>`;
    } else {
        embedHtml = `<a href="${entry.link}" target="_blank" class="text-blue-600 text-xs hover:underline">${entry.link}</a>`;
    }

    return `
        <div class="flex flex-col items-center bg-gray-50 rounded p-2 border relative">
            <div class="w-full mb-2">
                ${embedHtml}
            </div>
            <div class="font-semibold text-center mb-1">${escapeHtml(entry.title)}</div>
            <div class="flex gap-2">
                <button class="feature-button px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300" 
                        data-action="toggleTop" data-id="${entry.id}" aria-label="Unfeature this portfolio item">Unfeature</button>
                <button class="delete-button px-2 py-1 text-xs text-red-600 bg-gray-100 rounded hover:bg-red-100" 
                        data-action="delete" data-id="${entry.id}" aria-label="Delete this portfolio item">Delete</button>
            </div>
        </div>
    `;
}

/**
 * Render portfolio list item
 * @param {Object} entry - Portfolio entry
 * @param {number} topCount - Current top count
 * @returns {string} HTML
 */
function renderPortfolioListItem(entry, topCount) {
    return `
        <div class="flex items-center justify-between p-2 border rounded">
            <div class="flex flex-col">
                <span class="font-medium">${escapeHtml(entry.title)}</span>
                <a href="${entry.link}" target="_blank" class="text-blue-600 text-xs hover:underline">${entry.link}</a>
            </div>
            <div class="flex gap-2">
                <button class="feature-button px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 ${topCount >= 3 ? 'opacity-50 cursor-not-allowed' : ''}" 
                        data-action="toggleTop" data-id="${entry.id}" 
                        ${topCount >= 3 ? 'disabled title="You can only feature 3 items"' : ''} aria-label="Feature this portfolio item">Feature</button>
                <button class="delete-button px-2 py-1 text-xs text-red-600 bg-gray-100 rounded hover:bg-red-100" 
                        data-action="delete" data-id="${entry.id}" aria-label="Delete this portfolio item">Delete</button>
            </div>
        </div>
    `;
}

/**
 * Render skills list
 * @returns {void}
 */
function renderSkillsList() {
    const skillsList = document.getElementById('skillsList');
    if (!skillsList) return;

    if (skills.length === 0) {
        skillsList.innerHTML = '<p class="text-sm text-gray-500">No skills added yet.</p>';
        return;
    }

    skillsList.innerHTML = skills.map(skill => renderSkillItem(skill)).join('');
}

/**
 * Render a single skill item with subtasks
 * @param {Object} skill - Skill object
 * @returns {string} HTML
 */
function renderSkillItem(skill) {
    const subtasks = skill.subtasks || [];
    const hasSubtasks = subtasks.length > 0;
    const expandButtonId = `expand-${skill.id}`;
    const subtasksContainerId = `subtasks-${skill.id}`;

    const subtasksHtml = hasSubtasks ? subtasks.map(subtask => `
        <div class="subtask-item flex items-center justify-between p-2 ml-4 bg-gray-50 border-l-2 border-blue-300 rounded mb-2 mt-2" data-subtask-id="${subtask.id}">
            <div class="flex-1">
                <div class="text-sm text-gray-700">${escapeHtml(subtask.text)}</div>
            </div>
            <div class="flex items-center gap-2 ml-2">
                ${window.isMentorView ? `<span class="inline-block px-2 py-1 rounded text-xs font-semibold ${subtask.status === PROGRESS_STATUS.MASTERED ? 'bg-green-200 text-green-800' : subtask.status === PROGRESS_STATUS.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'} cursor-not-allowed opacity-70" 
                    title="Status (view only)">${statusIcons[subtask.status]}</span>`
            : `<button class="subtask-status-button p-1 rounded-full hover:bg-gray-100 transition-transform" aria-label="Toggle subtask status" title="Click to change status">
                    ${statusIcons[subtask.status]}
                </button>`}
                ${window.isMentorView ? '' : `<button class="subtask-delete-button p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-all" aria-label="Delete subtask" title="Delete">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>`}
            </div>
        </div>
    `).join('') : '';

    const subtasksContainerHtml = `
        <div id="${subtasksContainerId}" class="subtasks-container hidden mt-2">
            ${subtasksHtml}
            ${window.isMentorView ? '' : `<div class="mt-2 ml-4">
                <input type="text" class="subtask-input w-full p-2 border rounded text-sm" placeholder="Add a subtask (improvement goal)..." data-skill-id="${skill.id}" />
                <button class="subtask-add-button mt-1 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600" data-skill-id="${skill.id}">Add Subtask</button>
            </div>`}
        </div>
    `;

    return `
        <div class="skill-item flex flex-col p-2 border rounded mb-2" data-id="${skill.id}">
            <div class="flex items-center justify-between">
                <div class="flex items-center flex-1 gap-2">
                    ${!window.isMentorView ? `<button class="expand-button p-1 rounded hover:bg-gray-100" id="${expandButtonId}" data-skill-id="${skill.id}" aria-label="Toggle subtasks" title="Toggle subtasks">
                        <svg class="w-5 h-5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>` : `<div style="width: 24px;"></div>`}
                    <div class="font-medium flex-1">${escapeHtml(skill.name)}</div>
                </div>
                <div class="flex items-center gap-2">
                    ${window.isMentorView ? `<span class="inline-block px-2 py-1 rounded text-xs font-semibold ${skill.status === PROGRESS_STATUS.MASTERED ? 'bg-green-200 text-green-800' : skill.status === PROGRESS_STATUS.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'} cursor-not-allowed opacity-70" 
                        title="Status (view only)" aria-label="Status: ${skill.status}">${statusIcons[skill.status]}</span>`
            : `<button class="status-button p-1 rounded-full hover:bg-gray-100 transition-transform progress-button" aria-label="Toggle skill status" title="Click to change status">
                            ${statusIcons[skill.status]}
                        </button>`}
                    ${window.isMentorView ? '' : `<button class="delete-button p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-all" aria-label="Delete skill" title="Delete">
                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>`}
                </div>
            </div>
            ${subtasksContainerHtml}
        </div>
    `;
}

/**
 * Filter skills by search query
 * @param {string} query - Search query
 * @returns {void}
 */
function filterSkills(query) {
    const skillsList = document.getElementById('skillsList');
    if (!skillsList) return;

    if (!query) {
        renderSkillsList();
        return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = skills.filter(skill => skill.name.toLowerCase().includes(lowerQuery));

    skillsList.innerHTML = filtered.length > 0 ? filtered.map(skill => renderSkillItem(skill)).join('') : '<p class="text-sm text-gray-500">No skills found.</p>';
}

/**
 * Filter portfolio by search query
 * @param {string} query - Search query
 * @returns {void}
 */
function filterPortfolio(query) {
    if (!query) {
        renderPortfolio();
        return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = portfolioEntries.filter(item =>
        item.title && item.title.toLowerCase().includes(lowerQuery)
    );

    const top3 = filtered.filter(e => e.isTop).slice(0, 3);
    const rest = filtered.filter(e => !e.isTop);
    const topCount = top3.length;

    const portfolioTop3 = document.getElementById('portfolioTop3');
    const portfolioList = document.getElementById('portfolioList');

    if (portfolioTop3) {
        portfolioTop3.innerHTML = top3.length > 0 ? top3.map(e => renderPortfolioCard(e, true)).join('')
            : '<div class="text-gray-400 col-span-3">No top portfolio entries found.</div>';
    }

    if (portfolioList) {
        portfolioList.innerHTML = rest.length > 0 ? rest.map(e => renderPortfolioListItem(e, topCount)).join('')
            : '<div class="text-sm text-gray-500">No portfolio results found.</div>';
    }
}

/**
 * Get skills statistics
 * @returns {Object}
 */
function getSkillsStats() {
    const total = skills.length;
    const mastered = skills.filter(s => s.status === PROGRESS_STATUS.MASTERED).length;
    const inProgress = skills.filter(s => s.status === PROGRESS_STATUS.IN_PROGRESS).length;
    const notStarted = total - mastered - inProgress;

    return { total, mastered, inProgress, notStarted };
}

// Helper functions

function getYouTubeId(url) {
    const regex = /(?:youtube(?:-nocookie)?\.com\/(?:.*[?&]v=|(?:v|embed|shorts)\/)|youtu\.be\/)([\w-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function isSoundCloudUrl(url) {
    return /^https?:\/\/(soundcloud\.com|snd\.sc)\//.test(url);
}

function getPortfolioType(url) {
    if (getYouTubeId(url)) return 'youtube';
    if (isSoundCloudUrl(url)) return 'soundcloud';
    return null;
}

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
