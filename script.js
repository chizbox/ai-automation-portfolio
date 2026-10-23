(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.getElementById('nav-links');

  // Header border once the page scrolls
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
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

  // Workflow lightbox. Links still open the image directly if JS or <dialog> is unavailable.
  const dialog = document.getElementById('lightbox');
  if (dialog && typeof dialog.showModal === 'function') {
    const img = document.getElementById('lightbox-img');
    const title = document.getElementById('lightbox-title');
    const openLink = document.getElementById('lightbox-open');
    let opener = null;

    document.querySelectorAll('[data-lightbox]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        opener = link;
        const thumb = link.querySelector('img');
        const project = link.closest('.project').querySelector('h3').textContent;
        img.src = link.href;
        img.alt = thumb.alt;
        title.textContent = `${project}: n8n workflow`;
        openLink.href = link.href;
        dialog.showModal();
      });
    });

    document.getElementById('lightbox-close').addEventListener('click', () => dialog.close());
    // Click on the backdrop closes
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      img.removeAttribute('src');
      if (opener) opener.focus();
    });
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

  document.getElementById('year').textContent = new Date().getFullYear();
})();
