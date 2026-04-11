/**
 * Main Application Page Script (index.html)
 * Orchestrates all modules for the main app
 */

let currentUser = null;

// Detect mentor view early
(async function detectMentorViewEarly() {
    if (isMentorViewEarly()) {
        window.isMentorView = true;
    }
})();

// Detect public portfolio view early and load it (bypassing auth)
(async function detectPublicPortfolioViewEarly() {
    if (isPublicPortfolioViewEarly()) {
        window.isPublicPortfolioView = true;
        
        // Wait for Firebase to be ready (config.js defines db)
        const maxWait = 50; // 5 seconds max
        let attempts = 0;
        while (typeof db === 'undefined' && attempts < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (typeof db === 'undefined') {
            console.error('Firebase not loaded in time');
            alert('Error loading portfolio. Please refresh the page.');
            return;
        }
        
        // Load public portfolio immediately, bypassing auth
        await tryPublicPortfolioView();
    }
})();

// Watch auth state
onAuthStateChanged(async (user) => {
    // Skip normal auth flow if in public portfolio view
    if (window.isPublicPortfolioView) {
        return; // Public view already loaded
    }

    if (user) {
        const isPasswordAccount = user.providerData?.some(p => p.providerId === 'password');
        if (isPasswordAccount && !user.emailVerified) {
            // Block unverified users from accessing data
            try {
                await user.sendEmailVerification();
            } catch (err) {
                console.warn('Failed to resend verification email:', err);
            }
            await logoutUser();
            window.location.href = 'login.html?verify=required';
            return;
        }

        currentUser = user;
        const userEmailEl = document.getElementById('userEmail');
        const userEmailMobileEl = document.getElementById('userEmailMobile');

        if (window.isMentorView) {
            const params = new URLSearchParams(window.location.search);
            const mentorCodeRaw = (params.get('mentor') || '').toUpperCase().trim();
            const mentorCode = /^[A-Z0-9]{5}$/.test(mentorCodeRaw) ? mentorCodeRaw : '';
            const displayText = mentorCode ? `Mentor View: ${mentorCode}` : 'Mentor View';
            if (userEmailEl) {
                userEmailEl.textContent = mentorCode ? `Mentor View (${mentorCode})` : 'Mentor View';
            }
            if (userEmailMobileEl) {
                userEmailMobileEl.textContent = displayText;
            }
        } else {
            const displayText = `Logged in as: ${user.email}`;
            if (userEmailEl) {
                userEmailEl.textContent = displayText;
            }
            if (userEmailMobileEl) {
                userEmailMobileEl.textContent = displayText;
            }
        }

        // Load data after auth state confirmed
        await loadUserData();

        // Ensure settings reflect current link status
        const btn = document.getElementById('googleSignInToggleBtn');
        if (btn) {
            btn.textContent = isGoogleLinked() ? 'Unlink Google Account' : 'Link Google Account';
        }

        // Render ASL Club achievements if available
        const section = document.getElementById('achievementsSection');
        if (section && section.style.display !== 'none' && typeof renderASLClubAchievements === 'function') {
            renderASLClubAchievements();
        }

        // Activate tab from URL parameter (or default behavior) AFTER all data is loaded and rendered
        if (window.tabController) {
            window.tabController.initializeFromURL();
        }
    } else {
        window.location.href = 'login.html';
    }
});

// Logout functionality (both desktop and mobile)
const logoutBtn = document.getElementById('logoutBtn');
const logoutBtnMobile = document.getElementById('logoutBtnMobile');

const handleLogout = async () => {
    try {
        await logoutUser();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error: ', error.message);
    }
};

if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}

if (logoutBtnMobile) {
    logoutBtnMobile.addEventListener('click', handleLogout);
}

// Handlers for Vocabulary and Skills were moved to js/pages/app-vocabulary.js and js/pages/app-skills.js

// Portfolio handlers moved to js/pages/app-portfolio.js

// ===== SEARCH FUNCTIONALITY =====
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    const runSearch = debounce(() => {
        const query = searchInput.value.trim().toLowerCase();
        filterVocabulary(query);
        filterSkills(query);
        filterPortfolio(query);
    }, 180);

    searchInput.addEventListener('input', runSearch);
}

function renderVocabularyWithCurrentFilter() {
    const query = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    if (query) {
        filterVocabulary(query);
    } else {
        renderVocabularyList();
    }
    renderProgressMetrics();
}

function renderSkillsWithCurrentFilter() {
    const query = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    if (query) {
        filterSkills(query);
    } else {
        renderSkillsList();
    }
    renderProgressMetrics();
}

// Settings, mentor, account, Google linking, and language selection moved to js/pages/app-settings.js

// Tab navigation is now handled by js/controllers/tab-controller.js
// The TabController class manages all tab switching, active states, and URL routing

// Mentor view handling
window.addEventListener('DOMContentLoaded', tryMentorView);
