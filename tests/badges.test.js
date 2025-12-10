/**
 * Badge System Tests
 * Unit tests for badge logic, validation, and earning
 */

describe('Badge System Tests', () => {
    let mockVocabularyList;
    let mockSkills;
    let mockPortfolioEntries;

    beforeEach(() => {
        // Setup mocks
        mockVocabularyList = [
            { word: 'hola', status: 'mastered' },
            { word: 'goodbye', status: 'not_started' }
        ];
        mockSkills = [
            { name: 'Speaking', status: 'in_progress' }
        ];
        mockPortfolioEntries = [
            { title: 'Video 1', isTop: false }
        ];
    });

    // Test badge check functions
    describe('Badge Checks', () => {
        test('should check first_word badge correctly', () => {
            // Simulate badge check
            const badge = BADGES.find(b => b.id === 'first_word');
            expect(badge.check()).toBe(true);
        });

        test('should check ten_words badge correctly', () => {
            const badge = BADGES.find(b => b.id === 'ten_words');
            // With 2 items, should be false
            expect(badge.check()).toBe(false);
        });

        test('should check mastered badges correctly', () => {
            const badge = BADGES.find(b => b.id === 'ten_mastered');
            // With only 1 mastered, should be false
            expect(badge.check()).toBe(false);
        });

        test('should check portfolio badges correctly', () => {
            const badge = BADGES.find(b => b.id === 'first_portfolio');
            expect(badge.check()).toBe(true);
        });

        test('should check category explorer badge correctly', () => {
            const badge = BADGES.find(b => b.id === 'all_categories');
            expect(badge.check()).toBe(false);
        });
    });

    // Test earned badges
    describe('Earned Badges', () => {
        test('isBadgeEarned should return correct state', () => {
            earnedBadges = ['first_word', 'first_portfolio'];
            expect(isBadgeEarned('first_word')).toBe(true);
            expect(isBadgeEarned('ten_words')).toBe(false);
        });

        test('getEarnedBadgeObjects should return badge objects', () => {
            earnedBadges = ['first_word', 'first_portfolio'];
            const earned = getEarnedBadgeObjects();
            expect(earned.length).toBe(2);
            expect(earned[0].id).toBe('first_word');
        });

        test('getBadgeProgress should calculate percentage correctly', () => {
            earnedBadges = Array(7).fill(0).map((_, i) => BADGES[i].id);
            const progress = getBadgeProgress();
            expect(progress).toBe(Math.round((7 / BADGES.length) * 100));
        });
    });

    // Test badge earning logic
    describe('Badge Earning', () => {
        test('should detect new badges correctly', () => {
            const previouslyEarned = ['first_word'];
            const currentlyEarned = ['first_word', 'ten_words'];
            const newBadges = currentlyEarned.filter(b => !previouslyEarned.includes(b));
            expect(newBadges).toContain('ten_words');
        });

        test('should not duplicate badge notifications', () => {
            const previouslyEarned = ['first_word'];
            const currentlyEarned = ['first_word'];
            const newBadges = currentlyEarned.filter(b => !previouslyEarned.includes(b));
            expect(newBadges.length).toBe(0);
        });
    });

    // Test badge validation
    describe('Badge Validation', () => {
        test('all badges should have required properties', () => {
            BADGES.forEach(badge => {
                expect(badge.id).toBeDefined();
                expect(badge.name).toBeDefined();
                expect(badge.description).toBeDefined();
                expect(badge.icon).toBeDefined();
                expect(typeof badge.check).toBe('function');
            });
        });

        test('badge IDs should be unique', () => {
            const ids = BADGES.map(b => b.id);
            const uniqueIds = new Set(ids);
            expect(ids.length).toBe(uniqueIds.size);
        });

        test('badge check functions should return boolean', () => {
            BADGES.forEach(badge => {
                const result = badge.check();
                expect(typeof result).toBe('boolean');
            });
        });
    });

    // Test badge progression paths
    describe('Badge Progression', () => {
        test('should unlock vocabulary badges in order', () => {
            const vocabBadges = BADGES.filter(b => b.id.includes('word'));
            expect(vocabBadges.length).toBeGreaterThan(0);
            // First badge should be achievable with 1 word
            expect(vocabBadges[0].check()).toBeDefined();
        });

        test('should unlock skill badges in order', () => {
            const skillBadges = BADGES.filter(b => b.id.includes('skill'));
            expect(skillBadges.length).toBeGreaterThan(0);
        });

        test('should unlock portfolio badges in sequence', () => {
            const portfolioBadges = BADGES.filter(b => b.id.includes('portfolio'));
            expect(portfolioBadges[0].id).toBe('first_portfolio');
            expect(portfolioBadges[1].id).toBe('five_portfolio');
        });
    });
});
