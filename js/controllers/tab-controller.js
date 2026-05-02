/**
 * Tab Navigation Controller
 * Handles all tab switching, active state management, and URL routing
 * Extracted from app-page.js for clarity and maintainability
 */

class TabController {
    constructor() {
        this.currentTab = 'vocabulary';
        this.tabs = ['vocabulary', 'skills', 'portfolio', 'admin'];
        this.initializeListeners();
    }

    canAccessTab(tabId) {
        if (tabId !== 'admin') {
            return true;
        }

        if (typeof window.isCurrentUserAdmin === 'function') {
            return window.isCurrentUserAdmin() === true;
        }

        return false;
    }

    /**
     * Activate a specific tab
    * @param {string} tabId - The tab ID to activate (vocabulary, skills, portfolio, or admin)
     */
    activateTab(tabId) {
        // Validate tab ID
        if (!this.tabs.includes(tabId)) {
            console.warn(`Invalid tab ID: ${tabId}`);
            return;
        }

        if (!this.canAccessTab(tabId)) {
            tabId = 'vocabulary';
        }

        this.currentTab = tabId;

        // Update button states
        this.updateTabButtons(tabId);

        // Update content visibility
        this.updateTabContent(tabId);

        // Update URL
        this.updateURL(tabId);

        // Dispatch custom event for other modules
        window.dispatchEvent(new CustomEvent('tabChanged', { detail: { tab: tabId } }));
    }

    /**
     * Update visual state of tab buttons
     * @private
     */
    updateTabButtons(tabId) {
        const tabButtons = document.querySelectorAll('[data-tab-target]');
        tabButtons.forEach(btn => {
            const btnTabId = btn.getAttribute('data-tab-target').replace('#', '');
            if (btnTabId === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Update visibility of tab content
     * @private
     */
    updateTabContent(tabId) {
        const tabContents = document.querySelectorAll('[data-tab-content]');
        tabContents.forEach(content => {
            if (content.id === tabId) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
    }

    /**
     * Update browser URL with tab parameter
     * @private
     */
    updateURL(tabId) {
        const url = new URL(window.location);
        url.searchParams.set('tab', tabId);
        window.history.pushState({}, '', url);
    }

    /**
     * Initialize event listeners for tab buttons and browser navigation
     * @private
     */
    initializeListeners() {
        // Tab button click handlers - only for main navigation tabs
        document.addEventListener('click', (e) => {
            const tabButton = e.target.closest('[data-tab-target]');
            if (tabButton) {
                const tabId = tabButton.getAttribute('data-tab-target').replace('#', '');
                // Only handle main navigation tabs (vocabulary, skills, portfolio)
                if (this.tabs.includes(tabId)) {
                    if (!this.canAccessTab(tabId)) {
                        return;
                    }
                    this.activateTab(tabId);
                }
            }
        });

        // Browser back/forward navigation
        window.addEventListener('popstate', () => {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab') || 'vocabulary';
            if (this.tabs.includes(tabParam)) {
                this.activateTab(this.canAccessTab(tabParam) ? tabParam : 'vocabulary');
            }
        });
    }

    /**
     * Initialize tab state from URL on page load
     */
    initializeFromURL() {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');

        // If tab is explicitly in URL, use it
        if (tabParam && this.tabs.includes(tabParam)) {
            this.activateTab(this.canAccessTab(tabParam) ? tabParam : 'vocabulary');
            return;
        }

        // On normal page loads, default to vocabulary.
        this.activateTab('vocabulary');
    }

    /**
     * Get current active tab
     * @returns {string} The currently active tab ID
     */
    getCurrentTab() {
        return this.currentTab;
    }
}

// Create global instance
window.tabController = new TabController();

// Initialize from URL when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.tabController.initializeFromURL();
    });
} else {
    window.tabController.initializeFromURL();
}
