// ===== SETTINGS & MENTOR =====

// Settings Modal Tab Controller
class SettingsTabController {
    constructor() {
        this.currentTab = 'display';
        this.initializeListeners();
    }

    activateTab(tabName) {
        this.currentTab = tabName;

        // Update button states
        const tabButtons = document.querySelectorAll('[data-settings-tab]');
        tabButtons.forEach(btn => {
            const btnTabName = btn.getAttribute('data-settings-tab');
            if (btnTabName === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update content visibility
        const tabContents = document.querySelectorAll('[data-settings-tab-content]');
        tabContents.forEach(content => {
            if (content.id === tabName + 'Tab') {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
    }

    initializeListeners() {
        document.addEventListener('click', (e) => {
            const tabButton = e.target.closest('[data-settings-tab]');
            if (tabButton) {
                const tabName = tabButton.getAttribute('data-settings-tab');
                this.activateTab(tabName);
            }
        });
    }
}

// Initialize settings tab controller
const settingsTabController = new SettingsTabController();

// Mobile menu elements for closing when opening settings
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileNavDropdown = document.getElementById('mobileNavDropdown');

// Settings modal (both desktop and mobile)
const openSettingsHandler = () => {
    openModal('settingsModal');
    // Activate the default tab
    settingsTabController.activateTab('display');
    // Gate auth-related options based on user's login providers
    updateAuthOptionVisibility();
    updateMentorCodeToggle();
    updateMentorQuickReviewUI();
    // Close mobile menu if open
    if (mobileNavDropdown && mobileMenuBtn) {
        mobileNavDropdown.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }
};

document.getElementById('openSettingsBtn')?.addEventListener('click', openSettingsHandler);
const openSettingsBtnMobile = document.getElementById('openSettingsBtnMobile');
openSettingsBtnMobile?.addEventListener('click', openSettingsHandler);

document.getElementById('closeSettingsBtn')?.addEventListener('click', () => {
    closeModal('settingsModal');
});

document.getElementById('settingsModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('settingsModal')) {
        closeModal('settingsModal');
    }
});

// Show or hide email/password settings based on auth provider
function updateAuthOptionVisibility() {
    try {
        const user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : (typeof auth !== 'undefined' ? auth.currentUser : null);
        const providers = Array.isArray(user?.providerData) ? user.providerData.map(p => p.providerId) : [];
        const hasPasswordProvider = providers.includes('password');

        // Settings modal elements
        const changeEmailTabBtn = document.querySelector('[data-tab-target="#changeEmailSection"]');
        const resetPasswordTabBtn = document.querySelector('[data-tab-target="#resetPasswordSection"]');
        const changeEmailSection = document.getElementById('changeEmailSection');
        const resetPasswordSection = document.getElementById('resetPasswordSection');

        if (!hasPasswordProvider) {
            // Hide options that don't apply to Google-only accounts
            changeEmailTabBtn?.classList.add('hidden');
            resetPasswordTabBtn?.classList.add('hidden');
            changeEmailSection?.classList.add('hidden');
            resetPasswordSection?.classList.add('hidden');
        } else {
            // Ensure options are visible for email/password users
            changeEmailTabBtn?.classList.remove('hidden');
            resetPasswordTabBtn?.classList.remove('hidden');
            // Leave sections hidden by default; tabs or other logic can reveal them
        }
    } catch (err) {
        console.warn('Could not update auth option visibility:', err);
    }
}

// Progress metrics toggle
const toggleProgress = document.getElementById('toggleProgress');
toggleProgress?.addEventListener('change', async (e) => {
    await setProgressEnabled(e.target.checked);
    await updateProgressVisibility();
    renderProgressMetrics();
});

// Achievements toggle
const toggleAchievements = document.getElementById('toggleAchievements');
toggleAchievements?.addEventListener('change', async (e) => {
    await setAchievementsEnabled(e.target.checked);
    await updateAchievementsVisibility();
    const section = document.getElementById('achievementsSection');
    if (section && section.style.display !== 'none' && typeof renderASLClubAchievements === 'function') {
        renderASLClubAchievements();
    }
});

// Mentor view form submission
const mentorViewForm = document.getElementById('mentorViewForm');
mentorViewForm?.addEventListener('submit', async (e) => {
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

// Mentor code toggle with confirmation
const mentorToggle = document.getElementById('toggleMentorCode');
mentorToggle?.addEventListener('change', async (e) => {
    if (!e.target.checked) {
        if (!confirm('Are you sure you want to disable Mentor Access? Your mentor will no longer be able to view your progress.')) {
            mentorToggle.checked = true;
            return;
        }
    }
    await setMentorCodeEnabled(e.target.checked);
    await showMentorCode();
});

// Mentor quick review toggle
const mentorQuickReviewToggle = document.getElementById('toggleMentorQuickReview');
mentorQuickReviewToggle?.addEventListener('change', async (e) => {
    await setMentorQuickReviewEnabled(e.target.checked);
    if (e.target.checked) {
        showToast('✓ Mentors can now use Quick Review');
    } else {
        showToast('✓ Mentors cannot use Quick Review');
    }
});

// Regenerate mentor code with confirmation
const regenBtn = document.getElementById('regenerateMentorCodeBtn');
regenBtn?.addEventListener('click', async (e) => {
    if (!confirm('Are you sure you want to regenerate your mentor code? Your old code will no longer work.')) {
        e.preventDefault();
        return;
    }
    await showMentorCode(true);
    showToast('✓ Code regenerated!');
});

// Delete account
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
deleteAccountBtn?.addEventListener('click', async () => {
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

// Change email
const changeEmailBtn = document.getElementById('changeEmailBtn');
changeEmailBtn?.addEventListener('click', async () => {
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

// Reset password
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
resetPasswordBtn?.addEventListener('click', async () => {
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

// Google Account linking
const googleSignInToggleBtn = document.getElementById('googleSignInToggleBtn');
googleSignInToggleBtn?.addEventListener('click', async () => {
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

// Update button text on load if user present
if (googleSignInToggleBtn && typeof isGoogleLinked === 'function' && typeof currentUser !== 'undefined' && currentUser) {
    googleSignInToggleBtn.textContent = isGoogleLinked() ? 'Unlink Google Account' : 'Link Google Account';
}

// Language selection
const languageSelect = document.getElementById('languageSelect');
languageSelect?.addEventListener('change', async (e) => {
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

// Restore language selection on load
onAuthStateChanged?.(async (user) => {
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
