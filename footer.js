/**
 * footer.js — Génération dynamique du footer
 * Inclure ce script avant </body> sur chaque page.
 * Usage : <div id="footer-placeholder"></div>
 */

(function () {
    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) return;

    placeholder.outerHTML = `
    <footer>
        <p>&copy; 2026 Julien Philippe. Tous droits réservés.</p>
        <div class="footer-bottom-links">
            <a href="mentions-legales" class="legal-link">Mentions Légales</a>
        </div>
        <div class="socials">
            <a href="https://www.linkedin.com/in/julien-philippe-orl%C3%A9ans/" target="_blank" aria-label="LinkedIn"><i class="fab fa-linkedin"></i></a>
            <a href="https://github.com/Julien2712" target="_blank" aria-label="GitHub"><i class="fab fa-github"></i></a>
        </div>
    </footer>`;
})();
