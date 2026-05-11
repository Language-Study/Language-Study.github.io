// ===== SETTINGS & MENTOR =====

// Settings Modal Tab Controller
class SettingsTabController {
    constructor() {
        this.currentTab = 'display';
        this.initializeListeners();
    }

    activateTab(tabName) {
        this.currentTab = tabName;

        // Update button states
        const tabButtons = document.querySelectorAll('[data-settings-tab]');
        tabButtons.forEach(btn => {
            const btnTabName = btn.getAttribute('data-settings-tab');
            if (btnTabName === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update content visibility
        const tabContents = document.querySelectorAll('[data-settings-tab-content]');
        tabContents.forEach(content => {
            if (content.id === tabName + 'Tab') {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
    }

    initializeListeners() {
        document.addEventListener('click', (e) => {
            const tabButton = e.target.closest('[data-settings-tab]');
            if (tabButton) {
                const tabName = tabButton.getAttribute('data-settings-tab');
                this.activateTab(tabName);
            }
        });
    }
}

// Initialize settings tab controller
const settingsTabController = new SettingsTabController();

// Mobile menu elements for closing when opening settings
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileNavDropdown = document.getElementById('mobileNavDropdown');

// Settings modal (both desktop and mobile)
const openSettingsHandler = () => {
    openModal('settingsModal');
    // Activate the default tab
    settingsTabController.activateTab('display');
    // Gate auth-related options based on user's login providers
    updateAuthOptionVisibility();
    updateMentorCodeToggle();
    updateMentorAccessLevelUI();
    // Load current homepage setting
    loadHomepageTabSetting();
    // Ensure language switcher is properly shown/hidden based on selected languages
    const checkboxes = document.querySelectorAll('#languageCheckboxesContainer input[type="checkbox"]');
    const selectedLanguages = Array.from(checkboxes)
        .filter((cb) => cb.checked)
        .map((cb) => cb.value);
    updateLanguageSwitcher(selectedLanguages);
    // Close mobile menu if open
    if (mobileNavDropdown && mobileMenuBtn) {
        mobileNavDropdown.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }
    // Move focus into the modal for keyboard users
    const settingsModalEl = document.getElementById('settingsModal');
    if (settingsModalEl) {
        settingsModalEl.focus();
        // Also focus first interactive element inside modal if present
        const firstFocusable = settingsModalEl.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) firstFocusable.focus();
    }
};

document.getElementById('openSettingsBtn')?.addEventListener('click', openSettingsHandler);
const openSettingsBtnMobile = document.getElementById('openSettingsBtnMobile');
openSettingsBtnMobile?.addEventListener('click', openSettingsHandler);

document.getElementById('closeSettingsBtn')?.addEventListener('click', () => {
    closeModal('settingsModal');
});

document.getElementById('settingsModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('settingsModal')) {
        closeModal('settingsModal');
    }
});

// Show or hide email/password settings based on auth provider
function updateAuthOptionVisibility() {
    try {
        const user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : (typeof auth !== 'undefined' ? auth.currentUser : null);
        const providers = Array.isArray(user?.providerData) ? user.providerData.map(p => p.providerId) : [];
        const hasPasswordProvider = providers.includes('password');

        // Settings modal elements
        const changeEmailTabBtn = document.querySelector('[data-tab-target="#changeEmailSection"]');
        const resetPasswordTabBtn = document.querySelector('[data-tab-target="#resetPasswordSection"]');
        const changeEmailSection = document.getElementById('changeEmailSection');
        const resetPasswordSection = document.getElementById('resetPasswordSection');

        if (!hasPasswordProvider) {
            // Hide options that don't apply to Google-only accounts
            changeEmailTabBtn?.classList.add('hidden');
            resetPasswordTabBtn?.classList.add('hidden');
            changeEmailSection?.classList.add('hidden');
            resetPasswordSection?.classList.add('hidden');
        } else {
            // Ensure options are visible for email/password users
            changeEmailTabBtn?.classList.remove('hidden');
            resetPasswordTabBtn?.classList.remove('hidden');
            // Leave sections hidden by default; tabs or other logic can reveal them
        }
    } catch (err) {
        console.warn('Could not update auth option visibility:', err);
    }
}

function sanitizeExternalResourceUrl(url) {
    if (typeof url !== 'string') return null;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
    } catch (e) {
        return null;
    }
}

function getMentorSettingsErrorMessage(error, fallbackMessage = 'Failed to update mentor settings.') {
    const message = String(error?.message || '').trim();
    if (!message) return fallbackMessage;

    const lower = message.toLowerCase();
    if (lower.includes('rate limit') || lower.includes('too many')) {
        return message;
    }
    if (lower.includes('permission denied') || lower.includes('insufficient permissions')) {
        return 'You do not have permission to update mentor settings right now. Please sign out and sign back in.';
    }

    return message;
}

// Progress metrics toggle
const toggleProgress = document.getElementById('toggleProgress');
toggleProgress?.addEventListener('change', async (e) => {
    await setProgressEnabled(e.target.checked);
    await updateProgressVisibility();
    renderProgressMetrics();
});

// Achievements toggle
const toggleAchievements = document.getElementById('toggleAchievements');
toggleAchievements?.addEventListener('change', async (e) => {
    await setAchievementsEnabled(e.target.checked);
    await updateAchievementsVisibility();
    const section = document.getElementById('achievementsSection');
    // if (section && section.style.display !== 'none' && typeof renderASLClubAchievements === 'function') {
    //     renderASLClubAchievements();
    // }
});

// Mentor view form submission
const mentorViewForm = document.getElementById('mentorViewForm');
mentorViewForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mentorCodeInput = document.getElementById('mentorCodeInput');
    const mentorViewError = document.getElementById('mentorViewError');

    if (!mentorCodeInput || !mentorCodeInput.value.trim()) {
        mentorViewError.textContent = 'Please enter a mentor code.';
        mentorViewError.classList.remove('hidden');
        return;
    }

    const code = mentorCodeInput.value.toUpperCase().trim();

    try {
        // Validate mentor code format (5 alphanumeric)
        if (!/^[A-Z0-9]{5}$/.test(code)) {
            throw new Error('Please enter a valid 5-digit code.');
        }

        // Validate code exists in Firestore
        const doc = await db.collection('mentorCodes').doc(code).get();
        if (!doc.exists) {
            throw new Error('Invalid mentor code.');
        }

        // Check if mentor code is enabled
        if (doc.data().enabled === false) {
            throw new Error('This mentor code has been disabled.');
        }

        // Redirect to current page with mentor code as query parameter
        const url = new URL(window.location.href);
        url.searchParams.set('mentor', code);
        window.location.href = url.toString();
    } catch (error) {
        mentorViewError.textContent = error.message || 'Error validating code. Please try again.';
        mentorViewError.classList.remove('hidden');
        console.error('Mentor code validation error:', error);
    }
});

// Mentor code toggle with confirmation
const mentorToggle = document.getElementById('toggleMentorCode');
mentorToggle?.addEventListener('change', async (e) => {
    const nextChecked = e.target.checked;
    const previousChecked = !nextChecked;

    if (!nextChecked) {
        if (!confirm('Are you sure you want to disable Mentor Access? Your mentor will no longer be able to view your progress.')) {
            mentorToggle.checked = true;
            return;
        }
    }

    try {
        await setMentorCodeEnabled(nextChecked);
        const updated = await showMentorCode(false, { suppressErrorToast: true });
        if (!updated) {
            throw new Error('Mentor settings changed, but we could not refresh your mentor code display.');
        }
    } catch (error) {
        mentorToggle.checked = previousChecked;
        showToast('Error: ' + getMentorSettingsErrorMessage(error));
    }
});

// Mentor access level selector
const mentorAccessLevelSelect = document.getElementById('mentorAccessLevelSelect');
mentorAccessLevelSelect?.addEventListener('change', async (e) => {
    const selectedLevel = e.target.value;

    if (selectedLevel === 'full') {
        const confirmed = confirm('Allow Edit All? Mentors will be able to add, edit, and delete your learning data.');
        if (!confirmed) {
            const current = await getMentorAccessLevel();
            e.target.value = current;
            return;
        }
    }

    if (selectedLevel === 'status') {
        const confirmed = confirm('Allow Status Updates Only? Mentors will be able to change progress statuses but not edit content.');
        if (!confirmed) {
            const current = await getMentorAccessLevel();
            e.target.value = current;
            return;
        }
    }

    await setMentorAccessLevel(selectedLevel);
    await updateMentorAccessLevelUI();
    showToast('✓ Mentor access level updated');
});

// Regenerate mentor code with confirmation
const regenBtn = document.getElementById('regenerateMentorCodeBtn');
regenBtn?.addEventListener('click', async (e) => {
    if (!confirm('Are you sure you want to regenerate your mentor code? Your old code will no longer work.')) {
        e.preventDefault();
        return;
    }

    try {
        const regenerated = await showMentorCode(true, { suppressErrorToast: true });
        if (!regenerated) {
            throw new Error('Could not regenerate mentor code.');
        }
        showToast('Code regenerated.');
    } catch (error) {
        showToast('Error: ' + getMentorSettingsErrorMessage(error, 'Could not regenerate mentor code.'));
    }
});

// Delete account
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
deleteAccountBtn?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.')) {
        return;
    }

    try {
        showLoadingSpinner(true, 'Deleting account...');
        await deleteUserAccount();
        alert('Your account has been deleted.');
        window.location.href = 'login.html';
    } catch (error) {
        showLoadingSpinner(false);
        showToast('Error: ' + error.message);
    }
});

// Change email
const changeEmailBtn = document.getElementById('changeEmailBtn');
changeEmailBtn?.addEventListener('click', async () => {
    const newEmail = document.getElementById('changeEmailInput').value.trim();
    const changeEmailMsg = document.getElementById('changeEmailMsg');

    try {
        await changeUserEmail(newEmail);
        changeEmailMsg.textContent = 'A verification link has been sent to your new email address. Please check your inbox.';
        changeEmailMsg.className = 'text-sm mt-2 text-blue-600';
    } catch (error) {
        changeEmailMsg.textContent = 'Error: ' + error.message;
        changeEmailMsg.className = 'text-sm mt-2 text-red-600';
    }
});

// Reset password
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
resetPasswordBtn?.addEventListener('click', async () => {
    const email = document.getElementById('resetEmailInput').value.trim();
    const resetPasswordMsg = document.getElementById('resetPasswordMsg');

    if (!email) {
        resetPasswordMsg.textContent = 'Please enter your email address.';
        resetPasswordMsg.className = 'text-sm mt-2 text-red-600';
        return;
    }

    try {
        await sendPasswordResetEmail(email);
        resetPasswordMsg.textContent = 'Password reset email sent. Please check your inbox.';
        resetPasswordMsg.className = 'text-sm mt-2 text-blue-600';
    } catch (error) {
        resetPasswordMsg.textContent = 'Error: ' + error.message;
        resetPasswordMsg.className = 'text-sm mt-2 text-red-600';
    }
});

// Google Account linking
const googleSignInToggleBtn = document.getElementById('googleSignInToggleBtn');
googleSignInToggleBtn?.addEventListener('click', async () => {
    try {
        if (isGoogleLinked()) {
            await unlinkGoogleSignIn();
            googleSignInToggleBtn.textContent = 'Link Google Account';
            showToast('âœ“ Google Account unlinked');
        } else {
            await linkGoogleSignIn();
            googleSignInToggleBtn.textContent = 'Unlink Google Account';
            showToast('âœ“ Google Account linked');
        }
    } catch (error) {
        showToast('Error: ' + error.message);
    }
});

// Update button text on load if user present
if (googleSignInToggleBtn && typeof isGoogleLinked === 'function' && typeof currentUser !== 'undefined' && currentUser) {
    googleSignInToggleBtn.textContent = isGoogleLinked() ? 'Unlink Google Account' : 'Link Google Account';
}

// Language selection with checkboxes
async function populateLanguageCheckboxes() {
    const container = document.getElementById('languageCheckboxesContainer');
    if (!container) return;

    try {
        // Fetch available languages from Firestore
        const docs = await db.collection('languageLinks').get();
        const availableLanguages = docs.docs
            .map((doc) => {
                const name = String(doc.id || '').trim();
                return name ? name : null;
            })
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

        // Also include hardcoded options if not already in the list
        const hardcodedLanguages = ['ASL', 'Spanish'];
        const allLanguages = Array.from(new Set([...availableLanguages, ...hardcodedLanguages])).sort((a, b) => a.localeCompare(b));

        container.innerHTML = '';
        allLanguages.forEach((language) => {
            const label = document.createElement('label');
            label.className = 'flex items-center gap-2 cursor-pointer';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = language;
            checkbox.className = 'h-4 w-4 text-blue-600 rounded cursor-pointer';
            checkbox.id = `lang-checkbox-${language}`;
            checkbox.addEventListener('change', handleLanguageCheckboxChange);

            const text = document.createElement('span');
            text.className = 'text-sm sm:text-base text-gray-700';
            text.textContent = language;

            label.appendChild(checkbox);
            label.appendChild(text);
            container.appendChild(label);
        });

        // Restore checked state from settings
        const settings = await getUserSettingsData();
        const learnedLanguages = settings?.learnedLanguages || [];
        learnedLanguages.forEach((lang) => {
            const checkbox = document.getElementById(`lang-checkbox-${lang}`);
            if (checkbox) checkbox.checked = true;
        });
    } catch (error) {
        console.error('Error populating language checkboxes:', error);
    }
}

async function handleLanguageCheckboxChange() {
    const checkboxes = document.querySelectorAll('#languageCheckboxesContainer input[type="checkbox"]');
    const selectedLanguages = Array.from(checkboxes)
        .filter((cb) => cb.checked)
        .map((cb) => cb.value);

    try {
        // Save the list of learned languages
        await writeUserSettingsPatch({ learnedLanguages: selectedLanguages });

        // Update the language switcher dropdown
        await updateLanguageSwitcher(selectedLanguages);

        // If exactly one language selected, set it as current
        if (selectedLanguages.length === 1) {
            const language = selectedLanguages[0];
            setSelectedLearningLanguage(language);
            await writeUserSettingsPatch({ languageLearning: language });
        } else if (selectedLanguages.length === 0) {
            // No languages selected, clear current
            setSelectedLearningLanguage('');
            await writeUserSettingsPatch({ languageLearning: '' });
        }
        // If multiple languages selected, current language is managed by the switcher

        // Trigger UI updates
        if (typeof handleLanguageSelectionChange === 'function') {
            await handleLanguageSelectionChange(getSelectedLearningLanguage());
        }
        if (typeof renderVocabularyWithCurrentFilter === 'function') {
            renderVocabularyWithCurrentFilter();
        }
        if (typeof renderSkillsWithCurrentFilter === 'function') {
            renderSkillsWithCurrentFilter();
        }
        if (typeof renderPortfolio === 'function') {
            renderPortfolio();
        }
    } catch (error) {
        console.error('Error updating language selection:', error);
    }
}

async function updateLanguageSwitcher(languages) {
    const container = document.getElementById('languageSwitcherContainer');
    const switcher = document.getElementById('languageSwitcher');

    if (!container || !switcher) return;

    if (languages.length <= 1) {
        // Hide switcher if one or fewer languages
        container.classList.add('hidden');
    } else {
        // Show switcher if multiple languages
        container.classList.remove('hidden');

        // Populate switcher options
        switcher.innerHTML = '';
        languages.forEach((language) => {
            const option = document.createElement('option');
            option.value = language;
            option.textContent = language;
            switcher.appendChild(option);
        });

        // Set current language if it's in the list
        const currentLang = getSelectedLearningLanguage();
        if (currentLang && languages.includes(currentLang)) {
            switcher.value = currentLang;
        } else if (languages.length > 0) {
            switcher.value = languages[0];
            setSelectedLearningLanguage(languages[0]);
        }
    }
}

// Language switcher change handler
const languageSwitcher = document.getElementById('languageSwitcher');
languageSwitcher?.addEventListener('change', async (e) => {
    const selectedLanguage = e.target.value;
    setSelectedLearningLanguage(selectedLanguage);

    try {
        await writeUserSettingsPatch({ languageLearning: selectedLanguage });

        if (typeof handleLanguageSelectionChange === 'function') {
            await handleLanguageSelectionChange(selectedLanguage);
        }

        if (typeof renderVocabularyWithCurrentFilter === 'function') {
            renderVocabularyWithCurrentFilter();
        }
        if (typeof renderSkillsWithCurrentFilter === 'function') {
            renderSkillsWithCurrentFilter();
        }
        if (typeof renderPortfolio === 'function') {
            renderPortfolio();
        }
    } catch (error) {
        console.error('Error switching language:', error);
    }
});

// Restore language selection on load
onAuthStateChanged?.(async (user) => {
    if (!user) return;

    try {
        if (typeof initializeLanguageResourceAdmin === 'function') {
            await initializeLanguageResourceAdmin();
            const requestedTab = new URLSearchParams(window.location.search).get('tab');
            if (requestedTab === 'admin' && typeof isCurrentUserAdmin === 'function' && isCurrentUserAdmin() && window.tabController) {
                window.tabController.activateTab('admin');
            }
        }

        // Populate checkboxes
        await populateLanguageCheckboxes();

        const settings = await getUserSettingsData(false, user.uid);
        if (settings?.languageLearning) {
            setSelectedLearningLanguage(settings.languageLearning);
        } else if (typeof handleLanguageSelectionChange === 'function') {
            setSelectedLearningLanguage('');
            await handleLanguageSelectionChange('');
        }
    } catch (error) {
        console.error('Error restoring language:', error);
    }
});
/**
 * Save the selected homepage tab preference to Firestore
 * @async
 * @param {string} tabName - The tab name (vocabulary, skills, or portfolio)
 * @returns {Promise<void>}
 */
async function setHomepageTab(tabName) {
    if (!currentUser) return;

    const validTabs = ['vocabulary', 'skills', 'portfolio'];
    if (!validTabs.includes(tabName)) {
        console.warn(`Invalid homepage tab: ${tabName}`);
        return;
    }

    try {
        await writeUserSettingsPatch({ homepageTab: tabName });
    } catch (error) {
        console.error('Error saving homepage tab preference:', error);
        showToast('Error saving preference. Please try again.');
    }
}

/**
 * Get the saved homepage tab preference from Firestore
 * @async
 * @returns {Promise<string>} The saved homepage tab (defaults to 'vocabulary')
 */
async function getHomepageTab() {
    if (!currentUser) return 'vocabulary';

    try {
        const settings = await getUserSettingsData();
        if (settings?.homepageTab) {
            return settings.homepageTab;
        }
    } catch (error) {
        console.error('Error loading homepage tab preference:', error);
    }

    return 'vocabulary'; // Default to vocabulary
}

/**
 * Load and display the current homepage tab setting in the settings modal
 * @async
 * @returns {Promise<void>}
 */
async function loadHomepageTabSetting() {
    const homepageSelect = document.getElementById('homepageTabSelect');
    if (!homepageSelect) return;

    try {
        const currentTab = await getHomepageTab();
        homepageSelect.value = currentTab;
    } catch (error) {
        console.error('Error loading homepage setting:', error);
    }
}

// Homepage tab selection change handler
const homepageTabSelect = document.getElementById('homepageTabSelect');
homepageTabSelect?.addEventListener('change', async (e) => {
    const selectedTab = e.target.value;
    await setHomepageTab(selectedTab);
    showToast(`âœ“ Homepage set to ${selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)}`);
});
