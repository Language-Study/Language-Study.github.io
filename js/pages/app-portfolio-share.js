/**
 * Portfolio Share UI Module
 * Handles the share modal, QR code generation, and user interactions
 */

let qrCodeInstance = null;
const NON_EXPIRING_THRESHOLD_MS = 50 * 365 * 24 * 60 * 60 * 1000;
const SHARE_EXPIRY_OPTIONS_HOURS = [24, 168, 720];

/**
 * Initialize portfolio share modal and event listeners
 * @returns {void}
 */
function initPortfolioShareModal() {
    const openBtn = document.getElementById('openPortfolioShareBtn');
    const closeBtn = document.getElementById('closePortfolioShareBtn');
    const modal = document.getElementById('portfolioShareModal');
    const toggle = document.getElementById('portfolioShareToggle');
    const expiryToggle = document.getElementById('portfolioShareExpiryToggle');
    const expiryHours = document.getElementById('portfolioShareExpiryHours');
    const copyBtn = document.getElementById('copyShareLinkBtn');

    if (openBtn) {
        openBtn.addEventListener('click', openPortfolioShareModal);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closePortfolioShareModal);
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePortfolioShareModal();
            }
        });
    }

    if (toggle) {
        toggle.addEventListener('change', handleShareToggle);
    }

    if (expiryToggle) {
        expiryToggle.addEventListener('change', handleExpiryOptionChange);
    }

    if (expiryHours) {
        expiryHours.addEventListener('change', handleExpiryOptionChange);
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', copyShareLinkToClipboard);
    }
}

/**
 * Open portfolio share modal
 * @async
 * @returns {Promise<void>}
 */
async function openPortfolioShareModal() {
    const modal = document.getElementById('portfolioShareModal');
    if (!modal) return;

    modal.classList.remove('hidden');

    // Load current share status
    await loadShareModalState();
}

/**
 * Close portfolio share modal
 * @returns {void}
 */
function closePortfolioShareModal() {
    const modal = document.getElementById('portfolioShareModal');
    if (!modal) return;

    modal.classList.add('hidden');
}

/**
 * Load and display current share modal state
 * @async
 * @returns {Promise<void>}
 */
async function loadShareModalState() {
    try {
        let shareData = await getPortfolioShareData();
        let isEnabled = shareData?.enabled === true;
        const toggle = document.getElementById('portfolioShareToggle');

        // Repair invalid states so opening the modal never auto-creates a link.
        if (isEnabled && !shareData?.code) {
            await disablePortfolioSharing({ shareData, deleteCode: true });
            shareData = await getPortfolioShareData();
            isEnabled = false;
        }

        if (toggle) {
            toggle.checked = isEnabled;
        }

        syncExpiryControlsWithShareData(shareData, isEnabled);
        updateShareExpiryNotice(shareData, isEnabled);

        if (isEnabled) {
            showShareContent();
            if (shareData?.code) {
                const shareLink = await generatePortfolioShareLink();
                displayShareLink(shareLink);
                generateQRCode(shareLink);
            } else {
                hideShareContent();
                resetShareLinkDisplay();
                clearQRCode();
            }
        } else {
            hideShareContent();
            resetShareLinkDisplay();
            clearQRCode();
        }
    } catch (error) {
        console.error('Error loading share modal state:', error);
    }
}

/**
 * Handle share toggle switch change
 * @async
 * @param {Event} event - Change event
 * @returns {Promise<void>}
 */
async function handleShareToggle(event) {
    const isEnabled = event.target.checked;
    const selectedExpiryHours = getSelectedShareExpiryHours();

    try {
        if (isEnabled) {
            await enablePortfolioSharing({ expiryHours: selectedExpiryHours });
            const shareData = await getPortfolioShareData();
            updateShareExpiryNotice(shareData, true);
            showShareContent();
            const shareLink = await generatePortfolioShareLink();
            displayShareLink(shareLink);
            generateQRCode(shareLink);
        } else {
            await disablePortfolioSharing();
            const shareData = await getPortfolioShareData();
            updateShareExpiryNotice(shareData, false);
            hideShareContent();
            resetShareLinkDisplay();
            clearQRCode();
        }
    } catch (error) {
        console.error('Error toggling portfolio sharing:', error);
        const message = getPortfolioShareUiErrorMessage(error, 'Failed to update sharing settings.');
        if (typeof showToast === 'function') {
            showToast(`Error: ${message}`, 4200);
        } else {
            alert(message);
        }
        // Revert toggle state
        event.target.checked = !isEnabled;
    }
}

function getPortfolioShareUiErrorMessage(error, fallbackMessage) {
    const rawMessage = String(error?.message || '').trim();
    if (!rawMessage) return fallbackMessage;

    const lower = rawMessage.toLowerCase();
    if (lower.includes('rate limit') || lower.includes('too many')) {
        return rawMessage;
    }
    if (lower.includes('permission denied') || lower.includes('insufficient permissions')) {
        return 'You do not have permission to update sharing right now. Please sign out and sign back in.';
    }
    if (lower.includes('logged in')) {
        return 'Please sign in again and then retry enabling sharing.';
    }

    return rawMessage;
}

/**
 * Show share content (link and QR code)
 * @returns {void}
 */
function showShareContent() {
    const linkSection = document.getElementById('shareLinkSection');
    const disabledMessage = document.getElementById('shareDisabledMessage');

    if (linkSection) linkSection.classList.remove('hidden');
    if (disabledMessage) disabledMessage.classList.add('hidden');
}

/**
 * Hide share content
 * @returns {void}
 */
function hideShareContent() {
    const linkSection = document.getElementById('shareLinkSection');
    const disabledMessage = document.getElementById('shareDisabledMessage');

    if (linkSection) linkSection.classList.add('hidden');
    if (disabledMessage) disabledMessage.classList.remove('hidden');
}

/**
 * Display share link in the input field
 * @param {string} link - Shareable link URL
 * @returns {void}
 */
function displayShareLink(link) {
    const input = document.getElementById('shareableLinkInput');
    if (input) {
        input.value = link;
    }
}

function resetShareLinkDisplay() {
    const input = document.getElementById('shareableLinkInput');
    if (input) {
        input.value = '';
    }
}

function getSelectedShareExpiryHours() {
    const expiryToggle = document.getElementById('portfolioShareExpiryToggle');
    const expiryHours = document.getElementById('portfolioShareExpiryHours');

    if (!expiryToggle || !expiryToggle.checked) {
        return null;
    }

    const selected = Number(expiryHours?.value);
    if (!Number.isFinite(selected) || selected <= 0) {
        return 24;
    }

    return selected;
}

function syncExpiryControlsWithShareData(shareData, isEnabled) {
    const expiryToggle = document.getElementById('portfolioShareExpiryToggle');
    const expiryHours = document.getElementById('portfolioShareExpiryHours');
    if (!expiryToggle || !expiryHours) return;

    if (!isEnabled) {
        expiryToggle.checked = false;
        expiryHours.disabled = true;
        expiryHours.value = '24';
        return;
    }

    const selectedHours = inferShareExpiryHoursFromData(shareData);
    const hasExpiry = Number.isFinite(selectedHours) && selectedHours > 0;

    expiryToggle.checked = hasExpiry;
    expiryHours.disabled = !hasExpiry;

    if (hasExpiry) {
        const selectedValue = String(selectedHours);
        const supportsValue = Array.from(expiryHours.options).some(option => option.value === selectedValue);
        expiryHours.value = supportsValue ? selectedValue : '24';
    } else {
        expiryHours.value = '24';
    }
}

function inferShareExpiryHoursFromData(shareData) {
    let expiryDate = null;
    if (typeof shareData?.expiresAt?.toDate === 'function') {
        expiryDate = shareData.expiresAt.toDate();
    } else if (shareData?.expiresAt instanceof Date) {
        expiryDate = shareData.expiresAt;
    }

    if (!expiryDate || Number.isNaN(expiryDate.getTime())) {
        return null;
    }

    const remainingMs = expiryDate.getTime() - Date.now();
    if (remainingMs > NON_EXPIRING_THRESHOLD_MS) {
        return null;
    }

    const remainingHours = Math.max(1, Math.round(remainingMs / (60 * 60 * 1000)));
    return SHARE_EXPIRY_OPTIONS_HOURS.reduce((closest, option) => {
        return Math.abs(option - remainingHours) < Math.abs(closest - remainingHours) ? option : closest;
    }, SHARE_EXPIRY_OPTIONS_HOURS[0]);
}

async function handleExpiryOptionChange() {
    const shareToggle = document.getElementById('portfolioShareToggle');
    const expiryToggle = document.getElementById('portfolioShareExpiryToggle');
    const expiryHours = document.getElementById('portfolioShareExpiryHours');

    if (expiryHours && expiryToggle) {
        expiryHours.disabled = !expiryToggle.checked;
    }

    if (!shareToggle || !shareToggle.checked) {
        const shareData = await getPortfolioShareData();
        updateShareExpiryNotice(shareData, false);
        return;
    }

    const selectedExpiryHours = getSelectedShareExpiryHours();
    try {
        await enablePortfolioSharing({ expiryHours: selectedExpiryHours });
        const shareData = await getPortfolioShareData();
        updateShareExpiryNotice(shareData, true);
    } catch (error) {
        console.error('Error updating share expiration settings:', error);
        const message = getPortfolioShareUiErrorMessage(error, 'Failed to update expiration settings.');
        if (typeof showToast === 'function') {
            showToast(`Error: ${message}`, 4200);
        } else {
            alert(message);
        }
    }
}

function formatShareExpiryDate(expiresAt) {
    if (!expiresAt) return null;

    let date;
    if (typeof expiresAt.toDate === 'function') {
        date = expiresAt.toDate();
    } else if (expiresAt instanceof Date) {
        date = expiresAt;
    } else {
        return null;
    }

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    if ((date.getTime() - Date.now()) > NON_EXPIRING_THRESHOLD_MS) {
        return null;
    }

    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function updateShareExpiryNotice(shareData, isEnabled) {
    const notice = document.getElementById('shareExpiryNotice');
    if (!notice) return;

    if (!isEnabled) {
        notice.textContent = 'Public sharing is off. Links work only while sharing is enabled.';
        return;
    }

    const formattedExpiry = formatShareExpiryDate(shareData?.expiresAt);
    if (formattedExpiry) {
        notice.textContent = `This link expires on ${formattedExpiry}. Sharing will turn off automatically at that time.`;
        return;
    }

    notice.textContent = 'This link does not expire unless you turn sharing off.';
}

/**
 * Generate QR code for the share link
 * @param {string} link - Shareable link URL
 * @returns {void}
 */
function generateQRCode(link) {
    const container = document.getElementById('qrCodeContainer');
    if (!container) return;

    // Clear existing QR code
    clearQRCode();

    // Check if QRCode library is loaded
    if (typeof QRCode === 'undefined') {
        console.error('QRCode library not loaded');
        container.innerHTML = '<p class="text-red-600 text-sm">QR Code library not available</p>';
        return;
    }

    // Generate new QR code
    try {
        qrCodeInstance = new QRCode(container, {
            text: link,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });
    } catch (error) {
        console.error('Error generating QR code:', error);
        container.innerHTML = '<p class="text-red-600 text-sm">Error generating QR code</p>';
    }
}

/**
 * Clear QR code from container
 * @returns {void}
 */
function clearQRCode() {
    const container = document.getElementById('qrCodeContainer');
    if (container) {
        container.innerHTML = '';
    }
    qrCodeInstance = null;
}

/**
 * Copy share link to clipboard
 * @async
 * @returns {Promise<void>}
 */
async function copyShareLinkToClipboard() {
    const input = document.getElementById('shareableLinkInput');
    const feedback = document.getElementById('copyFeedback');

    if (!input) return;

    try {
        // Modern clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(input.value);
        } else {
            // Fallback for older browsers
            input.select();
            document.execCommand('copy');
        }

        // Show feedback
        if (feedback) {
            feedback.classList.remove('hidden');
            setTimeout(() => {
                feedback.classList.add('hidden');
            }, 3000);
        }
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        alert('Failed to copy link. Please copy manually.');
    }
}

/**
 * Add share button to settings panel
 * @returns {void}
 */
function addShareButtonToSettings() {
    // Don't add to settings in public portfolio view (settings modal doesn't exist)
    if (window.isPublicPortfolioView) return;

    // Find the settings modal content
    const settingsContent = document.querySelector('#settingsModal .settings-modal-content');
    if (!settingsContent) return;

    // Check if button already exists
    if (document.getElementById('settingsSharePortfolioBtn')) return;

    // Create share section in settings
    const shareSection = document.createElement('div');
    shareSection.className = 'mt-4 pt-4 border-t border-gray-300';
    shareSection.innerHTML = `
        <h3 class="text-lg font-semibold mb-2">Portfolio Sharing</h3>
        <p class="text-sm text-gray-600 mb-3">Share your portfolio publicly with a unique link and QR code.</p>
        <button id="settingsSharePortfolioBtn"
            class="w-full p-3 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Manage Portfolio Sharing
        </button>
    `;

    // Insert before the delete account section
    const deleteAccountSection = settingsContent.querySelector('#accountTab .mt-6.pt-6.border-t');
    if (deleteAccountSection && deleteAccountSection.parentNode) {
        deleteAccountSection.parentNode.insertBefore(shareSection, deleteAccountSection);
    } else {
        settingsContent.appendChild(shareSection);
    }

    // Add event listener
    const btn = document.getElementById('settingsSharePortfolioBtn');
    if (btn) {
        btn.addEventListener('click', () => {
            closeSettingsModal(); // Close settings first
            openPortfolioShareModal(); // Then open share modal
        });
    }
}

/**
 * Close settings modal (helper function)
 * @returns {void}
 */
function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Initialize portfolio share modal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Skip initialization in public portfolio view
    if (window.isPublicPortfolioView) return;

    initPortfolioShareModal();
    addShareButtonToSettings();
});
