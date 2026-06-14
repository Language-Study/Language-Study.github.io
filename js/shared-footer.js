(function () {
    const FOOTER_ID = 'siteFooter';
    const MOUNT_ID = 'sharedFooterMount';

    function renderSharedFooter() {
        if (document.getElementById(FOOTER_ID)) return;

        const mount = document.getElementById(MOUNT_ID);
        if (!mount) return;

        mount.innerHTML = `
            <footer id="siteFooter" class="text-center text-xs text-gray-500">
                <div class="flex flex-col items-center gap-1">
                    <a href="privacy-policy.html" class="hover:text-gray-700">Privacy Policy</a>
                    <a href="https://www.flaticon.com/free-icons/globe" title="globe icons" target="_blank" rel="noopener noreferrer" class="hover:text-gray-700">Globe icons created by Techno Icons - Flaticon</a>
                </div>
            </footer>
        `;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderSharedFooter);
    } else {
        renderSharedFooter();
    }
})();