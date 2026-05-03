/* Site Message Banner
 * - Shows a hidden-by-default banner when a site-wide message is set in Firestore
 * - Admins can set message text and optional expiry via the admin panel
 */

(function () {
    const COLLECTION = 'siteMessages';
    const DOC_ID = 'current';
    const BANNER_ID = 'siteMessageBanner';
    const BANNER_CONTENT_CLASS = 'site-message-content';
    const CLOSE_BTN_ID = 'siteMessageCloseBtn';
    const ADMIN_PANEL_ID = 'siteMessageAdminPanel';
    const ALLOWED_SITE_MESSAGE_TAGS = new Set([
        'a', 'b', 'br', 'code', 'div', 'em', 'i', 'li', 'ol', 'p', 'pre', 'small', 'span', 'strong', 'sub', 'sup', 'u', 'ul'
    ]);

    function sanitizeSiteMessageHtml(input) {
        const source = String(input || '');
        if (!source.trim()) return '';

        const template = document.createElement('template');
        template.innerHTML = source;

        const walk = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return document.createTextNode(node.textContent || '');
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return document.createDocumentFragment();
            }

            const tagName = node.tagName.toLowerCase();
            if (!ALLOWED_SITE_MESSAGE_TAGS.has(tagName)) {
                const fragment = document.createDocumentFragment();
                node.childNodes.forEach((child) => {
                    fragment.appendChild(walk(child));
                });
                return fragment;
            }

            const clone = document.createElement(tagName);

            if (tagName === 'a') {
                const rawHref = node.getAttribute('href') || '';
                try {
                    const url = new URL(rawHref, window.location.origin);
                    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:' || url.protocol === 'tel:') {
                        clone.setAttribute('href', url.toString());
                        clone.setAttribute('rel', 'noopener noreferrer');
                    }
                } catch (e) {
                    // Ignore invalid links.
                }

                const target = node.getAttribute('target');
                if (target === '_blank') {
                    clone.setAttribute('target', '_blank');
                    clone.setAttribute('rel', 'noopener noreferrer');
                }

                const title = node.getAttribute('title');
                if (title) {
                    clone.setAttribute('title', title);
                }
            }

            node.childNodes.forEach((child) => {
                clone.appendChild(walk(child));
            });

            return clone;
        };

        const fragment = document.createDocumentFragment();
        template.content.childNodes.forEach((child) => {
            fragment.appendChild(walk(child));
        });

        const container = document.createElement('div');
        container.appendChild(fragment);
        return container.innerHTML;
    }

    function toLocalDatetimeInputValue(date) {
        if (!date) return '';
        const pad = (n) => String(n).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    function parseLocalDatetimeInput(value) {
        if (!value) return null;
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }

    function getBannerEl() {
        return document.getElementById(BANNER_ID);
    }

    function getBannerContentEl() {
        return document.querySelector(`#${BANNER_ID} .${BANNER_CONTENT_CLASS}`);
    }

    function hideBanner() {
        const el = getBannerEl();
        if (!el) return;
        el.classList.add('hidden');
    }

    function showBanner(html, expiresAt, updatedAt) {
        const el = getBannerEl();
        const content = getBannerContentEl();
        if (!el || !content) return;

        // Suppress if user dismissed the current message
        try {
            const dismissed = localStorage.getItem('siteMessageDismissed');
            if (dismissed && updatedAt && dismissed === (new Date(updatedAt)).toISOString()) {
                // user dismissed this exact message
                return hideBanner();
            }
        } catch (e) {
            // ignore localStorage errors
        }

        content.innerHTML = sanitizeSiteMessageHtml(html);
        if (expiresAt) {
            const expiryText = document.createElement('div');
            expiryText.className = 'site-message-expiry text-xs mt-1';
            expiryText.textContent = 'Expires: ' + new Date(expiresAt).toLocaleString();
            content.appendChild(expiryText);
        }

        el.classList.remove('hidden');
    }

    async function loadSiteMessage() {
        if (typeof db === 'undefined') return null;
        try {
            const doc = await db.collection(COLLECTION).doc(DOC_ID).get();
            if (!doc.exists) return null;
            const data = doc.data() || {};
            const message = typeof data.message === 'string' ? data.message : '';
            const expiresAt = data.expiresAt ? data.expiresAt.toDate() : null;
            const updatedAt = data.updatedAt ? data.updatedAt.toDate() : null;
            return { message, expiresAt, updatedAt };
        } catch (err) {
            console.warn('Failed to load site message:', err);
            return null;
        }
    }

    function shouldShowMessage(obj) {
        if (!obj || !obj.message) return false;
        if (obj.expiresAt && new Date(obj.expiresAt) < new Date()) return false;
        return true;
    }

    function wireAdminPanelControls({ textarea, expiryInput, statusEl, saveBtn, clearBtn, refreshPanel }) {
        if (saveBtn && !saveBtn.dataset.siteMessageWired) {
            saveBtn.dataset.siteMessageWired = 'true';
            saveBtn.addEventListener('click', async () => {
                try {
                    enforceClientRateLimit({ bucket: 'admin-site-message-write', limit: 40, windowMs: 5 * 60 * 1000, message: 'Too many message saves' });
                    await window.resolveAdminStatus();
                    const isAdminNow = typeof window.isCurrentUserAdmin === 'function' ? window.isCurrentUserAdmin() : false;
                    if (!isAdminNow) throw new Error('Admin access required');

                    const message = textarea.value || '';
                    const expiry = parseLocalDatetimeInput(expiryInput.value);
                    const sanitizedMessage = sanitizeSiteMessageHtml(message);

                    if (!sanitizedMessage.trim()) {
                        throw new Error('Please enter a message or use Clear to remove it.');
                    }

                    const payload = {
                        message: sanitizedMessage,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedBy: currentUser?.uid || null
                    };
                    if (expiry) {
                        payload.expiresAt = firebase.firestore.Timestamp.fromDate(expiry);
                    } else {
                        payload.expiresAt = null;
                    }

                    await db.collection(COLLECTION).doc(DOC_ID).set(payload, { merge: true });
                    showToast('✓ Message saved');
                    await refreshPanel();
                } catch (err) {
                    showToast('Error: ' + (err.message || 'Could not save message'));
                }
            });
        }

        if (clearBtn && !clearBtn.dataset.siteMessageWired) {
            clearBtn.dataset.siteMessageWired = 'true';
            clearBtn.addEventListener('click', async () => {
                try {
                    enforceClientRateLimit({ bucket: 'admin-site-message-write', limit: 40, windowMs: 5 * 60 * 1000, message: 'Too many clears' });
                    await window.resolveAdminStatus();
                    const isAdminNow = typeof window.isCurrentUserAdmin === 'function' ? window.isCurrentUserAdmin() : false;
                    if (!isAdminNow) throw new Error('Admin access required');

                    if (!confirm('Clear site message for all users?')) return;
                    await db.collection(COLLECTION).doc(DOC_ID).delete();
                    showToast('✓ Message cleared');
                    textarea.value = '';
                    expiryInput.value = '';
                    statusEl.textContent = '';
                    await refreshPanel();
                } catch (err) {
                    showToast('Error: ' + (err.message || 'Could not clear message'));
                }
            });
        }
    }

    async function refreshAndRender() {
        const doc = await loadSiteMessage();
        if (!shouldShowMessage(doc)) {
            hideBanner();
            return;
        }
        showBanner(doc.message, doc.expiresAt, doc.updatedAt);
    }

    function wireBannerClose() {
        const btn = document.getElementById(CLOSE_BTN_ID);
        if (!btn) return;
        btn.addEventListener('click', async () => {
            // store dismissal tied to current updatedAt timestamp so banner reappears if message changes
            try {
                const docSnap = await db.collection(COLLECTION).doc(DOC_ID).get();
                const updatedAt = docSnap.exists && docSnap.data()?.updatedAt ? docSnap.data().updatedAt.toDate().toISOString() : '';
                if (updatedAt) localStorage.setItem('siteMessageDismissed', updatedAt);
            } catch (e) {
                // ignore
            }
            hideBanner();
        });
    }

    async function ensureAdminPanel() {
        const panel = document.getElementById(ADMIN_PANEL_ID);
        if (!panel) return;

        // Wait for resolveAdminStatus to be available
        if (typeof window.resolveAdminStatus === 'function') {
            try {
                await window.resolveAdminStatus();
            } catch (e) {
                console.warn('resolveAdminStatus failed', e);
            }
        }

        const isAdmin = typeof window.isCurrentUserAdmin === 'function' ? window.isCurrentUserAdmin() : false;
        panel.classList.toggle('hidden', !isAdmin);

        if (!isAdmin) return;

        const textarea = document.getElementById('adminMessageTextarea');
        const expiryInput = document.getElementById('adminMessageExpiry');
        const saveBtn = document.getElementById('adminSaveSiteMessageBtn');
        const clearBtn = document.getElementById('adminClearSiteMessageBtn');
        const statusEl = document.getElementById('adminSiteMessageStatus');

        async function populate() {
            const doc = await db.collection(COLLECTION).doc(DOC_ID).get();
            if (!doc.exists) {
                textarea.value = '';
                expiryInput.value = '';
                statusEl.textContent = '';
                return;
            }
            const data = doc.data() || {};
            textarea.value = data.message || '';
            expiryInput.value = data.expiresAt ? toLocalDatetimeInputValue(data.expiresAt.toDate()) : '';
            statusEl.textContent = (data.updatedAt ? 'Last updated: ' + new Date(data.updatedAt.toDate()).toLocaleString() : 'Not yet saved');
        }

        wireAdminPanelControls({
            textarea,
            expiryInput,
            statusEl,
            saveBtn,
            clearBtn,
            refreshPanel: populate
        });

        await populate();
    }

    function wireRealtimeListener() {
        if (typeof db === 'undefined' || !db.collection) return;
        try {
            db.collection(COLLECTION).doc(DOC_ID).onSnapshot((snap) => {
                if (!snap.exists) {
                    hideBanner();
                } else {
                    const d = snap.data() || {};
                    const message = d.message || '';
                    const expiresAt = d.expiresAt ? d.expiresAt.toDate() : null;
                    const updatedAt = d.updatedAt ? d.updatedAt.toDate() : null;
                    if (message && (!expiresAt || expiresAt > new Date())) {
                        showBanner(message, expiresAt, updatedAt);
                    } else {
                        hideBanner();
                    }
                }

                // Update admin controls if visible
                ensureAdminPanel();
            }, (err) => {
                console.warn('Site message realtime listener error', err);
            });
        } catch (err) {
            console.warn('Failed to attach realtime listener for site message', err);
        }
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', async () => {
        wireBannerClose();
        // Initial render
        try {
            await refreshAndRender();
        } catch (e) {
            console.warn('Error rendering site message on startup', e);
        }

        // Wire admin controls (may hide if not admin)
        ensureAdminPanel();

        // Start realtime updates
        wireRealtimeListener();
    });

})();
