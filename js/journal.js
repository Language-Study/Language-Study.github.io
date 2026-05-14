/**
 * Journal Module
 * Handles reflective journal entries and mentor visibility/access controls
 */

let journalEntries = [];
let journalEditingId = null;
let journalSearchQuery = '';

const JOURNAL_ACCESS_LEVELS = {
    VIEW: 'view',
    EDIT: 'edit'
};

function normalizeJournalAccessLevel(level) {
    return level === JOURNAL_ACCESS_LEVELS.EDIT ? JOURNAL_ACCESS_LEVELS.EDIT : JOURNAL_ACCESS_LEVELS.VIEW;
}

function normalizeJournalVisibility(value) {
    if (typeof value === 'boolean') return value;
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function escapeJournalHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text ?? '').replace(/[&<>"']/g, (character) => map[character]);
}

function getJournalCollection() {
    if (!currentUser) return null;
    return db.collection('users').doc(currentUser.uid).collection('journal');
}

function timestampToDate(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'number' || typeof value === 'string') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
}

function formatJournalDate(value) {
    const date = timestampToDate(value);
    return date ? date.toLocaleString() : '';
}

function normalizeJournalEntry(doc) {
    const data = typeof doc.data === 'function' ? doc.data() : doc;

    return {
        id: doc.id || data.id || '',
        title: data.title || '',
        content: data.content || '',
        language: data.language || '',
        mentorVisible: normalizeJournalVisibility(data.mentorVisible),
        mentorAccessLevel: normalizeJournalAccessLevel(data.mentorAccessLevel),
        dateAdded: data.dateAdded || null,
        dateModified: data.dateModified || data.updatedAt || null
    };
}

function syncJournalCache() {
    if (typeof dataCache === 'undefined' || !dataCache) return;
    dataCache.journalEntries = [...journalEntries];
}

function getJournalLanguageOptions() {
    const options = typeof getLanguageSelectOptions === 'function' ? getLanguageSelectOptions() : [];
    return [{ value: '', label: 'No language' }, ...options];
}

function populateJournalLanguageSelect(selectedValue = '') {
    const select = document.getElementById('journalLanguageSelect');
    if (!select) return;

    const options = getJournalLanguageOptions();
    select.innerHTML = options.map(option => `
        <option value="${escapeJournalHtml(option.value)}" ${String(option.value) === String(selectedValue || '') ? 'selected' : ''}>
            ${escapeJournalHtml(option.label || option.value || 'No language')}
        </option>
    `).join('');
}

function getJournalMentorVisibilityLabel(entry) {
    if (!entry.mentorVisible) return 'Mentor: hidden';
    return entry.mentorAccessLevel === JOURNAL_ACCESS_LEVELS.EDIT ? 'Mentor: editable' : 'Mentor: read only';
}

function canViewJournalEntry(entry) {
    if (!window.isMentorView) return true;
    return entry.mentorVisible === true;
}

function canEditJournalEntry(entry) {
    if (!window.isMentorView) return true;
    return entry.mentorVisible === true && entry.mentorAccessLevel === JOURNAL_ACCESS_LEVELS.EDIT;
}

function updateJournalEditorUI() {
    const section = document.getElementById('journalEditorSection');
    const title = document.getElementById('journalEditorTitle');
    const submitBtn = document.getElementById('journalSubmitBtn');
    const cancelBtn = document.getElementById('journalCancelBtn');
    const note = document.getElementById('journalModeNote');
    const mentorNote = document.getElementById('journalMentorVisibilityNote');

    if (!section) return;

    const isEditing = journalEditingId !== null;
    const shouldShowEditor = !window.isMentorView || isEditing;

    section.classList.toggle('hidden', !shouldShowEditor);

    if (title) {
        title.textContent = isEditing ? 'Edit Reflection' : 'New Reflection';
    }

    if (submitBtn) {
        submitBtn.textContent = isEditing ? 'Save Changes' : 'Add Entry';
    }

    if (cancelBtn) {
        cancelBtn.classList.toggle('hidden', !isEditing);
    }

    if (note) {
        note.textContent = window.isMentorView
            ? 'Mentor view shows only reflections marked visible. Use edit access to update shared entries.'
            : 'Write a reflection here. Visibility and access are set per entry.';
    }

    if (mentorNote) {
        mentorNote.textContent = window.isMentorView
            ? 'Mentor mode shows only shared reflections. Hidden entries stay private.'
            : 'Hidden reflections stay private. If visible, choose whether a mentor can only read it or also edit it.';
    }

    populateJournalLanguageSelect(document.getElementById('journalLanguageSelect')?.value || '');
}

function updateJournalAccessSelectState() {
    const visibilitySelect = document.getElementById('journalMentorVisibleSelect');
    const accessSelect = document.getElementById('journalMentorAccessSelect');

    if (!accessSelect || !visibilitySelect) return;

    const isMentorVisible = visibilitySelect.value === 'true';
    accessSelect.disabled = !isMentorVisible;

    if (!isMentorVisible) {
        accessSelect.value = JOURNAL_ACCESS_LEVELS.VIEW;
    }
}

function resetJournalForm(entry = null) {
    const titleInput = document.getElementById('journalTitleInput');
    const contentInput = document.getElementById('journalContentInput');
    const languageSelect = document.getElementById('journalLanguageSelect');
    const mentorVisibleSelect = document.getElementById('journalMentorVisibleSelect');
    const mentorAccessSelect = document.getElementById('journalMentorAccessSelect');

    if (titleInput) titleInput.value = entry?.title || '';
    if (contentInput) contentInput.value = entry?.content || '';
    if (languageSelect) languageSelect.value = entry?.language || '';
    if (mentorVisibleSelect) mentorVisibleSelect.value = entry?.mentorVisible ? 'true' : 'false';
    if (mentorAccessSelect) mentorAccessSelect.value = entry?.mentorAccessLevel || JOURNAL_ACCESS_LEVELS.VIEW;

    populateJournalLanguageSelect(entry?.language || '');
    updateJournalAccessSelectState();
}

function beginJournalEdit(entryId) {
    const entry = journalEntries.find(item => item.id === entryId);
    if (!entry) return;

    journalEditingId = entryId;
    resetJournalForm(entry);
    updateJournalEditorUI();

    const section = document.getElementById('journalEditorSection');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function cancelJournalEdit() {
    journalEditingId = null;
    resetJournalForm(null);
    updateJournalEditorUI();
}

function getVisibleJournalEntries() {
    const lowerQuery = journalSearchQuery.trim().toLowerCase();

    return journalEntries
        .filter(entry => canViewJournalEntry(entry))
        .filter(entry => {
            if (!lowerQuery) return true;
            const haystack = `${entry.title || ''} ${entry.content || ''}`.toLowerCase();
            return haystack.includes(lowerQuery);
        })
        .filter(entry => {
            return typeof isVisibleForSelectedLanguage === 'function'
                ? isVisibleForSelectedLanguage(entry.language) !== false
                : true;
        });
}

function renderJournalEntry(entry) {
    const canEdit = canEditJournalEntry(entry);
    const languageLabel = entry.language ? escapeJournalHtml(entry.language) : 'No language';
    const mentorLabel = escapeJournalHtml(getJournalMentorVisibilityLabel(entry));
    const updatedLabel = formatJournalDate(entry.dateModified || entry.dateAdded);
    const title = escapeJournalHtml(entry.title);
    const content = escapeJournalHtml(entry.content).replace(/\n/g, '<br>');

    return `
        <article class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" data-journal-id="${escapeJournalHtml(entry.id)}">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2 mb-2">
                        <h3 class="text-lg font-semibold text-gray-900 break-words">${title}</h3>
                        <span class="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">${languageLabel}</span>
                        <span class="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">${mentorLabel}</span>
                    </div>
                    <div class="whitespace-pre-wrap text-sm leading-6 text-gray-700">${content}</div>
                    ${updatedLabel ? `<div class="mt-3 text-xs text-gray-500">Updated ${escapeJournalHtml(updatedLabel)}</div>` : ''}
                </div>
                ${canEdit ? `
                    <div class="flex flex-wrap gap-2 sm:justify-end">
                        <button type="button" class="journal-edit-button rounded bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200" data-action="edit" data-id="${escapeJournalHtml(entry.id)}">Edit</button>
                        <button type="button" class="journal-delete-button rounded bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200" data-action="delete" data-id="${escapeJournalHtml(entry.id)}">Delete</button>
                    </div>
                ` : ''}
            </div>
        </article>
    `;
}

function renderJournalList() {
    const list = document.getElementById('journalList');
    if (!list) return;

    updateJournalEditorUI();

    const visibleEntries = getVisibleJournalEntries();

    if (visibleEntries.length === 0) {
        list.innerHTML = window.isMentorView
            ? '<p class="text-sm text-gray-500">No journal entries are shared with mentor view yet.</p>'
            : '<p class="text-sm text-gray-500">No journal entries yet.</p>';
        return;
    }

    list.innerHTML = visibleEntries.map(renderJournalEntry).join('');
}

function filterJournal(query) {
    journalSearchQuery = String(query || '').trim().toLowerCase();
    renderJournalList();
}

async function loadJournal() {
    if (!currentUser) return;

    try {
        const collection = getJournalCollection();
        if (!collection) return;

        const snapshot = await collection.orderBy('dateAdded', 'desc').get();
        journalEntries = snapshot.docs.map(normalizeJournalEntry);
        syncJournalCache();
        renderJournalList();
    } catch (error) {
        console.error('Error loading journal entries:', error);
    }
}

async function addJournalEntry(title, content, language = '', mentorVisible = false, mentorAccessLevel = JOURNAL_ACCESS_LEVELS.VIEW) {
    if (!currentUser) {
        throw new Error('You must be signed in to add a journal entry.');
    }

    const trimmedTitle = String(title || '').trim();
    const trimmedContent = String(content || '').trim();
    const normalizedLanguage = String(language || '').trim();
    const normalizedAccessLevel = normalizeJournalAccessLevel(mentorAccessLevel);

    if (!trimmedTitle || !trimmedContent) {
        throw new Error('Please enter both a title and reflection.');
    }

    const collection = getJournalCollection();
    if (!collection) {
        throw new Error('Journal collection is not available.');
    }

    const docRef = await collection.add({
        title: trimmedTitle,
        content: trimmedContent,
        language: normalizedLanguage,
        mentorVisible: mentorVisible === true,
        mentorAccessLevel: normalizedAccessLevel,
        dateAdded: firebase.firestore.FieldValue.serverTimestamp(),
        dateModified: firebase.firestore.FieldValue.serverTimestamp()
    });

    const newEntry = {
        id: docRef.id,
        title: trimmedTitle,
        content: trimmedContent,
        language: normalizedLanguage,
        mentorVisible: mentorVisible === true,
        mentorAccessLevel: normalizedAccessLevel,
        dateAdded: new Date(),
        dateModified: new Date()
    };

    journalEntries = [newEntry, ...journalEntries];
    syncJournalCache();
    renderJournalList();
    return docRef.id;
}

async function updateJournalEntry(entryId, updates) {
    if (!currentUser) {
        throw new Error('You must be signed in to update a journal entry.');
    }

    const entry = journalEntries.find(item => item.id === entryId);
    if (!entry) {
        throw new Error('Journal entry not found.');
    }

    if (!canEditJournalEntry(entry)) {
        throw new Error('Mentor access does not allow editing this journal entry.');
    }

    const nextTitle = String(updates.title || '').trim();
    const nextContent = String(updates.content || '').trim();
    const nextLanguage = String(updates.language || '').trim();
    const nextMentorVisible = normalizeJournalVisibility(updates.mentorVisible);
    const nextMentorAccessLevel = normalizeJournalAccessLevel(updates.mentorAccessLevel);

    if (!nextTitle || !nextContent) {
        throw new Error('Please enter both a title and reflection.');
    }

    const collection = getJournalCollection();
    if (!collection) {
        throw new Error('Journal collection is not available.');
    }

    await collection.doc(entryId).update({
        title: nextTitle,
        content: nextContent,
        language: nextLanguage,
        mentorVisible: nextMentorVisible,
        mentorAccessLevel: nextMentorAccessLevel,
        dateModified: firebase.firestore.FieldValue.serverTimestamp()
    });

    Object.assign(entry, {
        title: nextTitle,
        content: nextContent,
        language: nextLanguage,
        mentorVisible: nextMentorVisible,
        mentorAccessLevel: nextMentorAccessLevel,
        dateModified: new Date()
    });

    journalEntries = [...journalEntries];
    syncJournalCache();
    renderJournalList();
}

async function deleteJournalEntry(entryId) {
    if (!currentUser) {
        throw new Error('You must be signed in to delete a journal entry.');
    }

    const entry = journalEntries.find(item => item.id === entryId);
    if (!entry) {
        throw new Error('Journal entry not found.');
    }

    if (!canEditJournalEntry(entry)) {
        throw new Error('Mentor access does not allow deleting this journal entry.');
    }

    const collection = getJournalCollection();
    if (!collection) {
        throw new Error('Journal collection is not available.');
    }

    await collection.doc(entryId).delete();
    journalEntries = journalEntries.filter(item => item.id !== entryId);

    if (journalEditingId === entryId) {
        cancelJournalEdit();
    }

    syncJournalCache();
    renderJournalList();
}

function initJournalModule() {
    const form = document.getElementById('journalForm');
    const cancelBtn = document.getElementById('journalCancelBtn');
    const visibilitySelect = document.getElementById('journalMentorVisibleSelect');
    const accessSelect = document.getElementById('journalMentorAccessSelect');

    if (form && !form.dataset.journalInitialized) {
        form.dataset.journalInitialized = 'true';
        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const title = document.getElementById('journalTitleInput')?.value || '';
            const content = document.getElementById('journalContentInput')?.value || '';
            const language = document.getElementById('journalLanguageSelect')?.value || '';
            const mentorVisible = document.getElementById('journalMentorVisibleSelect')?.value === 'true';
            const mentorAccessLevel = document.getElementById('journalMentorAccessSelect')?.value || JOURNAL_ACCESS_LEVELS.VIEW;

            try {
                if (journalEditingId) {
                    await updateJournalEntry(journalEditingId, {
                        title,
                        content,
                        language,
                        mentorVisible,
                        mentorAccessLevel
                    });
                    journalEditingId = null;
                    resetJournalForm(null);
                    updateJournalEditorUI();
                    showToast('✓ Journal entry updated!');
                } else {
                    await addJournalEntry(title, content, language, mentorVisible, mentorAccessLevel);
                    resetJournalForm(null);
                    updateJournalEditorUI();
                    showToast('✓ Journal entry added!');
                }
            } catch (error) {
                showToast('Error: ' + error.message);
            }
        });
    }

    if (cancelBtn && !cancelBtn.dataset.journalInitialized) {
        cancelBtn.dataset.journalInitialized = 'true';
        cancelBtn.addEventListener('click', () => {
            journalEditingId = null;
            resetJournalForm(null);
            updateJournalEditorUI();
        });
    }

    if (visibilitySelect && !visibilitySelect.dataset.journalInitialized) {
        visibilitySelect.dataset.journalInitialized = 'true';
        visibilitySelect.addEventListener('change', () => {
            const mentorVisibilityNote = document.getElementById('journalMentorVisibilityNote');
            if (!mentorVisibilityNote) return;

            mentorVisibilityNote.textContent = visibilitySelect.value === 'true'
                ? 'Visible reflections can be shared with mentors. Pick whether they are read only or editable.'
                : 'Hidden reflections stay private.';

            updateJournalAccessSelectState();
        });
    }

    populateJournalLanguageSelect();
    resetJournalForm(null);
    updateJournalEditorUI();

    document.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const journalCard = button.closest('[data-journal-id]');
        if (!journalCard) return;

        const entryId = button.getAttribute('data-id') || journalCard.getAttribute('data-journal-id');
        const action = button.getAttribute('data-action');
        const entry = journalEntries.find(item => item.id === entryId);

        if (!entry) return;

        if (action === 'edit') {
            if (!canEditJournalEntry(entry)) {
                showToast('Mentor access does not allow editing this reflection.');
                return;
            }
            beginJournalEdit(entryId);
        } else if (action === 'delete') {
            if (!canEditJournalEntry(entry)) {
                showToast('Mentor access does not allow deleting this reflection.');
                return;
            }

            if (confirm('Delete this journal entry?')) {
                deleteJournalEntry(entryId).catch((error) => {
                    showToast('Error: ' + error.message);
                });
            }
        }
    });

    window.addEventListener('tabChanged', () => {
        updateJournalEditorUI();
    });
}

window.loadJournal = loadJournal;
window.renderJournalList = renderJournalList;
window.filterJournal = filterJournal;
window.addJournalEntry = addJournalEntry;
window.updateJournalEntry = updateJournalEntry;
window.deleteJournalEntry = deleteJournalEntry;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJournalModule);
} else {
    initJournalModule();
}