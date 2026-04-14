const root = document.documentElement;
const chips = Array.from(document.querySelectorAll(".project-chip"));
const projectSections = Array.from(document.querySelectorAll("[data-project]"));
const shotCards = Array.from(document.querySelectorAll(".shot-card"));

const lightbox = document.querySelector(".lightbox");
const lightboxImage = document.querySelector(".lightbox-image");
const lightboxCaption = document.querySelector(".lightbox-caption");
const lightboxClose = document.querySelector(".lightbox-close");
const sceneCanvas = document.querySelector(".scene-canvas");
const heroContact = document.querySelector(".hero-contact");
const contactToggle = document.querySelector("[data-contact-toggle]");
const heroContactCard = document.querySelector("#hero-contact-card");

const likeButton = document.querySelector(".like-button");
const likeCount = document.querySelector(".like-count");
const hiddenVisits = document.querySelector("[data-hidden-visits]");
const scenePointer = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
};

const STORAGE_KEYS = {
  liked: "portfolio.v2.liked",
  likeCount: "portfolio.v2.likeCount",
  visitCount: "portfolio.v2.visitCount",
  visitSession: "portfolio.v2.visitSession",
};

const METRICS_DEFAULTS = {
  likeCount: 589,
  visitCount: 0,
};

const readNumber = (key) => {
  const raw = window.localStorage.getItem(key);
  const value = Number(raw);

  if (Number.isFinite(value)) {
    return value;
  }

  if (key === STORAGE_KEYS.likeCount) {
    return METRICS_DEFAULTS.likeCount;
  }

  if (key === STORAGE_KEYS.visitCount) {
    return METRICS_DEFAULTS.visitCount;
  }

  return 0;
};

const writeNumber = (key, value) => {
  window.localStorage.setItem(key, String(value));
};

const bindImageFade = (image) => {
  if (!image) {
    return;
  }

  image.classList.add("image-fade");

  const reveal = () => {
    image.classList.add("is-loaded");
  };

  if (image.complete && image.naturalWidth > 0) {
    window.requestAnimationFrame(reveal);
    return;
  }

  image.addEventListener("load", reveal, { once: true });
  image.addEventListener("error", reveal, { once: true });
};

const prepareDynamicImageFade = (image) => {
  if (!image) {
    return;
  }

  image.classList.add("image-fade");
  image.classList.remove("is-loaded");

  const reveal = () => {
    image.classList.add("is-loaded");
  };

  image.addEventListener("load", reveal, { once: true });
  image.addEventListener("error", reveal, { once: true });
};

const initializeImageFades = () => {
  document.querySelectorAll("img").forEach((image) => {
    bindImageFade(image);
  });
};

const tokenizeRevealText = (text) => {
  const tokens = [];
  let buffer = "";

  for (const char of Array.from(text)) {
    if (/\s/u.test(char)) {
      if (buffer) {
        tokens.push(buffer);
        buffer = "";
      }
      tokens.push("\u00A0");
      continue;
    }

    if (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/u.test(char)) {
      if (buffer) {
        tokens.push(buffer);
        buffer = "";
      }
      tokens.push(char);
      continue;
    }

    buffer += char;
  }

  if (buffer) {
    tokens.push(buffer);
  }

  return tokens;
};

const splitTextIntoLines = (element) => {
  if (!element || element.dataset.revealSplit === "1") {
    return;
  }

  const text = element.textContent.replace(/\s+/g, " ").trim();

  if (!text) {
    return;
  }

  const tokens = tokenizeRevealText(text);
  const markers = [];
  const fragment = document.createDocumentFragment();

  element.textContent = "";

  tokens.forEach((token) => {
    const marker = document.createElement("span");
    marker.textContent = token;
    marker.style.display = "inline-block";
    marker.style.whiteSpace = "pre";
    fragment.appendChild(marker);
    markers.push(marker);
  });

  element.appendChild(fragment);

  const lines = [];
  let currentLine = [];
  let currentTop = null;

  markers.forEach((marker) => {
    const markerTop = marker.offsetTop;

    if (currentTop === null || Math.abs(markerTop - currentTop) <= 1) {
      currentLine.push(marker.textContent || "");
      currentTop = currentTop === null ? markerTop : currentTop;
      return;
    }

    lines.push(currentLine);
    currentLine = [marker.textContent || ""];
    currentTop = markerTop;
  });

  if (currentLine.length) {
    lines.push(currentLine);
  }

  element.textContent = "";

  lines.forEach((line, index) => {
    const clip = document.createElement("span");
    const inner = document.createElement("span");

    clip.className = "reveal-line-clip";
    inner.className = "reveal-line-inner";
    inner.style.setProperty("--line-index", String(index));
    line.forEach((token) => {
      inner.append(document.createTextNode(token));
    });
    clip.appendChild(inner);
    element.appendChild(clip);
  });

  element.classList.add("reveal-lines");
  element.dataset.revealSplit = "1";
};

const initializeSectionReveals = () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = [];

  const registerBlock = (element, delay = 0) => {
    if (!element) {
      return;
    }

    element.classList.add("reveal-on-scroll");
    element.style.setProperty("--reveal-delay", `${delay}ms`);
    targets.push(element);
  };

  const registerLines = (element, delay = 0) => {
    if (!element) {
      return;
    }

    splitTextIntoLines(element);
    element.style.setProperty("--reveal-delay", `${delay}ms`);
    targets.push(element);
  };

  registerBlock(contactToggle, 0);
  registerLines(document.querySelector(".hero-stack .eyebrow"), 40);
  registerLines(document.querySelector(".hero-stack h1"), 90);
  registerLines(document.querySelector(".hero-copy"), 150);
  registerBlock(document.querySelector(".hero-console"), 210);
  registerLines(document.querySelector(".console-copy"), 260);
  document.querySelectorAll(".console-action").forEach((element, index) => {
    registerBlock(element, 320 + index * 50);
  });

  registerLines(document.querySelector(".section--writing .section-kicker"), 0);
  registerLines(document.querySelector(".section--writing .section-heading h2"), 40);
  document.querySelectorAll(".section--writing .article-card").forEach((card, index) => {
    const baseDelay = 120 + index * 90;

    registerBlock(card, baseDelay);
    registerLines(card.querySelector(".article-body h3"), baseDelay + 60);
    registerLines(card.querySelector(".article-body p"), baseDelay + 110);
    registerBlock(card.querySelector(".article-link"), baseDelay + 150);
  });

  registerLines(document.querySelector(".section--projects .section-kicker"), 0);
  registerLines(document.querySelector(".section--projects .section-heading h2"), 40);
  document.querySelectorAll(".project-chip").forEach((chip, index) => {
    registerBlock(chip, 100 + index * 40);
  });
  document.querySelectorAll(".section--projects .project-card").forEach((card, cardIndex) => {
    const baseDelay = 180 + cardIndex * 120;

    registerBlock(card, baseDelay);
    registerLines(card.querySelector(".project-head h3"), baseDelay + 50);
    registerBlock(card.querySelector(".project-badge"), baseDelay + 90);
    registerLines(card.querySelector(".project-description"), baseDelay + 120);
    card.querySelectorAll(".tag-row span").forEach((tag, tagIndex) => {
      registerBlock(tag, baseDelay + 160 + tagIndex * 28);
    });
    card.querySelectorAll(".shot-card").forEach((shot, shotIndex) => {
      registerBlock(shot, baseDelay + 220 + shotIndex * 42);
    });
  });

  registerBlock(likeButton, 0);
  document.querySelectorAll(".footer > p:not(.footer-beian):not(.hidden-visit-counter)").forEach((paragraph, index) => {
    registerLines(paragraph, 60 + index * 50);
  });

  if (prefersReducedMotion) {
    targets.forEach((element) => {
      element.classList.add("is-visible");
    });
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, observerInstance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observerInstance.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.18,
    },
  );

  targets.forEach((element) => {
    revealObserver.observe(element);
  });
};

const createLikeBurst = () => {
  if (!likeButton || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const burstHost = likeButton.closest(".engagement-card") || likeButton.parentElement;

  if (!burstHost) {
    return;
  }

  const buttonRect = likeButton.getBoundingClientRect();
  const hostRect = burstHost.getBoundingClientRect();
  const originX = buttonRect.left - hostRect.left + buttonRect.width / 2;
  const originY = buttonRect.top - hostRect.top + buttonRect.height / 2;
  const colors = ["#ffd86b", "#ff8bb8", "#b58cff", "#8fd3ff", "#9cf0d0", "#ffffff"];
  const pieceCount = 16;

  for (let index = 0; index < pieceCount; index += 1) {
    const piece = document.createElement("span");
    const angle = (-144 + (108 / Math.max(pieceCount - 1, 1)) * index) * (Math.PI / 180);
    const distance = 44 + Math.random() * 40;
    const upwardBias = 18 + Math.random() * 22;
    const rotate = -130 + Math.random() * 260;

    piece.className = "like-confetti";
    piece.style.setProperty("--origin-x", `${originX}px`);
    piece.style.setProperty("--origin-y", `${originY}px`);
    piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--dy", `${Math.sin(angle) * distance - upwardBias}px`);
    piece.style.setProperty("--rotate", `${rotate}deg`);
    piece.style.setProperty("--delay", `${Math.random() * 70}ms`);
    piece.style.setProperty("--size", `${8 + Math.random() * 6}px`);
    piece.style.setProperty("--color", colors[index % colors.length]);

    burstHost.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove(), { once: true });
  }
};

const syncBodyLock = () => {
  document.body.style.overflow = !lightbox.hidden ? "hidden" : "";
};

const setActiveChip = (projectId) => {
  chips.forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.target === projectId);
  });
};

const observer = new IntersectionObserver(
  (entries) => {
    const visibleSection = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visibleSection) {
      setActiveChip(visibleSection.target.dataset.project);
    }
  },
  {
    rootMargin: "-25% 0px -45% 0px",
    threshold: [0.2, 0.35, 0.5, 0.7],
  },
);

projectSections.forEach((section) => observer.observe(section));

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    setActiveChip(chip.dataset.target);
  });
});

const openLightbox = (src, alt, caption) => {
  prepareDynamicImageFade(lightboxImage);
  lightboxImage.src = src;
  lightboxImage.alt = alt;
  lightboxCaption.textContent = caption;
  lightbox.hidden = false;
  syncBodyLock();
};

const closeLightbox = () => {
  lightbox.hidden = true;
  lightboxImage.src = "";
  lightboxImage.alt = "";
  lightboxCaption.textContent = "";
  syncBodyLock();
};

const openContactCard = () => {
  if (!contactToggle || !heroContactCard) {
    return;
  }

  heroContactCard.hidden = false;
  window.requestAnimationFrame(() => {
    heroContactCard.classList.add("is-visible");
  });
  contactToggle.setAttribute("aria-expanded", "true");
};

const closeContactCard = () => {
  if (!contactToggle || !heroContactCard || heroContactCard.hidden) {
    return;
  }

  heroContactCard.classList.remove("is-visible");
  contactToggle.setAttribute("aria-expanded", "false");

  window.setTimeout(() => {
    if (!heroContactCard.classList.contains("is-visible")) {
      heroContactCard.hidden = true;
    }
  }, 220);
};

const toggleContactCard = () => {
  if (!heroContactCard || !contactToggle) {
    return;
  }

  if (heroContactCard.hidden) {
    openContactCard();
  } else {
    closeContactCard();
  }
};

shotCards.forEach((card) => {
  card.addEventListener("click", () => {
    const image = card.querySelector("img");

    openLightbox(
      card.dataset.full,
      image ? image.alt : card.dataset.title,
      card.dataset.title,
    );
  });
});

lightboxClose.addEventListener("click", closeLightbox);

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});

if (contactToggle) {
  contactToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleContactCard();
  });
}

document.addEventListener("click", (event) => {
  if (heroContact && !heroContact.contains(event.target)) {
    closeContactCard();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (!lightbox.hidden) {
    closeLightbox();
  }

  if (heroContactCard && !heroContactCard.hidden) {
    closeContactCard();
  }
});

const updateScenePointer = (clientX, clientY) => {
  scenePointer.x = clientX;
  scenePointer.y = clientY;

  const offsetX = (clientX / window.innerWidth - 0.5) * 38;
  const offsetY = (clientY / window.innerHeight - 0.5) * 32;

  root.style.setProperty("--pointer-x", `${offsetX}px`);
  root.style.setProperty("--pointer-y", `${offsetY}px`);
};

window.addEventListener("pointermove", (event) => {
  updateScenePointer(event.clientX, event.clientY);
});

window.addEventListener(
  "scroll",
  () => {
    root.style.setProperty("--scroll-shift", `${window.scrollY * 0.08}px`);
  },
  { passive: true },
);

const initializeSceneCanvas = () => {
  if (!sceneCanvas) {
    return;
  }

  const context = sceneCanvas.getContext("2d");

  if (!context) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const particleCount = prefersReducedMotion ? 16 : 38;

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let animationFrame = 0;
  let lastTime = 0;

  const particles = [];

  const createParticle = () => ({
    x: Math.random(),
    y: Math.random() * 0.9,
    vx: (Math.random() - 0.5) * 0.0026,
    vy: (Math.random() - 0.5) * 0.0016,
    radius: 0.9 + Math.random() * 2.4,
    alpha: 0.16 + Math.random() * 0.28,
    hue: 276 + Math.random() * 26,
    phase: Math.random() * Math.PI * 2,
    twinkle: 0.6 + Math.random() * 1.2,
  });

  const resetScene = () => {
    particles.length = 0;

    for (let index = 0; index < particleCount; index += 1) {
      particles.push(createParticle());
    }
  };

  const resizeCanvas = () => {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
    width = window.innerWidth;
    height = window.innerHeight;

    sceneCanvas.width = Math.round(width * pixelRatio);
    sceneCanvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    resetScene();
  };

  const drawParticle = (particle, time) => {
    const pulse = 0.55 + 0.45 * Math.sin(time * particle.twinkle + particle.phase);
    const x = particle.x * width;
    const y = particle.y * height;
    const alpha = particle.alpha * pulse;

    context.beginPath();
    context.fillStyle = `hsla(${particle.hue} 100% 84% / ${alpha})`;
    context.shadowBlur = 22;
    context.shadowColor = `hsla(${particle.hue} 100% 80% / ${alpha * 2.4})`;
    context.arc(x, y, particle.radius, 0, Math.PI * 2);
    context.fill();
  };

  const render = (now) => {
    const time = now * 0.001;
    const delta = Math.min((now - lastTime) / 16.6667 || 1, 2);
    lastTime = now;

    context.clearRect(0, 0, width, height);

    particles.forEach((particle) => {
      particle.x += particle.vx * delta * 10;
      particle.y += particle.vy * delta * 10;
      drawParticle(particle, time);
    });

    context.shadowBlur = 0;
    animationFrame = window.requestAnimationFrame(render);
  };

  resizeCanvas();
  animationFrame = window.requestAnimationFrame(render);

  window.addEventListener("resize", resizeCanvas, { passive: true });
  window.addEventListener("beforeunload", () => {
    window.cancelAnimationFrame(animationFrame);
  });
};

const initializeStaticMetrics = () => {
  if (!window.sessionStorage.getItem(STORAGE_KEYS.visitSession)) {
    writeNumber(STORAGE_KEYS.visitCount, readNumber(STORAGE_KEYS.visitCount) + 1);
    window.sessionStorage.setItem(STORAGE_KEYS.visitSession, String(Date.now()));
  }

  const currentVisits = readNumber(STORAGE_KEYS.visitCount);
  const currentLikes = readNumber(STORAGE_KEYS.likeCount);
  const liked = window.localStorage.getItem(STORAGE_KEYS.liked) === "1";

  hiddenVisits.textContent = String(currentVisits);
  likeCount.textContent = String(currentLikes);
  likeButton.classList.toggle("is-liked", liked);
  likeButton.setAttribute("aria-pressed", String(liked));

  likeButton.addEventListener("click", () => {
    const hasLiked = window.localStorage.getItem(STORAGE_KEYS.liked) === "1";
    const nextLiked = !hasLiked;
    const nextLikes = Math.max(0, readNumber(STORAGE_KEYS.likeCount) + (nextLiked ? 1 : -1));

    window.localStorage.setItem(STORAGE_KEYS.liked, nextLiked ? "1" : "0");
    writeNumber(STORAGE_KEYS.likeCount, nextLikes);

    likeCount.textContent = String(nextLikes);
    likeButton.classList.toggle("is-liked", nextLiked);
    likeButton.setAttribute("aria-pressed", String(nextLiked));

    if (nextLiked) {
      createLikeBurst();
    }
  });
};

updateScenePointer(window.innerWidth / 2, window.innerHeight / 2);
initializeImageFades();
initializeSectionReveals();
initializeSceneCanvas();
initializeStaticMetrics();
