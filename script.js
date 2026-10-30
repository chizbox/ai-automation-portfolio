(() => {
  const header = document.querySelector('.site-header');
  const navLinks = document.getElementById('nav-links');

  const links = [...navLinks.querySelectorAll('a[href^="#"]')];
  const sections = links
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  // Phones and tablets: the links fold into a menu behind the toggle
  const toggle = header.querySelector('.nav-toggle');
  const menu = document.getElementById('nav-menu');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', () => setMenu(false));

  // A shadow under the frosted header once the page has scrolled
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Highlight a nav link only while its own section crosses a band 40-50% down the
  // viewport. Sections without a link (Why automation, Contact) clear the highlight.
  if ('IntersectionObserver' in window) {
    const inBand = new Set();
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) inBand.add(entry.target);
        else inBand.delete(entry.target);
      });
      const current = sections.find((s) => inBand.has(s));
      links.forEach((a) => {
        if (current && a.getAttribute('href') === `#${current.id}`) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));
  }

  // Back to top: scroll the window itself (a sticky header can't be a scroll target)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('a[href="#top"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      history.replaceState(null, '', location.pathname + location.search);
    });
  });

  // "How it's built": with JavaScript and <dialog> support, each card's folded
  // details open in one shared panel instead, so the card and its neighbours
  // never resize. Without either, the <details> fold stays as it is.
  const folds = document.querySelectorAll('.project-more');
  if (folds.length && typeof HTMLDialogElement === 'function') {
    const dialog = document.createElement('dialog');
    dialog.className = 'project-dialog';
    dialog.setAttribute('aria-labelledby', 'project-dialog-title');
    dialog.innerHTML = `
      <div class="dialog-head">
        <div>
          <p class="dialog-kicker">How it's built</p>
          <h2 id="project-dialog-title"></h2>
        </div>
        <button class="dialog-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="dialog-body"></div>`;
    document.body.append(dialog);
    const title = dialog.querySelector('#project-dialog-title');
    const body = dialog.querySelector('.dialog-body');
    let opener = null;

    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    // The panel's content fills the dialog box, so a click that lands on the
    // dialog itself is on the dimmed backdrop: close then too
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      body.replaceChildren();
      if (opener) opener.focus();
    });

    folds.forEach((fold) => {
      const card = fold.closest('.project');
      const name = fold.dataset.title || card.querySelector('.project-label').textContent;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project-more-btn';
      button.setAttribute('aria-haspopup', 'dialog');
      button.innerHTML = 'How it\'s built<span aria-hidden="true"> →</span>';
      button.addEventListener('click', () => {
        opener = button;
        title.textContent = name;
        body.replaceChildren(fold.querySelector('.project-details').cloneNode(true));
        dialog.showModal();
        body.scrollTop = 0;
      });
      fold.replaceWith(button);
    });
  }

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

  // Motion runs only when the visitor hasn't asked for reduced motion; otherwise
  // everything stays in its final state (the CSS hides nothing in that case).
  const motionOK = !reduceMotion.matches && 'IntersectionObserver' in window;

  if (motionOK) {
    // Scroll reveals, once each. Headings rise on their own; cards that enter view
    // together rise in reading order, 80ms apart.
    const heads = '.section-head, .why-head, .about-main, .contact-panel';
    const cards = '.project, .service-list > li, .why-item, .steps .step, .strengths';
    const revealer = new IntersectionObserver((entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left))
        .forEach((entry, i) => {
          const el = entry.target;
          revealer.unobserve(el);
          const gap = 80;
          const delay = el.matches(cards) ? i * gap : 0;
          el.style.setProperty('--reveal-delay', `${delay}ms`);
          el.classList.add('is-visible');
          // Once settled, drop the reveal styles so hover lifts respond without the delay
          const settle = 550;
          setTimeout(() => {
            el.classList.remove('reveal', 'is-visible');
            el.style.removeProperty('--reveal-delay');
          }, delay + settle);
        });
    }, { threshold: 0.15 });
    document.querySelectorAll(`${heads}, ${cards}`).forEach((el) => {
      el.classList.add('reveal');
      revealer.observe(el);
    });

    // Metric numbers count up once as their card comes into view. The HTML keeps the
    // final values, so without JS (or for a crawler) nothing reads "0". Only the digits
    // change ("~", "sec", "Up to" stay put), the width is held so nothing shifts,
    // and the text ends exactly as written. "Seconds" has no digits and is left alone.
    const counter = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        counter.unobserve(entry.target);
        const { el, text, before, after, target } = entry.target.countUp;
        // Hero stats wait for their place in the intro (about 1.3s after load)
        const wait = el.classList.contains('stat-num') ? Math.max(0, 1300 - performance.now()) : 0;
        const start = performance.now() + wait;
        const tick = (now) => {
          const t = Math.min(Math.max((now - start) / 900, 0), 1);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = t < 1 ? before + Math.round(target * eased) + after : text;
          if (t < 1) requestAnimationFrame(tick);
          else el.style.removeProperty('min-width');
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    // Zero a number only just before it scrolls into view (and once the web fonts are
    // in, so the held width is the real one); everything further down keeps its value.
    const armer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        armer.unobserve(entry.target);
        const el = entry.target;
        const text = el.textContent;
        const match = text.match(/\d+(\.\d+)?/);
        if (!match) return;
        const before = text.slice(0, match.index);
        const after = text.slice(match.index + match[0].length);
        el.style.minWidth = `${el.getBoundingClientRect().width}px`;
        el.textContent = `${before}0${after}`;
        el.countUp = { el, text, before, after, target: parseFloat(match[0]) };
        counter.observe(el);
      });
    }, { rootMargin: '0px 0px 20% 0px' });
    (document.fonts ? document.fonts.ready : Promise.resolve())
      .then(() => document.querySelectorAll('.metric-num, .stat-num').forEach((el) => armer.observe(el)));
  }

  // Hero parallax (mouse, desktop only): the photo and the glow behind it ease a few
  // pixels toward the cursor. Uses the independent `translate` property, so the
  // photo's float animation is untouched, and stops when it has settled.
  const hero = document.getElementById('hero');
  const photo = hero && hero.querySelector('.hero-photo');
  const glow = hero && hero.querySelector('.photo-glow');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (photo && glow && finePointer.matches && !reduceMotion.matches) {
    let tx = 0, ty = 0, x = 0, y = 0, frame = 0;
    const render = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      photo.style.translate = `${(x * 8).toFixed(2)}px ${(y * 6).toFixed(2)}px`;
      glow.style.translate = `${(x * 22).toFixed(2)}px ${(y * 16).toFixed(2)}px`;
      frame = (Math.abs(tx - x) > 0.002 || Math.abs(ty - y) > 0.002) ? requestAnimationFrame(render) : 0;
    };
    const kick = () => { if (!frame) frame = requestAnimationFrame(render); };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      kick();
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
  }

})();
