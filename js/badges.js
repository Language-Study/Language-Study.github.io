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
 * Groups badges by type (e.g., "Words Added", "Words Mastered", "Skills Added", etc.)
 * @returns {Object} Object with badge type as key and array of badges as value
 */
function groupBadgesByType() {
    const groups = {};

    BADGES.forEach(badge => {
        let type = 'Other';

        if (badge.id.includes('_word') && !badge.id.includes('_mastered')) {
            type = 'Words Added';
        } else if (badge.id.includes('_mastered') && !badge.id.includes('_skill')) {
            type = 'Words Mastered';
        } else if (badge.id.includes('_skill') && !badge.id.includes('_mastered')) {
            type = 'Skills Added';
        } else if (badge.id.includes('_mastered_skill')) {
            type = 'Skills Mastered';
        } else if (badge.id.includes('_portfolio')) {
            type = 'Portfolio';
        } else if (badge.id === 'all_categories') {
            type = 'Exploration';
        }

        if (!groups[type]) {
            groups[type] = [];
        }
        groups[type].push(badge);
    });

    return groups;
}

/**
 * Render badges UI with carousel functionality
 * @async
 * @returns {Promise<void>}
 */
async function renderBadges() {
    const badgesCarouselContainer = document.getElementById('badgesCarouselContainer');
    if (!badgesCarouselContainer) return;

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

    // Group badges by type and render carousels
    const groupedBadges = groupBadgesByType();

    badgesCarouselContainer.innerHTML = Object.entries(groupedBadges).map(([type, badges]) => {
        return `
            <div class="badge-carousel-group">
                <h3 class="badge-group-title">${type}</h3>
                <div class="badge-carousel-wrapper">
                    <button class="carousel-arrow carousel-arrow-left" data-group="${type}" aria-label="Previous badges">
                        <span>❮</span>
                    </button>
                    <div class="badge-carousel-track" data-group="${type}">
                        ${badges.map(badge => {
            const earned = earnedBadges.includes(badge.id);
            return `
                                <div class="badge-card ${earned ? 'badge-earned' : 'badge-locked'}" 
                                     role="img" 
                                     aria-label="${badge.name}: ${badge.description}" 
                                     title="${badge.description}"
                                     data-badge-id="${badge.id}">
                                    <div class="badge-icon" aria-hidden="true">${badge.icon}</div>
                                    <div class="badge-title">${badge.name}</div>
                                    <div class="badge-description">${badge.description}</div>
                                    <div class="badge-status ${earned ? 'status-earned' : 'status-locked'}">
                                        ${earned ? '✓ Earned' : 'Locked'}
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>
                    <button class="carousel-arrow carousel-arrow-right" data-group="${type}" aria-label="Next badges">
                        <span>❯</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Attach event listeners to carousel arrows
    attachCarouselListeners();
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
/**
 * Attach event listeners to carousel navigation arrows
 */
function attachCarouselListeners() {
    document.querySelectorAll('.carousel-arrow').forEach(button => {
        button.addEventListener('click', (e) => {
            const groupName = e.currentTarget.dataset.group;
            const track = document.querySelector(`.badge-carousel-track[data-group="${groupName}"]`);
            if (!track) return;

            const isLeftArrow = e.currentTarget.classList.contains('carousel-arrow-left');
            const scrollAmount = 112; // badge width (112px) + gap (12px)

            if (isLeftArrow) {
                track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else {
                track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        });
    });
}

/**
 * Update carousel arrow visibility based on scroll position
 */
function updateCarouselArrowVisibility() {
    document.querySelectorAll('.badge-carousel-track').forEach(track => {
        const groupName = track.dataset.group;
        const leftArrow = document.querySelector(`.carousel-arrow-left[data-group="${groupName}"]`);
        const rightArrow = document.querySelector(`.carousel-arrow-right[data-group="${groupName}"]`);

        if (leftArrow) {
            leftArrow.style.opacity = track.scrollLeft > 0 ? '1' : '0.3';
            leftArrow.style.pointerEvents = track.scrollLeft > 0 ? 'auto' : 'none';
        }

        if (rightArrow) {
            const canScrollRight = track.scrollLeft < track.scrollWidth - track.clientWidth - 10;
            rightArrow.style.opacity = canScrollRight ? '1' : '0.3';
            rightArrow.style.pointerEvents = canScrollRight ? 'auto' : 'none';
        }
    });
}

// Update arrow visibility on scroll
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.badge-carousel-track').forEach(track => {
        track.addEventListener('scroll', updateCarouselArrowVisibility);
    });
    updateCarouselArrowVisibility();
});