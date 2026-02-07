document.addEventListener('DOMContentLoaded', () => {
    // Mobile hamburger menu open/close logic
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNavDropdown = document.getElementById('mobileNavDropdown');
    const menuIcon = mobileMenuBtn?.querySelector('.menu-icon');
    const closeIcon = mobileMenuBtn?.querySelector('.close-icon');
    if (mobileMenuBtn && mobileNavDropdown) {
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = mobileNavDropdown.classList.toggle('active');
            mobileNavDropdown.style.display = isOpen ? 'block' : '';
            mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            if (menuIcon && closeIcon) {
                menuIcon.classList.toggle('hidden', isOpen);
                closeIcon.classList.toggle('hidden', !isOpen);
            }
        });
    }

    // Settings modal tab switcher
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-tab-target="#changeEmailSection"], [data-tab-target="#resetPasswordSection"]');
        if (btn) {
            const target = btn.getAttribute('data-tab-target');
            document.querySelectorAll('#changeEmailSection, #resetPasswordSection').forEach((el) => {
                el.classList.add('hidden');
            });
            document.querySelector(target)?.classList.remove('hidden');
        }
    });

    // Show/hide clear button and clear search input
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (searchInput && clearBtn) {
        searchInput.addEventListener('input', () => {
            clearBtn.style.display = searchInput.value ? 'block' : 'none';
        });
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.focus();
        });
    }

    const tabButtons = document.querySelectorAll('.tab-button');
    const searchInputBox = document.getElementById('searchInput');
    const tabPlaceholders = {
        vocabulary: 'Search vocabulary...',
        skills: 'Search skills...',
        portfolio: 'Search portfolio...'
    };

    tabButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab-target').replace('#', '');
            if (tabPlaceholders[tab] && searchInputBox) {
                searchInputBox.placeholder = tabPlaceholders[tab];
            }
        });
    });

    // Set initial placeholder based on active tab
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && searchInputBox) {
        const id = activeTab.id;
        if (tabPlaceholders[id]) {
            searchInputBox.placeholder = tabPlaceholders[id];
        }
    }

    const toggleButton = document.getElementById('toggleLanguageSection');
    const languageContainer = document.getElementById('languageSelectionContainer');

    if (toggleButton && languageContainer) {
        toggleButton.addEventListener('click', () => {
            languageContainer.classList.toggle('hidden');
        });
    }
});
