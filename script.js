(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.getElementById('nav-links');

  // Header border once the page scrolls
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    navLinks.classList.remove('is-open');
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    navLinks.classList.toggle('is-open', !open);
  });
  navLinks.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('is-open')) {
      closeMenu();
      toggle.focus();
    }
  });

  // Highlight the nav link for the section in view
  const links = [...navLinks.querySelectorAll('a[href^="#"]')];
  const sections = links
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => {
          const match = a.getAttribute('href') === `#${entry.target.id}`;
          if (match) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => observer.observe(s));
  }

  // Back to top: scroll the window itself (a sticky header can't be a scroll target)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('a[href="#top"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      history.replaceState(null, '', location.pathname + location.search);
      closeMenu();
    });
  });

  // Click-to-play videos: swap the thumbnail for the youtube-nocookie player on demand
  document.querySelectorAll('.video[data-video-id]').forEach((box) => {
    const poster = box.querySelector('.video-poster');
    const thumb = poster.querySelector('img');
    const markNoThumb = () => box.classList.add('no-thumb');
    // YouTube serves a 120px grey placeholder when a thumbnail is missing
    thumb.addEventListener('error', markNoThumb);
    thumb.addEventListener('load', () => { if (thumb.naturalWidth <= 120) markNoThumb(); });

    poster.addEventListener('click', (e) => {
      e.preventDefault();
      const id = box.dataset.videoId;
      const title = poster.getAttribute('aria-label').replace(/^Play video: /, '');
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1`;
      frame.title = `${title} video`;
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      poster.replaceWith(frame);
      frame.focus();
    });
  });

  const motionOK = document.documentElement.classList.contains('motion');

  // Gentle fade-and-slide-up as content enters the viewport
  if (motionOK && 'IntersectionObserver' in window) {
    const targets = document.querySelectorAll(
      '.section-head, .project, .steps .step, .experience-main, .about-head, .about-text, .contact-panel'
    );
    document.querySelectorAll('.steps .step').forEach((step, i) => {
      step.style.setProperty('--reveal-delay', `${i * 0.08}s`);
    });
    const revealer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach((el) => {
      el.classList.add('reveal');
      revealer.observe(el);
    });
  } else {
    document.documentElement.classList.remove('motion');
  }

  // Type the hero tagline once on load. Screen readers get the full sentence straight away.
  const tagline = document.querySelector('.hero-sub');
  if (motionOK && tagline) {
    const text = tagline.textContent.trim();
    tagline.style.minHeight = `${tagline.offsetHeight}px`;
    tagline.textContent = '';
    const full = document.createElement('span');
    full.className = 'visually-hidden';
    full.textContent = text;
    const typed = document.createElement('span');
    typed.setAttribute('aria-hidden', 'true');
    const caret = document.createElement('span');
    caret.className = 'typed-caret';
    caret.setAttribute('aria-hidden', 'true');
    tagline.append(full, typed, caret);

    let i = 0;
    const step = () => {
      typed.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(step, 22);
      else caret.classList.add('is-done');
    };
    setTimeout(step, 350);
  }

  document.getElementById('year').textContent = new Date().getFullYear();
})();
