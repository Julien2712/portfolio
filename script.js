// =====================================================
// PAGE TRANSITION OVERLAY
// =====================================================
(function () {
    const overlay = document.createElement('div');
    overlay.id = 'page-overlay';
    document.documentElement.appendChild(overlay);

    window.addEventListener('pageshow', (event) => {
        overlay.classList.remove('visible');
        if (window.scrollObserver) {
            document.querySelectorAll('.fade-in-scroll').forEach(el => {
                el.classList.remove('visible');
                window.scrollObserver.observe(el);
            });
        }
    });
})();

// =====================================================
// DOMContentLoaded : Animations & Interactions
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize critical UI components first
    initCarousel();
    initLightbox();
    initProgressBar();
    initSkeletons();
    initProjectFilters();

    const pageOverlay = document.getElementById('page-overlay');
    if (pageOverlay) pageOverlay.classList.remove('visible');

    // 2. --- Intersection Observer (scroll animations avec stagger) ---
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.08
    };

    function applyStaggerDelays() {
        const parents = new Set();
        document.querySelectorAll('.fade-in-scroll').forEach(el => {
            if (el.parentElement) parents.add(el.parentElement);
        });
        parents.forEach(parent => {
            const siblings = Array.from(parent.querySelectorAll(':scope > .fade-in-scroll'));
            siblings.forEach((el, i) => {
                el.style.setProperty('--delay', `${i * 100}ms`);
            });
        });
    }

    // Auto-ajouter fade-in-scroll sur les blocs des pages projet
    const projectPageBlocks = document.querySelectorAll(
        '.project-details, .schema-box, .comp-card, .project-footer-grid'
    );
    projectPageBlocks.forEach(el => el.classList.add('fade-in-scroll'));

    applyStaggerDelays();

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
                
                // Retirer la classe d'animation une fois terminée pour ne pas bloquer les hovers
                setTimeout(() => {
                    entry.target.classList.remove('fade-in-scroll');
                    entry.target.classList.remove('visible');
                }, 1000);
            }
        });
    }, observerOptions);

    window.scrollObserver = observer;
    document.querySelectorAll('.fade-in-scroll').forEach(el => observer.observe(el));

    // 3. --- Cartes projet cliquables (data-href) ---
    document.querySelectorAll('[data-href]').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const href = card.getAttribute('data-href');
            if (!href) return;
            if (pageOverlay) pageOverlay.classList.add('visible');
            setTimeout(() => {
                window.location.href = href;
            }, 380);
        });
    });

    // 4. --- Dark/Light Mode Toggle ---
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const icon = themeToggle.querySelector('i');
            // Animation de rotation
            icon.style.transform = 'scale(0.8) rotate(180deg)';
            
            setTimeout(() => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                updateThemeIcon();
                icon.style.transform = 'scale(1) rotate(0deg)';
            }, 100);
        });
    }

    function updateThemeIcon() {
        if (!themeToggle) return;
        const icon = themeToggle.querySelector('i');
        const theme = document.documentElement.getAttribute('data-theme');
        if (theme === 'light') {
            icon.className = 'fas fa-moon';
        } else {
            icon.className = 'fas fa-sun';
        }
    }
    updateThemeIcon();

    // 5. --- Parallax Progress ---
    function initParallax(lenis) {
        const parallaxElements = document.querySelectorAll('.project-card, .timeline-content, .hero-content');
        
        lenis.on('scroll', () => {
            parallaxElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                const speed = el.classList.contains('hero-content') ? 0.2 : 0.08;
                
                // Si l'élément est dans le viewport (ou proche)
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    const shift = (rect.top - window.innerHeight / 2) * speed;
                    el.style.transform = `translateY(${shift}px)`;
                }
            });
        });
    }

    // 6. --- Bouton Remonter (Scroll to Top) ---
    const scrollTopBtn = document.createElement('button');
    scrollTopBtn.id = 'scrollTopBtn';
    scrollTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    scrollTopBtn.title = 'Remonter en haut';
    scrollTopBtn.setAttribute('aria-label', 'Remonter en haut de la page');
    document.body.appendChild(scrollTopBtn);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollTopBtn.classList.add('show');
        } else {
            scrollTopBtn.classList.remove('show');
        }
    });

    scrollTopBtn.addEventListener('click', () => {
        if (window.lenisInstance) {
            window.lenisInstance.scrollTo(0, { duration: 1.5 });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // 6. --- Smooth Scroll Global (Lenis) ---
    const lenisScript = document.createElement('script');
    lenisScript.src = "https://unpkg.com/lenis@1.1.18/dist/lenis.min.js";

    // Fallback : si Lenis ne charge pas en 3s, on continue sans
    const lenisFallbackTimeout = setTimeout(() => {
        console.warn('Lenis failed to load, using native scroll');
    }, 3000);

    lenisScript.onerror = () => {
        clearTimeout(lenisFallbackTimeout);
        console.warn('Lenis script failed to load, using native scroll');
    };

    lenisScript.onload = () => {
        clearTimeout(lenisFallbackTimeout);
        try {
            const lenis = new Lenis({
                duration: 1.2,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                orientation: 'vertical',
                gestureOrientation: 'vertical',
                smoothWheel: true,
                wheelMultiplier: 1,
                smoothTouch: false,
                touchMultiplier: 2,
                infinite: false,
                autoResize: true,
                prevent: (node) => node.classList.contains('no-lenis'),
            });
            window.lenisInstance = lenis;
            initParallax(lenis);
            function raf(time) {
                lenis.raf(time);
                requestAnimationFrame(raf);
            }
            requestAnimationFrame(raf);

            // Fallback: si le scroll natif est complètement bloqué après 2s,
            // détruire Lenis et revenir au scroll natif
            setTimeout(() => {
                const testScroll = () => {
                    const scrollable = document.documentElement.scrollHeight > window.innerHeight;
                    if (scrollable && !lenis.isScrolling && window.scrollY === 0) {
                        // Possible stuck scroll - add wheel passthrough
                        window.addEventListener('wheel', (e) => {
                            if (!lenis.isScrolling) {
                                window.scrollBy(0, e.deltaY);
                            }
                        }, { passive: true });
                    }
                };
                testScroll();
            }, 2000);
        } catch (e) {
            console.error('Lenis init failed:', e);
        }
    };
    document.head.appendChild(lenisScript);

    // --- Timeline Line Scroll Animation ---
    const timeline = document.querySelector('.timeline');
    if (timeline && timeline.querySelector('.timeline-item')) {
        const timelineItems = timeline.querySelectorAll('.timeline-item');
        function updateTimelineLine() {
            const timelineRect = timeline.getBoundingClientRect();
            const firstIcon = timelineItems[0].querySelector('.timeline-icon');
            if (!firstIcon) return;
            const startY = firstIcon.getBoundingClientRect().top - timelineRect.top + 30;
            let activeHeight = 0;
            const threshold = window.innerHeight * 0.65;
            timelineItems.forEach((item) => {
                const icon = item.querySelector('.timeline-icon');
                if (icon) {
                    const iconRect = icon.getBoundingClientRect();
                    if (iconRect.top + 30 < threshold) {
                        activeHeight = (iconRect.top + 30) - (firstIcon.getBoundingClientRect().top + 30);
                    }
                }
            });
            timeline.style.setProperty('--line-height', Math.max(0, activeHeight) + 'px');
        }
        window.addEventListener('scroll', updateTimelineLine);
        window.addEventListener('resize', updateTimelineLine);
        updateTimelineLine();
    }

    // --- Sub-functions ---
    function initLightbox() {
        if (document.querySelector('.lightbox-v2')) return;
        
        // Injection directe du CSS pour les flèches (anti-cache)
        const style = document.createElement('style');
        style.textContent = `
            .lightbox-v2 { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); backdrop-filter:blur(15px); z-index:10000; justify-content:center; align-items:center; opacity:0; transition:opacity 0.3s; }
            .lightbox-v2.active { display:flex; opacity:1; }
            .lightbox-v2 .lightbox-nav { position:absolute; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:white; width:60px; height:60px; border-radius:50%; display:none; align-items:center; justify-content:center; cursor:pointer; z-index:10010; transition:all 0.3s; font-size:1.5rem; }
            .lightbox-v2 .lightbox-nav:hover { background:var(--accent); transform:translateY(-50%) scale(1.1); box-shadow:0 0 20px var(--accent-glow); }
            .lightbox-v2 .lightbox-prev { left:30px; }
            .lightbox-v2 .lightbox-next { right:30px; }
            .lightbox-v2 .lightbox-close { position:absolute; top:30px; right:30px; font-size:30px; color:white; background:none; border:none; cursor:pointer; z-index:10011; }
            .lightbox-v2 .lightbox-caption { color:white; margin-top:20px; padding:10px 20px; background:rgba(255,255,255,0.1); border-radius:30px; backdrop-filter:blur(10px); }
            @media (max-width: 768px) { .lightbox-v2 .lightbox-nav { width:45px; height:45px; font-size:1.2rem; } .lightbox-v2 .lightbox-prev { left:10px; } .lightbox-v2 .lightbox-next { right:10px; } }
        `;
        document.head.appendChild(style);

        const modal = document.createElement('div');
        modal.className = 'lightbox-v2';
        modal.innerHTML = `
            <button class="lightbox-close"><i class="fas fa-times"></i></button>
            <button class="lightbox-nav lightbox-prev"><i class="fas fa-chevron-left"></i></button>
            <div class="lightbox-content">
                <div class="lightbox-image-wrapper">
                    <img src="" alt="Aperçu">
                    <div class="lightbox-caption"></div>
                </div>
            </div>
            <button class="lightbox-nav lightbox-next"><i class="fas fa-chevron-right"></i></button>
        `;
        document.body.appendChild(modal);
        const modalImg = modal.querySelector('img');
        const closeBtn = modal.querySelector('.lightbox-close');
        const prevBtn = modal.querySelector('.lightbox-prev');
        const nextBtn = modal.querySelector('.lightbox-next');

        const captionEl = modal.querySelector('.lightbox-caption');
        let currentItems = [];
        let currentIndex = 0;

        function showImage(index) {
            if (currentItems.length === 0) return;
            currentIndex = (index + currentItems.length) % currentItems.length;
            const item = currentItems[currentIndex];
            modalImg.src = item.url;
            captionEl.textContent = item.caption || '';
            captionEl.style.display = item.caption ? 'block' : 'none';
        }

        const bindLightboxEvents = () => {
            document.querySelectorAll('[data-lightbox]').forEach(item => {
                item.onclick = (e) => {
                    const imgUrl = item.getAttribute('data-lightbox');
                    if (!imgUrl || imgUrl === "#") return;

                    // Collect all images from the same gallery container
                    const container = item.closest('.image-gallery-container') || item.closest('.image-gallery');
                    if (container) {
                        currentItems = Array.from(container.querySelectorAll('[data-lightbox]'))
                            .map(el => ({
                                url: el.getAttribute('data-lightbox'),
                                caption: el.querySelector('.caption') ? el.querySelector('.caption').textContent : ''
                            }))
                            .filter(obj => obj.url && obj.url !== "#");
                        currentIndex = currentItems.findIndex(obj => obj.url === imgUrl);
                    } else {
                        currentItems = [{
                            url: imgUrl,
                            caption: item.querySelector('.caption') ? item.querySelector('.caption').textContent : ''
                        }];
                        currentIndex = 0;
                    }

                    // Show/hide nav buttons based on count
                    const hasMultiple = currentItems.length > 1;
                    prevBtn.style.display = hasMultiple ? 'flex' : 'none';
                    nextBtn.style.display = hasMultiple ? 'flex' : 'none';

                    showImage(currentIndex);
                    modal.classList.add('active');
                    if (window.lenisInstance) window.lenisInstance.stop();
                };
            });
        };
        bindLightboxEvents();

        prevBtn.addEventListener('click', (e) => { e.stopPropagation(); showImage(currentIndex - 1); });
        nextBtn.addEventListener('click', (e) => { e.stopPropagation(); showImage(currentIndex + 1); });

        function closeModal() {
            modal.classList.remove('active');
            if (window.lenisInstance) window.lenisInstance.start();
        }
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        document.addEventListener('keydown', (e) => {
            if (!modal.classList.contains('active')) return;
            if (e.key === 'Escape') closeModal();
            if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
            if (e.key === 'ArrowRight') showImage(currentIndex + 1);
        });
    }

    function initCarousel() {
        document.querySelectorAll('.image-gallery-container').forEach(container => {
            const wrapper = container.querySelector('.image-gallery');
            const items = container.querySelectorAll('.gallery-item');
            if (items.length <= 1) return;
            if (!container.querySelector('.carousel-btn')) {
                const prevBtn = document.createElement('button');
                prevBtn.className = 'carousel-btn prev';
                prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
                const nextBtn = document.createElement('button');
                nextBtn.className = 'carousel-btn next';
                nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                container.appendChild(prevBtn);
                container.appendChild(nextBtn);

                const updateArrows = () => {
                    const x = wrapper.scrollLeft;
                    const max = wrapper.scrollWidth - wrapper.clientWidth;
                    prevBtn.style.opacity = x > 10 ? "1" : "0";
                    prevBtn.style.visibility = x > 10 ? "visible" : "hidden";
                    nextBtn.style.opacity = x < max - 10 ? "1" : "0";
                    nextBtn.style.visibility = x < max - 10 ? "visible" : "hidden";
                };
                wrapper.addEventListener('scroll', updateArrows);
                setTimeout(updateArrows, 150);

                prevBtn.addEventListener('click', () => {
                    const w = wrapper.clientWidth;
                    const target = Math.round((wrapper.scrollLeft - w) / w) * w;
                    wrapper.scrollTo({ left: target, behavior: 'smooth' });
                });
                nextBtn.addEventListener('click', () => {
                    const w = wrapper.clientWidth;
                    const target = Math.round((wrapper.scrollLeft + w) / w) * w;
                    wrapper.scrollTo({ left: target, behavior: 'smooth' });
                });
            }
        });
    }

    // 5. --- Background Parallax Effect ---
    window.addEventListener('mousemove', (e) => {
        const { clientX, clientY } = e;
        const x = (clientX - window.innerWidth / 2) / 30;
        const y = (clientY - window.innerHeight / 2) / 30;

        document.documentElement.style.setProperty('--mx', `${x}px`);
        document.documentElement.style.setProperty('--my', `${y}px`);
    });

    // 7. --- Reading Progress Bar ---
    function initProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.id = 'reading-progress';
        document.body.appendChild(progressBar);
        
        window.addEventListener('scroll', () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const progress = (scrollTop / scrollHeight) * 100;
            progressBar.style.width = progress + '%';
        });
    }

    // 8. --- Skeletons for Images ---
    function initSkeletons() {
        const images = document.querySelectorAll('img:not(.no-skeleton)');
        images.forEach(img => {
            // Add lazy loading
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
            // Add skeleton
            if (!img.complete) {
                img.classList.add('skeleton');
                img.addEventListener('load', () => {
                    img.classList.remove('skeleton');
                });
                img.addEventListener('error', () => {
                    img.classList.remove('skeleton');
                });
            }
        });
    }

    // 9. --- Project Filters ---
    function initProjectFilters() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        const projectCards = document.querySelectorAll('.project-card');

        if (filterBtns.length === 0 || projectCards.length === 0) return;

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filterValue = btn.getAttribute('data-filter');

                projectCards.forEach(card => {
                    // Start fade out
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.95)';
                    
                    setTimeout(() => {
                        if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
                            card.style.display = 'flex';
                            // Small delay for DOM to register display: flex before animating opacity
                            setTimeout(() => {
                                card.style.opacity = '1';
                                card.style.transform = 'scale(1)';
                            }, 50);
                        } else {
                            card.style.display = 'none';
                        }
                    }, 300); // Wait for transition out
                });
                
                // Refresh Scroll Observer
                setTimeout(() => {
                    if (window.scrollObserver) {
                        projectCards.forEach(el => window.scrollObserver.observe(el));
                    }
                }, 400);
            });
        });
    }
});

// Anchor Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();
            if (window.lenisInstance) window.lenisInstance.scrollTo(targetElement);
            else targetElement.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Init theme on load
(function() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

// Starry Background
class Star {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.reset();
    }
    reset() {
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        this.size = Math.random() * 1.5 + 0.1;
        this.velocity = Math.random() * 0.2 + 0.05;
        this.baseX = this.x;
    }
    update(mouse) {
        this.y -= this.velocity;
        
        // Mouse dodge logic
        if (mouse && mouse.x !== null) {
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const dodgeRadius = 120; // Radius of the invisible circle
            
            if (distance < dodgeRadius) {
                const force = (dodgeRadius - distance) / dodgeRadius;
                const angle = Math.atan2(dy, dx);
                // Push star outward
                this.x += Math.cos(angle) * force * 4;
                this.y += Math.sin(angle) * force * 4;
            }
        }

        // Slowly return to center-ish horizontally if drifted too far, or just let it wrap
        // Here we just wrap around if it goes off screen
        if (this.y < 0 || this.x < 0 || this.x > this.canvas.width || this.y > this.canvas.height) {
            this.y = this.canvas.height + Math.random() * 20;
            this.x = Math.random() * this.canvas.width;
        }
    }
    draw(color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        this.ctx.fill();
    }
}

class StarBackground {
    constructor() {
        this.canvas = document.getElementById('bg-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.shootingStars = [];
        this.starCount = 150;
        this.mouse = { x: null, y: null };
        this.resize();
        this.init();
        this.animate();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        window.addEventListener('mouseout', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
    }
    init() { for (let i = 0; i < this.starCount; i++) this.stars.push(new Star(this.canvas)); }
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    spawnShootingStar() { if (Math.random() < 0.005) this.shootingStars.push(new ShootingStar(this.canvas)); }
    animate() {
        if (document.hidden) {
            requestAnimationFrame(() => this.animate());
            return;
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const starColor = theme === 'light' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.8)';
        this.stars.forEach(star => { star.update(this.mouse); star.draw(starColor); });
        this.spawnShootingStar();
        this.shootingStars = this.shootingStars.filter(s => !s.isDead);
        this.shootingStars.forEach(s => { s.update(); s.draw(starColor); });
        requestAnimationFrame(() => this.animate());
    }
}

class ShootingStar {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.init();
    }
    init() {
        this.x = Math.random() * this.canvas.width;
        this.y = 0;
        this.len = Math.random() * 80 + 50;
        this.speed = Math.random() * 10 + 5;
        this.angle = (Math.random() < 0.5 ? Math.PI / 4 : (3 * Math.PI) / 4) + (Math.random() * 0.2 - 0.1);
        this.opacity = 0.8;
        this.isDead = false;
    }
    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.opacity -= 0.015;
        if (this.opacity <= 0 || this.x > this.canvas.width || this.y > this.canvas.height) this.isDead = true;
    }
    draw(color) {
        this.ctx.strokeStyle = color.replace('0.8', this.opacity).replace('0.4', this.opacity);
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.x, this.y);
        this.ctx.lineTo(this.x - Math.cos(this.angle) * this.len, this.y - Math.sin(this.angle) * this.len);
        this.ctx.stroke();
    }
}

(function () {
    let canvas = document.getElementById('bg-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'bg-canvas';
        document.body.prepend(canvas);
    }
    new StarBackground();
})();