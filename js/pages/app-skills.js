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

// ===== DRAG AND DROP FOR SKILLS ORDERING =====
let draggedElement = null;
let draggedOverElement = null;

skillsList?.addEventListener('dragstart', (e) => {
    const skillItem = e.target.closest('.skill-item');
    if (skillItem && !window.isMentorView) {
        draggedElement = skillItem;
        skillItem.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', skillItem.innerHTML);
    }
});

skillsList?.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const skillItem = e.target.closest('.skill-item');
    if (skillItem && skillItem !== draggedElement && !window.isMentorView) {
        draggedOverElement = skillItem;
        skillItem.classList.add('drag-over');
    }
});

skillsList?.addEventListener('dragleave', (e) => {
    const skillItem = e.target.closest('.skill-item');
    if (skillItem) {
        skillItem.classList.remove('drag-over');
    }
});

skillsList?.addEventListener('drop', async (e) => {
    e.preventDefault();

    if (draggedElement && draggedOverElement && draggedElement !== draggedOverElement && !window.isMentorView) {
        try {
            // Reorder the skills array
            const allSkillItems = Array.from(skillsList.querySelectorAll('.skill-item'));
            const draggedIndex = allSkillItems.indexOf(draggedElement);
            const targetIndex = allSkillItems.indexOf(draggedOverElement);

            // Swap the elements in DOM
            if (draggedIndex < targetIndex) {
                draggedOverElement.parentNode.insertBefore(draggedElement, draggedOverElement.nextSibling);
            } else {
                draggedOverElement.parentNode.insertBefore(draggedElement, draggedOverElement);
            }

            // Get new order of skill IDs
            const newOrder = Array.from(skillsList.querySelectorAll('.skill-item')).map(item => item.dataset.id);

            // Update in Firestore
            await updateSkillOrder(newOrder);

            // Update the in-memory skills array to match new order
            const newSkillsOrder = newOrder.map(id => skills.find(s => s.id === id)).filter(Boolean);
            skills.splice(0, skills.length, ...newSkillsOrder);
            if (dataCache?.isCached) {
                dataCache.skills = [...skills];
            }

            showToast('✓ Skills reordered!');
        } catch (error) {
            showToast('Error: ' + error.message);
            // Refresh to restore original order on error
            renderSkillsWithCurrentFilter();
        }
    }

    // Clean up
    draggedElement?.classList.remove('dragging');
    draggedOverElement?.classList.remove('drag-over');
    draggedElement = null;
    draggedOverElement = null;
});

skillsList?.addEventListener('dragend', (e) => {
    draggedElement?.classList.remove('dragging');
    draggedOverElement?.classList.remove('drag-over');
    draggedElement = null;
    draggedOverElement = null;
});

