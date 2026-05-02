/**
 * Onboarding System
 * Handles multi-step welcome and setup flow for new users
 */

const onboarding = {
    currentStep: 0,
    selectedLanguage: '',
    steps: [
        {
            id: 'welcome',
            title: 'Welcome to Language Study!',
            content: 'Your personal language learning companion. Track vocabulary, monitor skills, build a portfolio, and share progress with mentors.',
            actions: ['next']
        },
        {
            id: 'language',
            title: 'Select Your Language',
            content: 'Which language are you studying?',
            actions: ['next'],
            requiresInput: true
        },
        {
            id: 'vocabulary',
            title: 'Vocabulary Tracker',
            content: 'Organize words and phrases by category. Add translations, links to media, or pronunciation guides. Quick Review mode helps you practice.',
            actions: ['next', 'skip']
        },
        {
            id: 'skills',
            title: 'Skills Tracker',
            content: 'Track your progress across skills like listening, speaking, reading, and writing. Mark them as not started, in progress, or proficient.',
            actions: ['next', 'skip']
        },
        {
            id: 'portfolio',
            title: 'Portfolio & Sharing',
            content: 'Showcase your work with links to audio/video samples. Share your progress with a mentor using a secure code with customizable access levels.',
            actions: ['next', 'skip']
        },
        {
            id: 'finish',
            title: 'Ready to Go!',
            content: 'You\'re all set. You can adjust settings anytime in the Settings tab. Let\'s get started!',
            actions: ['finish']
        }
    ],

    init() {
        const modal = document.getElementById('onboardingModal');
        if (!modal) {
            console.error('Onboarding modal not found in DOM');
            return;
        }

        this.renderStep();
        this.attachEventListeners();
    },

    renderStep() {
        if (this.currentStep >= this.steps.length) return;

        const step = this.steps[this.currentStep];
        const modal = document.getElementById('onboardingModal');
        const container = document.getElementById('onboardingContent');
        const actionsContainer = document.getElementById('onboardingActions');

        if (!container || !actionsContainer) return;

        // Update content
        document.getElementById('onboardingTitle').textContent = step.title;

        if (step.id === 'language') {
            // Language selection step
            container.innerHTML = `
                <p class="mb-4">${step.content}</p>
                <select id="onboardingLanguageSelect" class="w-full p-2 border rounded bg-white">
                    <option value="">Loading languages...</option>
                </select>
                <p class="text-xs text-gray-500 mt-2">Don't see your language? Request it in Settings.</p>
            `;

            this.populateOnboardingLanguageOptions();
        } else {
            // Regular text step
            container.innerHTML = `<p>${step.content}</p>`;
        }

        // Update progress indicator
        const progress = ((this.currentStep + 1) / this.steps.length) * 100;
        document.getElementById('onboardingProgress').style.width = progress + '%';
        document.getElementById('onboardingStepIndicator').textContent =
            `Step ${this.currentStep + 1} of ${this.steps.length}`;

        // Render action buttons
        this.renderActions(step);
    },

    async getAvailableLanguages() {
        const mainSelect = document.getElementById('languageSelect');
        const selectedMainLanguage = mainSelect?.value || '';

        // Keep onboarding in sync with the same dynamic source used by settings/admin.
        if (typeof populateLanguageSelectOptions === 'function') {
            try {
                await populateLanguageSelectOptions(selectedMainLanguage);
            } catch (err) {
                console.warn('Could not refresh language options for onboarding:', err);
            }
        }

        const fromMainSelect = Array.from(mainSelect?.querySelectorAll('option') || [])
            .map((opt) => (opt.value || '').trim())
            .filter(Boolean);

        if (fromMainSelect.length > 0) {
            return Array.from(new Set(fromMainSelect)).sort((a, b) => a.localeCompare(b));
        }

        // Fallback for environments where options are not yet populated in the main select.
        if (typeof db !== 'undefined' && db?.collection) {
            try {
                const docs = await db.collection('languageLinks').get();
                const fromDb = docs.docs
                    .map((doc) => (doc.id || '').trim())
                    .filter(Boolean);

                if (fromDb.length > 0) {
                    return Array.from(new Set(fromDb)).sort((a, b) => a.localeCompare(b));
                }
            } catch (err) {
                console.warn('Could not load onboarding languages from Firestore:', err);
            }
        }

        return ['ASL', 'Spanish'];
    },

    async populateOnboardingLanguageOptions() {
        const select = document.getElementById('onboardingLanguageSelect');
        if (!select) return;

        const languages = await this.getAvailableLanguages();

        // User may have left the step before async work finishes.
        const activeSelect = document.getElementById('onboardingLanguageSelect');
        if (!activeSelect) return;

        activeSelect.innerHTML = '<option value="">-- Select a language --</option>';
        languages.forEach((language) => {
            const option = document.createElement('option');
            option.value = language;
            option.textContent = language;
            activeSelect.appendChild(option);
        });

        if (this.selectedLanguage && languages.includes(this.selectedLanguage)) {
            activeSelect.value = this.selectedLanguage;
        }
    },

    renderActions(step) {
        const actionsContainer = document.getElementById('onboardingActions');
        actionsContainer.innerHTML = '';

        step.actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = action === 'finish'
                ? 'px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors'
                : action === 'next'
                    ? 'px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
                    : 'px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors';

            btn.textContent = action === 'finish' ? 'Finish & Start' :
                action === 'next' ? 'Next →' : 'Skip';

            btn.addEventListener('click', () => {
                if (action === 'finish') {
                    this.complete();
                } else if (action === 'next') {
                    this.next();
                } else if (action === 'skip') {
                    this.skipToFinalStep();
                }
            });

            actionsContainer.appendChild(btn);
        });
    },

    next() {
        const step = this.steps[this.currentStep];

        // Validate language selection if on language step
        if (step.id === 'language') {
            const select = document.getElementById('onboardingLanguageSelect');
            if (!select || !select.value) {
                alert('Please select a language to continue.');
                return;
            }
            // Save language selection
            this.selectedLanguage = select.value.trim();
        }

        this.currentStep++;
        if (this.currentStep < this.steps.length) {
            this.renderStep();
        }
    },

    skipToFinalStep() {
        const finalStepIndex = this.steps.findIndex((step) => step.id === 'finish');
        this.currentStep = finalStepIndex >= 0 ? finalStepIndex : this.steps.length - 1;
        this.renderStep();
    },

    complete() {
        const modal = document.getElementById('onboardingModal');
        if (modal) {
            modal.classList.add('hidden');
        }

        // Save language selection if made
        if (this.selectedLanguage) {
            const languageSelect = document.getElementById('languageSelect');
            if (languageSelect) {
                languageSelect.value = this.selectedLanguage;
                // Trigger change event to load language resources
                languageSelect.dispatchEvent(new Event('change'));
            }
        }

        // Mark onboarding as complete
        if (typeof writeUserSettingsPatch === 'function') {
            writeUserSettingsPatch({ firstLogin: false });
        }
    },

    attachEventListeners() {
        const closeBtn = document.getElementById('onboardingCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.complete();
            });
        }
    },

    show() {
        const modal = document.getElementById('onboardingModal');
        if (modal) {
            modal.classList.remove('hidden');
            this.init();
        }
    }
};

/**
 * Show onboarding for new users
 */
function showOnboarding() {
    onboarding.currentStep = 0; // Reset to step 1
    onboarding.show();
}
