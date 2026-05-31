/**
 * navbar.js — Génération dynamique de la navbar
 * Inclure ce script AVANT la fermeture de </body> sur chaque page.
 */

(function () {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    const isProjectPage = placeholder.dataset.type === 'project';

    // Détection de la page courante
    const path = window.location.pathname;
    let fileName = path.split('/').pop() || 'index';

    // Si l'URL finit par "/" (ex: sur Vercel), on considère que c'est l'index
    if (fileName === "" || fileName === "/") fileName = "index";

    // On retire l'extension .html si présente (URLs propres)
    fileName = fileName.replace(/\.html$/, '');

    const currentPage = decodeURIComponent(fileName);

    // ---- Navbar principale ----
    const mainLinks = [
        { href: 'index', label: 'Accueil' },
        { href: 'projets', label: 'Projets' },
        { href: 'experience', label: 'Expérience' },
        { href: 'certifications', label: 'Certifications' },
        { href: 'veille', label: 'Veille' },
        { href: 'Image/Tableur certification.pdf', label: 'E5', target: '_blank' },
        { href: 'Image/CV.pdf', label: 'CV <i class="fas fa-download" style="font-size:0.85em; margin-left:4px;"></i>', target: '_blank' }
    ];

    function buildMainNav() {
        const items = mainLinks.map((link, i) => {
            // Logique de classe active
            const linkName = link.href.replace(/\.html$/, '');
            const isExactMatch = currentPage === linkName;
            const isProjectDetail = linkName === 'projets' && currentPage.startsWith('projet-');
            const isActive = isExactMatch || isProjectDetail;

            const activeClass = isActive ? ' class="active"' : '';
            const targetAttr = link.target ? ` target="${link.target}"` : '';

            // Gestion du chemin si on est dans un sous-dossier (optionnel mais plus sûr)
            const prefix = isProjectPage && !link.href.startsWith('http') ? '../' : '';
            const finalHref = (link.href.includes('/') || !isProjectPage) ? link.href : prefix + link.href;

            return `<li style="--i: ${i};"><a href="${finalHref}"${activeClass}${targetAttr}>${link.label}</a></li>`;
        }).join('\n');

        return `
    <div class="navbar-wrapper">
        <nav class="navbar">
            <a href="index" class="logo">Julien</a>
            
            <ul class="nav-links" id="nav-links">
                ${items}
            </ul>

            <div class="nav-right">
                <a href="contact" class="btn-nav-contact"><strong>Me contacter</strong> <i class="fas fa-external-link-alt"></i></a>
                <div class="nav-separator"></div>
                ${(function () {
                const savedTheme = localStorage.getItem('theme') || 'dark';
                const icon = savedTheme === 'light' ? 'fa-moon' : 'fa-sun';
                return `<button id="theme-toggle" class="theme-toggle" aria-label="Thème">
                                <i class="fas ${icon}"></i>
                            </button>`;
            })()}
                <button id="menu-toggle" class="menu-toggle" aria-label="Menu">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
        </nav>
    </div>`;
    }

    // Injection de la navbar
    placeholder.outerHTML = buildMainNav();

    // ---- Logique Menu Mobile ----
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.replace('fa-bars', 'fa-times');
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
            }
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                menuToggle.querySelector('i').classList.replace('fa-times', 'fa-bars');
            });
        });
    }
})();
