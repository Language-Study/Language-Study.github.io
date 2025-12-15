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

    // Group badges by type for carousel rendering
    const groups = {
        words_added: ['first_word', 'ten_words', 'fifty_words'],
        words_mastered: ['ten_mastered', 'fifty_mastered'],
        skills_added: ['first_skill', 'five_skills', 'ten_skills'],
        skills_mastered: ['five_mastered_skills', 'ten_mastered_skills'],
        categories: ['all_categories'],
        portfolio: ['first_portfolio', 'five_portfolio']
    };

    const groupTitles = {
        words_added: 'Vocabulary Added',
        words_mastered: 'Vocabulary Mastered',
        skills_added: 'Skills Added',
        skills_mastered: 'Skills Mastered',
        categories: 'Explorer',
        portfolio: 'Portfolio'
    };

    // Helper to build a single badge card HTML
    const renderBadgeCard = (badge) => {
        const earned = earnedBadges.includes(badge.id);
        return `
            <div class="rounded-lg border ${earned ? 'border-green-300' : 'border-gray-200'} bg-white shadow-sm p-3 sm:p-4 flex items-center gap-3">
                <div class="text-xl sm:text-2xl" aria-hidden="true">${badge.icon}</div>
                <div class="flex-1">
                    <div class="font-semibold ${earned ? 'text-green-700' : 'text-gray-800'} text-base sm:text-lg">${badge.name}</div>
                    <div class="text-sm text-gray-600">${badge.description}</div>
                </div>
                <div class="text-xs px-2 py-1 rounded ${earned ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                    ${earned ? '✓ Earned' : 'Locked'}
                </div>
            </div>
        `;
    };

    // Build carousels per group
    const allBadgesById = BADGES.reduce((acc, b) => { acc[b.id] = b; return acc; }, {});

    const carouselsHTML = Object.keys(groups).map(groupKey => {
        const badgeIds = groups[groupKey];
        const slides = badgeIds.map(id => allBadgesById[id]).filter(Boolean);
        if (slides.length === 0) return '';

        const carouselId = `carousel-${groupKey}`;
        const slidesHTML = slides.map((b, idx) => `
            <div class="carousel-slide ${idx === 0 ? 'active block' : 'hidden'}" data-index="${idx}" aria-hidden="${idx === 0 ? 'false' : 'true'}">
                ${renderBadgeCard(b)}
            </div>
        `).join('');

        const controls = slides.length > 1 ? `
                <div class="flex flex-col sm:flex-row items-center gap-2" id="${carouselId}" role="region" aria-label="${groupTitles[groupKey] || groupKey} badge carousel">
                    <button class="hidden sm:block px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Previous badge" data-action="prev">◀</button>
                    <div class="w-full flex flex-col gap-2">${slidesHTML}
                        <div class="flex justify-center gap-2 w-full sm:hidden mt-2">
                            <button class="px-4 py-2 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Previous badge" data-action="prev">◀</button>
                            <button class="px-4 py-2 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Next badge" data-action="next">▶</button>
                        </div>
                    </div>
                    <button class="hidden sm:block px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Next badge" data-action="next">▶</button>
                </div>
                <div class="flex justify-center gap-3 sm:gap-2 mt-3 sm:mt-2" role="tablist" aria-label="Slide indicators">
                    ${slides.map((_, i) => `<button class="w-3 h-3 sm:w-2 sm:h-2 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-gray-300'}" role="tab" aria-selected="${i === 0}" aria-controls="${carouselId}" data-index="${i}"></button>`).join('')}
                </div>
        ` : `
                <div class="w-full" id="${carouselId}" aria-label="${groupTitles[groupKey] || groupKey} badge">
                    ${slidesHTML}
                </div>
        `;

        return `
            <section class="mb-4 bg-gray-50 rounded-lg p-3">
                <div class="flex items-center justify-between mb-1">
                    <h3 class="font-semibold text-gray-800">${groupTitles[groupKey] || groupKey}</h3>
                    <div class="text-xs text-gray-600">${slides.filter(b => earnedBadges.includes(b.id)).length}/${slides.length} earned</div>
                </div>
                ${controls}
            </section>
        `;
    }).join('');

    // Wrap groups in a responsive grid: 1 column on mobile, 2 on md+
    badgesContainer.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${carouselsHTML}</div>
    `;

    // Minimal carousel behavior (no external deps)
    const initCarousel = (root) => {
        const track = root.querySelector(':scope > .w-full');
        const slides = Array.from(track.querySelectorAll('.carousel-slide'));
        const prevBtn = root.querySelector('[data-action="prev"]');
        const nextBtn = root.querySelector('[data-action="next"]');
        const dots = Array.from(root.parentElement.querySelectorAll('[role="tablist"] button'));
        let current = slides.findIndex(s => s.classList.contains('active'));

        const update = (index) => {
            current = (index + slides.length) % slides.length;
            slides.forEach((s, i) => {
                // Tailwind swap: use hidden/block
                if (i === current) {
                    s.classList.add('active');
                    s.classList.remove('hidden');
                    s.classList.add('block');
                    s.setAttribute('aria-hidden', 'false');
                } else {
                    s.classList.remove('active');
                    s.classList.remove('block');
                    s.classList.add('hidden');
                    s.setAttribute('aria-hidden', 'true');
                }
            });
            dots.forEach((d, i) => {
                d.classList.toggle('bg-blue-500', i === current);
                d.classList.toggle('bg-gray-200', i !== current);
                d.setAttribute('aria-selected', i === current ? 'true' : 'false');
            });
        };

        prevBtn?.addEventListener('click', () => update(current - 1));
        nextBtn?.addEventListener('click', () => update(current + 1));
        dots.forEach((d, i) => d.addEventListener('click', () => update(i)));

        // Keyboard navigation
        root.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') update(current - 1);
            else if (e.key === 'ArrowRight') update(current + 1);
        });
    };

    document.querySelectorAll('[role="region"][aria-label$="badge carousel"]').forEach(initCarousel);

    // Use Tailwind utility classes; no injected styles needed
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
