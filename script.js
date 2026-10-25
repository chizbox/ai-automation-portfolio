(() => {
  const header = document.querySelector('.site-header');
  const navLinks = document.getElementById('nav-links');

  // Highlight the nav link for the section in view: the last section whose top has
  // passed the line just under the sticky header (header height + 24px, the same
  // offset anchors land on), or the last one at page bottom.
  const readingLine = () => header.offsetHeight + 24 + 2; // 2px slack for sub-pixel layout
  const links = [...navLinks.querySelectorAll('a[href^="#"]')];
  const sections = links
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  // Soft shadow under the sticky nav once the page has scrolled more than 8px
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  let spyQueued = false;
  const updateSpy = () => {
    spyQueued = false;
    const line = readingLine();
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    let current = null;
    sections.forEach((s) => { if (s.getBoundingClientRect().top <= line) current = s; });
    if (atBottom) current = sections[sections.length - 1];
    links.forEach((a) => {
      if (current && a.getAttribute('href') === `#${current.id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };

  window.addEventListener('scroll', () => {
    if (!spyQueued) { spyQueued = true; requestAnimationFrame(updateSpy); }
  }, { passive: true });
  window.addEventListener('resize', updateSpy);
  updateSpy();

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
    // together rise in reading order, 80ms apart (the three strip pillars 100ms apart).
    const heads = '.section-head, .services-intro, .experience-main, .contact-inner';
    const cards = '.strip-item, .project, .service-list > li, .steps .step, .experience-card';
    const revealer = new IntersectionObserver((entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left))
        .forEach((entry, i) => {
          const el = entry.target;
          revealer.unobserve(el);
          const gap = el.classList.contains('strip-item') ? 100 : 80;
          const delay = el.matches(cards) ? i * gap : 0;
          el.style.setProperty('--reveal-delay', `${delay}ms`);
          el.classList.add('is-visible');
          // Once settled, drop the reveal styles so hover lifts respond without the delay
          const settle = el.classList.contains('strip-item') ? 900 : 550;
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

    // How I work: the connecting line draws once, then the step numbers fade in
    const steps = document.querySelector('.steps');
    if (steps) {
      const lineObserver = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        steps.classList.add('is-drawn');
        lineObserver.disconnect();
      }, { threshold: 0.15 });
      lineObserver.observe(steps);
    }

    // Metric numbers count up once as their card comes into view. Only the digits
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
    // Measure once the web fonts are in, so the held width is the real one
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => document.querySelectorAll('.metric-num').forEach((el) => {
      const text = el.textContent;
      const match = text.match(/\d+(\.\d+)?/);
      if (!match) return;
      const before = text.slice(0, match.index);
      const after = text.slice(match.index + match[0].length);
      // Hold the final width, then start from zero (the cards are still hidden below the fold)
      el.style.minWidth = `${el.getBoundingClientRect().width}px`;
      el.textContent = `${before}0${after}`;
      el.countUp = { el, text, before, after, target: parseFloat(match[0]) };
      counter.observe(el);
    }));

    // Thumbnail workflow nodes: the 6s loop only runs while its card is on screen
    const flows = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const flow = entry.target.querySelector('.media-flow');
        if (flow) flow.classList.toggle('is-live', entry.isIntersecting);
      });
    });
    document.querySelectorAll('.project').forEach((card) => flows.observe(card));
  }

  /* ------------------------------------------------------------------------
     Automation in action, feature 2: "Watch it run" demo in Project 01.
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
