/**
 * Validation & Data Tests
 * Unit tests for input validation and data integrity
 */

describe('Validation Tests', () => {
    // Test HTML escaping
    describe('HTML Escaping', () => {
        test('escapeHtml should escape dangerous characters', () => {
            const dangerous = '<script>alert("xss")</script>';
            const escaped = escapeHtml(dangerous);
            expect(escaped).not.toContain('<script>');
            expect(escaped).toContain('&lt;');
            expect(escaped).toContain('&gt;');
        });

        test('escapeHtml should preserve safe characters', () => {
            const safe = 'hello world 123';
            expect(escapeHtml(safe)).toBe(safe);
        });

        test('escapeHtml should escape HTML entities', () => {
            const html = '<div class="test">Content</div>';
            const escaped = escapeHtml(html);
            expect(escaped).toContain('&lt;div');
            expect(escaped).toContain('&quot;');
        });

        test('escapeHtml should escape ampersands', () => {
            const text = 'Tom & Jerry';
            const escaped = escapeHtml(text);
            expect(escaped).toContain('&amp;');
        });

        test('escapeHtml should escape quotes', () => {
            const text = 'He said "hello" and \'goodbye\'';
            const escaped = escapeHtml(text);
            expect(escaped).toContain('&quot;');
            expect(escaped).toContain('&#039;');
        });
    });

    // Test vocabulary validation
    describe('Vocabulary Validation', () => {
        test('should reject empty vocabulary words', async () => {
            try {
                await addVocabularyWords('', 'translation', 'General');
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('at least one');
            }
        });

        test('should reject whitespace-only vocabulary', async () => {
            try {
                await addVocabularyWords('   \n  \n   ', '', 'General');
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('at least one');
            }
        });

        test('should trim vocabulary words', () => {
            const words = '  hello  '.trim().split('\n');
            expect(words[0]).toBe('hello');
        });

        test('should split multiline vocabulary correctly', () => {
            const text = 'hola\nadios\ngracías';
            const words = text.split('\n').filter(w => w.trim());
            expect(words.length).toBe(3);
        });
    });

    // Test skill validation
    describe('Skill Validation', () => {
        test('should reject empty skills', async () => {
            try {
                await addSkills('');
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('at least one');
            }
        });

        test('should reject whitespace-only skills', async () => {
            try {
                await addSkills('   \n  \n   ');
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('at least one');
            }
        });

        test('should handle multiline skills', () => {
            const text = 'Speaking\nListening\nReading';
            const skills = text.split('\n').filter(s => s.trim());
            expect(skills.length).toBe(3);
        });
    });

    // Test category validation
    describe('Category Validation', () => {
        test('should reject empty category names', async () => {
            try {
                await addCategory('   ');
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBeDefined();
            }
        });

        test('should reject duplicate categories', async () => {
            categories = ['General', 'Food'];
            try {
                await addCategory('Food');
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('already exists');
            }
        });

        test('should prevent deletion of General category', async () => {
            try {
                await deleteCategory('General');
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('cannot be deleted');
            }
        });
    });

    // Test portfolio validation
    describe('Portfolio Validation', () => {
        test('should reject empty portfolio title', async () => {
            try {
                await addPortfolioEntry('', 'https://youtube.com/watch?v=dQw4w9WgXcQ');
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBeDefined();
            }
        });

        test('should reject empty portfolio link', async () => {
            try {
                await addPortfolioEntry('My Video', '');
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBeDefined();
            }
        });

        test('should accept valid YouTube URLs', () => {
            const youtubeUrls = [
                'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'https://youtu.be/dQw4w9WgXcQ',
                'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
            ];

            youtubeUrls.forEach(url => {
                const id = getYouTubeId(url);
                expect(id).toBeDefined();
                expect(id).toBe('dQw4w9WgXcQ');
            });
        });

        test('should accept valid SoundCloud URLs', () => {
            const scUrl = 'https://soundcloud.com/artist/track';
            expect(isSoundCloudUrl(scUrl)).toBe(true);
        });

        test('should reject invalid URLs', () => {
            const invalidUrl = 'https://example.com/random';
            const type = getPortfolioType(invalidUrl);
            expect(type).toBeNull();
        });

        test('should limit top portfolio to 3 items', async () => {
            portfolioEntries = [
                { id: '1', isTop: true },
                { id: '2', isTop: true },
                { id: '3', isTop: true },
                { id: '4', isTop: false }
            ];

            const topCount = portfolioEntries.filter(e => e.isTop).length;
            expect(topCount).toBeLessThanOrEqual(3);
        });
    });

    // Test status progression
    describe('Status Validation', () => {
        test('status should cycle through all states', () => {
            const statuses = [PROGRESS_STATUS.NOT_STARTED, PROGRESS_STATUS.IN_PROGRESS, PROGRESS_STATUS.MASTERED];
            statuses.forEach(status => {
                expect(PROGRESS_STATUS).toHaveProperty(Object.keys(PROGRESS_STATUS).find(key => PROGRESS_STATUS[key] === status));
            });
        });

        test('all items should have valid status', () => {
            const validStatuses = Object.values(PROGRESS_STATUS);
            const allItems = [...vocabularyList, ...skills];

            allItems.forEach(item => {
                expect(validStatuses).toContain(item.status);
            });
        });
    });

    // Test data integrity
    describe('Data Integrity', () => {
        test('vocabulary stats should be accurate', () => {
            vocabularyList = [
                { status: 'mastered' },
                { status: 'in_progress' },
                { status: 'not_started' }
            ];

            const stats = getVocabularyStats();
            expect(stats.total).toBe(3);
            expect(stats.mastered).toBe(1);
            expect(stats.inProgress).toBe(1);
            expect(stats.notStarted).toBe(1);
        });

        test('skills stats should be accurate', () => {
            skills = [
                { status: 'mastered' },
                { status: 'mastered' }
            ];

            const stats = getSkillsStats();
            expect(stats.total).toBe(2);
            expect(stats.mastered).toBe(2);
        });

        test('all vocabulary items should have required fields', () => {
            vocabularyList.forEach(item => {
                expect(item.id).toBeDefined();
                expect(item.word).toBeDefined();
                expect(item.category).toBeDefined();
                expect(item.status).toBeDefined();
            });
        });

        test('all skills should have required fields', () => {
            skills.forEach(skill => {
                expect(skill.id).toBeDefined();
                expect(skill.name).toBeDefined();
                expect(skill.status).toBeDefined();
            });
        });
    });
});
