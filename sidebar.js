document.addEventListener("DOMContentLoaded", () => {
    // 1. Inject the Sidebar HTML into the page
    injectSidebarHTML();

    // 2. Initialize Mobile Sidebar Toggle
    setupMobileSidebar();

    // 3. Set the Active Link based on the current URL
    setActiveLink();

    // 4. Apply Role-Based Access Control
    // Change this to 'Guest' to test the non-logged-in view
    const currentUserRole = 'Guest'; 
    applyRolePermissions(currentUserRole);
});

/**
 * Creates the sidebar HTML and injects it into the DOM
 */
function injectSidebarHTML() {
    const sidebarHTML = `
        <aside class="sidebar flex flex-col justify-between h-full">
            <div>
                <a href="#" class="logo-wrap">
                    <img src="/sidebar.jpeg" alt="Aashayein Logo" style="width: 36px; height: 36px; border-radius: 10px; object-fit: cover;">
                    <div class="logo-text">
                        <span class="font-bold text-slate-900">Aashayein</span>
                    </div>
                </a>
                
                <div class="nav-section-title">Overview</div>
                <nav class="nav-menu">
                    <a href="/dashboard/" class="nav-link">
                        <div class="link-left"><i class="fas fa-border-all"></i> Overview</div>
                    </a>
                    <a href="/admin/" class="nav-link">
                        <div class="link-left"><i class="fas fa-building"></i> Organizations</div>
                    </a>
                    <a href="/register/" class="nav-link">
                        <div class="link-left"><i class="fas fa-building-circle-check"></i> Register</div>
                    </a>
                </nav>

                <div class="nav-section-title">Impact</div>
                <nav class="nav-menu">
                    <a href="#" class="nav-link">
                        <div class="link-left"><i class="fas fa-seedling"></i> Environmental</div>
                        <span class="badge">4</span>
                    </a>
                    <a href="#" class="nav-link">
                        <div class="link-left"><i class="fas fa-users"></i> Community</div>
                        <span class="badge">127</span>
                    </a>
                    <a href="#" class="nav-link">
                        <div class="link-left"><i class="fas fa-hands-helping"></i> Livelihoods</div>
                        <span class="badge">184</span>
                    </a>
                </nav>

                <div class="nav-section-title">Insights</div>
                <nav class="nav-menu">
                    <a href="#" class="nav-link">
                        <div class="link-left"><i class="fas fa-quote-left"></i> Stories</div>
                    </a>
                    <a href="#" class="nav-link">
                        <div class="link-left"><i class="fas fa-file-alt"></i> ESG Report</div>
                    </a>
                </nav>
            </div>

            <!-- New Account Section at the Bottom -->
            <div>
                <div class="nav-section-title">Account</div>
                <nav class="nav-menu">
                    <a href="/login/" class="nav-link text-primary">
                        <div class="link-left"><i class="fas fa-sign-in-alt"></i> Login</div>
                    </a>
                    <a href="#" class="nav-link text-red-500 hover:text-red-600 hover:bg-red-50">
                        <div class="link-left"><i class="fas fa-sign-out-alt"></i> Logout</div>
                    </a>
                </nav>
            </div>
        </aside>
    `;

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.insertAdjacentHTML('beforebegin', sidebarHTML);
    }
}

/**
 * Injects sidebar CSS and handles mobile responsiveness.
 */
function setupMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const header = document.querySelector('.top-header');

    // 1. Inject ALL Sidebar CSS (Desktop & Mobile)
    const style = document.createElement('style');
    style.innerHTML = `
        /* Desktop Base Styles */
        .sidebar { width: 260px; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px); border-right: 1px solid rgba(0, 0, 0, 0.05); display: flex; flex-direction: column; z-index: 10; overflow-y: auto; }
        .logo-wrap { display: flex; align-items: center; gap: 0.75rem; padding: 1.5rem; text-decoration: none; border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
        .logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; color: white; font-size: 1rem; }
        .nav-section-title { font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; padding: 1.5rem 1.25rem 0.5rem; }
        .nav-menu { padding: 0 0.75rem 1.5rem; display: flex; flex-direction: column; gap: 0.25rem; }
        .nav-link { display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 1rem; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 600; color: #475569; text-decoration: none; transition: all 0.2s ease; }
        .nav-link .link-left { display: flex; align-items: center; gap: 0.75rem; }
        .nav-link i { font-size: 1rem; opacity: 0.7; width: 20px; text-align: center; }
        .nav-link:hover { background: var(--primary-light); color: var(--primary); }
        .nav-link.active { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3); }
        .nav-link.active i { opacity: 1; }
        .badge { background: rgba(0,0,0,0.05); padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; }
        .nav-link.active .badge { background: rgba(255,255,255,0.2); }

        /* Mobile Breakpoint Styles */
        @media (max-width: 768px) {
            .sidebar { position: fixed; left: -100%; top: 0; bottom: 0; transition: left 0.3s ease-in-out; }
            .sidebar.open { left: 0; }
            .mobile-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9; backdrop-filter: blur(4px); }
            .mobile-overlay.show { display: block; }
        }
    `;
    document.head.appendChild(style);

    // 2. Setup Mobile Toggle Buttons
    if (header && !document.querySelector('.mobile-toggle-btn')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'action-btn mobile-toggle-btn';
        toggleBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i> Menu';
        
        header.insertBefore(toggleBtn, header.firstChild);

        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        document.body.appendChild(overlay);

        toggleBtn.addEventListener('click', () => {
            if(sidebar) sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
        });

        overlay.addEventListener('click', () => {
            if(sidebar) sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });

        window.addEventListener('resize', () => {
            toggleBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
            if (window.innerWidth > 768) {
                if(sidebar) sidebar.classList.remove('open');
                overlay.classList.remove('show');
            }
        });
    }
}

/**
 * Highlights the current active navigation link based on the page URL.
 */
function setActiveLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        link.classList.remove('active');
        if (linkHref === currentPath || (currentPath === '/' && linkHref === '/dashboard/')) {
            link.classList.add('active');
        }
    });
}

/**
 * Filters the sidebar navigation links based on user roles.
 */
function applyRolePermissions(role) {
    const permissions = {
        'Overview': ['Admin', 'Guest'],
        'Organizations': ['Admin'],
        'Register': ['Admin', 'Guest'],
        'Environmental': ['Admin', 'Guest'],
        'Community': ['Admin', 'Guest'],
        'Livelihoods': ['Admin', 'Guest'],
        'Stories': ['Admin', 'Guest'],
        'ESG Report': ['Admin'],
        'Login': ['Guest'], // Only guests see Login
        'Logout': ['Admin'] // Only admins see Logout
    };

    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const linkText = link.textContent.trim();
        Object.keys(permissions).forEach(key => {
            if (linkText.includes(key)) {
                if (!permissions[key].includes(role)) {
                    link.style.display = 'none';
                }
            }
        });
    });
}
