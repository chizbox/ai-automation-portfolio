(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.getElementById('nav-links');

  // Frosted header with a bottom border once the page has scrolled 20px
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 20);
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

  // Highlight the nav link for the section in view: the last section whose top has
  // passed a line a third of the way down the screen (or the last one at page bottom)
  const links = [...navLinks.querySelectorAll('a[href^="#"]')];
  const sections = links
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  let spyQueued = false;
  const updateSpy = () => {
    spyQueued = false;
    const line = window.innerHeight / 3;
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    let current = null;
    sections.forEach((s) => { if (s.getBoundingClientRect().top <= line) current = s; });
    if (atBottom) current = sections[sections.length - 1];
    links.forEach((a) => {
      if (current && a.getAttribute('href') === `#${current.id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    moveIndicator();
  };

  // One underline that slides between links instead of each link drawing its own
  const indicator = document.createElement('span');
  indicator.className = 'nav-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  navLinks.append(indicator);
  navLinks.classList.add('has-indicator');
  function moveIndicator() {
    const active = links.find((a) => a.hasAttribute('aria-current'));
    if (!active) { indicator.style.opacity = '0'; return; }
    const x = active.offsetLeft;
    const y = active.offsetTop + active.offsetHeight - 1;
    indicator.style.transform = `translate(${x}px, ${y}px) scaleX(${active.offsetWidth / 100})`;
    indicator.style.opacity = '1';
  }
  window.addEventListener('scroll', () => {
    if (!spyQueued) { spyQueued = true; requestAnimationFrame(updateSpy); }
  }, { passive: true });
  window.addEventListener('resize', updateSpy);
  updateSpy();
  // Start sliding only after the first placement, and re-measure once fonts load
  requestAnimationFrame(() => indicator.classList.add('is-ready'));
  if (document.fonts) document.fonts.ready.then(moveIndicator);

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
    const stepCards = [...document.querySelectorAll('.steps .step')];
    const targets = document.querySelectorAll(
      '.section-head, .project, .steps .step, .experience-main, .about-head, .about-text, .contact-panel'
    );
    // Items that come into view together rise one after another, 80ms apart, in reading order
    const revealer = new IntersectionObserver((entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left))
        .forEach((entry, i) => {
          // The four steps always rise in order, 90ms apart
          const step = stepCards.indexOf(entry.target);
          entry.target.style.setProperty('--reveal-delay', `${(step >= 0 ? step * 0.09 : i * 0.08)}s`);
          entry.target.classList.add('is-visible');
          revealer.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach((el) => {
      el.classList.add('reveal');
      revealer.observe(el);
    });
    // Draw the How I work connector once the steps are on screen
    const steps = document.querySelector('.steps');
    if (steps) {
      const lineObserver = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        steps.classList.add('is-drawn');
        lineObserver.disconnect();
      }, { threshold: 0.5 });
      lineObserver.observe(steps);
    }
  } else {
    document.documentElement.classList.remove('motion');
  }

  // Key figures count up once when they come into view; only the number changes,
  // and the text ends exactly as written.
  if (motionOK && 'IntersectionObserver' in window) {
    const counter = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        counter.unobserve(entry.target);
        const el = entry.target;
        const text = el.textContent;
        const match = text.match(/\d+(\.\d+)?/);
        if (!match) return;
        const target = parseFloat(match[0]);
        const before = text.slice(0, match.index);
        const after = text.slice(match.index + match[0].length);
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / 600, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = t < 1 ? before + Math.round(target * eased) + after : text;
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('.project-stat-num').forEach((el) => counter.observe(el));
  }

  // Desktop only: the contact glow follows the cursor
  const panel = document.querySelector('.contact-panel');
  if (motionOK && panel) {
    const pointerDesktop = window.matchMedia('(min-width: 961px) and (hover: hover) and (pointer: fine)');
    let glowFrame = 0;
    const rest = () => {
      // Resting spot: the top-right corner, where the glow sits without a mouse
      panel.style.setProperty('--gx', `${panel.offsetWidth - 70}px`);
      panel.style.setProperty('--gy', '50px');
    };
    const setup = () => {
      panel.classList.toggle('glow-follow', pointerDesktop.matches);
      if (pointerDesktop.matches) rest();
    };
    setup();
    pointerDesktop.addEventListener('change', setup);
    window.addEventListener('resize', () => { if (pointerDesktop.matches) rest(); });
    panel.addEventListener('pointermove', (e) => {
      if (!pointerDesktop.matches || glowFrame) return;
      glowFrame = requestAnimationFrame(() => {
        glowFrame = 0;
        const r = panel.getBoundingClientRect();
        panel.style.setProperty('--gx', `${e.clientX - r.left}px`);
        panel.style.setProperty('--gy', `${e.clientY - r.top}px`);
      });
    });
    panel.addEventListener('pointerleave', () => { if (pointerDesktop.matches) rest(); });
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

  // Desktop only: the photo drifts a few pixels with the mouse
  const hero = document.querySelector('.hero');
  const person = document.querySelector('.hero-person');
  const fineDesktop = window.matchMedia('(min-width: 961px) and (pointer: fine)');
  if (motionOK && hero && person) {
    let frame = 0;
    const clamp = (v) => Math.max(-0.5, Math.min(0.5, v));
    const setTilt = (x, y) => {
      person.style.setProperty('--px', (x * 14).toFixed(2));
      person.style.setProperty('--py', (y * 14).toFixed(2));
    };
    window.addEventListener('mousemove', (e) => {
      if (!fineDesktop.matches || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = hero.getBoundingClientRect();
        if (e.clientY > r.bottom) { setTilt(0, 0); return; }
        setTilt(clamp((e.clientX - r.left) / r.width - 0.5), clamp((e.clientY - r.top) / r.height - 0.5));
      });
    }, { passive: true });
    document.addEventListener('mouseleave', () => setTilt(0, 0));
  }

  document.getElementById('year').textContent = new Date().getFullYear();
})();
