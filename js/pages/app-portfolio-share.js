/**
 * Portfolio Share UI Module
 * Handles the share modal, QR code generation, and user interactions
 */

let qrCodeInstance = null;

/**
 * Initialize portfolio share modal and event listeners
 * @returns {void}
 */
function initPortfolioShareModal() {
    const openBtn = document.getElementById('openPortfolioShareBtn');
    const closeBtn = document.getElementById('closePortfolioShareBtn');
    const modal = document.getElementById('portfolioShareModal');
    const toggle = document.getElementById('portfolioShareToggle');
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
        const isEnabled = await isPortfolioSharingEnabled();
        const toggle = document.getElementById('portfolioShareToggle');

        if (toggle) {
            toggle.checked = isEnabled;
        }

        if (isEnabled) {
            showShareContent();
            const shareLink = await generatePortfolioShareLink();
            displayShareLink(shareLink);
            generateQRCode(shareLink);
        } else {
            hideShareContent();
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

    try {
        if (isEnabled) {
            await enablePortfolioSharing();
            showShareContent();
            const shareLink = await generatePortfolioShareLink();
            displayShareLink(shareLink);
            generateQRCode(shareLink);
        } else {
            await disablePortfolioSharing();
            hideShareContent();
            clearQRCode();
        }
    } catch (error) {
        console.error('Error toggling portfolio sharing:', error);
        alert('Failed to update sharing settings. Please try again.');
        // Revert toggle state
        event.target.checked = !isEnabled;
    }
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
    const deleteAccountSection = settingsContent.querySelector('.mt-6.pt-6.border-t');
    if (deleteAccountSection) {
        settingsContent.insertBefore(shareSection, deleteAccountSection);
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
