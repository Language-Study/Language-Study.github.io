// ===== SKILLS MANAGEMENT =====
const skillsInput = document.getElementById('skillsInput');
const addSkillBtn = document.getElementById('addSkillBtn');
const skillsList = document.getElementById('skillsList');

addSkillBtn?.addEventListener('click', async () => {
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

skillsInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addSkillBtn?.click();
    }
});

// Delegate skills item events
skillsList?.addEventListener('click', async (e) => {
    // Handle practice tips
    const tipsBtn = e.target.closest('.tips-button');
    if (tipsBtn) {
        const skillId = tipsBtn.dataset.skillId || e.target.closest('.skill-item')?.dataset.id;
        const container = document.getElementById(`tips-${skillId}`);
        if (!skillId || !container) return;

        // Toggle if already visible without re-fetch
        const isHidden = container.classList.contains('hidden');
        if (!isHidden) {
            container.classList.add('hidden');
            return;
        }

        try {
            const usage = await (window.checkAndIncrementPracticeTipsUsage ? window.checkAndIncrementPracticeTipsUsage() : { allowed: true, userRemaining: 0 });
            if (!usage.allowed) {
                const msg = usage.reason === 'user'
                    ? 'You’ve used all 5 Practice Tips today. Try again tomorrow.'
                    : usage.reason === 'auth'
                        ? 'Please log in to use Practice Tips.'
                        : 'Today’s AI tips quota (1000 requests) is full. Please try again tomorrow.';
                showToast(msg);
                container.classList.add('hidden');
                return;
            }

            container.classList.remove('hidden');
            const skill = skills.find(s => s.id === skillId);
            container.innerHTML = '<div class="text-sm text-blue-800">Generating practice tips…</div>' +
                `<div class="text-xs text-blue-700 mt-1">AI Practice Tips: You have ${usage.userRemaining} of 5 left today.</div>`;
            const tips = await (window.getPracticeTipsForSkill ? window.getPracticeTipsForSkill(skill) : []);
            if (!tips || tips.length === 0) {
                container.innerHTML = '<div class="text-sm text-blue-800">No tips available right now.</div>' +
                    `<div class="text-xs text-blue-700 mt-1">AI Practice Tips: You have ${usage.userRemaining} of 5 left today.</div>`;
            } else {
                const items = tips.map(t => `<li class="pl-6 relative"><span class="absolute left-0 top-0">•</span>${escapeHtml(t)}</li>`).join('');
                container.innerHTML = `
                    <div class="text-sm text-blue-900 font-semibold mb-1">Practice Tips</div>
                    <div class="text-xs text-blue-800 mb-2">Uses AI to suggest short, actionable ideas tailored to this skill. Limit: 5 requests per day per user.</div>
                    <ul class="space-y-1 text-sm text-blue-900">${items}</ul>
                    <button class="save-tips-button mt-3 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600" data-skill-id="${skillId}">Save as Subtask</button>
                `;
            }
        } catch (err) {
            container.innerHTML = '<div class="text-sm text-red-700">Failed to load tips.</div>';
        }
        return;
    }

    // Handle save tips as subtask
    const saveTipsBtn = e.target.closest('.save-tips-button');
    if (saveTipsBtn) {
        const skillId = saveTipsBtn.dataset.skillId;
        const container = document.getElementById(`tips-${skillId}`);
        if (!skillId || !container) return;

        // Extract tips from the display
        const tipsList = container.querySelector('ul');
        if (!tipsList) return;

        const tipItems = Array.from(tipsList.querySelectorAll('li')).map(li => li.textContent.trim());
        if (tipItems.length === 0) return;

        // Save each tip as a separate subtask
        try {
            for (const tip of tipItems) {
                await addSubtask(skillId, tip);
            }
            showToast(`✓ ${tipItems.length} tips saved as subtasks!`);
            container.classList.add('hidden');
        } catch (error) {
            showToast('Error: ' + error.message);
        }
        return;
    }

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
skillsList?.addEventListener('keydown', (e) => {
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
