/**
 * Mentor View Module
 * Handles mentor code validation, mentor view UI, and read-only mode
 */

/**
 * Detect if this is a mentor view based on URL parameters
 * @returns {boolean}
 */
function isMentorViewEarly() {
    const params = new URLSearchParams(window.location.search);
    const mentorCode = params.get('mentor');
    return !!mentorCode;
}

/**
 * Validate mentor code and load mentor view
 * @async
 * @returns {Promise<void>}
 */
async function tryMentorView() {
    const params = new URLSearchParams(window.location.search);
    const mentorCode = params.get('mentor');

    if (!mentorCode) return;

    try {
        const code = mentorCode.toUpperCase();
        const doc = await db.collection('mentorCodes').doc(code).get();

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

        // Load data for mentor UID instead of current user
        await loadUserDataForMentor(window.mentorUid);

        // Disable all editing features
        disableEditingUI();
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
    // Hide editing buttons and forms
    const editingElements = [
        '.delete-button',
        '.edit-button',
        '.status-button',
        '.feature-button',
        '#addVocabBtn',
        '#addSkillBtn',
        '#addCategoryBtn',
        '#deleteCategoryBtn',
        '#portfolioForm',
        '#openSettingsBtn',
        '#deleteAccountBtn',
        '#newCategoryInput',
        '#vocabularyInput',
        '#skillsInput',
        '#portfolioTitle',
        '#portfolioLink',
        '#toggleLanguageSection',
        '#openPrintPdfModalBtn',
        '#startReviewBtn'
    ];

    editingElements.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (el) {
                if (el.tagName === 'FORM' || el.tagName === 'BUTTON') {
                    el.style.display = 'none';
                } else {
                    el.disabled = true;
                }
            }
        });
    });

    // Hide settings modal if open
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('hidden');

    // Disable translation input for mentor mode
    const translationInput = document.getElementById('translationInput');
    if (translationInput) translationInput.disabled = true;

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

    // Check if mentor has enabled quick review
    handleMentorQuickReviewAccess();
}

/**
 * Handle quick review access for mentor view
 * Shows button only if mentor has enabled it
 * @async
 * @returns {Promise<void>}
 */
async function handleMentorQuickReviewAccess() {
    if (!window.isMentorView) return;

    try {
        const mentorQuickReviewEnabled = await getMentorQuickReviewEnabled();
        const startReviewBtn = document.getElementById('startReviewBtn');

        if (startReviewBtn) {
            if (mentorQuickReviewEnabled) {
                // Show button for mentor
                startReviewBtn.style.display = '';
            } else {
                // Keep button hidden (already hidden by disableEditingUI)
                startReviewBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error handling mentor quick review access:', error);
        // Keep button hidden if there's an error
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

    // Hide logout button
    if (logoutBtn) logoutBtn.style.display = 'none';

    // Prevent duplicate
    if (document.getElementById('mentorBackBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'mentorBackBtn';
    btn.textContent = 'Go back to my account';
    btn.className = logoutBtn ? logoutBtn.className : 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors';
    btn.setAttribute('aria-label', 'Return to your own account');

    if (logoutBtn && logoutBtn.parentNode) {
        logoutBtn.parentNode.insertBefore(btn, logoutBtn.nextSibling);
    } else {
        document.body.appendChild(btn);
    }

    btn.onclick = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('mentor');
        let newUrl = url.pathname;
        if (url.searchParams.toString()) {
            newUrl += '?' + url.searchParams.toString();
        }
        window.location.replace(newUrl);
    };
}

/**
 * Get user email display for mentor view
 * @returns {string}
 */
function getMentorViewEmailDisplay() {
    if (window.isMentorView) {
        const params = new URLSearchParams(window.location.search);
        const mentorCode = params.get('mentor');
        return mentorCode ? `Mentor View: <b>(${mentorCode})</b>` : 'Mentor View';
    }
    return '';
}

/**
 * Update UI for mentor view
 * @returns {void}
 */
function updateMentorViewUI() {
    const userEmail = document.getElementById('userEmail');

    if (window.isMentorView) {
        if (userEmail) {
            userEmail.innerHTML = getMentorViewEmailDisplay();
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.style.display = '';
            logoutBtn.disabled = false;
        }
    }
}

/**
 * Validate mentor form submission
 * @async
 * @param {string} code - Mentor code from form
 * @returns {Promise<boolean>}
 */
async function validateMentorCode(code) {
    if (!/^[A-Z0-9]{5}$/.test(code)) {
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
