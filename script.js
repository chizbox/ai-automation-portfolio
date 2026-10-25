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

  /* ------------------------------------------------------------------------
     Automation in action, feature 1: small looping workflows (hero and each
     project card). A dot runs along the straight wire; each node pulses and
     gets a tick as the dot reaches it. 5.5s of motion, then a 1.5s pause.
     Each one runs only while it is on screen. Without motion they stay in
     their finished state (all nodes ticked).
     ------------------------------------------------------------------------ */
  const miniFlows = document.querySelectorAll('.mini-flow');
  if (motionOK && miniFlows.length && 'IntersectionObserver' in window) {
    const RUN = 5500;
    const CYCLE = RUN + 1500;
    const HOLD = 800; // the last node stays ticked this long before the reset
    const STEP = 44; // distance between node centres in the SVG
    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    const flows = [...miniFlows].map((el) => {
      const nodes = [...el.querySelectorAll('.mini-flow-node')];
      el.classList.add('is-live');
      return { el, nodes, dot: el.querySelector('.mini-flow-dot'), leg: (RUN - HOLD) / (nodes.length - 1), origin: 0, paused: -600, on: false, x: -1 };
    });
    let frame = 0;
    const render = (now) => {
      frame = 0;
      flows.forEach((f) => {
        if (!f.on) return;
        const elapsed = now - f.origin;
        const t = elapsed < 0 ? -1 : elapsed % CYCLE;
        // Each leg: a short wait on the node, then the eased move to the next one
        const legs = f.nodes.length - 1;
        const i = Math.min(Math.floor(Math.max(t, 0) / f.leg), legs);
        const within = i < legs ? (Math.max(t, 0) - i * f.leg) / f.leg : 0;
        const x = 18 + STEP * (i + (within < 0.25 ? 0 : easeInOut((within - 0.25) / 0.75)));
        if (x !== f.x) { f.x = x; f.dot.setAttribute('transform', `translate(${x.toFixed(1)} 20)`); }
        f.dot.classList.toggle('is-on', t >= 0 && t < RUN - 300);
        f.nodes.forEach((node, n) => {
          const done = t >= n * f.leg && t < RUN;
          if (node.classList.contains('is-done') !== done) node.classList.toggle('is-done', done);
        });
      });
      if (flows.some((f) => f.on)) frame = requestAnimationFrame(render);
    };
    const watcher = new IntersectionObserver((entries) => {
      const now = performance.now();
      entries.forEach((entry) => {
        const f = flows.find((item) => item.el === entry.target);
        if (entry.isIntersecting && !f.on) {
          f.on = true;
          f.origin = now - f.paused;
        } else if (!entry.isIntersecting && f.on) {
          f.on = false;
          f.paused = now - f.origin;
        }
      });
      if (!frame && flows.some((f) => f.on)) frame = requestAnimationFrame(render);
    });
    flows.forEach((f) => watcher.observe(f.el));
  }

  /* ------------------------------------------------------------------------
     Automation in action, feature 2: "Watch it run" demo in Project 01.
     Plays once when it scrolls into view: the email slides in, the five nodes
     light up in turn, the new row lands in the sheet and the timer counts to
     ~30 sec. Replay runs it again. Without motion it shows the finished state.
     ------------------------------------------------------------------------ */
  const demo = document.querySelector('.project-demo');
  if (motionOK && demo && 'IntersectionObserver' in window) {
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

  /* ------------------------------------------------------------------------
     Automation in action, feature 3: the page as a workflow (1024px and up).
     A thin line in the left gutter with one node per section; a dot moves
     down it with scroll and the current section's node fills. Section tops
     are measured only on resize, so scrolling reads nothing but scrollY.
     ------------------------------------------------------------------------ */
  const wideScreen = window.matchMedia('(min-width: 1024px)');
  if (sections.length > 1) {
    const LINE_TOP = 20;
    const LINE_GAP = 240 / (sections.length - 1);
    const rail = document.createElement('div');
    rail.className = 'flowline';
    rail.setAttribute('aria-hidden', 'true');
    const railNodes = sections.map((s, i) => {
      const a = document.createElement('a');
      a.className = 'flowline-node';
      a.href = `#${s.id}`;
      a.tabIndex = -1;
      a.style.top = `${LINE_TOP + i * LINE_GAP}px`;
      const tip = document.createElement('span');
      tip.className = 'flowline-tip';
      tip.textContent = links.find((l) => l.getAttribute('href') === `#${s.id}`).textContent;
      a.append(tip);
      rail.append(a);
      return a;
    });
    const railDot = document.createElement('span');
    railDot.className = 'flowline-dot';
    rail.append(railDot);
    document.body.append(rail);

    let marks = [];
    let lastLine = 0;
    let railQueued = false;
    const measure = () => {
      if (!wideScreen.matches) return;
      const offset = window.innerHeight / 3;
      // The reading line can go no lower than this, so later sections count as reached there
      lastLine = document.documentElement.scrollHeight - window.innerHeight + offset;
      marks = sections.map((s) => Math.min(s.getBoundingClientRect().top + window.scrollY, lastLine - 1));
      marks[marks.length - 1] = Math.min(marks[marks.length - 1], lastLine);
      updateRail();
    };
    function updateRail() {
      railQueued = false;
      if (!wideScreen.matches || !marks.length) return;
      const y = window.scrollY + window.innerHeight / 3;
      let current = -1;
      marks.forEach((m, i) => { if (y >= m) current = i; });
      if (y >= lastLine - 2) current = marks.length - 1;
      let pos = LINE_TOP;
      if (current >= 0) {
        const next = marks[current + 1];
        const share = next > marks[current] ? Math.min(Math.max((y - marks[current]) / (next - marks[current]), 0), 1) : 0;
        pos = LINE_TOP + (current + (next === undefined ? 0 : share)) * LINE_GAP;
      }
      railDot.style.transform = `translateY(${pos.toFixed(1)}px)`;
      railNodes.forEach((n, i) => n.classList.toggle('is-current', i === current));
      rail.classList.toggle('is-shown', y >= marks[0] - 120); // appears as Projects nears the reading line
    }
    window.addEventListener('scroll', () => {
      if (!railQueued) { railQueued = true; requestAnimationFrame(updateRail); }
    }, { passive: true });
    window.addEventListener('resize', measure);
    wideScreen.addEventListener('change', measure);
    // Opening "How it's built" or loading images changes section positions
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
    document.addEventListener('toggle', measure, true);
    measure();
  }

  document.getElementById('year').textContent = new Date().getFullYear();
})();
