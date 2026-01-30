// ===== PORTFOLIO MANAGEMENT =====
const portfolioForm = document.getElementById('portfolioForm');
const portfolioTitle = document.getElementById('portfolioTitle');
const portfolioLink = document.getElementById('portfolioLink');
const portfolioTop3 = document.getElementById('portfolioTop3');
const portfolioList = document.getElementById('portfolioList');

if (portfolioForm) {
    portfolioForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (window.isMentorView) {
            showToast('Mentor view is read-only.');
            return;
        }
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
            if (window.isMentorView) {
                showToast('Mentor view is read-only.');
                return;
            }

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
