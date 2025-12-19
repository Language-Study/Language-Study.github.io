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

// ===== PORTFOLIO MANAGEMENT =====
const portfolioForm = document.getElementById('portfolioForm');
const portfolioTitle = document.getElementById('portfolioTitle');
const portfolioLink = document.getElementById('portfolioLink');
const portfolioTop3 = document.getElementById('portfolioTop3');
const portfolioList = document.getElementById('portfolioList');

if (portfolioForm) {
    portfolioForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await addPortfolioEntry(portfolioTitle.value, portfolioLink.value);
            portfolioTitle.value = '';
            portfolioLink.value = '';
            await refreshUserData();
            showToast('✓ Portfolio entry added!');
        } catch (error) {
            showToast('Error: ' + error.message);
        }
    });
}

// Portfolio actions
[portfolioTop3, portfolioList].forEach(container => {
    if (container) {
        container.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;

            const id = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');

            try {
                if (action === 'toggleTop') {
                    await toggleTopPortfolio(id);
                } else if (action === 'edit') {
                    const entry = portfolioEntries.find(e => e.id === id);
                    if (!entry) return;

                    const result = await openEditModal({
                        title: 'Edit Portfolio Item',
                        subtitle: 'Update title and link',
                        fields: [
                            { name: 'title', label: 'Title', value: entry.title || '' },
                            { name: 'link', label: 'Link (YouTube or SoundCloud)', value: entry.link || '', placeholder: 'https://...' }
                        ],
                        payload: { id }
                    });

                    const newTitle = (result.title || '').trim();
                    const newLink = (result.link || '').trim();

                    if (!newTitle || !newLink) {
                        showToast('Error: Title and link are required.');
                        return;
                    }

                    await updatePortfolioEntry(id, newTitle, newLink);
                } else if (action === 'delete') {
                    if (confirm('Delete this portfolio entry?')) {
                        await deletePortfolioEntry(id);
                    } else {
                        return;
                    }
                }
                await refreshUserData();
                showToast('✓ Updated!');
            } catch (error) {
                showToast('Error: ' + error.message);
            }
        });
    }
});

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

// ===== SETTINGS & UI =====

// Mobile menu toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileNavDropdown = document.getElementById('mobileNavDropdown');

if (mobileMenuBtn && mobileNavDropdown) {
    mobileMenuBtn.addEventListener('click', () => {
        const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
        mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
        mobileNavDropdown.classList.toggle('active');
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!mobileMenuBtn.contains(e.target) && !mobileNavDropdown.contains(e.target)) {
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
            mobileNavDropdown.classList.remove('active');
        }
    });
}

// Settings modal (both desktop and mobile)
const openSettingsHandler = () => {
    openModal('settingsModal');
    updateMentorCodeToggle();
    // Close mobile menu if open
    if (mobileNavDropdown) {
        mobileNavDropdown.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }
};

document.getElementById('openSettingsBtn').addEventListener('click', openSettingsHandler);

const openSettingsBtnMobile = document.getElementById('openSettingsBtnMobile');
if (openSettingsBtnMobile) {
    openSettingsBtnMobile.addEventListener('click', openSettingsHandler);
}

document.getElementById('closeSettingsBtn').addEventListener('click', () => {
    closeModal('settingsModal');
});

document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('settingsModal')) {
        closeModal('settingsModal');
    }
});

// Progress metrics toggle
const toggleProgress = document.getElementById('toggleProgress');
if (toggleProgress) {
    toggleProgress.addEventListener('change', async (e) => {
        await setProgressEnabled(e.target.checked);
        await updateProgressVisibility();
        renderProgressMetrics();
    });
}

// Achievements toggle
const toggleAchievements = document.getElementById('toggleAchievements');
if (toggleAchievements) {
    toggleAchievements.addEventListener('change', async (e) => {
        await setAchievementsEnabled(e.target.checked);
        await updateAchievementsVisibility();
        const section = document.getElementById('achievementsSection');
        if (section && section.style.display !== 'none' && typeof renderASLClubAchievements === 'function') {
            renderASLClubAchievements();
        }
    });
}

// Mentor view form submission
const mentorViewForm = document.getElementById('mentorViewForm');
if (mentorViewForm) {
    mentorViewForm.addEventListener('submit', async (e) => {
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
}

// Mentor code toggle with confirmation
const mentorToggle = document.getElementById('toggleMentorCode');
if (mentorToggle) {
    mentorToggle.addEventListener('change', async (e) => {
        if (!e.target.checked) {
            if (!confirm('Are you sure you want to disable Mentor Access? Your mentor will no longer be able to view your progress.')) {
                mentorToggle.checked = true;
                return;
            }
        }
        await setMentorCodeEnabled(e.target.checked);
        await showMentorCode();
    });
}

// Regenerate mentor code with confirmation
const regenBtn = document.getElementById('regenerateMentorCodeBtn');
if (regenBtn) {
    regenBtn.addEventListener('click', async (e) => {
        if (!confirm('Are you sure you want to regenerate your mentor code? Your old code will no longer work.')) {
            e.preventDefault();
            return;
        }
        await showMentorCode(true);
        showToast('✓ Code regenerated!');
    });
}

// Delete account
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async () => {
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
}

// Change email
const changeEmailBtn = document.getElementById('changeEmailBtn');
if (changeEmailBtn) {
    changeEmailBtn.addEventListener('click', async () => {
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
}

// Reset password
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
if (resetPasswordBtn) {
    resetPasswordBtn.addEventListener('click', async () => {
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
}

// Google Account linking
const googleSignInToggleBtn = document.getElementById('googleSignInToggleBtn');
if (googleSignInToggleBtn) {
    googleSignInToggleBtn.addEventListener('click', async () => {
        try {
            if (isGoogleLinked()) {
                await unlinkGoogleSignIn();
                googleSignInToggleBtn.textContent = 'Link Google Account';
                showToast('✓ Google Account unlinked');
            } else {
                await linkGoogleSignIn();
                googleSignInToggleBtn.textContent = 'Unlink Google Account';
                showToast('✓ Google Account linked');
            }
        } catch (error) {
            showToast('Error: ' + error.message);
        }
    });

    // Update button text on load
    if (currentUser) {
        googleSignInToggleBtn.textContent = isGoogleLinked() ? 'Unlink Google Account' : 'Link Google Account';
    }
}



// Language selection
const languageSelect = document.getElementById('languageSelect');
if (languageSelect) {
    languageSelect.addEventListener('change', async (e) => {
        const selectedLanguage = e.target.value;

        try {
            await db.collection('users').doc(currentUser.uid).collection('metadata').doc('settings').set(
                { languageLearning: selectedLanguage },
                { merge: true }
            );

            const languageLinksContainer = document.getElementById('languageLinksContainer');
            const linksSnapshot = await db.collection('languageLinks').doc(selectedLanguage).get();

            if (linksSnapshot.exists) {
                const links = linksSnapshot.data().links;
                languageLinksContainer.innerHTML = links.map(link => `
                    <a href="${link.url}" target="_blank" class="text-blue-600 hover:underline">${link.name}</a>
                `).join('<br>');
            } else {
                languageLinksContainer.innerHTML = '<p class="text-sm text-gray-500">No links available for this language.</p>';
            }
        } catch (error) {
            console.error('Error updating language:', error);
        }
    });
}

// Restore language selection on load
onAuthStateChanged(async (user) => {
    if (!user) return;

    try {
        const settingsDoc = await db.collection('users').doc(user.uid).collection('metadata').doc('settings').get();
        if (settingsDoc.exists && settingsDoc.data().languageLearning) {
            const languageSelect = document.getElementById('languageSelect');
            if (languageSelect) {
                languageSelect.value = settingsDoc.data().languageLearning;
                languageSelect.dispatchEvent(new Event('change'));
            }
        }
    } catch (error) {
        console.error('Error restoring language:', error);
    }
});

// Tab navigation is now handled by js/controllers/tab-controller.js
// The TabController class manages all tab switching, active states, and URL routing

// Mentor view handling
window.addEventListener('DOMContentLoaded', tryMentorView);
