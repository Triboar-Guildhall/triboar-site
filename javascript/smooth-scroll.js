// Smooth scrolling for anchor links with header offset
document.querySelectorAll('a[href*="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');

        // Only handle links that point to anchors on this page
        const hashIndex = href.indexOf('#');
        if (hashIndex === -1) return;

        const hash = href.substring(hashIndex);
        const path = href.substring(0, hashIndex);

        // Normalize paths for comparison
        const currentPath = window.location.pathname;
        const linkPath = path || currentPath; // If no path specified, assume current page

        // Check if this link is for the current page
        const isCurrentPage = !path || linkPath === currentPath;

        if (isCurrentPage && hash) {
            e.preventDefault();
            const target = document.querySelector(hash);
            if (target) {
                const headerHeight = document.querySelector('header').offsetHeight;
                const targetPosition = target.offsetTop - headerHeight - 20; // 20px extra padding
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                // Update URL hash without jumping
                history.pushState(null, null, hash);
            }
        }
    });
});
