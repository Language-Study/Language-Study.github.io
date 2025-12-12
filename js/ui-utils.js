/**
 * UI Utilities Module
 * Handles toast notifications, settings management, mentor codes, and common UI operations
 */

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {number} duration - Duration in ms (default 2500)
 * @returns {void}
 */
function showToast(message, duration = 2500) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.style.opacity = '1';

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, duration);
}

/**
 * Show loading spinner overlay
 * @param {boolean} show - Show or hide
 * @param {string} message - Optional message
 * @returns {void}
 */
function showLoadingSpinner(show, message = 'Loading...') {
    let spinner = document.getElementById('loadingSpinner');

    if (show) {
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = 'loadingSpinner';
            spinner.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            spinner.innerHTML = `
                <div class="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
                    <div class="animate-spin">
                        <svg class="w-10 h-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <p class="text-gray-700">${message}</p>
                </div>
            `;
            document.body.appendChild(spinner);
        }
        spinner.style.display = 'flex';
    } else {
        if (spinner) {
            spinner.style.display = 'none';
        }
    }
}

/**
 * Show modal dialog
 * @param {string} modalId - ID of modal element
 * @returns {void}
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * Hide modal dialog
 * @param {string} modalId - ID of modal element
 * @returns {void}
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Show welcome modal for new users
 * @returns {void}
 */
function showWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    if (!modal) return;

    modal.classList.remove('hidden');

    const closeBtn = document.getElementById('closeWelcomeBtn');
    const continueBtn = document.getElementById('welcomeContinueBtn');

    const close = () => {
        modal.classList.add('hidden');
    };

    if (closeBtn) closeBtn.onclick = close;
    if (continueBtn) continueBtn.onclick = close;
}

/**
 * Get achievements enabled setting
 * @async
 * @returns {Promise<boolean>}
 */
async function getAchievementsEnabled() {
    if (!currentUser) return false;

    try {
        const doc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').get();
        if (doc.exists && typeof doc.data().achievementsEnabled === 'boolean') {
            return doc.data().achievementsEnabled;
        }
    } catch (e) {
        console.error('Error fetching achievements setting:', e);
    }

    return false;
}

/**
 * Set achievements enabled setting
 * @async
 * @param {boolean} val - Enable or disable
 * @returns {Promise<void>}
 */
async function setAchievementsEnabled(val) {
    if (!currentUser) return;

    try {
        await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').set(
            { achievementsEnabled: val },
            { merge: true }
        );
    } catch (e) {
        console.error('Error setting achievements:', e);
    }
}

/**
 * Update achievements visibility in UI
 * @async
 * @returns {Promise<void>}
 */
async function updateAchievementsVisibility() {
    const section = document.getElementById('achievementsSection');
    const toggle = document.getElementById('toggleAchievements');
    const enabled = await getAchievementsEnabled();

    if (section) section.style.display = enabled ? '' : 'none';
    if (toggle) toggle.checked = enabled;

    window.achievementsEnabledCache = enabled;
}

/**
 * Get progress metrics enabled setting
 * @async
 * @returns {Promise<boolean>}
 */
async function getProgressEnabled() {
    if (!currentUser) return false;

    try {
        const doc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').get();
        if (doc.exists && typeof doc.data().progressEnabled === 'boolean') {
            return doc.data().progressEnabled;
        }
    } catch (e) {
        console.error('Error fetching progress setting:', e);
    }

    return false;
}

/**
 * Set progress metrics enabled setting
 * @async
 * @param {boolean} val - Enable or disable
 * @returns {Promise<void>}
 */
async function setProgressEnabled(val) {
    if (!currentUser) return;

    try {
        await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').set(
            { progressEnabled: val },
            { merge: true }
        );
    } catch (e) {
        console.error('Error setting progress:', e);
    }
}

/**
 * Update progress visibility in UI
 * @async
 * @returns {Promise<void>}
 */
async function updateProgressVisibility() {
    const section = document.getElementById('progressMetrics');
    const toggle = document.getElementById('toggleProgress');
    const enabled = await getProgressEnabled();

    if (section) section.style.display = enabled ? '' : 'none';
    if (toggle) toggle.checked = enabled;

    window.progressEnabledCache = enabled;
}

/**
 * Render progress metrics
 * @returns {void}
 */
function renderProgressMetrics() {
    if (window.progressEnabledCache === false) {
        const metricsEl = document.getElementById('progressMetrics');
        if (metricsEl) metricsEl.innerHTML = '';
        return;
    }

    const metricsEl = document.getElementById('progressMetrics');
    if (!metricsEl) return;

    const vocabStats = getVocabularyStats();
    const skillsStats = getSkillsStats();

    metricsEl.innerHTML = `
        <div class="flex flex-col items-center bg-gray-100 rounded p-3 min-w-[120px]" role="status" aria-label="Vocabulary Progress">
            <div class="font-bold text-blue-700">Vocabulary</div>
            <div class="text-sm">${vocabStats.mastered} / ${vocabStats.total} Mastered</div>
            <div class="text-xs text-gray-500">${vocabStats.inProgress} In Progress</div>
        </div>
        <div class="flex flex-col items-center bg-gray-100 rounded p-3 min-w-[120px]" role="status" aria-label="Skills Progress">
            <div class="font-bold text-green-700">Skills</div>
            <div class="text-sm">${skillsStats.mastered} / ${skillsStats.total} Mastered</div>
            <div class="text-xs text-gray-500">${skillsStats.inProgress} In Progress</div>
        </div>
    `;
}

/**
 * Get mentor code enabled setting
 * @async
 * @returns {Promise<boolean>}
 */
async function getMentorCodeEnabled() {
    if (!currentUser) return false;

    try {
        const doc = await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').get();
        if (doc.exists && typeof doc.data().mentorCodeEnabled === 'boolean') {
            return doc.data().mentorCodeEnabled;
        }
    } catch (e) {
        console.error('Error fetching mentor code setting:', e);
    }

    return false;
}

/**
 * Set mentor code enabled setting
 * @async
 * @param {boolean} val - Enable or disable
 * @returns {Promise<void>}
 */
async function setMentorCodeEnabled(val) {
    if (!currentUser) return;

    try {
        await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').set(
            { mentorCodeEnabled: val },
            { merge: true }
        );

        try {
            const codeDoc = await db.collection('mentorCodes').where('uid', '==', currentUser.uid).get();
            if (!codeDoc.empty) {
                const docId = codeDoc.docs[0].id;
                // Update enabled flag based on val
                await db.collection('mentorCodes').doc(docId).update({
                    enabled: val
                });
                console.log('Mentor code enabled status updated to:', val);
            }
        } catch (updateError) {
            console.warn('Could not update mentor code status:', updateError);
            // Don't throw - continue with settings update
        }
    } catch (e) {
        console.error('Error setting mentor code:', e);
        throw e;
    }
}

/**
 * Get or create mentor code
 * @async
 * @param {boolean} forceRegenerate - Force create new code
 * @returns {Promise<string>} Mentor code
 */
async function getOrCreateMentorCode(forceRegenerate = false) {
    if (!currentUser) return null;

    try {
        const codeDoc = await db.collection('mentorCodes').where('uid', '==', currentUser.uid).get();

        if (!codeDoc.empty && !forceRegenerate) {
            return codeDoc.docs[0].id;
        }

        if (!codeDoc.empty && forceRegenerate) {
            // Delete old code on regeneration
            await db.collection('mentorCodes').doc(codeDoc.docs[0].id).delete();
        }

        let code, exists, attempts = 0;
        do {
            code = generateMentorCode();
            const doc = await db.collection('mentorCodes').doc(code).get();
            exists = doc.exists;
            attempts++;
        } while (exists && attempts < 10);

        if (exists) {
            throw new Error('Could not generate a unique mentor code. Please try again.');
        }

        await db.collection('mentorCodes').doc(code).set({ uid: currentUser.uid, enabled: true });
        return code;
    } catch (e) {
        console.error('Error managing mentor code:', e);
        throw e;
    }
}

/**
 * Display mentor code in UI
 * @async
 * @param {boolean} forceRegenerate - Force regenerate code
 * @returns {Promise<void>}
 */
async function showMentorCode(forceRegenerate = false) {
    const enabled = await getMentorCodeEnabled();
    const codeDiv = document.getElementById('mentorCodeDiv');
    const regenBtn = document.getElementById('regenerateMentorCodeBtn');
    const infoDiv = document.getElementById('mentorCodeInfo');

    if (!enabled) {
        if (codeDiv) codeDiv.innerHTML = '';
        if (regenBtn) regenBtn.classList.add('hidden');
        if (infoDiv) infoDiv.classList.add('hidden');
        return;
    }

    try {
        const code = await getOrCreateMentorCode(forceRegenerate);
        if (codeDiv) {
            codeDiv.innerHTML = `<b>Mentor Share Code:</b> <span class='font-mono text-lg select-all' role="textbox" aria-label="Your mentor code: ${code}">${code}</span>`;
        }
        if (regenBtn) regenBtn.classList.remove('hidden');
        if (infoDiv) infoDiv.classList.remove('hidden');
    } catch (e) {
        showToast('Error generating mentor code: ' + e.message);
    }
}

/**
 * Update mentor code toggle UI
 * @async
 * @returns {Promise<void>}
 */
async function updateMentorCodeToggle() {
    const toggle = document.getElementById('toggleMentorCode');
    const regenBtn = document.getElementById('regenerateMentorCodeBtn');

    if (!toggle) return;

    const enabled = await getMentorCodeEnabled();
    toggle.checked = enabled;
    await showMentorCode();

    toggle.onchange = async (e) => {
        await setMentorCodeEnabled(e.target.checked);
        await showMentorCode();
    };

    if (regenBtn) {
        regenBtn.onclick = async () => {
            await showMentorCode(true);
        };
    }
}

/**
 * Debounce helper for rapid-fire events
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {Function}
 */
function debounce(fn, delay = 150) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

// ===== WALKTHROUGH TUTORIAL =====
const walkthroughSteps = [
    {
        title: 'Add your vocabulary',
        body: 'Pick a category, type a word and translation, then press Enter or the plus button to save it.',
        selector: '#vocabularyInput',
        tab: 'vocabulary'
    },
    {
        title: 'Track skills with subtasks',
        body: 'List the skills you are building. Use the circles to move a skill from Not Started to Mastered and add subtasks when you expand a skill.',
        selector: '#skillsInput',
        tab: 'skills'
    },
    {
        title: 'Show your work',
        body: 'Drop YouTube or SoundCloud links into your portfolio. Feature up to three items for quick playback.',
        selector: '#portfolioForm',
        tab: 'portfolio'
    },
    {
        title: 'Control mentor access',
        body: 'Use Settings to enable or regenerate a view-only mentor code. Mentors can view progress but cannot edit.',
        selector: '#openSettingsBtn'
    }
];

let walkthroughState = {
    index: 0,
    running: false
};

function initWalkthroughControls() {
    const overlay = document.getElementById('tourOverlay');
    if (!overlay) return;

    const nextBtn = document.getElementById('tourNextBtn');
    const prevBtn = document.getElementById('tourPrevBtn');
    const skipBtn = document.getElementById('tourSkipBtn');

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (walkthroughState.index >= walkthroughSteps.length - 1) {
                endWalkthrough(true);
            } else {
                renderWalkthroughStep(walkthroughState.index + 1);
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (walkthroughState.index > 0) {
                renderWalkthroughStep(walkthroughState.index - 1);
            }
        });
    }

    if (skipBtn) {
        skipBtn.addEventListener('click', () => endWalkthrough(true));
    }
}

function clearWalkthroughHighlights() {
    document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
    });
}

function positionWalkthroughCard(targetEl) {
    const card = document.getElementById('tourCard');
    if (!card) return;

    let top = window.scrollY + (window.innerHeight - card.offsetHeight) / 2;
    let left = window.scrollX + (window.innerWidth - card.offsetWidth) / 2;

    if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        top = window.scrollY + rect.bottom + 12;
        left = window.scrollX + rect.left;

        const maxLeft = window.scrollX + window.innerWidth - card.offsetWidth - 16;
        const maxTop = window.scrollY + window.innerHeight - card.offsetHeight - 16;
        left = Math.max(window.scrollX + 16, Math.min(left, maxLeft));
        top = Math.max(window.scrollY + 16, Math.min(top, maxTop));
    }

    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
}

function renderWalkthroughStep(stepIndex = 0) {
    const overlay = document.getElementById('tourOverlay');
    const stepLabel = document.getElementById('tourStepLabel');
    const titleEl = document.getElementById('tourTitle');
    const bodyEl = document.getElementById('tourBody');
    const nextBtn = document.getElementById('tourNextBtn');
    const prevBtn = document.getElementById('tourPrevBtn');

    if (!overlay || !stepLabel || !titleEl || !bodyEl || !nextBtn || !prevBtn) return;

    walkthroughState.index = stepIndex;
    walkthroughState.running = true;
    overlay.classList.remove('hidden');

    const step = walkthroughSteps[stepIndex];
    if (step.tab && typeof activateTab === 'function') {
        activateTab(step.tab);
    }

    // Delay to allow layout changes when switching tabs
    setTimeout(() => {
        clearWalkthroughHighlights();
        const targetEl = step.selector ? document.querySelector(step.selector) : null;
        if (targetEl) {
            targetEl.classList.add('tour-highlight');
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }

        stepLabel.textContent = `Step ${stepIndex + 1} of ${walkthroughSteps.length}`;
        titleEl.textContent = step.title;
        bodyEl.textContent = step.body;

        prevBtn.disabled = stepIndex === 0;
        nextBtn.textContent = stepIndex === walkthroughSteps.length - 1 ? 'Done' : 'Next';

        positionWalkthroughCard(targetEl);
    }, 80);
}

async function markWalkthroughSeen() {
    if (!currentUser) return;
    try {
        await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').set(
            { tutorialSeen: true },
            { merge: true }
        );
    } catch (e) {
        console.warn('Could not mark tutorial as seen:', e);
    }
}

function endWalkthrough(markSeen = false) {
    const overlay = document.getElementById('tourOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
    clearWalkthroughHighlights();
    walkthroughState.running = false;
    if (markSeen) {
        markWalkthroughSeen();
    }
}

function startWalkthrough() {
    const overlay = document.getElementById('tourOverlay');
    if (!overlay) return;
    renderWalkthroughStep(0);
    dismissWalkthroughPrompt();
}

function dismissWalkthroughPrompt(markSeen = false) {
    const prompt = document.getElementById('tourPrompt');
    if (prompt) {
        prompt.remove();
    }
    if (markSeen) {
        markWalkthroughSeen();
    }
}

function showWalkthroughPrompt() {
    if (document.getElementById('tourPrompt')) return;

    const prompt = document.createElement('div');
    prompt.id = 'tourPrompt';
    prompt.className = 'fixed bottom-6 right-6 bg-white text-gray-900 shadow-xl rounded-lg p-4 w-64 z-40 border border-gray-200 space-y-2';
    prompt.innerHTML = `
        <p class="text-sm font-semibold">New here?</p>
        <p class="text-sm text-gray-600">Take a 60-second walkthrough of the main tools.</p>
        <div class="flex justify-end gap-2 pt-2">
            <button id="tourLaterBtn" class="text-sm text-gray-500 hover:text-gray-700">Maybe later</button>
            <button id="tourStartBtn" class="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Start</button>
        </div>
    `;

    document.body.appendChild(prompt);

    const startBtn = document.getElementById('tourStartBtn');
    const laterBtn = document.getElementById('tourLaterBtn');

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            startWalkthrough();
            markWalkthroughSeen();
        });
    }

    if (laterBtn) {
        laterBtn.addEventListener('click', () => dismissWalkthroughPrompt(true));
    }
}

function shouldOfferWalkthrough(settingsDoc) {
    if (!currentUser) return false;
    if (!settingsDoc) return true;
    const data = settingsDoc.data && settingsDoc.data();
    return !(data && data.tutorialSeen === true);
}

// Expose helpers globally for other modules
window.startWalkthrough = startWalkthrough;
window.showWalkthroughPrompt = showWalkthroughPrompt;
window.shouldOfferWalkthrough = shouldOfferWalkthrough;
window.endWalkthrough = endWalkthrough;
window.markWalkthroughSeen = markWalkthroughSeen;

document.addEventListener('DOMContentLoaded', initWalkthroughControls);
