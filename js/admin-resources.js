/**
 * Language Resource Admin Module
 * Adds admin-only CRUD for shared language resources stored in Firestore.
 */

const languageResourceAdminState = {
    isAdmin: false,
    adminResolvedUid: null,
    activeLanguage: '',
    links: [],
    initialized: false
};

function showLanguageResourceToast(message) {
    if (typeof showToast === 'function') {
        showToast(message);
    } else {
        console.log(message);
    }
}

function sanitizeResourceUrl(url) {
    if (typeof url !== 'string') return null;
    try {
        const parsed = new URL(url.trim());
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
    } catch (err) {
        return null;
    }
}

function escapeAdminHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getLanguageSelectElement() {
    return document.getElementById('languageSelect');
}

function getLanguageLinksContainerElement() {
    return document.getElementById('languageLinksContainer');
}

function getLanguageAdminPanelElement() {
    return document.getElementById('languageAdminPanel');
}

function normalizeLanguageName(value) {
    if (typeof value !== 'string') return '';
    return value.trim();
}

async function resolveAdminStatus(forceRefresh = false) {
    const uid = currentUser?.uid;
    if (!uid) {
        languageResourceAdminState.isAdmin = false;
        languageResourceAdminState.adminResolvedUid = null;
        return false;
    }

    if (!forceRefresh && languageResourceAdminState.adminResolvedUid === uid) {
        return languageResourceAdminState.isAdmin;
    }

    let isAdmin = false;

    try {
        const token = await currentUser.getIdTokenResult(forceRefresh);
        if (token?.claims?.admin === true) {
            isAdmin = true;
        }
    } catch (err) {
        console.warn('Could not read auth claims:', err);
    }

    if (!isAdmin) {
        try {
            const adminDoc = await db.collection('admins').doc(uid).get();
            isAdmin = adminDoc.exists && adminDoc.data()?.active === true;
        } catch (err) {
            console.warn('Could not load admin document:', err);
        }
    }

    languageResourceAdminState.isAdmin = isAdmin;
    languageResourceAdminState.adminResolvedUid = uid;
    return isAdmin;
}

function setAdminPanelVisibility(isVisible) {
    const adminPanel = getLanguageAdminPanelElement();
    if (!adminPanel) return;

    if (isVisible && !window.isMentorView && !window.isPublicPortfolioView) {
        adminPanel.classList.remove('hidden');
    } else {
        adminPanel.classList.add('hidden');
    }
}

async function fetchLanguageLinks(languageName) {
    const language = normalizeLanguageName(languageName);
    if (!language) return [];

    const doc = await db.collection('languageLinks').doc(language).get();
    if (!doc.exists) return [];

    const links = Array.isArray(doc.data()?.links) ? doc.data().links : [];
    return links
        .map((link) => ({
            name: typeof link?.name === 'string' ? link.name.trim() : '',
            url: sanitizeResourceUrl(link?.url)
        }))
        .filter((link) => link.url);
}

function renderLanguageLinksForLearner(links) {
    const container = getLanguageLinksContainerElement();
    if (!container) return;

    if (!Array.isArray(links) || links.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500">No links available for this language.</p>';
        return;
    }

    container.textContent = '';
    links.forEach((link, index) => {
        const anchor = document.createElement('a');
        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.className = 'text-blue-600 hover:underline';
        anchor.textContent = link.name || link.url;
        container.appendChild(anchor);

        if (index < links.length - 1) {
            container.appendChild(document.createElement('br'));
        }
    });
}

function renderAdminResourceList() {
    const listEl = document.getElementById('adminLanguageResourcesList');
    if (!listEl) return;

    if (!languageResourceAdminState.activeLanguage) {
        listEl.innerHTML = '<p class="text-xs text-gray-600">Select a language to manage links.</p>';
        return;
    }

    if (!languageResourceAdminState.links.length) {
        listEl.innerHTML = '<p class="text-xs text-gray-600">No links yet. Add one above.</p>';
        return;
    }

    listEl.innerHTML = languageResourceAdminState.links.map((link, index) => `
        <div class="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center border rounded p-2 bg-white" data-index="${index}">
            <input type="text" class="admin-resource-name-input flex-1 p-2 border rounded" value="${escapeAdminHtml(link.name || '')}" placeholder="Resource name" />
            <input type="url" class="admin-resource-url-input flex-1 p-2 border rounded" value="${escapeAdminHtml(link.url || '')}" placeholder="https://example.com" />
            <button type="button" class="admin-resource-save-btn p-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
            <button type="button" class="admin-resource-delete-btn p-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
        </div>
    `).join('');
}

async function saveLanguageLinks(languageName, links) {
    const language = normalizeLanguageName(languageName);
    if (!language) throw new Error('Please select a language first.');

    const cleanedLinks = links
        .map((link) => ({
            name: (typeof link?.name === 'string' ? link.name.trim() : ''),
            url: sanitizeResourceUrl(link?.url)
        }))
        .filter((link) => link.url);

    await db.collection('languageLinks').doc(language).set({
        links: cleanedLinks,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid
    }, { merge: true });

    languageResourceAdminState.links = cleanedLinks;
}

async function populateLanguageSelectOptions(selectedLanguage) {
    const languageSelect = getLanguageSelectElement();
    if (!languageSelect) return;

    const existing = Array.from(languageSelect.querySelectorAll('option'))
        .map((opt) => opt.value)
        .filter((value) => value);

    const docs = await db.collection('languageLinks').get();
    const dynamicLanguages = docs.docs
        .map((doc) => normalizeLanguageName(doc.id))
        .filter(Boolean);

    const languages = Array.from(new Set([...existing, ...dynamicLanguages]))
        .sort((a, b) => a.localeCompare(b));

    const targetValue = normalizeLanguageName(selectedLanguage) || languageSelect.value;

    languageSelect.innerHTML = '<option value="">-- Select a language --</option>';
    languages.forEach((language) => {
        const option = document.createElement('option');
        option.value = language;
        option.textContent = language;
        languageSelect.appendChild(option);
    });

    if (targetValue && languages.includes(targetValue)) {
        languageSelect.value = targetValue;
    }
}

async function handleLanguageSelectionChange(selectedLanguage) {
    const language = normalizeLanguageName(selectedLanguage);
    languageResourceAdminState.activeLanguage = language;

    if (!language) {
        renderLanguageLinksForLearner([]);
        renderAdminResourceList();
        return;
    }

    const links = await fetchLanguageLinks(language);
    languageResourceAdminState.links = links;

    renderLanguageLinksForLearner(links);
    renderAdminResourceList();
}

function assertAdminForLanguageEditing() {
    if (!languageResourceAdminState.isAdmin || window.isMentorView || window.isPublicPortfolioView) {
        throw new Error('Admin access is required for editing language resources.');
    }
}

function wireAdminPanelListeners() {
    if (languageResourceAdminState.initialized) return;

    document.getElementById('adminAddLanguageBtn')?.addEventListener('click', async () => {
        try {
            assertAdminForLanguageEditing();
            const input = document.getElementById('adminLanguageNameInput');
            const languageName = normalizeLanguageName(input?.value || '');

            if (!languageName) {
                throw new Error('Please enter a language name.');
            }

            if (languageName.includes('/')) {
                throw new Error('Language name cannot include /.');
            }

            const docRef = db.collection('languageLinks').doc(languageName);
            const doc = await docRef.get();
            if (doc.exists) {
                throw new Error('That language already exists.');
            }

            await docRef.set({
                links: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser.uid,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: currentUser.uid
            });

            await populateLanguageSelectOptions(languageName);
            await handleLanguageSelectionChange(languageName);

            if (input) input.value = '';
            showLanguageResourceToast('✓ Language added');
        } catch (err) {
            showLanguageResourceToast('Error: ' + (err.message || 'Could not add language.'));
        }
    });

    document.getElementById('adminDeleteLanguageBtn')?.addEventListener('click', async () => {
        try {
            assertAdminForLanguageEditing();
            const language = normalizeLanguageName(languageResourceAdminState.activeLanguage);
            if (!language) {
                throw new Error('Select a language first.');
            }

            if (!confirm(`Delete language "${language}" and all its resource links?`)) {
                return;
            }

            await db.collection('languageLinks').doc(language).delete();
            languageResourceAdminState.activeLanguage = '';
            languageResourceAdminState.links = [];
            await populateLanguageSelectOptions('');
            const languageSelect = getLanguageSelectElement();
            if (languageSelect) {
                languageSelect.value = '';
            }
            renderLanguageLinksForLearner([]);
            renderAdminResourceList();
            showLanguageResourceToast('✓ Language deleted');
        } catch (err) {
            showLanguageResourceToast('Error: ' + (err.message || 'Could not delete language.'));
        }
    });

    document.getElementById('adminAddResourceBtn')?.addEventListener('click', async () => {
        try {
            assertAdminForLanguageEditing();
            const language = normalizeLanguageName(languageResourceAdminState.activeLanguage);
            if (!language) {
                throw new Error('Select a language first.');
            }

            const nameInput = document.getElementById('adminResourceNameInput');
            const urlInput = document.getElementById('adminResourceUrlInput');
            const name = (nameInput?.value || '').trim();
            const url = sanitizeResourceUrl(urlInput?.value || '');

            if (!url) {
                throw new Error('Please enter a valid http(s) URL.');
            }

            const newLinks = [...languageResourceAdminState.links, { name, url }];
            await saveLanguageLinks(language, newLinks);
            renderLanguageLinksForLearner(languageResourceAdminState.links);
            renderAdminResourceList();

            if (nameInput) nameInput.value = '';
            if (urlInput) urlInput.value = '';
            showLanguageResourceToast('✓ Link added');
        } catch (err) {
            showLanguageResourceToast('Error: ' + (err.message || 'Could not add link.'));
        }
    });

    document.getElementById('adminLanguageResourcesList')?.addEventListener('click', async (event) => {
        const wrapper = event.target.closest('[data-index]');
        if (!wrapper) return;

        const index = Number(wrapper.getAttribute('data-index'));
        if (Number.isNaN(index) || index < 0 || index >= languageResourceAdminState.links.length) {
            return;
        }

        const isDelete = event.target.classList.contains('admin-resource-delete-btn');
        const isSave = event.target.classList.contains('admin-resource-save-btn');
        if (!isDelete && !isSave) return;

        try {
            assertAdminForLanguageEditing();
            const language = normalizeLanguageName(languageResourceAdminState.activeLanguage);
            if (!language) {
                throw new Error('Select a language first.');
            }

            if (isDelete) {
                const nextLinks = languageResourceAdminState.links.filter((_, i) => i !== index);
                await saveLanguageLinks(language, nextLinks);
                renderLanguageLinksForLearner(languageResourceAdminState.links);
                renderAdminResourceList();
                showLanguageResourceToast('✓ Link deleted');
                return;
            }

            const nameInput = wrapper.querySelector('.admin-resource-name-input');
            const urlInput = wrapper.querySelector('.admin-resource-url-input');
            const name = (nameInput?.value || '').trim();
            const url = sanitizeResourceUrl(urlInput?.value || '');

            if (!url) {
                throw new Error('Please enter a valid http(s) URL.');
            }

            const nextLinks = [...languageResourceAdminState.links];
            nextLinks[index] = { name, url };
            await saveLanguageLinks(language, nextLinks);
            renderLanguageLinksForLearner(languageResourceAdminState.links);
            renderAdminResourceList();
            showLanguageResourceToast('✓ Link updated');
        } catch (err) {
            showLanguageResourceToast('Error: ' + (err.message || 'Could not update link.'));
        }
    });

    languageResourceAdminState.initialized = true;
}

async function initializeLanguageResourceAdmin(selectedLanguage = '') {
    await resolveAdminStatus();
    setAdminPanelVisibility(languageResourceAdminState.isAdmin);
    wireAdminPanelListeners();
    await populateLanguageSelectOptions(selectedLanguage);
}

window.resolveAdminStatus = resolveAdminStatus;
window.handleLanguageSelectionChange = handleLanguageSelectionChange;
window.initializeLanguageResourceAdmin = initializeLanguageResourceAdmin;
window.populateLanguageSelectOptions = populateLanguageSelectOptions;
window.isCurrentUserAdmin = () => languageResourceAdminState.isAdmin;
