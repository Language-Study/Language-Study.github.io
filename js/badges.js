/**
 * Badge System Module
 * Manages badge definitions, checking, earning, and rendering
 */

const BADGES = [
    {
        id: 'first_word',
        name: 'First Word Added',
        description: 'Add your first vocabulary word.',
        icon: '🥇',
        check: () => vocabularyList.length >= 1
    },
    {
        id: 'ten_words',
        name: '10 Words Added',
        description: 'Add 10 vocabulary words.',
        icon: '🔟',
        check: () => vocabularyList.length >= 10
    },
    {
        id: 'fifty_words',
        name: '50 Words Added',
        description: 'Add 50 vocabulary words.',
        icon: '🏅',
        check: () => vocabularyList.length >= 50
    },
    {
        id: 'ten_mastered',
        name: '10 Words Mastered',
        description: 'Master 10 vocabulary words.',
        icon: '🏆',
        check: () => vocabularyList.filter(w => w.status === PROGRESS_STATUS.MASTERED).length >= 10
    },
    {
        id: 'fifty_mastered',
        name: '50 Words Mastered',
        description: 'Master 50 vocabulary words.',
        icon: '🥇',
        check: () => vocabularyList.filter(w => w.status === PROGRESS_STATUS.MASTERED).length >= 50
    },
    {
        id: 'first_skill',
        name: 'First Skill Added',
        description: 'Add your first skill.',
        icon: '🎓',
        check: () => skills.length >= 1
    },
    {
        id: 'five_skills',
        name: '5 Skills Added',
        description: 'Add 5 skills.',
        icon: '✋',
        check: () => skills.length >= 5
    },
    {
        id: 'ten_skills',
        name: '10 Skills Added',
        description: 'Add 10 skills.',
        icon: '🔟',
        check: () => skills.length >= 10
    },
    {
        id: 'five_mastered_skills',
        name: '5 Skills Mastered',
        description: 'Master 5 skills.',
        icon: '🏅',
        check: () => skills.filter(s => s.status === PROGRESS_STATUS.MASTERED).length >= 5
    },
    {
        id: 'ten_mastered_skills',
        name: '10 Skills Mastered',
        description: 'Master 10 skills.',
        icon: '🏆',
        check: () => skills.filter(s => s.status === PROGRESS_STATUS.MASTERED).length >= 10
    },
    {
        id: 'all_categories',
        name: 'Explorer',
        description: 'Add vocabulary to 3 or more categories.',
        icon: '🌍',
        check: () => {
            const usedCategories = new Set(vocabularyList.map(w => w.category));
            return usedCategories.size >= 3;
        }
    },
    {
        id: 'first_portfolio',
        name: 'First Portfolio Item',
        description: 'Add your first portfolio entry.',
        icon: '📁',
        check: () => Array.isArray(portfolioEntries) && portfolioEntries.length >= 1
    },
    {
        id: 'five_portfolio',
        name: '5 Portfolio Items',
        description: 'Add 5 portfolio entries.',
        icon: '⭐',
        check: () => Array.isArray(portfolioEntries) && portfolioEntries.length >= 5
    }
];

let earnedBadges = [];

/**
 * Render badges UI
 * @async
 * @returns {Promise<void>}
 */
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
    } catch (e) {
        console.error('Error fetching earned badges:', e);
    }

    const currentlyEarned = BADGES.filter(badge => badge.check()).map(b => b.id);

    // Show toast only for newly earned badges (not on every page load)
    BADGES.forEach(badge => {
        if (badge.check() && !previouslyEarned.includes(badge.id)) {
            showToast(`🎉 Badge earned: ${badge.name}!`);
        }
    });

    // Update Firestore with the latest earned badges
    try {
        await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').set(
            { earnedBadges: currentlyEarned },
            { merge: true }
        );
        earnedBadges = currentlyEarned;
    } catch (e) {
        console.error('Error saving earned badges:', e);
    }

    // Render badges HTML
    badgesContainer.innerHTML = BADGES.map(badge => {
        const earned = earnedBadges.includes(badge.id);
        return `
            <div class="badge-card ${earned ? 'badge-earned' : 'badge-locked'}" role="img" aria-label="${badge.name}: ${badge.description}" title="${badge.description}">
                <div class="badge-icon" aria-hidden="true">${badge.icon}</div>
                <div class="badge-title">${badge.name}</div>
                <div class="badge-description">${badge.description}</div>
                <div class="badge-status ${earned ? 'status-earned' : 'status-locked'}">
                    ${earned ? '✓ Earned' : 'Locked'}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Check if a specific badge is earned
 * @param {string} badgeId - Badge ID to check
 * @returns {boolean}
 */
function isBadgeEarned(badgeId) {
    return earnedBadges.includes(badgeId);
}

/**
 * Get all earned badge objects
 * @returns {Array<Object>}
 */
function getEarnedBadgeObjects() {
    return BADGES.filter(badge => earnedBadges.includes(badge.id));
}

/**
 * Get achievement progress percentage
 * @returns {number} Percentage of badges earned (0-100)
 */
function getBadgeProgress() {
    return Math.round((earnedBadges.length / BADGES.length) * 100);
}
