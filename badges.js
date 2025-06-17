// badges.js
// Contains badge definitions and related logic

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
