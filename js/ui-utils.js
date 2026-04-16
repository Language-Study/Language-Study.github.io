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

// Simple reusable edit modal
const editModal = {
    element: null,
    form: null,
    titleEl: null,
    subtitleEl: null,
    fieldsEl: null,
    cancelBtn: null,
    closeBtn: null,
    saveBtn: null,
    resolver: null,
    rejecter: null,
    currentPayload: null,
};

function initEditModal() {
    if (editModal.element) return;
    editModal.element = document.getElementById('editModal');
    editModal.form = document.getElementById('editModalForm');
    editModal.titleEl = document.getElementById('editModalTitle');
    editModal.subtitleEl = document.getElementById('editModalSubtitle');
    editModal.fieldsEl = document.getElementById('editModalFields');
    editModal.cancelBtn = document.getElementById('editModalCancel');
    editModal.closeBtn = document.getElementById('editModalClose');
    editModal.saveBtn = document.getElementById('editModalSave');

    if (!editModal.element) return;

    const close = () => {
        editModal.element.classList.add('hidden');
        editModal.element.style.display = 'none';
        editModal.fieldsEl.innerHTML = '';
        editModal.form?.reset();
        if (editModal.rejecter) {
            editModal.rejecter('closed');
        }
        editModal.resolver = null;
        editModal.rejecter = null;
    };

    editModal.cancelBtn?.addEventListener('click', close);
    editModal.closeBtn?.addEventListener('click', close);

    editModal.element?.addEventListener('click', (e) => {
        if (e.target === editModal.element) {
            close();
        }
    });

    editModal.form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {};
        editModal.fieldsEl.querySelectorAll('input, textarea, select').forEach(input => {
            data[input.name] = input.value;
        });
        if (editModal.resolver) {
            editModal.resolver({ ...data, payload: editModal.currentPayload });
        }
        editModal.element.classList.add('hidden');
        editModal.element.style.display = 'none';
        editModal.fieldsEl.innerHTML = '';
    });
}

/**
 * Open edit modal with dynamic fields
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.subtitle
 * @param {Array<{name: string, label: string, type?: string, value?: string, placeholder?: string}>} options.fields
 * @param {any} options.payload - arbitrary payload to return alongside form values
 * @returns {Promise<Object>} Resolves with form values + payload
 */
function openEditModal({ title, subtitle = '', fields = [], payload = null }) {
    initEditModal();
    if (!editModal.element || !editModal.fieldsEl) return Promise.reject('Edit modal not initialized');

    editModal.titleEl.textContent = title || 'Edit';
    editModal.subtitleEl.textContent = subtitle || '';
    editModal.subtitleEl.classList.toggle('hidden', !subtitle);

    editModal.fieldsEl.innerHTML = fields.map(field => {
        const type = field.type || 'text';
        const baseClasses = 'w-full p-2 border rounded';
        if (type === 'textarea') {
            return `<label class="block text-sm text-gray-700">${field.label}
                <textarea name="${field.name}" class="${baseClasses} mt-1" placeholder="${field.placeholder || ''}">${field.value || ''}</textarea>
            </label>`;
        }
        return `<label class="block text-sm text-gray-700">${field.label}
            <input name="${field.name}" type="${type}" class="${baseClasses} mt-1" value="${field.value || ''}" placeholder="${field.placeholder || ''}" />
        </label>`;
    }).join('');

    editModal.currentPayload = payload;
    editModal.element.classList.remove('hidden');
    editModal.element.style.display = 'flex';

    return new Promise((resolve, reject) => {
        editModal.resolver = resolve;
        editModal.rejecter = reject;
    });
}

window.openEditModal = openEditModal;

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

const SETTINGS_CACHE_TTL_MS = 60 * 1000;
const userSettingsCache = {
    uid: null,
    data: null,
    fetchedAt: 0
};

function invalidateUserSettingsCache() {
    userSettingsCache.uid = null;
    userSettingsCache.data = null;
    userSettingsCache.fetchedAt = 0;
}

function upsertUserSettingsCache(uid, patch) {
    if (!uid || !patch || typeof patch !== 'object') return;
    if (userSettingsCache.uid !== uid || !userSettingsCache.data) {
        userSettingsCache.uid = uid;
        userSettingsCache.data = {};
    }

    userSettingsCache.data = {
        ...userSettingsCache.data,
        ...patch
    };
    userSettingsCache.fetchedAt = Date.now();
}

async function getUserSettingsData(forceRefresh = false, uidOverride = null) {
    const uid = typeof uidOverride === 'string' && uidOverride
        ? uidOverride
        : currentUser?.uid;

    if (!uid) return null;
    const now = Date.now();
    const isFresh = userSettingsCache.uid === uid
        && userSettingsCache.data
        && (now - userSettingsCache.fetchedAt) < SETTINGS_CACHE_TTL_MS;

    if (!forceRefresh && isFresh) {
        return userSettingsCache.data;
    }

    const doc = await db.collection('users').doc(uid).collection('metadata').doc('settings').get();
    const data = doc.exists ? (doc.data() || {}) : {};

    userSettingsCache.uid = uid;
    userSettingsCache.data = data;
    userSettingsCache.fetchedAt = now;

    return data;
}

async function writeUserSettingsPatch(patch) {
    if (!currentUser?.uid) return;

    const uid = currentUser.uid;
    await db.collection('users').doc(uid).collection('metadata').doc('settings').set(
        patch,
        { merge: true }
    );

    upsertUserSettingsCache(uid, patch);
}

const MENTOR_CODE_CACHE_TTL_MS = 60 * 1000;
const mentorCodeCache = {
    uid: null,
    code: null,
    fetchedAt: 0
};

function invalidateMentorCodeCache() {
    mentorCodeCache.uid = null;
    mentorCodeCache.code = null;
    mentorCodeCache.fetchedAt = 0;
}

function setMentorCodeCache(uid, code) {
    mentorCodeCache.uid = uid || null;
    mentorCodeCache.code = code || null;
    mentorCodeCache.fetchedAt = Date.now();
}

async function getMentorCodeIdForCurrentUser(forceRefresh = false) {
    if (!currentUser?.uid) return null;

    const uid = currentUser.uid;
    const now = Date.now();
    const isFresh = mentorCodeCache.uid === uid
        && (now - mentorCodeCache.fetchedAt) < MENTOR_CODE_CACHE_TTL_MS;

    if (!forceRefresh && isFresh) {
        return mentorCodeCache.code;
    }

    const codeDoc = await db.collection('mentorCodes').where('uid', '==', uid).get();
    const code = codeDoc.empty ? null : codeDoc.docs[0].id;
    setMentorCodeCache(uid, code);
    return code;
}

/**
 * Get achievements enabled setting
 * @async
 * @returns {Promise<boolean>}
 */
async function getAchievementsEnabled() {
    if (!currentUser) return false;

    try {
        const settings = await getUserSettingsData();
        if (settings && typeof settings.achievementsEnabled === 'boolean') {
            return settings.achievementsEnabled;
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
        await writeUserSettingsPatch({ achievementsEnabled: val });
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
        const settings = await getUserSettingsData();
        if (settings && typeof settings.progressEnabled === 'boolean') {
            return settings.progressEnabled;
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
        await writeUserSettingsPatch({ progressEnabled: val });
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
    const portfolioStats = getPortfolioStats();

    metricsEl.innerHTML = `
        <div class="flex flex-col items-center bg-gray-100 rounded p-3 min-w-[120px]" role="status" aria-label="Vocabulary Progress">
            <div class="font-bold text-blue-700">Vocabulary</div>
            <div class="text-sm">${vocabStats.proficient} / ${vocabStats.total} Proficient</div>
            <div class="text-xs text-gray-500">${vocabStats.inProgress} In Progress</div>
        </div>
        <div class="flex flex-col items-center bg-gray-100 rounded p-3 min-w-[120px]" role="status" aria-label="Skills Progress">
            <div class="font-bold text-green-700">Skills</div>
            <div class="text-sm">${skillsStats.proficient} / ${skillsStats.total} Proficient</div>
            <div class="text-xs text-gray-500">${skillsStats.inProgress} In Progress</div>
        </div>
        <div class="flex flex-col items-center bg-gray-100 rounded p-3 min-w-[120px]" role="status" aria-label="Portfolio Progress">
            <div class="font-bold text-purple-700">Portfolio</div>
            <div class="text-sm">${portfolioStats.featured} Featured</div>
            <div class="text-xs text-gray-500">${portfolioStats.total} Total</div>
        </div>
    `;
}

const MENTOR_ACCESS_LEVELS = {
    VIEW: 'view',
    STATUS: 'status',
    FULL: 'full'
};

function isMentorPermissionDeniedError(error) {
    return error?.code === 'permission-denied'
        || String(error?.message || '').toLowerCase().includes('insufficient permissions')
        || String(error?.message || '').toLowerCase().includes('missing or insufficient permissions');
}

function normalizeMentorErrorMessage(error, fallbackMessage = 'Unable to update mentor code settings.') {
    const rawMessage = String(error?.message || '').trim();
    if (rawMessage) {
        return rawMessage;
    }

    if (isMentorPermissionDeniedError(error)) {
        return 'Permission denied. Please sign out and sign back in, then try again.';
    }

    return fallbackMessage;
}

function normalizeMentorAccessLevel(level) {
    if (level === MENTOR_ACCESS_LEVELS.STATUS || level === MENTOR_ACCESS_LEVELS.FULL) {
        return level;
    }
    return MENTOR_ACCESS_LEVELS.VIEW;
}

/**
 * Get mentor code enabled setting
 * @async
 * @returns {Promise<boolean>}
 */
async function getMentorCodeEnabled() {
    if (!currentUser) return false;

    try {
        const settings = await getUserSettingsData();
        if (settings && typeof settings.mentorCodeEnabled === 'boolean') {
            return settings.mentorCodeEnabled;
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
        // Enabling mentor access is only valid when a code exists (or can be created).
        if (val === true) {
            await getOrCreateMentorCode(false);
        }

        await writeUserSettingsPatch({ mentorCodeEnabled: val });

        try {
            const docId = await getMentorCodeIdForCurrentUser();
            if (docId) {
                // Update enabled flag based on val
                await db.collection('mentorCodes').doc(docId).update({
                    enabled: val
                });
                setMentorCodeCache(currentUser.uid, docId);
                console.log('Mentor code enabled status updated to:', val);
            }
        } catch (updateError) {
            console.warn('Could not update mentor code status:', updateError);
            throw new Error(normalizeMentorErrorMessage(updateError, 'Could not sync mentor code status. Please try again.'));
        }
    } catch (e) {
        console.error('Error setting mentor code:', e);
        throw new Error(normalizeMentorErrorMessage(e, 'Could not update mentor access settings.'));
    }
}

/**
 * Get mentor access level setting
 * @async
 * @returns {Promise<'view'|'status'|'full'>}
 */
async function getMentorAccessLevel() {
    if (!currentUser) return MENTOR_ACCESS_LEVELS.VIEW;

    try {
        const data = await getUserSettingsData();
        if (data && typeof data.mentorAccessLevel === 'string') {
            return normalizeMentorAccessLevel(data.mentorAccessLevel);
        }

        // Backward compatibility: quick-review previously implied status-edit access.
        if (data?.mentorQuickReviewEnabled === true) {
            return MENTOR_ACCESS_LEVELS.STATUS;
        }
    } catch (e) {
        console.error('Error fetching mentor access level setting:', e);
    }

    return MENTOR_ACCESS_LEVELS.VIEW;
}

/**
 * Set mentor access level setting
 * @async
 * @param {'view'|'status'|'full'} level - Access level
 * @returns {Promise<void>}
 */
async function setMentorAccessLevel(level) {
    if (!currentUser) return;

    const normalized = normalizeMentorAccessLevel(level);
    try {
        await writeUserSettingsPatch({
            mentorAccessLevel: normalized,
            mentorQuickReviewEnabled: normalized !== MENTOR_ACCESS_LEVELS.VIEW
        });
        console.log('Mentor access level updated to:', normalized);
    } catch (e) {
        console.error('Error setting mentor access level:', e);
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
        const existingCode = await getMentorCodeIdForCurrentUser();

        if (existingCode && !forceRegenerate) {
            return existingCode;
        }

        if (existingCode && forceRegenerate) {
            // Delete old code on regeneration.
            await db.collection('mentorCodes').doc(existingCode).delete();
            setMentorCodeCache(currentUser.uid, null);
        }

        enforceClientRateLimit({
            bucket: 'mentor-code-create',
            limit: 6,
            windowMs: 60 * 60 * 1000,
            message: 'Too many mentor code changes.'
        });

        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            const code = generateMentorCode();
            const doc = await db.collection('mentorCodes').doc(code).get();

            if (doc.exists) {
                attempts++;
                continue;
            }

            try {
                await db.collection('mentorCodes').doc(code).set({ uid: currentUser.uid, enabled: true });
                setMentorCodeCache(currentUser.uid, code);
                return code;
            } catch (writeError) {
                if (isMentorPermissionDeniedError(writeError)) {
                    attempts++;
                    continue;
                }

                throw writeError;
            }
        }

        throw new Error('Could not generate a unique mentor code. Please try again.');
    } catch (e) {
        console.error('Error managing mentor code:', e);
        throw new Error(normalizeMentorErrorMessage(e, 'Failed to generate mentor code.'));
    }
}

/**
 * Display mentor code in UI
 * @async
 * @param {boolean} forceRegenerate - Force regenerate code
 * @returns {Promise<void>}
 */
async function showMentorCode(forceRegenerate = false, options = {}) {
    const suppressErrorToast = options?.suppressErrorToast === true;
    const enabled = await getMentorCodeEnabled();
    const codeDiv = document.getElementById('mentorCodeDiv');
    const regenBtn = document.getElementById('regenerateMentorCodeBtn');
    const infoDiv = document.getElementById('mentorCodeInfo');

    if (!enabled) {
        if (codeDiv) codeDiv.innerHTML = '';
        if (regenBtn) regenBtn.classList.add('hidden');
        if (infoDiv) infoDiv.classList.add('hidden');
        updateMentorAccessLevelUI();
        return true;
    }

    try {
        const code = await getOrCreateMentorCode(forceRegenerate);
        if (codeDiv) {
            codeDiv.innerHTML = `<b>Mentor Share Code:</b> <span class='font-mono text-lg select-all' role="textbox" aria-label="Your mentor code: ${code}">${code}</span>`;
        }
        if (regenBtn) regenBtn.classList.remove('hidden');
        if (infoDiv) infoDiv.classList.remove('hidden');

        // Update mentor access level section visibility
        updateMentorAccessLevelUI();
        return true;
    } catch (e) {
        if (!suppressErrorToast) {
            showToast('Error: ' + normalizeMentorErrorMessage(e, 'Failed to generate mentor code.'));
        }
        return false;
    }
}

/**
 * Update mentor access level UI section
 * Shows the section only when mentor code is enabled
 * @async
 * @returns {Promise<void>}
 */
async function updateMentorAccessLevelUI() {
    const mentorCodeEnabled = await getMentorCodeEnabled();
    const accessSection = document.getElementById('mentorAccessLevelSection');
    const accessSelect = document.getElementById('mentorAccessLevelSelect');
    const accessDescription = document.getElementById('mentorAccessLevelDescription');

    if (!accessSection) return;

    if (mentorCodeEnabled) {
        accessSection.classList.remove('hidden');

        if (accessSelect) {
            const level = await getMentorAccessLevel();
            accessSelect.value = level;
        }

        if (accessDescription && accessSelect) {
            if (accessSelect.value === MENTOR_ACCESS_LEVELS.FULL) {
                accessDescription.textContent = 'Edit All: mentors can add, edit, and delete your vocabulary, skills, and portfolio.';
            } else if (accessSelect.value === MENTOR_ACCESS_LEVELS.STATUS) {
                accessDescription.textContent = 'Status Updates Only: mentors can change learning progress statuses (no content edits).';
            } else {
                accessDescription.textContent = 'Read Only: mentors can view your data but cannot make any changes.';
            }
        }
    } else {
        accessSection.classList.add('hidden');
        if (accessSelect) {
            accessSelect.value = MENTOR_ACCESS_LEVELS.VIEW;
        }
        if (accessDescription) {
            accessDescription.textContent = '';
        }
    }
}

/**
 * Update mentor code toggle UI
 * @async
 * @returns {Promise<void>}
 */
async function updateMentorCodeToggle() {
    const toggle = document.getElementById('toggleMentorCode');

    if (!toggle) return;

    let enabled = await getMentorCodeEnabled();

    // Self-heal inconsistent state from previous failures: enabled=true but no code exists.
    if (enabled) {
        try {
            const codeId = await getMentorCodeIdForCurrentUser(true);
            if (!codeId) {
                await writeUserSettingsPatch({ mentorCodeEnabled: false });
                enabled = false;
            }
        } catch (error) {
            console.warn('Could not verify mentor code consistency:', error);
        }
    }

    toggle.checked = enabled;
    await showMentorCode();
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


