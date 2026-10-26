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

  // Floating booking button: shown once the hero has scrolled out of view, and
  // tucked away again while the contact section (with its own button) is on screen
  const floatCta = document.querySelector('.float-cta');
  const hero = document.getElementById('hero');
  const contact = document.getElementById('contact');
  if (floatCta && hero && 'IntersectionObserver' in window) {
    let heroVisible = true;
    let contactVisible = false;
    const update = () => {
      const show = !heroVisible && !contactVisible;
      floatCta.classList.toggle('is-shown', show);
      floatCta.setAttribute('aria-hidden', String(!show));
      if (show) floatCta.removeAttribute('tabindex');
      else floatCta.setAttribute('tabindex', '-1');
    };
    new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; update(); }).observe(hero);
    if (contact) new IntersectionObserver(([entry]) => { contactVisible = entry.isIntersecting; update(); }).observe(contact);
  }

  // Highlight a nav link only while its own section crosses a band 40-50% down the
  // viewport. Sections without a link (Services, Contact) clear the highlight.
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
    const heads = '.section-head, .about-main, .contact-panel, .project-demo';
    const cards = '.project, .service-list > li, .steps .step, .strengths';
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
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / 900, 1);
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
      .then(() => document.querySelectorAll('.metric-num').forEach((el) => armer.observe(el)));
  }

  /* ------------------------------------------------------------------------
     "Watch it run" demo under the project cards.
     Plays once when it scrolls into view: the email slides in, the five nodes
     light up in turn, the new row lands in the sheet and the timer counts to
     ~30 sec. Replay runs it again. Without motion it shows the finished state.
     ------------------------------------------------------------------------ */
  const demo = document.querySelector('.project-demo');
  if (motionOK && demo) {
    const replay = demo.querySelector('.demo-replay');
    const email = demo.querySelector('[data-demo="email"]');
    const demoNodes = [...demo.querySelectorAll('.demo-node')];
    const row = demo.querySelector('[data-demo="row"]');
    const timer = demo.querySelector('[data-demo="timer"]');
    const finalTime = timer.textContent;
    let pending = [];
    let countFrame = 0;

    const clear = () => {
      pending.forEach(clearTimeout);
      pending = [];
      cancelAnimationFrame(countFrame);
      email.classList.remove('is-in');
      demoNodes.forEach((n) => n.classList.remove('is-on'));
      row.classList.remove('is-in');
      timer.textContent = '0 sec';
    };
    const play = (delay) => {
      const at = (ms, fn) => pending.push(setTimeout(fn, delay + ms));
      const ROW_AT = 3050;
      clear();
      // Replay stays in place (and keeps focus) while a replay runs
      replay.setAttribute('aria-disabled', 'true');
      demo.classList.add('is-armed');
      at(0, () => email.classList.add('is-in'));
      demoNodes.forEach((n, i) => at(700 + i * 450, () => n.classList.add('is-on')));
      at(ROW_AT, () => row.classList.add('is-in'));
      at(0, () => {
        const start = performance.now();
        const count = (now) => {
          const t = Math.min((now - start) / ROW_AT, 1);
          timer.textContent = t < 1 ? `${Math.round(30 * t)} sec` : finalTime;
          if (t < 1) countFrame = requestAnimationFrame(count);
        };
        countFrame = requestAnimationFrame(count);
      });
      at(ROW_AT + 500, () => {
        replay.hidden = false;
        replay.removeAttribute('aria-disabled');
      });
    };

    demo.classList.add('is-armed');
    clear();
    const demoObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      demoObserver.disconnect();
      play(150);
    }, { threshold: 0.4 });
    demoObserver.observe(demo);
    // Give the earlier state time to fade out before replaying
    replay.addEventListener('click', () => {
      if (replay.getAttribute('aria-disabled') !== 'true') play(500);
    });
  }

})();
