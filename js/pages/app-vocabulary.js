// ===== CATEGORY MANAGEMENT =====
const categorySelect = document.getElementById('categorySelect');
const newCategoryInput = document.getElementById('newCategoryInput');
const newCategoryName = document.getElementById('newCategoryName');
const deleteCategoryBtn = document.getElementById('deleteCategoryBtn');

if (categorySelect) {
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
}

document.getElementById('addCategoryBtn')?.addEventListener('click', async () => {
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

document.getElementById('cancelCategoryBtn')?.addEventListener('click', () => {
    newCategoryInput.classList.add('hidden');
    newCategoryName.value = '';
    const protectedCategories = ['General'];
    deleteCategoryBtn.disabled = categorySelect.value === 'new' || protectedCategories.includes(categorySelect.value);
});

if (deleteCategoryBtn) {
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
}

// ===== VOCABULARY MANAGEMENT =====
const vocabularyInput = document.getElementById('vocabularyInput');
const translationInput = document.getElementById('translationInput');
const addVocabBtn = document.getElementById('addVocabBtn');
const vocabularyListEl = document.getElementById('vocabularyList');

addVocabBtn?.addEventListener('click', async () => {
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

vocabularyInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addVocabBtn?.click();
    }
});

translationInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addVocabBtn?.click();
    }
});

// Delegate vocabulary item events
vocabularyListEl?.addEventListener('click', async (e) => {
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
