/* ══════════════════════════════════════════════════
   COMFORT THEORY — Script
   8 chapters · GSAP page-flip · menu drawer · interactivity
══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ─── Chapters ───────────────────────────────── */
  // Chapters are in REVERSE DOM order — reversing gives cover = index 0
  const chapters = Array.from(document.querySelectorAll('.chapter')).reverse();
  const total    = chapters.length;   // 8

  let current    = 0;
  let isAnimating = false;

  const chapterLabels = [
    'Cover',
    'Introduction',
    'The World Today',
    'Emotional Needs',
    'What is Jellycat',
    'Why Jellycat Works',
    'How It Became Popular',
    'The Deeper Meaning',
    'Reflection',
  ];

  /* ─── UI Elements ────────────────────────────── */
  const progressFill = document.getElementById('progress-fill');
  const pageCurrent  = document.getElementById('page-current');
  const pageTotal    = document.getElementById('page-total');
  const biTitle      = document.getElementById('bi-title');
  const uiPageTitle  = document.getElementById('ui-page-title');

  const menuBtn      = document.getElementById('menu-btn');
  const menuDrawer   = document.getElementById('menu-drawer');
  const menuBackdrop = document.getElementById('menu-backdrop');
  const menuClose    = document.getElementById('menu-close');
  const menuNav      = document.getElementById('menu-nav');

  pageTotal.textContent = total;

  /* ─── Build Menu Items ───────────────────────── */
  chapters.forEach((ch, i) => {
    const btn = document.createElement('button');
    btn.className = 'menu-item' + (i === 0 ? ' active' : '');
    btn.innerHTML = `
      <span class="menu-item-num">${i === 0 ? '✦' : String(i).padStart(2, '0')}</span>
      <span class="menu-item-title">${chapterLabels[i] || `Chapter ${i}`}</span>
      <span class="menu-item-dot"></span>
    `;
    btn.setAttribute('aria-label', `Go to: ${chapterLabels[i]}`);
    btn.addEventListener('click', () => { goTo(i); closeMenu(); });
    menuNav.appendChild(btn);
  });
  const menuItems = menuNav.querySelectorAll('.menu-item');

  /* ─── Menu ───────────────────────────────────── */
  function openMenu() {
    menuDrawer.classList.add('open');
    menuBackdrop.classList.add('open');
    menuDrawer.setAttribute('aria-hidden', 'false');
  }
  function closeMenu() {
    menuDrawer.classList.remove('open');
    menuBackdrop.classList.remove('open');
    menuDrawer.setAttribute('aria-hidden', 'true');
  }

  menuBtn.addEventListener('click', openMenu);
  menuClose.addEventListener('click', closeMenu);
  menuBackdrop.addEventListener('click', closeMenu);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menuDrawer.classList.contains('open')) closeMenu();
  });

  /* ─── Update UI ──────────────────────────────── */
  function updateUI() {
    const pct = total > 1 ? (current / (total - 1)) * 100 : 0;
    progressFill.style.width = pct + '%';
    pageCurrent.textContent  = current + 1;
    biTitle.textContent      = chapterLabels[current] || '';
    if (uiPageTitle) uiPageTitle.textContent = chapterLabels[current] || '';
    menuItems.forEach((m, i) => m.classList.toggle('active', i === current));
  }

  /* ─── Activate Chapter ───────────────────────── */
  function activateChapter(index) {
    chapters.forEach(ch => ch.classList.remove('active'));
    chapters[index].classList.add('active');

    // Animate any stat counters on this chapter
    chapters[index].querySelectorAll('[data-target]').forEach(animateCounter);

    // Notification rain is removed (it was distracting over the dark image)
    if (false && chapters[index].classList.contains('chapter--emotional')) {
      startNotifRain();
    } else {
      stopNotifRain();
    }
  }

  /* ─── GSAP Page Flip ─────────────────────────── */
  function goTo(targetIndex) {
    if (isAnimating || targetIndex === current) return;
    if (targetIndex < 0 || targetIndex >= total) return;

    isAnimating = true;
    const forward = targetIndex > current;

    if (forward) {
      const ch = chapters[current];
      ch.classList.add('flipping');
      gsap.to(ch, {
        rotationY: -180,
        duration: 0.85,
        ease: 'power2.inOut',
        transformOrigin: 'left center',
        onComplete: () => {
          ch.classList.remove('flipping');
          current = targetIndex;
          updateUI();
          activateChapter(current);
          isAnimating = false;
        }
      });
    } else {
      const ch = chapters[targetIndex];
      ch.classList.add('flipping');
      gsap.to(ch, {
        rotationY: 0,
        duration: 0.85,
        ease: 'power2.inOut',
        transformOrigin: 'left center',
        onComplete: () => {
          ch.classList.remove('flipping');
          current = targetIndex;
          updateUI();
          activateChapter(current);
          isAnimating = false;
        }
      });
    }
  }

  /* ─── Wheel ──────────────────────────────────── */
  let wheelAccum = 0;
  window.addEventListener('wheel', e => {
    e.preventDefault();
    if (isAnimating || menuDrawer.classList.contains('open')) return;
    wheelAccum += e.deltaY;
    if (wheelAccum >  60) { goTo(current + 1); wheelAccum = 0; }
    if (wheelAccum < -60) { goTo(current - 1); wheelAccum = 0; }
  }, { passive: false });

  /* ─── Keyboard ───────────────────────────────── */
  document.addEventListener('keydown', e => {
    if (menuDrawer.classList.contains('open')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ')
      { e.preventDefault(); goTo(current + 1); }
    if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')
      { e.preventDefault(); goTo(current - 1); }
  });

  /* ─── Touch ──────────────────────────────────── */
  let touchY = 0;
  window.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', e => {
    if (menuDrawer.classList.contains('open')) return;
    const d = touchY - e.changedTouches[0].clientY;
    if (Math.abs(d) < 40) return;
    d > 0 ? goTo(current + 1) : goTo(current - 1);
  }, { passive: true });

  /* ─── Counter ────────────────────────────────── */
  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min((now - t0) / 1200, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    })(t0);
  }

  /* ─── Notification Rain (emotional chapter) ──── */
  const notifMessages = [
    '🔔 You have 47 new emails',
    '📱 3 people liked your photo',
    '⚡ Breaking News: …',
    '💬 New message from Sarah',
    '📊 Report is ready to review',
    '🛍️ Flash sale ends in 2 hours!',
    '🔴 Live now — Watch this',
    '📅 Meeting in 10 minutes',
    '⭐ New follower request',
    '🔔 96 notifications pending',
    '📧 FWD: RE: RE: Please advise…',
    '💡 Daily reminder: Breathe.',
  ];
  let rainInterval = null;

  function startNotifRain() {
    const container = document.getElementById('notif-rain');
    if (!container || rainInterval) return;

    function drop() {
      const msg    = notifMessages[Math.floor(Math.random() * notifMessages.length)];
      const bubble = document.createElement('div');
      bubble.className = 'notif-bubble';
      bubble.textContent = msg;
      const x   = 5 + Math.random() * 55;
      const dur = 5 + Math.random() * 5;
      const del = Math.random() * 1.5;
      bubble.style.left                = x + '%';
      bubble.style.animationDuration   = dur + 's';
      bubble.style.animationDelay      = del + 's';
      container.appendChild(bubble);
      setTimeout(() => bubble.remove(), (dur + del + 0.5) * 1000);
    }

    for (let i = 0; i < 5; i++) setTimeout(drop, i * 300);
    rainInterval = setInterval(drop, 1200);
  }

  function stopNotifRain() {
    if (!rainInterval) return;
    clearInterval(rainInterval);
    rainInterval = null;
  }

  /* ─── Notification bubble CSS (injected) ────── */
  const rainStyle = document.createElement('style');
  rainStyle.textContent = `
    .notif-rain { position:absolute; inset:0; pointer-events:none; overflow:hidden; z-index:0; }
    .notif-bubble {
      position:absolute; top:-60px;
      background:rgba(255,255,255,0.82); border:1px solid rgba(61,43,31,0.08);
      border-radius:24px; padding:6px 14px;
      font-family:'Nunito',sans-serif; font-size:12px; color:#3D2B1F;
      white-space:nowrap; box-shadow:0 2px 10px rgba(0,0,0,0.06);
      animation: rainFall linear infinite; opacity:.75;
    }
    @keyframes rainFall {
      0%   { transform:translateY(0);             opacity:0;    }
      8%   {                                       opacity:.75;  }
      92%  {                                       opacity:.75;  }
      100% { transform:translateY(calc(100vh+80px)); opacity:0;  }
    }
  `;
  document.head.appendChild(rainStyle);

  /* ─── Init ───────────────────────────────────── */
  chapters.forEach(ch => gsap.set(ch, { rotationY: 0 }));
  updateUI();
  activateChapter(0);

});
