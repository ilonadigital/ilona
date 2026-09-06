(() => {
  'use strict';
  const body = document.body;
  const menu = document.getElementById('mobile-nav');
  const menuToggle = document.querySelector('.menu-toggle');
  const pageContent = [document.getElementById('main'), document.querySelector('.site-footer')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let previousDialogTrigger = null;

  function syncScrollLock() {
    body.classList.toggle('dialog-open', !!document.querySelector('dialog[open]'));
  }

  function setMenu(open, restoreFocus = false) {
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    body.classList.toggle('menu-open', open);
    pageContent.forEach(element => { element.inert = open; });
    if (open) menu.querySelector('a').focus({ preventScroll: true });
    else if (restoreFocus) menuToggle.focus({ preventScroll: true });
  }

  menuToggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    setMenu(false);
    const target = link.hash && document.querySelector(link.hash);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
  }));
  document.querySelectorAll('.brand, .header-contact').forEach(link => link.addEventListener('click', () => {
    if (!menu.hidden) setMenu(false);
  }));
  document.addEventListener('keydown', event => {
    if (menu.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); setMenu(false, true); return; }
    if (event.key !== 'Tab') return;
    const focusable = [menuToggle, ...menu.querySelectorAll('a')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  const briefDialog = document.getElementById('brief-dialog');
  const resultDialog = document.getElementById('result-dialog');
  const isPlainClick = event => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

  document.querySelectorAll('.brief-trigger').forEach(link => link.addEventListener('click', event => {
    if (!isPlainClick(event) || typeof briefDialog.showModal !== 'function') return;
    event.preventDefault();
    previousDialogTrigger = link;
    const context = document.getElementById('service-context');
    context.textContent = link.dataset.service || '';
    context.hidden = !link.dataset.service;
    const frame = document.getElementById('brief-frame');
    if (!frame.hasAttribute('src')) frame.src = frame.dataset.src;
    briefDialog.showModal();
    syncScrollLock();
  }));

  document.querySelectorAll('.result-image-link').forEach(link => link.addEventListener('click', event => {
    if (!isPlainClick(event) || typeof resultDialog.showModal !== 'function') return;
    event.preventDefault();
    previousDialogTrigger = event.currentTarget;
    const source = link.querySelector('img');
    const image = resultDialog.querySelector('img');
    image.src = link.href;
    image.alt = source.alt;
    image.width = source.width;
    image.height = source.height;
    resultDialog.setAttribute('aria-label', link.getAttribute('aria-label'));
    resultDialog.showModal();
    resultDialog.scrollTop = 0;
    syncScrollLock();
  }));

  [briefDialog, resultDialog].forEach(dialog => {
    dialog.querySelector('button').addEventListener('click', () => dialog.close());
    let pointerStartedOutside = false;
    const isOutside = event => {
      const box = dialog.getBoundingClientRect();
      return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
    };
    dialog.addEventListener('pointerdown', event => { pointerStartedOutside = event.target === dialog && isOutside(event); });
    dialog.addEventListener('click', event => {
      if (pointerStartedOutside && event.target === dialog && isOutside(event)) dialog.close();
      pointerStartedOutside = false;
    });
    dialog.addEventListener('close', () => {
      syncScrollLock();
      previousDialogTrigger?.focus({ preventScroll: true });
      previousDialogTrigger = null;
    });
  });

  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06 });
    document.querySelectorAll('.reveal').forEach(element => {
      element.classList.add('is-ready');
      revealObserver.observe(element);
    });
    reduceMotion.addEventListener('change', event => {
      if (event.matches) {
        revealObserver.disconnect();
        document.querySelectorAll('.reveal').forEach(element => element.classList.add('is-visible'));
      }
    });
  }

  // Two equal groups make -50% -> 0 a seamless left-to-right loop.
  const marquee = document.getElementById('client-marquee');
  const marqueeTrack = marquee.querySelector('.client-track');
  const logoSet = marquee.querySelector('.client-logo-set');
  const marqueeToggle = document.querySelector('.marquee-toggle');
  const repeatedLogos = logoSet.cloneNode(true);
  repeatedLogos.setAttribute('aria-hidden', 'true');
  repeatedLogos.removeAttribute('aria-label');
  repeatedLogos.querySelectorAll('img').forEach(image => {
    image.alt = '';
    image.loading = 'eager';
  });
  marqueeTrack.append(repeatedLogos);
  let marqueePaused = false;
  let marqueeInView = true;
  function syncMarquee() {
    marquee.classList.toggle('is-enhanced', !reduceMotion.matches);
    marquee.classList.toggle('is-paused', marqueePaused || document.hidden || !marqueeInView);
    marqueeToggle.hidden = reduceMotion.matches;
    marqueeToggle.setAttribute('aria-pressed', String(marqueePaused));
    marqueeToggle.querySelector('span').textContent = marqueePaused ? 'Resume logos' : 'Pause logos';
    marqueeToggle.querySelector('use').setAttribute('href', marqueePaused ? '#play' : '#pause');
  }
  marqueeToggle.addEventListener('click', () => { marqueePaused = !marqueePaused; syncMarquee(); });
  reduceMotion.addEventListener('change', syncMarquee);
  document.addEventListener('visibilitychange', syncMarquee);
  if ('IntersectionObserver' in window) {
    const marqueeObserver = new IntersectionObserver(entries => {
      marqueeInView = entries[0].isIntersecting;
      syncMarquee();
    }, { rootMargin: '150px' });
    marqueeObserver.observe(marquee);
  }
  syncMarquee();

  // Hover is decorative. Native details keep all content accessible by tap or keyboard.
  const hoverDevice = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 901px) and (min-height: 600px)');
  const expertiseItems = [...document.querySelectorAll('.expertise-item')];
  const expertisePreview = document.querySelector('.expertise-preview');
  const previewImage = expertisePreview.querySelector('.preview-image');
  const previewTitle = expertisePreview.querySelector('.preview-title');
  const previewTags = expertisePreview.querySelector('.preview-tags');
  let activeExpertise = null;
  let previewFrame = 0;
  let cursorX = 0, cursorY = 0, previewX = 0, previewY = 0;

  function hideExpertisePreview() {
    activeExpertise = null;
    expertisePreview.classList.remove('is-visible');
    window.cancelAnimationFrame(previewFrame);
    previewFrame = 0;
  }
  function previewPosition() {
    const width = expertisePreview.offsetWidth;
    const height = expertisePreview.offsetHeight;
    const gap = 32;
    let x = cursorX + gap;
    if (x + width > window.innerWidth - 20) x = cursorX - width - gap;
    return {
      x: Math.max(20, Math.min(x, window.innerWidth - width - 20)),
      y: Math.max(100, Math.min(cursorY - height * .48, window.innerHeight - height - 20))
    };
  }
  function animateExpertisePreview() {
    previewFrame = 0;
    if (!activeExpertise) return;
    const target = previewPosition();
    const dx = target.x - previewX;
    const dy = target.y - previewY;
    previewX += dx * .19;
    previewY += dy * .19;
    expertisePreview.style.transform = `translate3d(${previewX.toFixed(2)}px,${previewY.toFixed(2)}px,0)`;
    expertisePreview.style.setProperty('--preview-tilt', `${Math.max(-5, Math.min(5, dx * .025 - 2)).toFixed(2)}deg`);
    if (Math.abs(dx) + Math.abs(dy) > .2) previewFrame = window.requestAnimationFrame(animateExpertisePreview);
  }
  function queueExpertisePreview(event) {
    cursorX = event.clientX;
    cursorY = event.clientY;
    if (!previewFrame) previewFrame = window.requestAnimationFrame(animateExpertisePreview);
  }
  expertiseItems.forEach(item => {
    const summary = item.querySelector('summary');
    function showPreview(event) {
      if (event.pointerType !== 'mouse' || !hoverDevice.matches || reduceMotion.matches || item.open || body.classList.contains('menu-open') || document.querySelector('dialog[open]')) return;
      const sourceImage = item.querySelector('.service-image');
      previewImage.src = sourceImage.src;
      previewImage.width = sourceImage.width;
      previewImage.height = sourceImage.height;
      previewImage.classList.toggle('is-logo', sourceImage.classList.contains('service-image-logo'));
      previewTitle.textContent = item.querySelector('h3').textContent;
      previewTags.replaceChildren(...[...item.querySelectorAll('.service-tags li')].map(tag => tag.cloneNode(true)));
      cursorX = event.clientX;
      cursorY = event.clientY;
      const target = previewPosition();
      previewX = target.x;
      previewY = target.y;
      activeExpertise = item;
      expertisePreview.style.transform = `translate3d(${previewX}px,${previewY}px,0)`;
      expertisePreview.classList.add('is-visible');
      queueExpertisePreview(event);
    }
    summary.addEventListener('pointerenter', showPreview);
    summary.addEventListener('pointermove', event => {
      if (activeExpertise === item) queueExpertisePreview(event);
      else showPreview(event);
    });
    summary.addEventListener('pointerleave', hideExpertisePreview);
    summary.addEventListener('pointerdown', hideExpertisePreview);
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      hideExpertisePreview();
      expertiseItems.forEach(other => { if (other !== item) other.open = false; });
    });
  });
  window.addEventListener('scroll', hideExpertisePreview, { passive: true });
  window.addEventListener('resize', hideExpertisePreview, { passive: true });
  window.addEventListener('blur', hideExpertisePreview);
  document.addEventListener('keydown', hideExpertisePreview);
  document.addEventListener('visibilitychange', hideExpertisePreview);
  reduceMotion.addEventListener('change', hideExpertisePreview);
  hoverDevice.addEventListener('change', hideExpertisePreview);

  const navLinks = [...menu.querySelectorAll('a[href^="#"]')];
  const sections = navLinks.map(link => document.querySelector(link.hash));
  const hero = document.querySelector('.hero-story');
  const heroPin = document.querySelector('.hero-pin');
  const about = document.querySelector('.about-section');
  const introStory = document.querySelector('.intro-story');
  const introPanel = document.querySelector('.intro-panel');
  const introWords = [];
  document.querySelectorAll('[data-intro-text]').forEach(line => {
    const words = line.textContent.trim().split(/\s+/);
    const fragment = document.createDocumentFragment();
    words.forEach((word, index) => {
      const span = document.createElement('span');
      span.className = 'intro-word';
      span.textContent = word;
      introWords.push(span);
      fragment.append(span);
      if (index < words.length - 1) fragment.append(document.createTextNode(' '));
    });
    line.replaceChildren(fragment);
  });
  introPanel.classList.add('has-text-reveal');
  const aboutFirst = document.querySelector('[data-parallax="first"]');
  const aboutSecond = document.querySelector('[data-parallax="second"]');
  const contact = document.querySelector('.contact-section');
  const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
  const progress = document.querySelector('.reading-progress');
  let scrollQueued = false;
  function updateScroll() {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0})`;
    let active = null;
    sections.forEach(section => {
      const box = section.getBoundingClientRect();
      if (box.top <= 180 && box.bottom > 180) active = section.id;
    });
    navLinks.forEach(link => {
      if (link.hash === `#${active}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const vp = window.innerHeight;
    const introBox = introStory.getBoundingClientRect();
    let introProgress = 1;
    if (!reduceMotion.matches) {
      const stickyIntro = window.innerWidth > 800 && window.innerHeight > 680;
      const start = vp * (stickyIntro ? .62 : .82);
      const end = stickyIntro ? -(introStory.offsetHeight - introPanel.offsetHeight - 100) : vp * .12;
      introProgress = clamp((start - introBox.top) / Math.max(1, start - end));
    }
    introStory.style.setProperty('--intro-progress', introProgress.toFixed(4));
    introWords.forEach((word, index) => {
      word.style.setProperty('--word-fill', `${(clamp(introProgress * introWords.length - index) * 100).toFixed(1)}%`);
    });
    if (!reduceMotion.matches) {
      const box = hero.getBoundingClientRect();
      const travel = Math.max(1, hero.offsetHeight - heroPin.offsetHeight);
      hero.style.setProperty('--hero-progress', clamp(-box.top / travel).toFixed(4));
      if (window.innerWidth > 800) {
        const aboutBox = about.getBoundingClientRect();
        const drift = clamp((vp - aboutBox.top) / (vp + aboutBox.height));
        aboutFirst.style.setProperty('--photo-drift', `${(drift * -30).toFixed(1)}px`);
        aboutSecond.style.setProperty('--photo-drift', `${(drift * -90).toFixed(1)}px`);
        const contactBox = contact.getBoundingClientRect();
        contact.style.setProperty('--contact-shift', `${((clamp((vp - contactBox.top) / vp) - 1) * 45).toFixed(1)}px`);
      } else {
        aboutFirst.style.removeProperty('--photo-drift');
        aboutSecond.style.removeProperty('--photo-drift');
        contact.style.removeProperty('--contact-shift');
      }
    } else {
      hero.style.setProperty('--hero-progress', '0');
      aboutFirst.style.removeProperty('--photo-drift');
      aboutSecond.style.removeProperty('--photo-drift');
      contact.style.removeProperty('--contact-shift');
    }
    scrollQueued = false;
  }
  function queueScroll() {
    if (!scrollQueued) { scrollQueued = true; window.requestAnimationFrame(updateScroll); }
  }
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll, { passive: true });
  window.addEventListener('load', updateScroll, { once: true });
  reduceMotion.addEventListener('change', queueScroll);
  if (document.fonts?.ready) document.fonts.ready.then(queueScroll);
  updateScroll();
  document.getElementById('copyright-year').textContent = String(new Date().getFullYear());
})();
