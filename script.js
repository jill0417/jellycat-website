/* ============================================
   PAGE DATA
   Defines every section in scroll order.
   pageNumber: which of the 9 chapters it belongs to (for progress bar).
   chapterId:  the id of the first section of that chapter (for nav links).
   ============================================ */

const pages = Array.from(document.querySelectorAll(".page"));

const pageChapterMap = {
  "page-1": 1,
  "page-2": 2,
  "page-3": 3,
  "page-4": 4,
  "page-5": 5,
  "page-5b": 5,
  "page-6": 6,
  "page-6b": 6,
  "page-7": 7,
  "page-7b": 7,
  "page-7c": 7,
  "page-8": 8,
  "page-8b": 8,
  "page-9": 9,
};

/* Returns a page's .reveal steps, sorted by data-step */
function getReveals(pageEl) {
  return Array.from(pageEl.querySelectorAll(".reveal")).sort(
    (a, b) => +a.dataset.step - +b.dataset.step,
  );
}

/* Hide a page's reveal steps so their entrance animation can replay */
function resetReveals(pageEl) {
  /* Hide the steps INSTANTLY (no fade-out flash while the page flips in) */
  pageEl.classList.add("is-resetting");
  getReveals(pageEl).forEach((el) => el.classList.remove("is-revealed"));
  void pageEl.offsetWidth; /* force the reset to apply with transitions off */
  pageEl.classList.remove("is-resetting");
}

/* The chapter (1–9) a section belongs to */
function chapterOf(section) {
  return pageChapterMap[section.id] || getChapterFromClasses(section);
}

/* True when moving between two steps of the same fade sequence (e.g. page 4):
   these cross-dissolve instead of doing the 3D page flip. */
function isFadeStep(a, b) {
  return (
    a.classList.contains("fade-step") &&
    b.classList.contains("fade-step") &&
    chapterOf(a) === chapterOf(b)
  );
}

/* Page-flip sound effect */
const flipSound = new Audio("sounds/flip-book.mp3");
flipSound.volume = 0.5;
let soundMuted = false; /* sound is ON by default */

function playFlipSound() {
  if (soundMuted) return;
  flipSound.currentTime = 0; /* rewind so quick page turns retrigger it */
  flipSound
    .play()
    .catch(() => {}); /* ignore autoplay block before first interaction */
}

function setupVolumeToggle() {
  const btn = document.getElementById("volume-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (!musicStarted) {
      /* First interaction is the button → just turn sound ON */
      startMusic();
      soundMuted = false;
    } else {
      soundMuted = !soundMuted;
    }
    updateVolumeIcon();
    applyMusic(800); /* fade music out/in with the toggle */
  });
  updateVolumeIcon();
}

/* Swap the icon: mute vs on, and light (-w) vs dark (-b) page variant */
function updateVolumeIcon() {
  const icon = document.getElementById("volume-icon");
  if (!icon) return;
  const tone = document.body.classList.contains("dark-nav") ? "w" : "b";
  const state = soundMuted ? "mute" : "volume-up";
  icon.src = "image/" + state + "-" + tone + ".png";
  icon.alt = soundMuted ? "Sound off" : "Sound on";
}

/* ============================================
   BACKGROUND MUSIC
   cozy = default · tense = pages 3 & 4
   Both loop continuously; switching zones only crossfades the volume,
   so the music never restarts when you move between non-tense pages.
   ============================================ */

const cozyMusic = new Audio("sounds/cozy.mp3");
const tenseMusic = new Audio("sounds/tense.mp3");
cozyMusic.loop = true;
tenseMusic.loop = true;
cozyMusic.volume = 0;
tenseMusic.volume = 0;

const MUSIC_VOLUME = 0.3; /* background level (flip sfx is 0.5) */
let musicStarted = false;
let musicMode = "cozy"; /* "cozy" | "tense" */

/* Smoothly ramp an audio element's volume to a target over `ms`,
   using an equal-power curve so a crossfade has no loudness dip */
function fadeAudio(audio, target, ms) {
  if (audio._fade) clearInterval(audio._fade);
  const startVol = audio.volume;
  const diff = target - startVol;
  if (Math.abs(diff) < 0.005) {
    audio.volume = Math.min(1, Math.max(0, target));
    return;
  }
  const steps = Math.max(1, Math.round(ms / 40));
  let i = 0;
  audio._fade = setInterval(() => {
    i++;
    const p = i / steps;
    const eased =
      diff > 0
        ? Math.sin((p * Math.PI) / 2) /* fade in */
        : 1 - Math.cos((p * Math.PI) / 2); /* fade out */
    audio.volume = Math.min(1, Math.max(0, startVol + diff * eased));
    if (i >= steps) {
      audio.volume = Math.min(1, Math.max(0, target));
      clearInterval(audio._fade);
      audio._fade = null;
    }
  }, 40);
}

/* Fade the two tracks to match the current mode + mute state */
function applyMusic(ms) {
  if (!musicStarted) return;
  const dur = ms || 2600; /* long, smooth cozy <-> tense crossfade */
  fadeAudio(
    cozyMusic,
    !soundMuted && musicMode === "cozy" ? MUSIC_VOLUME : 0,
    dur,
  );
  fadeAudio(
    tenseMusic,
    !soundMuted && musicMode === "tense" ? MUSIC_VOLUME : 0,
    dur,
  );
}

/* Switch cozy <-> tense. No-op if unchanged, so the music keeps playing. */
function setMusicMode(mode) {
  if (mode === musicMode) return;
  musicMode = mode;
  applyMusic();
}

/* Browsers block autoplay until the user interacts, so start on first input */
function startMusic() {
  if (musicStarted) return;
  musicStarted = true;
  cozyMusic.play().catch(() => {});
  tenseMusic.play().catch(() => {});
  applyMusic(1200);
}

/* First-visit prompt: the user chooses sound on/off. Their click is also the
   gesture browsers require before any audio is allowed to play. */
function setupSoundPrompt() {
  const prompt = document.getElementById("sound-prompt");
  if (!prompt) return;
  const close = () => prompt.classList.add("is-hidden");

  const withSound = document.getElementById("enter-sound");
  const silent = document.getElementById("enter-silent");

  if (withSound) {
    withSound.addEventListener("click", () => {
      soundMuted = false;
      startMusic();
      updateVolumeIcon();
      close();
    });
  }
  if (silent) {
    silent.addEventListener("click", () => {
      soundMuted = true;
      updateVolumeIcon();
      close();
    });
  }
}

/* Pause the music when the tab/window isn't visible; resume when it's back */
function setupAudioVisibility() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cozyMusic.pause();
      tenseMusic.pause();
    } else if (musicStarted && !soundMuted) {
      cozyMusic.play().catch(() => {});
      tenseMusic.play().catch(() => {});
    }
  });
}

/* Run a swipe that was queued while a transition was still in flight */
function drainPending() {
  if (pendingNav === 0) return;
  const dir = pendingNav;
  pendingNav = 0;
  requestAnimationFrame(() => (dir > 0 ? goForward() : goBackward()));
}

/* ============================================
   STATE
   ============================================ */

let currentIndex = 0;
let isAnimating = false;
let pendingNav = 0; /* a deliberate swipe that arrived mid-flip: -1 back, +1 fwd */
const TOTAL_CHAPTERS = 9;

/* ============================================
   INIT
   ============================================ */

function init() {
  prepareReflection();
  showPage(0, null);
  updateNav(0);
  setupHamburger();
  setupNavLinks();
  setupScrollListener();
  setupKeyListener();
  setupVolumeToggle();
  setupSoundPrompt();
  setupAudioVisibility();
}

/* Move page 9's inline text into data-text and clear it, so it stays hidden
   until the typewriter writes it (prevents a flash of the full text) */
function prepareReflection() {
  document.querySelectorAll("#page-9 .writing-text").forEach((el) => {
    if (!el.dataset.text) {
      el.dataset.text = el.textContent.replace(/\s+/g, " ").trim();
    }
    el.textContent = "";
  });
}

/* ============================================
   SHOW PAGE
   direction: 'forward' | 'backward' | null (no animation on first load)
   ============================================ */

function showPage(newIndex, direction, revealAll = false) {
  const oldPage = pages[currentIndex];
  const newPage = pages[newIndex];

  /* — Reset all pages — */
  pages.forEach((p) => {
    p.classList.remove(
      "is-current",
      "is-next",
      "flip-out-forward",
      "flip-out-backward",
      "is-active",
    );
    p.style.opacity = "0";
    p.style.zIndex = "0";
    p.style.pointerEvents = "none";
  });

  if (direction === null) {
    /* First load — no animation */
    newPage.classList.add("is-current", "is-active");
    newPage.style.opacity = "1";
    newPage.style.zIndex = "10";
    newPage.style.pointerEvents = "auto";
    currentIndex = newIndex;
    triggerPageAnimations(newPage, direction, revealAll);
    return;
  }

  /* Reset the incoming page's steps so they animate in again on re-entry */
  resetReveals(newPage);

  /* Clear page 9's handwriting before it shows, so the full text doesn't flash */
  if (newPage.id === "page-9") prepareReflection();

  /* — Same-chapter fade step (page 4): cross-dissolve, no page flip — */
  if (isFadeStep(oldPage, newPage)) {
    const FADE_DURATION = 600;

    /* New step waits on top at 0; old step sits beneath at full opacity */
    newPage.classList.add("is-current");
    newPage.style.opacity = "0";
    newPage.style.zIndex = "10";
    newPage.style.pointerEvents = "auto";
    oldPage.style.opacity = "1";
    oldPage.style.zIndex = "9";

    /* Lock in the starting opacities before transitioning */
    void document.body.offsetWidth;

    newPage.style.transition = "opacity " + FADE_DURATION + "ms ease";
    oldPage.style.transition = "opacity " + FADE_DURATION + "ms ease";
    newPage.classList.add(
      "is-active",
    ); /* starts the step-5 delayed line clock */
    newPage.style.opacity = "1";
    oldPage.style.opacity = "0";

    isAnimating = true;

    setTimeout(() => {
      oldPage.style.transition = "";
      newPage.style.transition = "";
      oldPage.style.opacity = "0";
      oldPage.style.zIndex = "0";

      currentIndex = newIndex;
      isAnimating = false;

      updateNav(newIndex);
      triggerPageAnimations(newPage, direction, revealAll);
      drainPending();
    }, FADE_DURATION);
    return;
  }

  /* Pre-show the incoming page underneath */
  newPage.classList.add("is-next");
  newPage.style.opacity = "1";
  newPage.style.zIndex = "9";

  /* Animate the outgoing page flipping away */
  const animClass =
    direction === "forward" ? "flip-out-forward" : "flip-out-backward";
  oldPage.classList.add(animClass);
  oldPage.style.opacity = "1";
  oldPage.style.zIndex = "11";

  playFlipSound(); /* page-turn sound, in sync with the flip */

  isAnimating = true;

  const FLIP_DURATION = 800; /* match --flip-duration in CSS */

  setTimeout(() => {
    /* Clean up old page */
    oldPage.classList.remove(animClass);
    oldPage.style.opacity = "0";
    oldPage.style.zIndex = "0";

    /* Settle new page as current */
    newPage.classList.remove("is-next");
    newPage.classList.add("is-current", "is-active");
    newPage.style.zIndex = "10";
    newPage.style.pointerEvents = "auto";

    currentIndex = newIndex;
    isAnimating = false;

    updateNav(newIndex);
    triggerPageAnimations(newPage, direction, revealAll);
    drainPending();
  }, FLIP_DURATION);
}

/* ============================================
   NAVIGATION UPDATES
   ============================================ */

function updateNav(index) {
  const section = pages[index];
  const title = section.dataset.pageTitle || "";
  const sectionId = section.id || "";
  const chapterNumber =
    pageChapterMap[sectionId] || getChapterFromClasses(section);

  document.getElementById("page-title").textContent = title;

  /* Dark-background pages → switch the nav + progress bar to white */
  const darkPages = [3, 4, 9];
  document.body.classList.toggle("dark-nav", darkPages.includes(chapterNumber));
  updateVolumeIcon(); /* switch the -w / -b icon variant to match the page */

  /* Background music: tense piano on pages 3 & 4, cozy lofi elsewhere */
  setMusicMode([3, 4].includes(chapterNumber) ? "tense" : "cozy");

  /* Progress bar */
  const progress = (chapterNumber / TOTAL_CHAPTERS) * 100;
  document
    .getElementById("progress-bar")
    .style.setProperty("--progress", progress + "%");
  document.getElementById("progress-label").textContent =
    chapterNumber + " / " + TOTAL_CHAPTERS;
}

function getChapterFromClasses(section) {
  /* Fallback: read chapter from class like .page-chapter-4 */
  const match = Array.from(section.classList)
    .join(" ")
    .match(/page-chapter-(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

/* ============================================
   PAGE-SPECIFIC ANIMATIONS
   ============================================ */

function triggerPageAnimations(section, direction, revealAll) {
  const reveals = getReveals(section);

  if (reveals.length) {
    if (revealAll) {
      /* Jumped here via the menu → show everything */
      reveals.forEach((el) => el.classList.add("is-revealed"));
    } else {
      /* Entering by scroll (either direction) → show only step 1;
         the rest cascade in gradually as the user keeps scrolling */
      reveals.forEach((el, i) => el.classList.toggle("is-revealed", i === 0));
    }
  }

  if (section.id === "page-9") {
    startReflectionWriting();
  }
}

/* ============================================
   NAVIGATION DECIDERS
   Decide whether a scroll reveals an in-page step or flips the page.
   ============================================ */

/* Forward: reveal the next hidden step, OR flip to the next page */
function goForward() {
  if (isAnimating) return;

  const page = pages[currentIndex];
  const nextHidden = getReveals(page).find(
    (el) => !el.classList.contains("is-revealed"),
  );

  if (nextHidden) {
    nextHidden.classList.add("is-revealed"); /* fade in — NO flip */
    return;
  }

  if (currentIndex < pages.length - 1) {
    showPage(currentIndex + 1, "forward");
  }
}

/* Backward: hide the last revealed step, OR flip to the previous page */
function goBackward() {
  if (isAnimating) return;

  const page = pages[currentIndex];
  const revealed = getReveals(page).filter((el) =>
    el.classList.contains("is-revealed"),
  );

  if (revealed.length > 1) {
    revealed[revealed.length - 1].classList.remove("is-revealed"); /* NO flip */
    return;
  }

  if (currentIndex > 0) {
    showPage(currentIndex - 1, "backward");
  }
}

/* ============================================
   SCROLL HANDLER
   ============================================ */

function setupScrollListener() {
  let inGesture = false; /* are we inside one continuous scroll right now? */
  let endTimer = null; /* fires once the wheel has paused */

  /* — Mouse wheel / trackpad — */
  function handleWheel(e) {
    e.preventDefault();

    /* Ignore only the tiniest scroll noise */
    if (Math.abs(e.deltaY) < 4) return;

    /* A "new gesture" = the first event after a quiet pause.
       Momentum events are continuations, not new gestures. */
    const isNewGesture = !inGesture;
    inGesture = true;

    /* Each event pushes this back. Once events stop for 120ms,
       the next one will count as a brand-new gesture. */
    clearTimeout(endTimer);
    endTimer = setTimeout(() => {
      inGesture = false;
    }, 120);

    if (!isNewGesture) return; /* swallow the momentum tail → no double flip */

    const dir = e.deltaY > 0 ? 1 : -1;

    /* A flip is still running: remember this deliberate swipe and fire it
       the moment the flip lands, so quick successive scrolls aren't lost. */
    if (isAnimating) {
      pendingNav = dir;
      return;
    }

    if (dir > 0) {
      goForward();
    } else {
      goBackward();
    }
  }

  window.addEventListener("wheel", handleWheel, { passive: false });

  /* — Touch swipe — */
  let touchStartY = 0;

  window.addEventListener(
    "touchstart",
    (e) => {
      touchStartY = e.touches[0].clientY;
    },
    { passive: true },
  );

  window.addEventListener(
    "touchend",
    (e) => {
      if (isAnimating) return;
      const delta = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(delta) < 40) return;

      if (delta > 0) {
        goForward();
      } else if (delta < 0) {
        goBackward();
      }
    },
    { passive: true },
  );
}

/* ============================================
   KEYBOARD NAVIGATION
   ============================================ */

function setupKeyListener() {
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") goForward();
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") goBackward();
  });
}

/* ============================================
   HAMBURGER MENU
   ============================================ */

function setupHamburger() {
  const hamburger = document.getElementById("hamburger");
  const menu = document.getElementById("nav-menu");

  /* Create overlay element dynamically */
  const overlay = document.createElement("div");
  overlay.id = "nav-overlay";
  document.body.appendChild(overlay);

  hamburger.addEventListener("click", () => toggleMenu(menu, overlay));
  overlay.addEventListener("click", () => closeMenu(menu, overlay));
}

function toggleMenu(menu, overlay) {
  const isOpen = menu.classList.contains("is-open");
  isOpen ? closeMenu(menu, overlay) : openMenu(menu, overlay);
}

function openMenu(menu, overlay) {
  menu.classList.add("is-open");
  overlay.classList.add("is-open");
}

function closeMenu(menu, overlay) {
  menu.classList.remove("is-open");
  overlay.classList.remove("is-open");
}

/* ============================================
   NAV LINK CLICKS
   ============================================ */

function setupNavLinks() {
  const links = document.querySelectorAll("#nav-menu a");
  const menu = document.getElementById("nav-menu");

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href").replace("#", "");
      const targetIndex = pages.findIndex((p) => p.id === targetId);
      if (targetIndex === -1) return;

      const overlay = document.getElementById("nav-overlay");
      closeMenu(menu, overlay);

      /* Already on this page → just restart it from its first step */
      if (targetIndex === currentIndex) {
        resetReveals(pages[currentIndex]);
        triggerPageAnimations(pages[currentIndex], "forward", false);
        return;
      }

      /* Jump to the page and start it at step 1 (scroll reveals the rest) */
      const direction = targetIndex > currentIndex ? "forward" : "backward";
      showPage(targetIndex, direction, false);
    });
  });
}

/* ============================================
   PAGE 9 — TYPEWRITER / HANDWRITING EFFECT
   ============================================ */

function startReflectionWriting() {
  const lines = document.querySelectorAll("#page-9 .writing-line");
  const CHARS_PER_MS = 45; /* milliseconds per character */

  lines.forEach((line) => {
    const el = line.querySelector(".writing-text");
    /* Use data-text if present, otherwise the text written inside the <p> */
    const fullText = (el.dataset.text || el.textContent)
      .replace(/\s+/g, " ")
      .trim();
    const delay = parseInt(line.dataset.delay, 10) || 0;
    let index = 0;

    /* Reset in case the user navigated back and returned */
    el.textContent = "";
    el.classList.remove("typing");

    setTimeout(() => {
      el.classList.add("typing");

      const interval = setInterval(() => {
        el.textContent = fullText.slice(0, index + 1);
        index++;

        if (index === fullText.length) {
          clearInterval(interval);
          el.classList.remove("typing");

          /* After last line finishes, reveal the closing heart */
          if (line === lines[lines.length - 1]) {
            setTimeout(() => {
              const heart = document.querySelector(".reflection-end-mark");
              if (heart) heart.classList.add("visible");
            }, 800);
          }
        }
      }, CHARS_PER_MS);
    }, delay);
  });
}

/* ============================================
   START
   ============================================ */

document.addEventListener("DOMContentLoaded", init);
