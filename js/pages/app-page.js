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
const bulkSelectAll = document.getElementById('bulkSelectAll');
const bulkClearSelectionBtn = document.getElementById('bulkClearSelection');
const bulkMarkNotStartedBtn = document.getElementById('bulkMarkNotStarted');
const bulkMarkInProgressBtn = document.getElementById('bulkMarkInProgress');
const bulkMarkMasteredBtn = document.getElementById('bulkMarkMastered');
const bulkDeleteBtn = document.getElementById('bulkDelete');

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
    const checkbox = e.target.closest('.vocab-select-checkbox');
    if (checkbox && checkbox.dataset.id) {
        const itemId = checkbox.dataset.id;
        if (checkbox.checked) {
            selectedVocabIds.add(itemId);
        } else {
            selectedVocabIds.delete(itemId);
        }
        if (typeof updateBulkSelectionUI === 'function') {
            updateBulkSelectionUI();
        }
        return;
    }

    const editButton = e.target.closest('.edit-button');
    const statusButton = e.target.closest('.status-button');
    const deleteButton = e.target.closest('.delete-button');
    const itemId = e.target.closest('.vocab-item')?.dataset.id;

    if (editButton && itemId) {
        const item = vocabularyList.find(v => v.id === itemId);
        if (!item) return;

        try {
            const result = await openEditModal({
                title: 'Edit Vocabulary',
                subtitle: 'Update the word and translation/link',
                fields: [
                    { name: 'word', label: 'Word or phrase', value: item.word },
                    { name: 'translation', label: 'Translation or media link (optional)', value: item.translation || '', placeholder: 'Text, YouTube, or SoundCloud link' }
                ],
                payload: { itemId }
            });

            const newWord = (result.word || '').trim();
            const newTranslation = (result.translation || '').trim();

            if (!newWord) {
                showToast('Error: Word cannot be empty.');
                return;
            }

            await updateVocabularyItem(itemId, { word: newWord, translation: newTranslation });
            if (dataCache?.isCached) {
                dataCache.vocabularyList = [...vocabularyList];
            }
            renderVocabularyWithCurrentFilter();
            showToast('✓ Item updated!');
        } catch (error) {
            if (error !== 'closed') {
                showToast('Error: ' + error.message);
            }
        }
    } else if (statusButton && itemId) {
        try {
            const item = vocabularyList.find(v => v.id === itemId);
            const statusOrder = [PROGRESS_STATUS.NOT_STARTED, PROGRESS_STATUS.IN_PROGRESS, PROGRESS_STATUS.MASTERED];
            const currentIndex = statusOrder.indexOf(item.status);
            const newStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

            await updateVocabularyStatus(itemId, newStatus);
            item.status = newStatus;
            if (dataCache?.isCached) {
                dataCache.vocabularyList = [...vocabularyList];
            }
            renderVocabularyWithCurrentFilter();
        } catch (error) {
            showToast('Error: ' + error.message);
        }
    } else if (deleteButton && itemId) {
        const item = vocabularyList.find(v => v.id === itemId);
        if (confirm(`Delete "${item.word}"?`)) {
            try {
                await deleteVocabularyItem(itemId);
                vocabularyList = vocabularyList.filter(v => v.id !== itemId);
                if (dataCache?.isCached) {
                    dataCache.vocabularyList = [...vocabularyList];
                }
                renderVocabularyWithCurrentFilter();
                showToast('✓ Item deleted!');
            } catch (error) {
                showToast('Error: ' + error.message);
            }
        }
    }
});

// ===== BULK VOCABULARY ACTIONS =====
const getDisplayedVocabularyIds = () => Array.from(document.querySelectorAll('.vocab-item')).map(el => el.dataset.id).filter(Boolean);

const syncCheckboxesToSelection = () => {
    document.querySelectorAll('.vocab-select-checkbox').forEach(cb => {
        const id = cb.dataset.id;
        cb.checked = selectedVocabIds.has(id);
    });
};

const expandAllVocabularyCategories = () => {
    document.querySelectorAll('#vocabularyList .category-content').forEach(content => {
        content.classList.add('expanded');
        content.style.display = 'block';
        const header = content.previousElementSibling;
        if (header) {
            header.setAttribute('aria-expanded', 'true');
            const arrow = header.querySelector('svg');
            if (arrow) {
                arrow.style.transform = 'rotate(180deg)';
            }
        }
    });
};

bulkSelectAll?.addEventListener('change', () => {
    const displayedIds = getDisplayedVocabularyIds();
    if (bulkSelectAll.checked) {
        displayedIds.forEach(id => selectedVocabIds.add(id));
        expandAllVocabularyCategories();
    } else {
        displayedIds.forEach(id => selectedVocabIds.delete(id));
    }
    syncCheckboxesToSelection();
    if (typeof updateBulkSelectionUI === 'function') {
        updateBulkSelectionUI();
    }
});

bulkClearSelectionBtn?.addEventListener('click', () => {
    selectedVocabIds.clear();
    syncCheckboxesToSelection();
    if (typeof updateBulkSelectionUI === 'function') {
        updateBulkSelectionUI();
    }
});

async function bulkUpdateStatus(newStatus) {
    const ids = Array.from(selectedVocabIds);
    if (ids.length === 0) return;

    try {
        await Promise.all(ids.map(id => updateVocabularyStatus(id, newStatus)));
        vocabularyList = vocabularyList.map(item => ids.includes(item.id) ? { ...item, status: newStatus } : item);
        if (dataCache?.isCached) {
            dataCache.vocabularyList = [...vocabularyList];
        }
        renderVocabularyWithCurrentFilter();
        showToast('✓ Status updated');
    } catch (error) {
        showToast('Error: ' + error.message);
    }
}

async function bulkDeleteSelected() {
    const ids = Array.from(selectedVocabIds);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected item(s)?`)) return;

    try {
        await Promise.all(ids.map(id => deleteVocabularyItem(id)));
        vocabularyList = vocabularyList.filter(item => !selectedVocabIds.has(item.id));
        selectedVocabIds.clear();
        if (dataCache?.isCached) {
            dataCache.vocabularyList = [...vocabularyList];
        }
        renderVocabularyWithCurrentFilter();
        showToast('✓ Selected items deleted');
    } catch (error) {
        showToast('Error: ' + error.message);
    }
}

bulkMarkNotStartedBtn?.addEventListener('click', () => bulkUpdateStatus(PROGRESS_STATUS.NOT_STARTED));
bulkMarkInProgressBtn?.addEventListener('click', () => bulkUpdateStatus(PROGRESS_STATUS.IN_PROGRESS));
bulkMarkMasteredBtn?.addEventListener('click', () => bulkUpdateStatus(PROGRESS_STATUS.MASTERED));
bulkDeleteBtn?.addEventListener('click', bulkDeleteSelected);

// ===== SKILLS MANAGEMENT =====
const skillsInput = document.getElementById('skillsInput');
const addSkillBtn = document.getElementById('addSkillBtn');
const skillsList = document.getElementById('skillsList');

addSkillBtn.addEventListener('click', async () => {
    try {
        // Save expanded state
        const expandedSkills = new Set();
        document.querySelectorAll('.expand-button[aria-expanded="true"]').forEach(btn => {
            expandedSkills.add(btn.dataset.skillId);
        });

        await addSkills(skillsInput.value);
        skillsInput.value = '';
        await refreshUserData();

        // Restore expanded state
        expandedSkills.forEach(id => {
            const btn = document.querySelector(`.expand-button[data-skill-id="${id}"]`);
            const container = document.getElementById(`subtasks-${id}`);
            if (btn && container) {
                container.classList.remove('hidden');
                btn.setAttribute('aria-expanded', 'true');
            }
        });

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
    // Handle expand/collapse subtasks
    const expandButton = e.target.closest('.expand-button');
    if (expandButton) {
        const skillId = expandButton.dataset.skillId;
        const subtasksContainer = document.getElementById(`subtasks-${skillId}`);
        if (subtasksContainer) {
            subtasksContainer.classList.toggle('hidden');
            // Update aria-expanded for accessibility and CSS rotation
            const isExpanded = !subtasksContainer.classList.contains('hidden');
            expandButton.setAttribute('aria-expanded', isExpanded);
        }
        return;
    }

    // Handle expand/collapse when clicking the skill header (excluding status/delete buttons)
    const skillHeader = e.target.closest('.skill-header');
    const headerBlocked = e.target.closest('.status-button') || e.target.closest('.delete-button') || e.target.closest('.expand-button') || e.target.closest('.edit-button');
    if (skillHeader && !headerBlocked) {
        const skillId = skillHeader.dataset.skillId || skillHeader.closest('.skill-item')?.dataset.id;
        if (skillId) {
            const subtasksContainer = document.getElementById(`subtasks-${skillId}`);
            const headerExpandButton = document.querySelector(`.expand-button[data-skill-id="${skillId}"]`);
            if (subtasksContainer && headerExpandButton) {
                subtasksContainer.classList.toggle('hidden');
                const isExpanded = !subtasksContainer.classList.contains('hidden');
                headerExpandButton.setAttribute('aria-expanded', isExpanded);
            }
        }
        return;
    }

    // Handle add subtask
    const addSubtaskBtn = e.target.closest('.subtask-add-button');
    const editSubtaskBtn = e.target.closest('.subtask-edit-button');
    if (addSubtaskBtn) {
        const skillId = addSubtaskBtn.dataset.skillId;
        const input = document.querySelector(`.subtask-input[data-skill-id="${skillId}"]`);
        if (input && input.value.trim()) {
            try {
                // Save expanded state before refresh
                const expandedSkills = new Set();
                document.querySelectorAll('.expand-button[aria-expanded="true"]').forEach(btn => {
                    expandedSkills.add(btn.dataset.skillId);
                });

                await addSubtask(skillId, input.value);
                input.value = '';
                await refreshUserData();
                renderSkillsWithCurrentFilter();

                // Restore expanded state
                expandedSkills.forEach(id => {
                    const btn = document.querySelector(`.expand-button[data-skill-id="${id}"]`);
                    const container = document.getElementById(`subtasks-${id}`);
                    if (btn && container) {
                        container.classList.remove('hidden');
                        btn.setAttribute('aria-expanded', 'true');
                    }
                });

                showToast('✓ Subtask added!');
            } catch (error) {
                showToast('Error: ' + error.message);
            }
        }
        return;
    }

    // Handle subtask edit
    if (editSubtaskBtn) {
        const subtaskItem = e.target.closest('.subtask-item');
        const skillId = e.target.closest('.skill-item')?.dataset.id;
        const subtaskId = subtaskItem?.dataset.subtaskId;

        if (skillId && subtaskId) {
            try {
                const skill = skills.find(s => s.id === skillId);
                const subtask = (skill?.subtasks || []).find(st => st.id === subtaskId);
                if (!subtask) return;

                const result = await openEditModal({
                    title: 'Edit Subtask',
                    subtitle: 'Update the subtask text',
                    fields: [
                        { name: 'text', label: 'Subtask', value: subtask.text || '', placeholder: 'Describe the subtask...' }
                    ],
                    payload: { skillId, subtaskId }
                });

                const newText = (result.text || '').trim();
                if (!newText) {
                    showToast('Error: Subtask cannot be empty.');
                    return;
                }

                const expandedSkills = new Set();
                document.querySelectorAll('.expand-button[aria-expanded="true"]').forEach(btn => {
                    expandedSkills.add(btn.dataset.skillId);
                });

                await updateSubtaskText(skillId, subtaskId, newText);
                await refreshUserData();
                renderSkillsWithCurrentFilter();

                expandedSkills.forEach(id => {
                    const btn = document.querySelector(`.expand-button[data-skill-id="${id}"]`);
                    const container = document.getElementById(`subtasks-${id}`);
                    if (btn && container) {
                        container.classList.remove('hidden');
                        btn.setAttribute('aria-expanded', 'true');
                    }
                });

                showToast('✓ Subtask updated!');
            } catch (error) {
                if (error !== 'closed') {
                    showToast('Error: ' + error.message);
                }
            }
        }
        return;
    }

    // Handle subtask status change
    const subtaskStatusButton = e.target.closest('.subtask-status-button');
    if (subtaskStatusButton) {
        const subtaskItem = e.target.closest('.subtask-item');
        const skillId = e.target.closest('.skill-item')?.dataset.id;
        const subtaskId = subtaskItem?.dataset.subtaskId;

        if (skillId && subtaskId) {
            try {
                // Save expanded state before refresh
                const expandedSkills = new Set();
                document.querySelectorAll('.expand-button[aria-expanded="true"]').forEach(btn => {
                    expandedSkills.add(btn.dataset.skillId);
                });

                const skill = skills.find(s => s.id === skillId);
                const subtask = (skill.subtasks || []).find(st => st.id === subtaskId);
                const statusOrder = [PROGRESS_STATUS.NOT_STARTED, PROGRESS_STATUS.IN_PROGRESS, PROGRESS_STATUS.MASTERED];
                const currentIndex = statusOrder.indexOf(subtask.status);
                const newStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

                await updateSubtaskStatus(skillId, subtaskId, newStatus);
                await refreshUserData();
                renderSkillsWithCurrentFilter();

                // Restore expanded state
                expandedSkills.forEach(id => {
                    const btn = document.querySelector(`.expand-button[data-skill-id="${id}"]`);
                    const container = document.getElementById(`subtasks-${id}`);
                    if (btn && container) {
                        container.classList.remove('hidden');
                        btn.setAttribute('aria-expanded', 'true');
                    }
                });
            } catch (error) {
                showToast('Error: ' + error.message);
            }
        }
        return;
    }

    // Handle subtask delete
    const subtaskDeleteButton = e.target.closest('.subtask-delete-button');
    if (subtaskDeleteButton) {
        const subtaskItem = e.target.closest('.subtask-item');
        const skillId = e.target.closest('.skill-item')?.dataset.id;
        const subtaskId = subtaskItem?.dataset.subtaskId;

        if (skillId && subtaskId) {
            try {
                const skill = skills.find(s => s.id === skillId);
                const subtask = (skill.subtasks || []).find(st => st.id === subtaskId);
                if (confirm(`Delete subtask "${subtask.text}"?`)) {
                    // Save expanded state before refresh
                    const expandedSkills = new Set();
                    document.querySelectorAll('.expand-button[aria-expanded="true"]').forEach(btn => {
                        expandedSkills.add(btn.dataset.skillId);
                    });

                    await deleteSubtask(skillId, subtaskId);
                    await refreshUserData();
                    renderSkillsWithCurrentFilter();

                    // Restore expanded state
                    expandedSkills.forEach(id => {
                        const btn = document.querySelector(`.expand-button[data-skill-id="${id}"]`);
                        const container = document.getElementById(`subtasks-${id}`);
                        if (btn && container) {
                            container.classList.remove('hidden');
                            btn.setAttribute('aria-expanded', 'true');
                        }
                    });

                    showToast('✓ Subtask deleted!');
                }
            } catch (error) {
                showToast('Error: ' + error.message);
            }
        }
        return;
    }

    // Handle main skill status and delete
    const statusButton = e.target.closest('.status-button');
    const editButton = e.target.closest('.edit-button');
    const deleteButton = e.target.closest('.delete-button');
    const itemId = e.target.closest('.skill-item')?.dataset.id;

    if (editButton && itemId) {
        const skill = skills.find(s => s.id === itemId);
        if (!skill) return;

        try {
            const result = await openEditModal({
                title: 'Edit Skill',
                subtitle: 'Update the skill name',
                fields: [
                    { name: 'name', label: 'Skill name', value: skill.name || '' }
                ],
                payload: { itemId }
            });

            const newName = (result.name || '').trim();
            if (!newName) {
                showToast('Error: Skill name cannot be empty.');
                return;
            }

            const expandedSkills = new Set();
            document.querySelectorAll('.expand-button[aria-expanded="true"]').forEach(btn => {
                expandedSkills.add(btn.dataset.skillId);
            });

            await updateSkillName(itemId, newName);
            skill.name = newName;
            if (dataCache?.isCached) {
                dataCache.skills = [...skills];
            }
            renderSkillsWithCurrentFilter();

            expandedSkills.forEach(id => {
                const btn = document.querySelector(`.expand-button[data-skill-id="${id}"]`);
                const container = document.getElementById(`subtasks-${id}`);
                if (btn && container) {
                    container.classList.remove('hidden');
                    btn.setAttribute('aria-expanded', 'true');
                }
            });

            showToast('✓ Skill updated!');
        } catch (error) {
            if (error !== 'closed') {
                showToast('Error: ' + error.message);
            }
        }
    } else if (statusButton && itemId) {
        try {
            // Save expanded state
            const expandedSkills = new Set();
            document.querySelectorAll('.expand-button[aria-expanded="true"]').forEach(btn => {
                expandedSkills.add(btn.dataset.skillId);
            });

            const skill = skills.find(s => s.id === itemId);
            const statusOrder = [PROGRESS_STATUS.NOT_STARTED, PROGRESS_STATUS.IN_PROGRESS, PROGRESS_STATUS.MASTERED];
            const currentIndex = statusOrder.indexOf(skill.status);
            const newStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

            await updateSkillStatus(itemId, newStatus);
            skill.status = newStatus;
            if (dataCache?.isCached) {
                dataCache.skills = [...skills];
            }
            renderSkillsWithCurrentFilter();

            // Restore expanded state
            expandedSkills.forEach(id => {
                const btn = document.querySelector(`.expand-button[data-skill-id="${id}"]`);
                const container = document.getElementById(`subtasks-${id}`);
                if (btn && container) {
                    container.classList.remove('hidden');
                    btn.setAttribute('aria-expanded', 'true');
                }
            });
        } catch (error) {
            showToast('Error: ' + error.message);
        }
    } else if (deleteButton && itemId) {
        const skill = skills.find(s => s.id === itemId);
        if (confirm(`Delete "${skill.name}"?`)) {
            try {
                // Save expanded state
                const expandedSkills = new Set();
                document.querySelectorAll('.expand-button[aria-expanded="true"]').forEach(btn => {
                    expandedSkills.add(btn.dataset.skillId);
                });

                await deleteSkill(itemId);
                skills = skills.filter(s => s.id !== itemId);
                if (dataCache?.isCached) {
                    dataCache.skills = [...skills];
                }
                renderSkillsWithCurrentFilter();

                // Restore expanded state (excluding deleted skill)
                expandedSkills.forEach(id => {
                    const btn = document.querySelector(`.expand-button[data-skill-id="${id}"]`);
                    const container = document.getElementById(`subtasks-${id}`);
                    if (btn && container) {
                        container.classList.remove('hidden');
                        btn.setAttribute('aria-expanded', 'true');
                    }
                });

                showToast('✓ Skill deleted!');
            } catch (error) {
                showToast('Error: ' + error.message);
            }
        }
    }
});

// Handle Enter key in subtask input
skillsList.addEventListener('keydown', (e) => {
    const subtaskInput = e.target.closest('.subtask-input');
    if (subtaskInput && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const skillId = subtaskInput.dataset.skillId;
        const addBtn = document.querySelector(`.subtask-add-button[data-skill-id="${skillId}"]`);
        if (addBtn) {
            addBtn.click();
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

// Tab navigation is now handled by js/controllers/tab-controller.js
// The TabController class manages all tab switching, active states, and URL routing

// Mentor view handling
window.addEventListener('DOMContentLoaded', tryMentorView);
