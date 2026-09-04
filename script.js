/* ==========================================================================
   Grace Community Fellowship – script.js (მკაცრი ერთ-ქარდიანი სლაიდერის ფიქსი)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ──────────────────────────────────────────────
    // 1. STICKY HEADER - სქროლის ეფექტი (ხელუხლებელი)
    // ──────────────────────────────────────────────
    const header = document.querySelector('.main-header');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (header) {
        let lastScrollY = window.scrollY;

        const onScroll = () => {
            const currentScrollY = window.scrollY;

            // 1. Toggle standard scroll class
            header.classList.toggle('scrolled', currentScrollY > 60);

            // 2. Mobile smart header logic (hide on scroll down, show on scroll up)
            if (hamburger) {
                const isMobile = window.getComputedStyle(hamburger).display !== 'none';
                const isMenuOpen = navMenu && navMenu.classList.contains('open');

                if (isMobile && !isMenuOpen) {
                    if (currentScrollY > 100 && currentScrollY > lastScrollY) {
                        // Scrolling down - hide header
                        header.classList.add('header-hidden');
                    } else {
                        // Scrolling up or at the top - show header
                        header.classList.remove('header-hidden');
                    }
                } else {
                    // Always show on desktop or when mobile menu is open
                    header.classList.remove('header-hidden');
                }
            }

            lastScrollY = currentScrollY;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }


    // ──────────────────────────────────────────────
    // 2. WELCOME BANNER - გლუვი გამოჩენა სქროლისას (ხელუხლებელი)
    // ──────────────────────────────────────────────
    const welcomeBanner = document.querySelector('.welcome-banner.floating-banner');

    if (welcomeBanner) {
        const revealBanner = () => {
            if (window.scrollY > 1) {
                welcomeBanner.classList.add('banner-visible');
                window.removeEventListener('scroll', revealBanner);
            }
        };
        window.addEventListener('scroll', revealBanner, { passive: true });
    }


    // ──────────────────────────────────────────────
    // 3. MOBILE NAVIGATION (ჰამბურგერი & Dropdowns) (ხელუხლებელი)
    // ──────────────────────────────────────────────
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('open');
            hamburger.classList.toggle('active');
            hamburger.setAttribute('aria-expanded', isOpen);
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        // კლავიატურის "Escape" ღილაკით დახურვა
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMenu.classList.contains('open')) {
                navMenu.classList.remove('open');
                hamburger.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }
        });

        // მობილურზე Dropdown მენიუების მართვის ლოგიკა (აკორდეონი)
        const dropdownLinks = navMenu.querySelectorAll('.has-dropdown > a');
        dropdownLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // "#" ლინკები არასდროს უნდა გადახტნენ გვერდის თავში (დესკტოპზეც)
                if ((link.getAttribute('href') || '').trim() === '#') {
                    e.preventDefault();
                }

                if (window.innerWidth <= 1307) {
                    const parentLi = link.parentElement;

                    // სხვა გახსნილი dropdown-ების დაკეტვა
                    navMenu.querySelectorAll('.has-dropdown').forEach(item => {
                        if (item !== parentLi) {
                            item.classList.remove('dropdown-open');
                            const otherLink = item.querySelector(':scope > a');
                            if (otherLink) otherLink.setAttribute('aria-expanded', 'false');
                        }
                    });

                    // მიმდინარე მენიუს გადართვა
                    const isDropdownOpen = parentLi.classList.toggle('dropdown-open');
                    link.setAttribute('aria-expanded', isDropdownOpen);
                }
            });
        });

        // ჩვეულებრივ ლინკზე კლიკისას მენიუს ავტომატური დაკეტვა
        const menuLinks = navMenu.querySelectorAll('.nav-list > li:not(.has-dropdown) a, .dropdown-menu a');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('open');
                hamburger.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });

        // მენიუს დაკეტვა გარედან კლიკისას
        document.addEventListener('click', (e) => {
            if (navMenu.classList.contains('open') &&
                !navMenu.contains(e.target) &&
                !hamburger.contains(e.target)) {
                navMenu.classList.remove('open');
                hamburger.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }
        });
    }


    // ──────────────────────────────────────────────
    // 4. CARD SLIDER (მკაცრი დაცვა: ერთი დრაგი = მაქსიმუმ ერთი ქარდი)
    // ──────────────────────────────────────────────
    // ──────────────────────────────────────────────
    // 4. CARD SLIDER (მკაცრი დაცვა: ერთი დრაგი = მაქსიმუმ ერთი ქარდი)
    // ──────────────────────────────────────────────
    const track = document.querySelector('.slider-track');
    const container = document.querySelector('.slider-container');
    const arrowLeft = document.querySelector('.arrow-left');
    const arrowRight = document.querySelector('.arrow-right');

    if (track && container) {
        const originalItems = Array.from(track.children);
        const originalCount = originalItems.length;

        // ელემენტების კლონირება უსასრულო სქროლისთვის
        for (let i = 0; i < 3; i++) {
            originalItems.forEach(item => track.appendChild(item.cloneNode(true)));
        }

        let currentX = 0;
        let targetX = 0;
        let isDragging = false;
        let startX = 0;
        let storedX = 0;
        const EASE = 0.075;
        const DRAG_THRESHOLD = 50; // მინიმალური პიქსელები დრაგის დასაფიქსირებლად
        let lastTouchTime = 0;

        let lastWidth = window.innerWidth;
        let lastItemWidth = 0;
        let lastPad = 0;

        function getItemMetrics() {
            const item = track.querySelector('.card-item');
            if (!item) return { itemWidth: 380, totalWidth: 380 * originalCount };
            const rect = item.getBoundingClientRect();
            const style = window.getComputedStyle(item);
            const ml = parseFloat(style.marginLeft) || 0;
            const mr = parseFloat(style.marginRight) || 0;
            const itemWidth = rect.width + ml + mr;
            const totalWidth = itemWidth * originalCount;
            return { itemWidth, totalWidth };
        }

        function getContainerPadding() {
            return parseFloat(window.getComputedStyle(container).paddingLeft) || 0;
        }

        function init() {
            // თუ ეკრანის სიგანე არ შეცვლილა (მაგ. ვერტიკალური სქროლი მობილურზე), ვინარჩუნებთ პოზიციას
            if (window.innerWidth === lastWidth && currentX !== 0) {
                return;
            }

            const { itemWidth, totalWidth } = getItemMetrics();
            const pad = getContainerPadding();

            if (currentX !== 0 && lastItemWidth > 0) {
                // რეზოლუციის სიგანის შეცვლისას (მაგ. ეკრანის როტაცია), ინარჩუნებს მიმდინარე აქტიურ სლაიდს
                const index = Math.round((targetX - lastPad) / lastItemWidth);
                targetX = (index * itemWidth) + pad;
                currentX = targetX;
            } else {
                // საწყისი ჩატვირთვა
                targetX = -totalWidth + pad;
                currentX = -totalWidth + pad;
            }

            lastWidth = window.innerWidth;
            lastItemWidth = itemWidth;
            lastPad = pad;

            track.style.transform = `translate3d(${currentX}px, 0, 0)`;
        }

        window.addEventListener('load', init);
        window.addEventListener('resize', init);
        init();

        function snapToNearest() {
            const { itemWidth } = getItemMetrics();
            const pad = getContainerPadding();
            let rel = targetX - pad;
            rel = Math.round(rel / itemWidth) * itemWidth;
            targetX = rel + pad;
        }

        // მაუსის დაჭერა
        container.addEventListener('mousedown', (e) => {
            if (Date.now() - lastTouchTime < 500) return;
            if (e.target.closest('.slider-arrow')) return;
            if (!e.target.closest('.slider-track')) return; // სქროლვა მხოლოდ სლაიდერის შიგთავსზე
            e.preventDefault();
            isDragging = true;
            startX = e.clientX;
            storedX = targetX;
        });

        // მაუსის მოძრაობა მკაცრი ჩამკეტით
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const { itemWidth } = getItemMetrics();
            const diff = e.clientX - startX;

            if (diff > DRAG_THRESHOLD) {
                targetX = storedX + itemWidth;
                isDragging = false;
                snapToNearest();
            } else if (diff < -DRAG_THRESHOLD) {
                targetX = storedX - itemWidth;
                isDragging = false;
                snapToNearest();
            } else {
                targetX = storedX + diff;
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            snapToNearest();
        });

        container.addEventListener('mouseleave', () => {
            if (isDragging) { isDragging = false; snapToNearest(); }
        });

        // 🌟 თაჩ დრაგი მობილურისთვის ოპტიმიზებული სქროლის ბლოკით (ახალი კოდი სწორ ადგილას)
        let touchStartX = 0, touchStartY = 0, touchStoredX = 0;
        let isTouchDragging = false;

        container.addEventListener('touchstart', (e) => {
            lastTouchTime = Date.now();
            if (e.target.closest('.slider-arrow')) return;
            if (!e.target.closest('.slider-track')) return; // სქროლვა მხოლოდ სლაიდერის შიგთავსზე
            isTouchDragging = true;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStoredX = targetX;
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            lastTouchTime = Date.now();
            if (!isTouchDragging) return;

            const diffX = e.touches[0].clientX - touchStartX;
            const diffY = e.touches[0].clientY - touchStartY;

            // თუ მომხმარებელი უფრო მეტად გვერდზე სქროლავს, ვიდრე ზემოთ/ქვემოთ
            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (e.cancelable) e.preventDefault(); // ვბლოკავთ გვერდის ზემოთ/ქვემოთ გაქცევას
            }

            const { itemWidth } = getItemMetrics();
            const diff = diffX;

            if (diff > DRAG_THRESHOLD) {
                targetX = touchStoredX + itemWidth;
                isTouchDragging = false;
                snapToNearest();
            } else if (diff < -DRAG_THRESHOLD) {
                targetX = touchStoredX - itemWidth;
                isTouchDragging = false;
                snapToNearest();
            } else {
                targetX = touchStoredX + diff;
            }
        }, { passive: false }); // აუცილებელია false, რომ ბრაუზერმა სქროლის ბლოკირება მოგვცეს

        container.addEventListener('touchend', () => {
            lastTouchTime = Date.now();
            isTouchDragging = false;
            snapToNearest();
        });

        // ისრების ფუნქციონალი
        if (arrowLeft) {
            arrowLeft.addEventListener('click', () => {
                targetX += getItemMetrics().itemWidth;
                snapToNearest();
            });
        }
        if (arrowRight) {
            arrowRight.addEventListener('click', () => {
                targetX -= getItemMetrics().itemWidth;
                snapToNearest();
            });
        }

        // ანიმაციის ციკლი
        function animate() {
            currentX += (targetX - currentX) * EASE;
            const { totalWidth } = getItemMetrics();
            const pad = getContainerPadding();
            if (currentX > pad) {
                targetX -= totalWidth;
                currentX -= totalWidth;
                storedX -= totalWidth;
                touchStoredX -= totalWidth;
            }
            if (currentX < -(totalWidth * 2) + pad) {
                targetX += totalWidth;
                currentX += totalWidth;
                storedX += totalWidth;
                touchStoredX += totalWidth;
            }
            track.style.transform = `translate3d(${currentX}px, 0, 0)`;
            requestAnimationFrame(animate);
        }
        animate();
    } // <─── აი აქ იხურება სლაიდერის მთავარი ბლოკი იდეალურად!


    // ──────────────────────────────────────────────
    // 5. BACK TO TOP ღილაკის მუშაობის ლოგიკა (ხელუხლებელი)
    // ──────────────────────────────────────────────
    const backToTopBtn = document.querySelector('.back-to-top');

    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            backToTopBtn.classList.toggle('visible', window.scrollY > 300);
        }, { passive: true });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }


    // ──────────────────────────────────────────────
    // 6. VIDEO PLACEHOLDERS - ინტერაქტიული YouTube ფლეიერი და Thumbnail-ები
    // ──────────────────────────────────────────────
    const setupVideoClick = (el) => {
        const videoId = el.getAttribute('data-video-id') || '-yhiipmNtMA';
        const platform = el.getAttribute('data-video-platform') || (videoId.match(/^\d+$/) ? 'vimeo' : 'youtube');

        if (platform === 'vimeo') {
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            el.style.position = 'relative';

            // Try to fetch Vimeo thumbnail
            fetch(`https://vimeo.com/api/v2/video/${videoId}.json`)
                .then(res => res.json())
                .then(data => {
                    if (data && data[0] && data[0].thumbnail_large) {
                        el.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.2)), url('${data[0].thumbnail_large}')`;
                    }
                })
                .catch(err => {
                    console.error('Error fetching Vimeo thumbnail:', err);
                    el.style.backgroundColor = '#1e1e1e';
                });
        } else {
            /* Set high quality YouTube thumbnail dynamically */
            if (typeof setYouTubeThumbnailBackground === 'function') {
                setYouTubeThumbnailBackground(el, videoId, 'linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.2))');
            } else {
                el.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.2)), url('https://img.youtube.com/vi/${videoId}/hqdefault.jpg')`;
            }
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            el.style.position = 'relative';
        }

        el.addEventListener('click', () => {
            const iframe = document.createElement('iframe');

            if (platform === 'vimeo') {
                iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share');
                iframe.setAttribute('allowfullscreen', 'true');
                iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
                iframe.setAttribute('frameborder', '0');
            } else {
                iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
                iframe.setAttribute('allowfullscreen', 'true');
                iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            }

            // შეფუთვა video-container კლასში სითხისთვის
            const videoContainer = document.createElement('div');
            videoContainer.className = 'video-container';
            videoContainer.appendChild(iframe);

            // Hide all existing children of the placeholder to preserve the user gesture target in DOM
            Array.from(el.children).forEach(child => {
                if (child !== videoContainer) {
                    child.style.setProperty('display', 'none', 'important');
                }
            });

            // Append container to the DOM first so the navigation is linked to the active user gesture
            el.appendChild(videoContainer);

            const activeVideoId = el.getAttribute('data-video-id') || videoId;
            const activePlatform = el.getAttribute('data-video-platform') || platform;

            if (activePlatform === 'vimeo') {
                iframe.setAttribute('src', `https://player.vimeo.com/video/${activeVideoId}?autoplay=1&badge=0&autopause=0&player_id=0&app_id=58479`);
            } else {
                iframe.setAttribute('src', `https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&vq=hd1080&rel=0&modestbranding=1`);
            }

            // Focus the iframe immediately to transfer user activation
            iframe.focus();

            el.style.display = 'block';
            el.style.background = '#000';
            el.removeAttribute('role');
            el.removeAttribute('tabindex');
        }, { once: true });
    };

    document.querySelectorAll('.video-placeholder, .main-video-placeholder, .camp-video-placeholder').forEach(el => {
        setupVideoClick(el);
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                el.click();
            }
        });
    });


    // ──────────────────────────────────────────────
    // 7. რუკის სქროლის დამცავი ფენა (Map Overlay) (ხელუხლებელი)
    // ──────────────────────────────────────────────
    document.querySelectorAll('.map-wrapper').forEach(wrapper => {
        const overlay = wrapper.querySelector('.map-overlay');
        const hint = wrapper.closest('.contact-map-col')?.querySelector('.map-hint');
        const hintText = hint?.querySelector('.hint-text');
        if (!overlay) return;

        overlay.addEventListener('click', () => {
            overlay.classList.add('map-unlocked');
            if (hint) hint.classList.add('hint-active');
            if (hintText) hintText.textContent = 'რუკის დასაბლოკად მაუსი გაწიეთ გარეთ';
        });

        wrapper.addEventListener('mouseleave', () => {
            overlay.classList.remove('map-unlocked');
            if (hint) hint.classList.remove('hint-active');
            if (hintText) hintText.textContent = 'დააკლიკეთ რუკაზე ინტერაქტივისთვის';
        });

        overlay.addEventListener('touchstart', () => {
            overlay.classList.add('map-unlocked');
        }, { passive: true });
    });

    // ──────────────────────────────────────────────
    // 8. OPTIMIZE VIDEO PLAYBACK (Intersection Observer)
    // ──────────────────────────────────────────────
    const setupIntersectionObserverForVideo = (videoEl) => {
        if (!videoEl || videoEl.dataset.observed === 'true') return;

        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0
        };

        const observerCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    videoEl.play().catch(err => {
                        console.warn('Video play interrupted or blocked:', err);
                    });
                } else {
                    videoEl.pause();
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);
        observer.observe(videoEl);
        videoEl.dataset.observed = 'true';
    };

    // Watch for current and future video elements in the building container
    const watchVideoContainer = document.getElementById('building-video-container');
    if (watchVideoContainer) {
        const initialVideo = watchVideoContainer.querySelector('video');
        if (initialVideo) {
            setupIntersectionObserverForVideo(initialVideo);
        }
        const mutObserver = new MutationObserver(() => {
            const currentVideo = watchVideoContainer.querySelector('video');
            if (currentVideo) {
                setupIntersectionObserverForVideo(currentVideo);
            }
        });
        mutObserver.observe(watchVideoContainer, { childList: true });
    }

    // Also support direct fallback selections
    const directVideo = document.getElementById('churchVideo') || document.getElementById('sanity-video-element');
    if (directVideo) {
        setupIntersectionObserverForVideo(directVideo);
    }

});

// Global Body Scroll Lock/Unlock helpers
let isScrollLocked = false;

function preventDefault(e) {
    const activeOverlay = document.querySelector('.creed-modal-overlay.open, .camp-modal.modal-active, .reg-modal.modal-active, .group-modal.modal-active, .modal.modal-active');
    if (activeOverlay) {
        const scrollableContent = activeOverlay.querySelector('.creed-modal, .modal-content-box, .modal-body, #campRegisterForm, #groupRegisterForm');
        if (scrollableContent) {
            if (scrollableContent.contains(e.target)) {
                return;
            }
        }
        e.preventDefault();
    }
}

window.lockBodyScroll = function() {
    document.documentElement.classList.add('no-scroll');
    document.body.classList.add('no-scroll');
    if (!isScrollLocked) {
        window.addEventListener('wheel', preventDefault, { passive: false });
        window.addEventListener('touchmove', preventDefault, { passive: false });
        isScrollLocked = true;
    }
};

window.unlockBodyScroll = function() {
    document.documentElement.classList.remove('no-scroll');
    document.body.classList.remove('no-scroll');
    window.removeEventListener('wheel', preventDefault, { passive: false });
    window.removeEventListener('touchmove', preventDefault, { passive: false });
    isScrollLocked = false;
};

