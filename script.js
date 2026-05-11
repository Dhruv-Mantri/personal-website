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
// WARP STARFIELD CANVAS
// ─────────────────────────────────────────────
(function initStarfield() {
  const canvas = document.getElementById('starfield');
  const ctx    = canvas.getContext('2d');
  let W, H, stars = [];
  const STAR_COUNT = 300;
  let scrollSpeed = 0;
  let lastScrollY = window.scrollY;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 2000,
        z: Math.random() * 2000,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    
    // Base speed + scroll speed
    const currentSpeed = 2 + scrollSpeed * 20;
    scrollSpeed *= 0.9; // decay

    const cx = W / 2;
    const cy = H / 2;

    for (const s of stars) {
      s.z -= currentSpeed;

      if (s.z <= 0) {
        s.x = (Math.random() - 0.5) * 2000;
        s.y = (Math.random() - 0.5) * 2000;
        s.z = 2000;
      }

      const projX = cx + (s.x / s.z) * 800;
      const projY = cy + (s.y / s.z) * 800;
      
      const prevZ = s.z + currentSpeed;
      const prevProjX = cx + (s.x / prevZ) * 800;
      const prevProjY = cy + (s.y / prevZ) * 800;

      const alpha = 1 - (s.z / 2000);
      
      if (projX >= 0 && projX <= W && projY >= 0 && projY <= H) {
        ctx.beginPath();
        ctx.moveTo(prevProjX, prevProjY);
        ctx.lineTo(projX, projY);
        ctx.strokeStyle = `rgba(200, 210, 255, ${alpha})`;
        ctx.lineWidth = Math.max(0.5, 3 * (1 - s.z / 2000));
        ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('scroll', () => {
    const dy = Math.abs(window.scrollY - lastScrollY);
    scrollSpeed = Math.min(20, scrollSpeed + dy * 0.05);
    lastScrollY = window.scrollY;
  }, { passive: true });

  window.addEventListener('resize', () => { resize(); createStars(); });
  resize();
  createStars();
  draw();
})();

// ─────────────────────────────────────────────
// NAVBAR — scroll state & active link tracking
// ─────────────────────────────────────────────
(function initNav() {
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  // Need to handle standard sections and the new sticky section
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
      // If we are past the top of the section, and we haven't scrolled past its bottom
      if (window.scrollY >= top && window.scrollY < top + sec.offsetHeight) {
        current = sec.id;
      }
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
