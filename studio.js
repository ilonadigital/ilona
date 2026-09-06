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
    menuToggle.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
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

  document.querySelector('.result-image-link').addEventListener('click', event => {
    if (!isPlainClick(event) || typeof resultDialog.showModal !== 'function') return;
    event.preventDefault();
    previousDialogTrigger = event.currentTarget;
    resultDialog.showModal();
    resultDialog.scrollTop = 0;
    syncScrollLock();
  });

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

  const navLinks = [...menu.querySelectorAll('a[href^="#"]')];
  const sections = navLinks.map(link => document.querySelector(link.hash));
  const hero = document.querySelector('.hero-story');
  const heroPin = document.querySelector('.hero-pin');
  const about = document.querySelector('.about-section');
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
