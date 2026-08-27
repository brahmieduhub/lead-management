/* ============================================================
   BRAHMI EDUHUB SERVICES — JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ---------- Elements ----------
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    const sections = document.querySelectorAll('section[id]');
    const navAnchors = document.querySelectorAll('.nav-links a');
    const contactForm = document.getElementById('contactForm');

    // ---------- Navbar scroll effect ----------
    const handleScroll = () => {
        if (window.scrollY > 80) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        updateActiveLink();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // ---------- Hamburger toggle ----------
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('open');
    });

    // Close nav on link click (mobile)
    navAnchors.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('open');
        });
    });

    // ---------- Active link highlighting ----------
    const updateActiveLink = () => {
        let current = '';
        sections.forEach(section => {
            const top = section.offsetTop - 120;
            const bottom = top + section.offsetHeight;
            if (window.scrollY >= top && window.scrollY < bottom) {
                current = section.getAttribute('id');
            }
        });

        navAnchors.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    };

    // Run once on load
    updateActiveLink();

    // ---------- Scroll Reveal Animations ----------
    const revealElements = document.querySelectorAll(
        '.about-card, .program-card, .why-item, .franchise-point, .franchise-cta, .contact-item, .contact-form, .section-header'
    );

    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // Optionally unobserve after reveal
                    // revealObserver.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px',
        }
    );

    revealElements.forEach(el => {
        el.classList.add('reveal');
        revealObserver.observe(el);
    });

    // ---------- Contact Form Handling ----------
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Gather form data
        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData.entries());

        // Simple validation
        let isValid = true;
        const inputs = contactForm.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.hasAttribute('required') && !input.value.trim()) {
                input.style.borderColor = '#e53935';
                isValid = false;
            } else {
                input.style.borderColor = '';
            }
        });

        if (!isValid) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        // Simulate sending
        const submitBtn = contactForm.querySelector('.btn-primary');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        setTimeout(() => {
            showToast('Thank you! We will get back to you shortly.', 'success');
            contactForm.reset();
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }, 1200);
    });

    // ---------- Toast Notification ----------
    function showToast(message, type = 'success') {
        // Remove existing toast if any
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;

        if (type === 'success') {
            toast.style.background = '#2e7d32';
        } else {
            toast.style.background = '#c62828';
        }

        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            background: type === 'success' ? '#2e7d32' : '#c62828',
            color: '#fff',
            padding: '16px 28px',
            borderRadius: '12px',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.95rem',
            fontWeight: '500',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
            zIndex: '9999',
            opacity: '0',
            transform: 'translateY(20px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
            maxWidth: '400px',
        });

        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Auto remove after 4s
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // ---------- Smooth scroll offset for fixed navbar ----------
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offset = 80;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });
});