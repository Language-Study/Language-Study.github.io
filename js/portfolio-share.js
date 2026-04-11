/**
 * Portfolio Share Module
 * Handles public portfolio sharing with shareable links and QR codes
 */
const PORTFOLIO_CODE_REGEX = /^[A-Z0-9]{5}$/;
const DEFAULT_NON_EXPIRING_HOURS = 24 * 365 * 100;

function normalizeShareExpiryHours(hours) {
    const parsed = Number(hours);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
}

function getShareExpiryTimestamp(hours = null) {
    const normalizedHours = normalizeShareExpiryHours(hours);
    const effectiveHours = normalizedHours || DEFAULT_NON_EXPIRING_HOURS;
    return firebase.firestore.Timestamp.fromDate(new Date(Date.now() + effectiveHours * 60 * 60 * 1000));
}

function getExpiryDateFromValue(expiresAt) {
    if (!expiresAt) return null;
    if (typeof expiresAt.toDate === 'function') {
        const date = expiresAt.toDate();
        return Number.isNaN(date?.getTime?.()) ? null : date;
    }
    if (expiresAt instanceof Date) {
        return Number.isNaN(expiresAt.getTime()) ? null : expiresAt;
    }
    return null;
}

function isShareDataExpired(shareData) {
    const expiryDate = getExpiryDateFromValue(shareData?.expiresAt);
    if (!expiryDate) return false;
    return expiryDate.getTime() <= Date.now();
}

async function getPortfolioShareDataRaw() {
    if (!currentUser) return null;

    const doc = await db.collection('users').doc(currentUser.uid).collection('settings').doc('portfolioShare').get();
    return doc.exists ? doc.data() : null;
}

function getRawPortfolioCodeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('portfolio') || '').trim();
}

function getPortfolioCodeFromUrl() {
    const rawCode = getRawPortfolioCodeFromUrl().toUpperCase();
    if (!PORTFOLIO_CODE_REGEX.test(rawCode)) return null;
    return rawCode;
}

/**
 * Detect if this is a public portfolio view based on URL parameters
 * @returns {boolean}
 */
function isPublicPortfolioViewEarly() {
    return Boolean(getRawPortfolioCodeFromUrl());
}

/**
 * Try to load public portfolio view if URL parameter is present
 * @async
 * @returns {Promise<void>}
 */
async function tryPublicPortfolioView() {
    const rawPortfolioCode = getRawPortfolioCodeFromUrl();
    const portfolioCode = getPortfolioCodeFromUrl();

    if (!rawPortfolioCode) return;
    if (!portfolioCode) {
        alert('Invalid portfolio link.');
        window.location.href = 'index.html';
        return;
    }

    try {
        // Look up the public share link to get the user ID
        const codeDoc = await db.collection('publicShareLinks').doc(portfolioCode).get();

        if (!codeDoc.exists) {
            alert('Invalid portfolio link.');
            window.location.href = 'index.html';
            return;
        }

        const shareData = codeDoc.data();
        const isExpired = isShareDataExpired(shareData);
        const isActiveShare = shareData.enabled === true && !isExpired;

        if (isExpired && shareData.enabled === true) {
            try {
                await db.collection('publicShareLinks').doc(portfolioCode).delete();
            } catch (disableError) {
                console.warn('Unable to delete expired public share link:', disableError);
            }
        }

        if (!isActiveShare || typeof shareData.uid !== 'string') {
            alert('This portfolio is not publicly shared or has been disabled.');
            window.location.href = 'index.html';
            return;
        }

        const portfolioUserId = shareData.uid;

        window.isPublicPortfolioView = true;
        window.publicPortfolioUid = portfolioUserId;

        // Load portfolio data for this user
        await loadPortfolioDataForPublicView(portfolioUserId);

        // Configure UI for public view
        disableEditingForPublicPortfolio();
        showPublicPortfolioUI();
        addPublicPortfolioHeader();
        addPublicPortfolioBanner();

    } catch (error) {
        console.error('Error loading public portfolio:', error);
        alert('Error loading portfolio. Please try again.');
        window.location.href = 'index.html';
    }
}

/**
 * Load portfolio data for public view
 * @async
 * @param {string} uid - User UID whose portfolio to view
 * @returns {Promise<void>}
 */
async function loadPortfolioDataForPublicView(uid) {
    try {
        // Temporarily set currentUser for data loading (similar to mentor view pattern)
        const originalUid = currentUser?.uid;
        currentUser = { uid };

        // Load only portfolio data (not vocabulary or skills)
        await loadPortfolio();
        await renderPortfolio();

        // Restore original user if exists
        if (originalUid) {
            currentUser = { uid: originalUid };
        }
    } catch (error) {
        console.error('Error loading portfolio data for public view:', error);
        throw error;
    }
}

/**
 * Disable editing UI for public portfolio view
 * @returns {void}
 */
function disableEditingForPublicPortfolio() {
    // Hide all editing controls and non-portfolio tabs
    const elementsToHide = [
        '.delete-button',
        '.edit-button',
        '.feature-button',
        '#portfolioForm',
        '#openSettingsBtn',
        '#openSettingsBtnMobile',
        '#logoutBtn',
        '#logoutBtnMobile',
        '#mobileMenuBtn',
        '#searchInput',
        '#openPortfolioShareBtn',  // Hide share button in public view
        '#mentorAccessSection',
        '.tab-button:not([data-tab-target="#portfolio"])', // Hide all tabs except portfolio
        '#vocabulary',
        '#skills',
        '#badges',
        '.mobile-nav-item:not([data-tab-target="#portfolio"])'
    ];

    elementsToHide.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (el) {
                el.style.display = 'none';
            }
        });
    });

    // Show portfolio tab and activate it
    const portfolioTab = document.querySelector('[data-tab-target="#portfolio"]');
    const portfolioContent = document.getElementById('portfolio');

    if (portfolioTab) portfolioTab.style.display = 'none'; // Hide tab buttons entirely
    if (portfolioContent) {
        portfolioContent.classList.remove('hidden');
        portfolioContent.style.display = 'block';
    }
}

function addPublicPortfolioBanner() {
    if (document.getElementById('publicPortfolioBanner')) return;

    const appContainer = document.querySelector('.max-w-4xl.mx-auto.p-2.sm\\:p-4');
    if (!appContainer) return;

    const total = Array.isArray(portfolioEntries) ? portfolioEntries.length : 0;
    const featured = Array.isArray(portfolioEntries) ? portfolioEntries.filter(e => e.isTop).length : 0;
    const code = getPortfolioCodeFromUrl();

    const banner = document.createElement('div');
    banner.id = 'publicPortfolioBanner';
    banner.className = 'mb-4 rounded border-l-4 border-blue-500 bg-blue-50 px-4 py-3 text-sm text-blue-900';
    banner.textContent = code
        ? `Viewing public portfolio (${code}) - ${featured} featured item${featured === 1 ? '' : 's'}, ${total} total.`
        : `Viewing public portfolio - ${featured} featured item${featured === 1 ? '' : 's'}, ${total} total.`;

    appContainer.prepend(banner);
}

/**
 * Show public portfolio UI elements
 * @returns {void}
 */
function showPublicPortfolioUI() {
    // Add class to body for styling
    document.body.classList.add('public-portfolio-view');

    // Hide the welcome modal if it appears
    const welcomeModal = document.getElementById('welcomeModal');
    if (welcomeModal) welcomeModal.classList.add('hidden');

    // Hide search and progress sections
    const searchSection = document.querySelector('.mb-6:has(#searchInput)');
    if (searchSection) searchSection.style.display = 'none';

    // Hide progress metrics
    const progressSection = document.querySelector('.bg-white.rounded-lg.shadow.p-6:has(#progressMetrics)');
    if (progressSection) progressSection.style.display = 'none';
}

/**
 * Add branded header for public portfolio view
 * @returns {void}
 */
function addPublicPortfolioHeader() {
    const nav = document.querySelector('.top-nav');
    if (!nav) return;

    // Update navigation to show it's a public portfolio
    const navTitle = nav.querySelector('h1');
    if (navTitle) {
        navTitle.innerHTML = '<span class="text-xl font-bold">Public Portfolio</span>';
    }

    // Remove desktop nav menu
    const desktopNav = nav.querySelector('.desktop-nav-menu');
    if (desktopNav) desktopNav.style.display = 'none';

    // Add "View on Language Study" button
    const ctaButton = document.createElement('a');
    ctaButton.href = 'index.html';
    ctaButton.className = 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors';
    ctaButton.textContent = 'Create Your Portfolio';
    ctaButton.setAttribute('aria-label', 'Sign up for Language Study');
    ctaButton.style.color = 'white'; // Ensure text is white
    ctaButton.style.textDecoration = 'none'; // Remove link underline

    const navContainer = nav.querySelector('.max-w-4xl > div');
    if (navContainer) {
        navContainer.appendChild(ctaButton);
    }

    // Add attribution footer
    addPublicPortfolioFooter();
}

/**
 * Add footer with branding for public portfolio
 * @returns {void}
 */
function addPublicPortfolioFooter() {
    // Check if footer already exists
    if (document.getElementById('publicPortfolioFooter')) return;

    const footer = document.createElement('div');
    footer.id = 'publicPortfolioFooter';
    footer.className = 'bg-gray-100 border-t border-gray-300 mt-8 py-6 text-center text-sm text-gray-600';
    footer.innerHTML = `
        <p>Powered by <a href="index.html" class="text-blue-600 hover:text-blue-700 font-semibold">Language Study</a></p>
        <p class="mt-1">Track your language learning journey</p>
    `;

    document.body.appendChild(footer);
}

/**
 * Generate shareable portfolio link for current user
 * @async
 * @returns {Promise<string>}
 */
async function generatePortfolioShareLink() {
    if (!currentUser) {
        throw new Error('User must be logged in to generate share link');
    }

    // Get existing portfolio share code only. Link creation should happen
    // explicitly when sharing is enabled.
    const shareData = await getPortfolioShareData();
    let code = shareData?.code;

    if (!code) {
        throw new Error('No active portfolio share code found');
    }

    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?portfolio=${code}`;
}

/**
 * Create a new portfolio share code
 * @async
 * @returns {Promise<string>}
 */
async function createPortfolioShareCode(options = {}) {
    if (!currentUser) {
        throw new Error('User must be logged in');
    }

    const expiryHours = normalizeShareExpiryHours(options.expiryHours);
    let code;
    let attempts = 0;
    const maxAttempts = 10;

    // Try to generate and reserve a unique code without pre-reading.
    // Some rule sets deny reads of missing docs, so write-first is safer.
    while (attempts < maxAttempts) {
        code = generatePortfolioShareCode();
        const expiresAt = getShareExpiryTimestamp(expiryHours);

        try {
            // If a generated code already belongs to another user, this set is denied.
            // Retry with another code instead of failing immediately.
            await db.collection('publicShareLinks').doc(code).set({
                uid: currentUser.uid,
                shareType: 'full-site-24h',
                enabled: true,
                expiresAt: expiresAt,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Store share config in user's settings for rules-based public reads.
            await db.collection('users').doc(currentUser.uid).collection('settings').doc('portfolioShare').set({
                code: code,
                enabled: true,
                shareType: 'full-site-24h',
                expiresAt: expiresAt,
                disabledAt: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            return code;
        } catch (error) {
            const isPermissionDenied = error?.code === 'permission-denied'
                || String(error?.message || '').toLowerCase().includes('permission');

            if (!isPermissionDenied) {
                throw error;
            }

            attempts++;
        }
    }

    throw new Error('Failed to generate unique portfolio code. Check Firestore rules for publicShareLinks.');
}

/**
 * Enable portfolio sharing for current user
 * @async
 * @returns {Promise<void>}
 */
async function enablePortfolioSharing(options = {}) {
    if (!currentUser) {
        throw new Error('User must be logged in');
    }

    try {
        const expiryHours = normalizeShareExpiryHours(options.expiryHours);
        const expiresAt = getShareExpiryTimestamp(expiryHours);

        // Get or create code
        let shareData = await getPortfolioShareData();
        let code = shareData?.code;
        const wasPreviouslyDisabled = shareData?.enabled !== true;
        const wasExpired = isShareDataExpired(shareData);
        const shouldCreateNewCode = !code || wasPreviouslyDisabled || wasExpired;

        if (shouldCreateNewCode) {
            if (code) {
                const shouldDeleteOldCode = wasExpired || wasPreviouslyDisabled;
                if (shouldDeleteOldCode) {
                    try {
                        await db.collection('publicShareLinks').doc(code).delete();
                    } catch (error) {
                        const isNotFound = error?.code === 'not-found';
                        if (!isNotFound) {
                            console.warn('Unable to delete old portfolio share code:', error);
                        }
                    }
                } else {
                    try {
                        await db.collection('publicShareLinks').doc(code).update({
                            enabled: false,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    } catch (error) {
                        const isNotFound = error?.code === 'not-found';
                        if (!isNotFound) {
                            console.warn('Unable to disable old portfolio share code:', error);
                        }
                    }
                }
            }

            code = await createPortfolioShareCode({ expiryHours });
        } else {
            try {
                await db.collection('publicShareLinks').doc(code).set({
                    uid: currentUser.uid,
                    shareType: 'full-site-24h',
                    enabled: true,
                    expiresAt: expiresAt,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } catch (error) {
                const isPermissionDenied = error?.code === 'permission-denied'
                    || String(error?.message || '').toLowerCase().includes('permission');
                if (!isPermissionDenied) {
                    throw error;
                }

                // If this code no longer belongs to the owner, rotate to a fresh code.
                code = await createPortfolioShareCode({ expiryHours });
            }

            await db.collection('users').doc(currentUser.uid).collection('settings').doc('portfolioShare').set({
                enabled: true,
                code: code,
                shareType: 'full-site-24h',
                expiresAt: expiresAt,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                disabledAt: null
            }, { merge: true });
        }
    } catch (error) {
        console.error('Error enabling portfolio sharing:', error);
        throw new Error('Failed to enable portfolio sharing');
    }
}

/**
 * Disable portfolio sharing for current user
 * @async
 * @returns {Promise<void>}
 */
async function disablePortfolioSharing(options = {}) {
    if (!currentUser) {
        throw new Error('User must be logged in');
    }

    try {
        const shareData = options.shareData || await getPortfolioShareDataRaw();
        const shouldDeleteCode = options.deleteCode === true;

        if (shareData?.code) {
            if (shouldDeleteCode) {
                try {
                    await db.collection('publicShareLinks').doc(shareData.code).delete();
                } catch (error) {
                    const isNotFound = error?.code === 'not-found';
                    if (!isNotFound) {
                        console.warn('Unable to delete portfolio share code during disable:', error);
                    }
                }
            } else {
                try {
                    await db.collection('publicShareLinks').doc(shareData.code).update({
                        enabled: false,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch (error) {
                    const isNotFound = error?.code === 'not-found';
                    if (!isNotFound) {
                        console.warn('Unable to disable portfolio share code:', error);
                    }
                }
            }
        }

        await db.collection('users').doc(currentUser.uid).collection('settings').doc('portfolioShare').set({
            enabled: false,
            code: shouldDeleteCode ? null : (shareData?.code || null),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            disabledAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error disabling portfolio sharing:', error);
        throw new Error('Failed to disable portfolio sharing');
    }
}

/**
 * Check if portfolio sharing is enabled for current user
 * @async
 * @returns {Promise<boolean>}
 */
async function isPortfolioSharingEnabled() {
    if (!currentUser) return false;

    try {
        const shareData = await getPortfolioShareData();
        return shareData?.enabled === true;
    } catch (error) {
        console.error('Error checking portfolio sharing status:', error);
        return false;
    }
}

/**
 * Get portfolio share data for current user
 * @async
 * @returns {Promise<Object|null>}
 */
async function getPortfolioShareData() {
    if (!currentUser) return null;

    try {
        let shareData = await getPortfolioShareDataRaw();
        if (!shareData) return null;

        if (shareData.enabled === true && isShareDataExpired(shareData)) {
            await disablePortfolioSharing({
                shareData,
                deleteCode: true
            });
            shareData = {
                ...shareData,
                enabled: false,
                code: null
            };
        }

        return shareData;
    } catch (error) {
        console.error('Error getting portfolio share data:', error);
        return null;
    }
}
