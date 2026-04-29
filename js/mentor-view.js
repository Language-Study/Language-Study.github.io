/**
 * Mentor View Module
 * Handles mentor code validation, mentor view UI, and read-only mode
 */
const MENTOR_CODE_REGEX = /^[A-Z0-9]{5}$/;
const MENTOR_VIEW_ACCESS_LEVELS = {
    VIEW: 'view',
    STATUS: 'status',
    FULL: 'full'
};
const MENTOR_EXIT_LABEL = 'Exit Mentor Mode';

function normalizeMentorAccessLevel(level) {
    if (level === MENTOR_VIEW_ACCESS_LEVELS.STATUS || level === MENTOR_VIEW_ACCESS_LEVELS.FULL) {
        return level;
    }
    return MENTOR_VIEW_ACCESS_LEVELS.VIEW;
}

function getCurrentMentorAccessLevel() {
    return normalizeMentorAccessLevel(window.mentorAccessLevelForView);
}

function canMentorEditStatus() {
    if (!window.isMentorView) return false;
    const level = getCurrentMentorAccessLevel();
    return level === MENTOR_VIEW_ACCESS_LEVELS.STATUS || level === MENTOR_VIEW_ACCESS_LEVELS.FULL;
}

function canMentorEditAll() {
    return window.isMentorView && getCurrentMentorAccessLevel() === MENTOR_VIEW_ACCESS_LEVELS.FULL;
}

window.getCurrentMentorAccessLevel = getCurrentMentorAccessLevel;
window.canMentorEditStatus = canMentorEditStatus;
window.canMentorEditAll = canMentorEditAll;

function getRawMentorCodeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('mentor') || '').trim();
}

function getMentorCodeFromUrl() {
    const rawCode = getRawMentorCodeFromUrl().toUpperCase();
    if (!MENTOR_CODE_REGEX.test(rawCode)) return null;
    return rawCode;
}

/**
 * Detect if this is a mentor view based on URL parameters
 * @returns {boolean}
 */
function isMentorViewEarly() {
    return Boolean(getRawMentorCodeFromUrl());
}

/**
 * Validate mentor code and load mentor view
 * @async
 * @returns {Promise<void>}
 */
async function tryMentorView() {
    const rawMentorCode = getRawMentorCodeFromUrl();
    const mentorCode = getMentorCodeFromUrl();
    const params = new URLSearchParams(window.location.search);

    if (!rawMentorCode) return;
    if (!mentorCode) {
        alert('Invalid mentor code.');
        return;
    }

    try {
        const doc = await db.collection('mentorCodes').doc(mentorCode).get();

        if (!doc.exists) {
            alert('Invalid mentor code.');
            return;
        }

        // Check if mentor code is enabled
        if (doc.data().enabled === false) {
            alert('This mentor code has been disabled.');
            window.location.href = 'index.html';
            return;
        }

        window.isMentorView = true;
        window.mentorUid = doc.data().uid;
        window.mentorAccessLevelForView = await loadMentorAccessLevelForOwner(window.mentorUid);

        // Load data for mentor UID instead of current user
        await loadUserDataForMentor(window.mentorUid);

        // Disable all editing features
        disableEditingUI();
        addMentorModeBanner();
        addMentorBackButton();

        // Activate tab from URL parameter
        const tabParam = params.get('tab') || 'vocabulary';
        if (['vocabulary', 'skills', 'portfolio'].includes(tabParam)) {
            setTimeout(() => {
                if (typeof activateTab === 'function') {
                    activateTab(tabParam);
                }
            }, 100);
        }
    } catch (error) {
        console.error('Error validating mentor view:', error);
        alert('Error loading mentor view. Please try again.');
    }
}

/**
 * Load user data for mentor view (read-only)
 * @async
 * @param {string} uid - User UID to view
 * @returns {Promise<void>}
 */
async function loadUserDataForMentor(uid) {
    try {
        // Temporarily set currentUser for data loading
        const originalUid = currentUser?.uid;
        currentUser = { uid };

        await loadCategories();
        await loadVocabulary();
        await loadSkills();
        await loadPortfolio();
        await renderBadges();
        await renderVocabularyList();
        await renderSkillsList();
        await renderPortfolio();
        await updateProgressVisibility();
        renderProgressMetrics();

        // Restore original user
        if (originalUid) {
            currentUser = { uid: originalUid };
        }
    } catch (error) {
        console.error('Error loading mentor view data:', error);
    }
}

/**
 * Disable editing UI for mentor view
 * @returns {void}
 */
function disableEditingUI() {
    const canStatusEdit = canMentorEditStatus();
    const canFullEdit = canMentorEditAll();

    const alwaysHidden = [
        '#openSettingsBtn',
        '#openSettingsBtnMobile',
        '#openPortfolioShareBtn',
        '#deleteAccountBtn',
        '#mentorAccessSection'
    ];

    alwaysHidden.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.style.display = 'none';
        });
    });

    if (!canFullEdit) {
        const fullEditOnly = [
            '.delete-button',
            '.edit-button',
            '.feature-button',
            '.privacy-button',
            '.subtask-edit-button',
            '.subtask-delete-button',
            '.subtask-add-button',
            '.drag-handle',
            '#addVocabBtn',
            '#addSkillBtn',
            '#addCategoryBtn',
            '#deleteCategoryBtn',
            '#portfolioForm',
            '#newCategoryInput',
            '#vocabularyInput',
            '#translationInput',
            '#skillsInput',
            '#portfolioTitle',
            '#portfolioLink',
            '#openPrintPdfModalBtn'
        ];

        fullEditOnly.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                    el.disabled = true;
                } else {
                    el.style.display = 'none';
                }
            });
        });
    }

    if (!canStatusEdit) {
        document.querySelectorAll('.status-button, .subtask-status-button').forEach(el => {
            el.style.display = 'none';
        });
    }

    // Hide settings modal if open
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('hidden');

    // Disable mentor code input and button
    const mentorCodeInput = document.getElementById('mentorCodeInput');
    const viewAsMentorBtn = document.querySelector('#mentorViewForm button[type="submit"]');
    if (mentorCodeInput) mentorCodeInput.disabled = true;
    if (viewAsMentorBtn) viewAsMentorBtn.disabled = true;

    // Show tab buttons and content
    document.querySelectorAll('.tab-button, .tab-content').forEach(el => {
        el.style.display = '';
        el.disabled = false;
    });

    // Access-level specific actions
    handleMentorAccessActions();
}

async function loadMentorAccessLevelForOwner(ownerUid) {
    try {
        const data = await getUserSettingsData(false, ownerUid);
        if (!data) return MENTOR_VIEW_ACCESS_LEVELS.VIEW;

        if (typeof data.mentorAccessLevel === 'string') {
            return normalizeMentorAccessLevel(data.mentorAccessLevel);
        }

        if (data.mentorQuickReviewEnabled === true) {
            return MENTOR_VIEW_ACCESS_LEVELS.STATUS;
        }
    } catch (error) {
        console.error('Error loading mentor access level:', error);
    }

    return MENTOR_VIEW_ACCESS_LEVELS.VIEW;
}

function addMentorModeBanner() {
    if (document.getElementById('mentorModeBanner')) return;

    const appContainer = document.querySelector('.max-w-4xl.mx-auto.p-2.sm\\:p-4');
    if (!appContainer) return;

    const mentorCode = getMentorCodeFromUrl();
    const banner = document.createElement('div');
    banner.id = 'mentorModeBanner';
    banner.className = 'mb-4 rounded border-l-4 border-yellow-500 bg-yellow-50 px-4 py-3 text-sm text-yellow-900';
    const accessLevel = getCurrentMentorAccessLevel();
    const accessLabel = accessLevel === MENTOR_VIEW_ACCESS_LEVELS.FULL
        ? 'Edit All'
        : accessLevel === MENTOR_VIEW_ACCESS_LEVELS.STATUS
            ? 'Status Updates Only'
            : 'Read Only';
    banner.textContent = mentorCode
        ? `Mentor View (${mentorCode}): ${accessLabel}`
        : `Mentor View: ${accessLabel}`;

    appContainer.prepend(banner);
}

/**
 * Handle access-specific actions for mentor view
 * @async
 * @returns {Promise<void>}
 */
async function handleMentorAccessActions() {
    if (!window.isMentorView) return;

    try {
        const mentorCanUseQuickReview = canMentorEditStatus();
        const startReviewBtn = document.getElementById('startReviewBtn');

        if (startReviewBtn) {
            if (mentorCanUseQuickReview) {
                startReviewBtn.style.display = '';
            } else {
                startReviewBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error handling mentor access actions:', error);
        const startReviewBtn = document.getElementById('startReviewBtn');
        if (startReviewBtn) startReviewBtn.style.display = 'none';
    }
}

/**
 * Add back button for mentor view
 * @returns {void}
 */
function addMentorBackButton() {
    if (!window.isMentorView) return;

    const logoutBtn = document.getElementById('logoutBtn');
    const logoutBtnMobile = document.getElementById('logoutBtnMobile');
    const exitMentorMode = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('mentor');
        let newUrl = url.pathname;
        if (url.searchParams.toString()) {
            newUrl += '?' + url.searchParams.toString();
        }
        window.location.replace(newUrl);
    };

    // Hide logout buttons while mentor mode is active
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (logoutBtnMobile) logoutBtnMobile.style.display = 'none';

    const createExitButton = (buttonId, sourceButton) => {
        if (!sourceButton || document.getElementById(buttonId)) return;

        const btn = document.createElement('button');
        btn.id = buttonId;
        btn.textContent = MENTOR_EXIT_LABEL;
        btn.className = sourceButton.className || 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors';
        btn.setAttribute('aria-label', 'Exit mentor mode and return to your account');
        btn.onclick = exitMentorMode;

        if (sourceButton.parentNode) {
            sourceButton.parentNode.insertBefore(btn, sourceButton);
        } else {
            document.body.appendChild(btn);
        }
    };

    createExitButton('mentorBackBtn', logoutBtn);
    createExitButton('mentorBackBtnMobile', logoutBtnMobile);
}

/**
 * Get user email display for mentor view
 * @returns {string}
 */
function getMentorViewEmailDisplay() {
    if (window.isMentorView) {
        const mentorCode = getMentorCodeFromUrl();
        return mentorCode ? `Mentor View (${mentorCode})` : 'Mentor View';
    }
    return '';
}

/**
 * Update UI for mentor view
 * @returns {void}
 */
function updateMentorViewUI() {
    const userEmail = document.getElementById('userEmail');
    const userEmailMobile = document.getElementById('userEmailMobile');
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutBtnMobile = document.getElementById('logoutBtnMobile');

    if (window.isMentorView) {
        if (userEmail) {
            userEmail.textContent = getMentorViewEmailDisplay();
        }
        if (userEmailMobile) {
            userEmailMobile.textContent = getMentorViewEmailDisplay();
        }

        if (logoutBtn) logoutBtn.style.display = 'none';
        if (logoutBtnMobile) logoutBtnMobile.style.display = 'none';
    }
}

/**
 * Validate mentor form submission
 * @async
 * @param {string} code - Mentor code from form
 * @returns {Promise<boolean>}
 */
async function validateMentorCode(code) {
    if (!MENTOR_CODE_REGEX.test(code)) {
        throw new Error('Please enter a valid 5-digit code.');
    }

    try {
        const doc = await db.collection('mentorCodes').doc(code.toUpperCase()).get();
        if (!doc.exists) {
            throw new Error('Invalid mentor code.');
        }

        // Check if mentor code is enabled
        if (doc.data().enabled === false) {
            throw new Error('This mentor code has been disabled.');
        }

        return true;
    } catch (error) {
        throw new Error(error.message || 'Error checking code. Please try again.');
    }
}
