/* ─── script.js ─── */

// ── Year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// ─────────────────────────────────────────────
// PROJECT CAROUSEL ARROWS
// ─────────────────────────────────────────────
(function initCarouselArrows() {
  const grid = document.getElementById('projects-grid');
  const prev = document.getElementById('proj-prev');
  const next = document.getElementById('proj-next');
  if (!grid || !prev || !next) return;

  const CARD_W = () => {
    const card = grid.querySelector('.project-card');
    if (!card) return 340;
    return card.offsetWidth + 24; // card + gap
  };

  function updateArrows() {
    prev.disabled = grid.scrollLeft <= 4;
    next.disabled = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 4;
  }

  prev.addEventListener('click', () => {
    grid.scrollBy({ left: -CARD_W(), behavior: 'smooth' });
  });
  next.addEventListener('click', () => {
    grid.scrollBy({ left:  CARD_W(), behavior: 'smooth' });
  });

  grid.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();
})();

// ─────────────────────────────────────────────
// STARFIELD CANVAS
// ─────────────────────────────────────────────
(function initStarfield() {
  const canvas = document.getElementById('starfield');
  const ctx    = canvas.getContext('2d');
  let W, H, stars = [];
  const STAR_COUNT = 200;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x:     Math.random() * W,
        y:     Math.random() * H,
        r:     Math.random() * 1.4 + 0.2,
        alpha: Math.random() * 0.7 + 0.1,
        speed: Math.random() * 0.15 + 0.02,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const t = Date.now() / 1000;
    for (const s of stars) {
      s.twinkle += 0.01;
      const a = s.alpha * (0.6 + 0.4 * Math.sin(s.twinkle));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,210,255,${a})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); createStars(); });
  resize();
  createStars();
  draw();
})();

// ─────────────────────────────────────────────
// PARALLAX STARFIELD ON SCROLL
// ─────────────────────────────────────────────
// Stars drift slightly as the user scrolls for a space-travel feel
(function scrollParallax() {
  const nebulae = document.querySelectorAll('.nebula');
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    nebulae.forEach((n, i) => {
      const speed = (i + 1) * 0.04;
      n.style.transform = `translateY(${y * speed}px)`;
    });
  }, { passive: true });
})();

// ─────────────────────────────────────────────
// NAVBAR — scroll state & active link tracking
// ─────────────────────────────────────────────
(function initNav() {
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    // Scrolled state
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Active link
    let current = '';
    sections.forEach(sec => {
      const top = sec.offsetTop - 100;
      if (window.scrollY >= top) current = sec.id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  }, { passive: true });

  // Hamburger
  const hamburger = document.getElementById('hamburger');
  const navLinksEl = document.getElementById('nav-links');
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinksEl.classList.toggle('open');
  });

  // Close mobile menu on link click
  navLinksEl.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinksEl.classList.remove('open');
    });
  });
})();

// ─────────────────────────────────────────────
// SCROLL REVEAL
// ─────────────────────────────────────────────
(function initReveal() {
  const items = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger siblings
        const siblings = Array.from(entry.target.parentElement.querySelectorAll('.reveal'));
        const idx = siblings.indexOf(entry.target);
        entry.target.style.transitionDelay = `${idx * 0.07}s`;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  items.forEach(el => observer.observe(el));
})();

// ─────────────────────────────────────────────
// PROJECT CARD TILT (mouse parallax)
// ─────────────────────────────────────────────
(function initTilt() {
  const cards = document.querySelectorAll('[data-tilt]');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) / (rect.width  / 2);
      const dy   = (e.clientY - cy) / (rect.height / 2);
      card.style.transform = `perspective(600px) rotateY(${dx * 6}deg) rotateX(${-dy * 6}deg) translateZ(6px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.5s cubic-bezier(.4,0,.2,1)';
      card.style.transform  = 'perspective(600px) rotateY(0deg) rotateX(0deg) translateZ(0)';
      setTimeout(() => { card.style.transition = ''; }, 500);
    });
  });
})();

// ─────────────────────────────────────────────
// PILL ENTRANCE ANIMATION (stagger on reveal)
// ─────────────────────────────────────────────
(function initPills() {
  const groups = document.querySelectorAll('.skill-group');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const pills = entry.target.querySelectorAll('.pill');
        pills.forEach((pill, i) => {
          pill.style.opacity    = '0';
          pill.style.transform  = 'translateY(10px)';
          pill.style.transition = `opacity 0.4s ${i * 0.05}s ease, transform 0.4s ${i * 0.05}s ease`;
          requestAnimationFrame(() => {
            pill.style.opacity   = '1';
            pill.style.transform = 'translateY(0)';
          });
        });
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  groups.forEach(g => obs.observe(g));
})();
