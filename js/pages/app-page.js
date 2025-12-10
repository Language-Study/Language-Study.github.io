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
        currentUser = user;
        const userEmailEl = document.getElementById('userEmail');

        if (window.isMentorView) {
            const params = new URLSearchParams(window.location.search);
            const mentorCode = params.get('mentor');
            if (userEmailEl) {
                userEmailEl.innerHTML = mentorCode ? `Mentor View: <b>(${mentorCode})</b>` : 'Mentor View';
            }
        } else {
            if (userEmailEl) {
                userEmailEl.textContent = `Logged in as: ${user.email}`;
            }
        }

        // Load data after auth state confirmed
        await loadUserData();

        // Render ASL Club achievements if available
        const section = document.getElementById('achievementsSection');
        if (section && section.style.display !== 'none' && typeof renderASLClubAchievements === 'function') {
            renderASLClubAchievements();
        }

        // Activate tab from URL parameter
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab') || 'vocabulary';
        if (['vocabulary', 'skills', 'portfolio'].includes(tabParam)) {
            setTimeout(() => {
                if (typeof activateTab === 'function') {
                    activateTab(tabParam);
                }
            }, 100);
        }
    } else {
        window.location.href = 'login.html';
    }
});

// Logout functionality
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await logoutUser();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error: ', error.message);
        }
    });
}

// ===== CATEGORY MANAGEMENT =====
const categorySelect = document.getElementById('categorySelect');
const newCategoryInput = document.getElementById('newCategoryInput');
const newCategoryName = document.getElementById('newCategoryName');
const deleteCategoryBtn = document.getElementById('deleteCategoryBtn');

categorySelect.addEventListener('change', (e) => {
    const selectedValue = e.target.value;
    if (selectedValue === 'new') {
        newCategoryInput.classList.remove('hidden');
        deleteCategoryBtn.disabled = true;
    } else {
        newCategoryInput.classList.add('hidden');
        const protectedCategories = ['General'];
        deleteCategoryBtn.disabled = protectedCategories.includes(selectedValue);
    }
});

document.getElementById('addCategoryBtn').addEventListener('click', async () => {
    const newCategory = newCategoryName.value.trim();

    try {
        await addCategory(newCategory);
        updateCategorySelect();
        categorySelect.value = newCategory;
        newCategoryInput.classList.add('hidden');
        newCategoryName.value = '';
        deleteCategoryBtn.disabled = false;
        showToast('✓ Category added!');
    } catch (error) {
        showToast('Error: ' + error.message);
    }
});

document.getElementById('cancelCategoryBtn').addEventListener('click', () => {
    newCategoryInput.classList.add('hidden');
    newCategoryName.value = '';
    const protectedCategories = ['General'];
    deleteCategoryBtn.disabled = categorySelect.value === 'new' || protectedCategories.includes(categorySelect.value);
});

deleteCategoryBtn.addEventListener('click', async () => {
    const categoryToDelete = categorySelect.value;

    if (confirm(`Are you sure you want to delete "${categoryToDelete}"? All vocabulary in this category will be deleted.`)) {
        try {
            await deleteCategory(categoryToDelete);
            await refreshUserData();
            categorySelect.value = 'General';
            deleteCategoryBtn.disabled = true;
            showToast('✓ Category deleted!');
        } catch (error) {
            showToast('Error: ' + error.message);
        }
    }
});

// ===== VOCABULARY MANAGEMENT =====
const vocabularyInput = document.getElementById('vocabularyInput');
const translationInput = document.getElementById('translationInput');
const addVocabBtn = document.getElementById('addVocabBtn');
const vocabularyListEl = document.getElementById('vocabularyList');

addVocabBtn.addEventListener('click', async () => {
    try {
        const words = vocabularyInput.value;
        const translation = translationInput.value;
        const category = categorySelect.value;

        await addVocabularyWords(words, translation, category);
        vocabularyInput.value = '';
        translationInput.value = '';
        await refreshUserData();
        showToast('✓ Vocabulary added!');
    } catch (error) {
        showToast('Error: ' + error.message);
    }
});

vocabularyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addVocabBtn.click();
    }
});

translationInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addVocabBtn.click();
    }
});

// Delegate vocabulary item events
vocabularyListEl.addEventListener('click', async (e) => {
    const statusButton = e.target.closest('.status-button');
    const deleteButton = e.target.closest('.delete-button');
    const itemId = e.target.closest('.vocab-item')?.dataset.id;

    if (statusButton && itemId) {
        try {
            const item = vocabularyList.find(v => v.id === itemId);
            const statusOrder = [PROGRESS_STATUS.NOT_STARTED, PROGRESS_STATUS.IN_PROGRESS, PROGRESS_STATUS.MASTERED];
            const currentIndex = statusOrder.indexOf(item.status);
            const newStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

            await updateVocabularyStatus(itemId, newStatus);
            await refreshUserData();
        } catch (error) {
            showToast('Error: ' + error.message);
        }
    } else if (deleteButton && itemId) {
        const item = vocabularyList.find(v => v.id === itemId);
        if (confirm(`Delete "${item.word}"?`)) {
            try {
                await deleteVocabularyItem(itemId);
                await refreshUserData();
                showToast('✓ Item deleted!');
            } catch (error) {
                showToast('Error: ' + error.message);
            }
        }
    }
});

// ===== SKILLS MANAGEMENT =====
const skillsInput = document.getElementById('skillsInput');
const addSkillBtn = document.getElementById('addSkillBtn');
const skillsList = document.getElementById('skillsList');

addSkillBtn.addEventListener('click', async () => {
    try {
        await addSkills(skillsInput.value);
        skillsInput.value = '';
        await refreshUserData();
        showToast('✓ Skills added!');
    } catch (error) {
        showToast('Error: ' + error.message);
    }
});

skillsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addSkillBtn.click();
    }
});

// Delegate skills item events
skillsList.addEventListener('click', async (e) => {
    const statusButton = e.target.closest('.status-button');
    const deleteButton = e.target.closest('.delete-button');
    const itemId = e.target.closest('.skill-item')?.dataset.id;

    if (statusButton && itemId) {
        try {
            const skill = skills.find(s => s.id === itemId);
            const statusOrder = [PROGRESS_STATUS.NOT_STARTED, PROGRESS_STATUS.IN_PROGRESS, PROGRESS_STATUS.MASTERED];
            const currentIndex = statusOrder.indexOf(skill.status);
            const newStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

            await updateSkillStatus(itemId, newStatus);
            await refreshUserData();
        } catch (error) {
            showToast('Error: ' + error.message);
        }
    } else if (deleteButton && itemId) {
        const skill = skills.find(s => s.id === itemId);
        if (confirm(`Delete "${skill.name}"?`)) {
            try {
                await deleteSkill(itemId);
                await refreshUserData();
                showToast('✓ Skill deleted!');
            } catch (error) {
                showToast('Error: ' + error.message);
            }
        }
    }
});

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
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        filterVocabulary(query);
        filterSkills(query);
        filterPortfolio(query);
    });
}

// ===== SETTINGS & UI =====
document.getElementById('openSettingsBtn').addEventListener('click', () => {
    openModal('settingsModal');
    updateMentorCodeToggle();
});

document.getElementById('closeSettingsBtn').addEventListener('click', () => {
    closeModal('settingsModal');
});

document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('settingsModal')) {
        closeModal('settingsModal');
    }
});

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

// Progress metrics toggle
const toggleProgress = document.getElementById('toggleProgress');
if (toggleProgress) {
    toggleProgress.addEventListener('change', async (e) => {
        await setProgressEnabled(e.target.checked);
        await updateProgressVisibility();
        renderProgressMetrics();
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

// Google Sign-In linking
const googleSignInToggleBtn = document.getElementById('googleSignInToggleBtn');
if (googleSignInToggleBtn) {
    googleSignInToggleBtn.addEventListener('click', async () => {
        try {
            if (isGoogleLinked()) {
                await unlinkGoogleSignIn();
                googleSignInToggleBtn.textContent = 'Link Google Sign-In';
                showToast('✓ Google Sign-In unlinked');
            } else {
                await linkGoogleSignIn();
                googleSignInToggleBtn.textContent = 'Unlink Google Sign-In';
                showToast('✓ Google Sign-In linked');
            }
        } catch (error) {
            showToast('Error: ' + error.message);
        }
    });

    // Update button text on load
    if (currentUser) {
        googleSignInToggleBtn.textContent = isGoogleLinked() ? 'Unlink Google Sign-In' : 'Link Google Sign-In';
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

// Tab navigation
function activateTab(tabId) {
    // Handle data-tab-target system
    const tabButtons = document.querySelectorAll('[data-tab-target]');
    const tabContents = document.querySelectorAll('[data-tab-content]');

    if (tabButtons && tabContents) {
        const activeButton = document.querySelector(`[data-tab-target="#${tabId}"]`);
        const activeContent = document.querySelector(`#${tabId}`);

        if (activeButton && activeContent) {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.add('hidden'));

            activeButton.classList.add('active');
            activeContent.classList.remove('hidden');
        }
    }

    // Handle main tab button system
    const mainTabButtons = document.querySelectorAll('.tab-button');
    const mainTabContents = document.querySelectorAll('.tab-content');

    if (mainTabButtons && mainTabContents) {
        const activeMainButton = document.querySelector(`[data-tab="${tabId}"]`);
        const activeMainContent = document.getElementById(tabId);

        if (activeMainButton && activeMainContent) {
            mainTabButtons.forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('bg-gray-200', 'text-gray-700');
            });

            mainTabContents.forEach(content => {
                content.classList.remove('active');
            });

            activeMainButton.classList.add('bg-blue-500', 'text-white');
            activeMainButton.classList.remove('bg-gray-200', 'text-gray-700');
            activeMainContent.classList.add('active');
        }
    }

    // Update URL
    if (['vocabulary', 'skills', 'portfolio'].includes(tabId)) {
        const url = new URL(window.location);
        url.searchParams.set('tab', tabId);
        window.history.pushState({}, '', url);
    }
}

// Tab button listeners
document.querySelectorAll('[data-tab-target]').forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.dataset.tabTarget.replace('#', '');
        activateTab(tabId);
    });
});

document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.dataset.tab;
        if (targetId) {
            activateTab(targetId);
        }
    });
});

// Browser back/forward navigation
window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') || 'vocabulary';
    if (['vocabulary', 'skills', 'portfolio'].includes(tabParam)) {
        activateTab(tabParam);
    }
});

// Mentor view handling
window.addEventListener('DOMContentLoaded', tryMentorView);
