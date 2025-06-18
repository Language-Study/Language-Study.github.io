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

        let earnedASLBadges = [];
        if (currentUser) {
            try {
                const aslClubDoc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('aslClub').get();
                if (aslClubDoc.exists && Array.isArray(aslClubDoc.data().earnedASLBadges)) {
                    earnedASLBadges = aslClubDoc.data().earnedASLBadges;
                }
            } catch (e) {
                console.error("Could not fetch user's earned ASL badges:", e);
            }
        }

        const isAdmin = await isCurrentUserASLClubAdmin();

        container.innerHTML = await Promise.all(Array.from(snapshot.docs).map(async doc => {
            const data = doc.data();
            const isEarned = earnedASLBadges.includes(data.code);

            let codeHtml = '';
            if (isAdmin) {
                codeHtml = `<div class="text-xs text-blue-700 font-mono mt-1">Code: ${data.code}</div>`;
            }

            const badgeClasses = isEarned ? 'bg-green-100 border-green-500' : 'bg-gray-50 border-gray-200';
            const earnedStatusClass = isEarned ? 'text-green-700' : 'text-gray-500';
            const earnedStatusText = isEarned ? 'Earned' : 'Locked';

            return `<div class="flex flex-col items-center p-2 rounded border ${badgeClasses} w-32">
                <div class="text-3xl mb-1">${data.emoji || '🏅'}</div>
                <div class="font-semibold text-center">${data.title || ''}</div>
                <div class="text-xs text-gray-500 text-center">${data.description || ''}</div>
                <div class="mt-1 text-xs ${earnedStatusClass}">${earnedStatusText}</div>
                ${codeHtml}
            </div>`;
        })).then(htmlArr => htmlArr.join(''));
    } catch (err) {
        console.error("Error rendering ASL Club achievements:", err);
        container.innerHTML = '<div class="text-red-500">Error loading ASL Club achievements.</div>';
    }
}

// --- ASL Club Admin: Check if current user is admin ---
async function isCurrentUserASLClubAdmin() {
    if (!currentUser) return false;
    try {
        const doc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('aslClub').get();
        const result = doc.exists && doc.data().isAdmin === true;
        if (!result) console.warn('isCurrentUserASLClubAdmin: Not admin. Doc:', doc.data());
        return result;
    } catch (e) {
        console.error('isCurrentUserASLClubAdmin error:', e);
        return false;
    }
}

// --- ASL Club: Check if current user is a member (admin is always a member, no need for isMember flag if admin) ---
async function isCurrentUserASLClubMember() {
    if (!currentUser) return false;
    try {
        const doc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('aslClub').get();
        const result = doc.exists && (doc.data().isAdmin === true || doc.data().isMember === true);
        if (!result) console.warn('isCurrentUserASLClubMember: Not member. Doc:', doc.data());
        return result;
    } catch (e) {
        console.error('isCurrentUserASLClubMember error:', e);
        return false;
    }
}

// Patch renderASLClubAchievements to only show for members, and hide the section if not
let _originalRenderASLClubAchievements = renderASLClubAchievements;
renderASLClubAchievements = async function () {
    const achievementsSection = document.getElementById('achievementsSection');
    const aslClubContainer = document.getElementById('aslClubAchievementsContainer');
    if (!aslClubContainer || !achievementsSection) return;
    let isMember, isAdmin;
    try {
        isMember = await isCurrentUserASLClubMember();
        isAdmin = await isCurrentUserASLClubAdmin();
    } catch (e) {
        console.error('Error checking ASL Club member/admin status:', e);
    }
    if (!isMember && !isAdmin) {
        // Hide only the ASL Club container and heading, not the whole achievements section
        aslClubContainer.style.display = 'none';
        // Hide the ASL Club heading if present
        const headings = achievementsSection.querySelectorAll('h2');
        headings.forEach(h => {
            if (h.textContent && h.textContent.trim().toLowerCase().includes('asl club')) {
                h.style.display = 'none';
            }
        });
        return;
    } else {
        aslClubContainer.style.display = '';
        // Restore heading if needed
        const headings = achievementsSection.querySelectorAll('h2');
        headings.forEach(h => {
            if (h.textContent && h.textContent.trim().toLowerCase().includes('asl club')) {
                h.style.display = '';
            }
        });
    }
    await _originalRenderASLClubAchievements();
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
if (!window._defaultRenderBadges) {
    window._defaultRenderBadges = async function () {
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
    };
}
window.renderBadges = async function () {
    // Only use the admin badge code logic if the user is an admin
    const isAdmin = await (typeof isCurrentUserASLClubAdmin === 'function' ? isCurrentUserASLClubAdmin() : false);
    if (isAdmin) {
        await renderBadgesWithCodes();
    } else {
        await window._defaultRenderBadges();
    }
};

// --- ASL Club: Award badge for correct code ---
async function submitASLClubCode(inputCode) {
    if (!currentUser) return;
    const code = inputCode.trim().toUpperCase();
    if (!code) return;
    // Check if code matches an achievement
    const achievementSnap = await db.collection('achievements').where('code', '==', code).limit(1).get();
    if (achievementSnap.empty) {
        throw new Error('Invalid code.');
    }
    const achievement = achievementSnap.docs[0].data();
    // Get user's earnedASLBadges array
    const aslClubDocRef = db.collection('users').doc(currentUser.uid).collection('metadata').doc('aslClub');
    const aslClubDoc = await aslClubDocRef.get();
    let earned = (aslClubDoc.exists && Array.isArray(aslClubDoc.data().earnedASLBadges)) ? aslClubDoc.data().earnedASLBadges : [];
    if (earned.includes(code)) {
        throw new Error('You have already earned this badge!');
    }
    earned.push(code);
    await aslClubDocRef.set({ earnedASLBadges: earned }, { merge: true });

    // Optionally re-render achievements
    if (typeof renderASLClubAchievements === 'function') renderASLClubAchievements();
    return achievement;
}

// --- ASL Club Badge Code Entry UI ---
function setupASLClubCodeEntryUI() {
    const aslClubContainer = document.getElementById('aslClubAchievementsContainer');
    if (!aslClubContainer) return;
    // Create code entry form (visible for members and admins)
    let codeForm = document.getElementById('aslClubCodeForm');
    if (!codeForm) {
        codeForm = document.createElement('form');
        codeForm.id = 'aslClubCodeForm';
        codeForm.style.display = '';
        codeForm.innerHTML = `
            <div class="flex flex-col sm:flex-row items-center gap-2 mt-4">
                <input id="aslClubCodeInput" type="text" maxlength="6" placeholder="Enter 6-digit badge code" class="p-2 border rounded font-mono uppercase w-40" />
                <button type="submit" class="p-2 bg-blue-500 text-white rounded hover:bg-blue-600">Submit Code</button>
                <span id="aslClubCodeMsg" class="text-sm ml-2"></span>
            </div>
        `;
        // Insert directly after the ASL Club badges container
        aslClubContainer.parentNode.insertBefore(codeForm, aslClubContainer.nextSibling);
        codeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('aslClubCodeInput');
            const msg = document.getElementById('aslClubCodeMsg');
            msg.textContent = '';
            if (!input.value.trim()) {
                msg.textContent = 'Please enter a code.';
                msg.className = 'text-sm text-red-600 ml-2';
                return;
            }
            try {
                const achievement = await submitASLClubCode(input.value);
                if (typeof showToast === 'function') {
                    showToast(`Badge awarded: ${achievement.title}`);
                }
                input.value = '';
            } catch (err) {
                msg.textContent = err.message || 'Error.';
                msg.className = 'text-sm text-red-600 ml-2';
            }
        });
    }
}

// Call this after rendering ASL Club achievements if member or admin
const _origRenderASLClubAchievements = _originalRenderASLClubAchievements;
_originalRenderASLClubAchievements = async function () {
    await _origRenderASLClubAchievements();
    const isMember = await isCurrentUserASLClubMember();
    const isAdmin = await isCurrentUserASLClubAdmin();
    if (isMember || isAdmin) setupASLClubCodeEntryUI();
};

// Call on page load if container exists
if (document.getElementById('aslClubAchievementsContainer')) {
    renderASLClubAchievements();
}
