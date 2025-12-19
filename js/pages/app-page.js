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

// Watch auth state
onAuthStateChanged(async (user) => {
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
        window.currentUser = user; // Expose globally for other modules
        const userEmailEl = document.getElementById('userEmail');
        const userEmailMobileEl = document.getElementById('userEmailMobile');

        if (window.isMentorView) {
            const params = new URLSearchParams(window.location.search);
            const mentorCode = params.get('mentor');
            const displayText = mentorCode ? `Mentor View: ${mentorCode}` : 'Mentor View';
            if (userEmailEl) {
                userEmailEl.innerHTML = mentorCode ? `Mentor View: <b>(${mentorCode})</b>` : 'Mentor View';
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

        // Activate tab from URL parameter AFTER all data is loaded and rendered
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
