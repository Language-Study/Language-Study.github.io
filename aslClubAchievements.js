// aslClubAchievements.js
// Handles rendering and logic for ASL Club achievements

async function renderASLClubAchievements() {
    const container = document.getElementById('aslClubAchievementsContainer');
    if (!container) return;
    try {
        const snapshot = await db.collection('achievements').orderBy('createdAt', 'desc').get();
        if (snapshot.empty) {
            container.innerHTML = '<div class="text-gray-500">No ASL Club achievements yet.</div>';
            return;
        }
        const isAdmin = await isCurrentUserASLClubAdmin();
        const isMentorView = window.isMentorView === true;
        container.innerHTML = await Promise.all(Array.from(snapshot.docs).map(async doc => {
            const data = doc.data();
            let codeHtml = '';
            // Only show code if admin
            if (isAdmin) {
                codeHtml = `<div class=\"text-xs text-blue-700 font-mono mt-1\">Code: ${data.code}</div>`;
            }
            return `<div class=\"flex flex-col items-center p-2 rounded border bg-blue-50 border-blue-300 w-32\">
                <div class=\"text-3xl mb-1\">${data.emoji || '🏅'}</div>
                <div class=\"font-semibold text-center\">${data.title || ''}</div>
                <div class=\"text-xs text-gray-500 text-center\">${data.description || ''}</div>
                ${codeHtml}
            </div>`;
        })).then(htmlArr => htmlArr.join(''));
    } catch (err) {
        container.innerHTML = '<div class="text-red-500">Error loading ASL Club achievements.</div>';
    }
}

// --- ASL Club Admin: Check if current user is admin ---
async function isCurrentUserASLClubAdmin() {
    if (!currentUser) return false;
    try {
        const doc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('aslClub').get();
        return doc.exists && doc.data().isAdmin === true;
    } catch (e) {
        return false;
    }
}

// --- CREATE ACHIEVEMENT TAB LOGIC ---
function generateAchievementCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function isAchievementCodeUnique(code) {
    const snapshot = await db.collection('achievements').where('code', '==', code).get();
    return snapshot.empty;
}

const createAchievementForm = document.getElementById('createAchievementForm');
const achievementCreateMsg = document.getElementById('achievementCreateMsg');

if (createAchievementForm) {
    createAchievementForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emoji = document.getElementById('achievementEmoji').value.trim();
        const title = document.getElementById('achievementTitle').value.trim();
        const description = document.getElementById('achievementDescription').value.trim();
        let code = document.getElementById('achievementCode').value.trim().toUpperCase();
        if (!emoji || !title || !description) {
            achievementCreateMsg.textContent = 'Please fill out all fields.';
            achievementCreateMsg.className = 'mt-4 text-red-600 font-medium';
            return;
        }
        // Validate or generate code
        if (code && !/^[A-Z0-9]{6}$/.test(code)) {
            achievementCreateMsg.textContent = 'Code must be 6 alphanumeric characters.';
            achievementCreateMsg.className = 'mt-4 text-red-600 font-medium';
            return;
        }
        if (code) {
            // User provided a code, check uniqueness
            if (!(await isAchievementCodeUnique(code))) {
                achievementCreateMsg.textContent = 'That code is already in use. Please enter a different code.';
                achievementCreateMsg.className = 'mt-4 text-red-600 font-medium';
                return;
            }
        } else {
            // Auto-generate a unique code
            let attempts = 0;
            const maxAttempts = 10;
            do {
                code = generateAchievementCode();
                attempts++;
            } while (!(await isAchievementCodeUnique(code)) && attempts < maxAttempts);
            if (!(await isAchievementCodeUnique(code))) {
                achievementCreateMsg.textContent = 'Could not generate a unique code. Please try again.';
                achievementCreateMsg.className = 'mt-4 text-red-600 font-medium';
                return;
            }
        }
        try {
            await db.collection('achievements').add({
                emoji,
                title,
                description,
                code,
                createdBy: currentUser ? currentUser.uid : null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            achievementCreateMsg.textContent = `Achievement created! Code: ${code}`;
            achievementCreateMsg.className = 'mt-4 text-green-600 font-medium';
            createAchievementForm.reset();
            // Optionally re-render achievements
            if (typeof renderASLClubAchievements === 'function') renderASLClubAchievements();
        } catch (err) {
            achievementCreateMsg.textContent = 'Error creating achievement.';
            achievementCreateMsg.className = 'mt-4 text-red-600 font-medium';
        }
    });
}

// --- Show achievement codes under badges for admins ---
async function renderBadgesWithCodes() {
    const badgesContainer = document.getElementById('badgesContainer');
    if (!badgesContainer) return;
    const isAdmin = await isCurrentUserASLClubAdmin();
    // Fetch all achievements if admin
    let achievementCodes = {};
    if (isAdmin) {
        try {
            const snapshot = await db.collection('achievements').get();
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data && data.title) {
                    achievementCodes[data.title] = data.code;
                }
            });
        } catch (e) { }
    }
    // Render badges (reuse BADGES from badges.js)
    badgesContainer.innerHTML = BADGES.map(badge => {
        // Only show code if admin
        let codeHtml = '';
        if (isAdmin && achievementCodes[badge.name]) {
            codeHtml = `<div class='text-xs text-blue-700 font-mono mt-1'>Code: ${achievementCodes[badge.name]}</div>`;
        }
        return `
        <div class="flex flex-col items-center p-2 rounded border ${earnedBadges.includes(badge.id) ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-200'} w-32">
            <div class="text-3xl mb-1">${badge.icon}</div>
            <div class="font-semibold text-center">${badge.name}</div>
            <div class="text-xs text-gray-500 text-center">${badge.description}</div>
            <div class="mt-1 text-xs ${earnedBadges.includes(badge.id) ? 'text-green-600' : 'text-gray-400'}">
                ${earnedBadges.includes(badge.id) ? 'Earned' : 'Locked'}
            </div>
            ${codeHtml}
        </div>
        `;
    }).join('');
}

// Patch renderBadges to show codes for admins
window.renderBadges = async function () {
    // Only use the admin badge code logic if the user is an admin
    const isAdmin = await (typeof isCurrentUserASLClubAdmin === 'function' ? isCurrentUserASLClubAdmin() : false);
    if (isAdmin) {
        await renderBadgesWithCodes();
    } else {
        // Fallback to the default renderBadges (from script.js)
        if (typeof window._defaultRenderBadges === 'function') {
            window._defaultRenderBadges();
        } else {
            // Inline fallback: render without codes
            const badgesContainer = document.getElementById('badgesContainer');
            if (!badgesContainer) return;
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
    }
};
// Save the original renderBadges from script.js if not already saved
if (!window._defaultRenderBadges && typeof window.renderBadges === 'function') {
    window._defaultRenderBadges = window.renderBadges;
}

// Call on page load if container exists
if (document.getElementById('aslClubAchievementsContainer')) {
    renderASLClubAchievements();
}
