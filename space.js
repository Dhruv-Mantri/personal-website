/* ─── space.js — Planet-hopping scroll journey ─── */

(function initSpaceJourney() {
  const viewport = document.getElementById('sticky-viewport');
  const expSection = document.getElementById('experience');
  if (!viewport || !expSection) return;

  // ── Create the planet canvas ──────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.id = 'space-journey';
  canvas.style.cssText = `
    position: absolute; inset: 0;
    z-index: 1;
    pointer-events: none;
  `;
  viewport.insertBefore(canvas, viewport.firstChild);
  const ctx = canvas.getContext('2d');

  // ── Planet definitions (one per content stop) ────────────────────────
  const PLANETS = [
    { colors: ['#e8e0ff', '#9c7dfc', '#2a0a60'], ring: false, side: 0 },   // Intro
    { colors: ['#80deea', '#00838f', '#00212a'], ring: false, side: -1 },  // UAV
    { colors: ['#ffcc80', '#e65100', '#2a1000'], ring: true, side: 1 },    // Garmin
    { colors: ['#ef9a9a', '#b71c1c', '#1a0000'], ring: false, side: -1 },  // ROV
    { colors: ['#ce93d8', '#7b1fa2', '#1a0030'], ring: false, side: 0 }    // Outro
  ];

  // ── State ─────────────────────────────────────────────────────────────
  let W, H;
  let scrollY = 0;
  let planetPositions = PLANETS.map((_, i) => i / (PLANETS.length - 1));
  let warpSpeed = 0;      
  let lastScrollY = 0;
  let lastScrollTime = performance.now();
  const Z_SCALE = 10000;

  // ── Resize ────────────────────────────────────────────────────────────
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function docTop(el) {
    let top = 0;
    let node = el;
    while (node) { top += node.offsetTop; node = node.offsetParent; }
    return top;
  }

  // ── Draw a single planet ──────────────────────────────────────────────
  function drawPlanet(x, y, r, colors, ring, alpha) {
    if (alpha < 0.01 || r < 1) return;
    ctx.save();
    ctx.globalAlpha = alpha;

    // outer atmospheric glow
    const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3.2);
    glow.addColorStop(0, colors[0] + '30');
    glow.addColorStop(0.5, colors[1] + '14');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
    ctx.fill();

    // ring — back half
    if (ring) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.3);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 2.0, r * 2.0, 0, Math.PI * 0.05, Math.PI * 1.05);
      ctx.strokeStyle = colors[0] + '60';
      ctx.lineWidth = r * 0.32;
      ctx.stroke();
      ctx.restore();
    }

    // planet body
    const body = ctx.createRadialGradient(
      x - r * 0.3, y - r * 0.35, r * 0.05,
      x + r * 0.1, y + r * 0.1, r
    );
    body.addColorStop(0,   colors[0]);
    body.addColorStop(0.45, colors[1]);
    body.addColorStop(1,   colors[2]);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // specular highlight
    const hi = ctx.createRadialGradient(
      x - r * 0.38, y - r * 0.38, 0,
      x - r * 0.15, y - r * 0.15, r * 0.7
    );
    hi.addColorStop(0, 'rgba(255,255,255,0.28)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // terminator shadow
    const shadow = ctx.createRadialGradient(
      x + r * 0.25, y + r * 0.25, r * 0.4,
      x + r * 0.35, y + r * 0.35, r * 1.1
    );
    shadow.addColorStop(0, 'rgba(0,0,0,0)');
    shadow.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // ring — front half
    if (ring) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.3);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 2.0, r * 2.0, 0, Math.PI * 1.05, Math.PI * 2.05);
      ctx.strokeStyle = colors[0] + '80';
      ctx.lineWidth = r * 0.32;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  // ── Warp streak effect ─────────────────────────────────
  function drawWarpStreaks() {
    if (warpSpeed < 0.08) return;
    ctx.save();
    ctx.globalAlpha = warpSpeed * 0.4;
    const count = Math.floor(warpSpeed * 60);
    for (let i = 0; i < count; i++) {
      const sx = Math.random() * W;
      const sy = Math.random() * H;
      const len = 20 + Math.random() * 120 * warpSpeed;
      const g = ctx.createLinearGradient(sx, sy, sx, sy + len);
      g.addColorStop(0, 'rgba(200,210,255,0)');
      g.addColorStop(0.5, 'rgba(200,210,255,0.7)');
      g.addColorStop(1, 'rgba(200,210,255,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.random() * 1.2 + 0.2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (Math.random() - 0.5) * 8, sy + len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Helper to project 3D to 2D
  function project(x3d, y3d, z3d, cameraZ) {
    const deltaZ = z3d - cameraZ;
    const fov = 1000;
    // Don't render behind camera
    if (deltaZ < -fov) return null;
    const zDepth = Math.max(1, deltaZ + fov); 
    const scale = fov / zDepth;
    return {
      x: W / 2 + (x3d * scale),
      y: H / 2 + (y3d * scale),
      scale: scale,
      deltaZ: deltaZ
    };
  }

  // ── Main render loop ──────────────────────────────────────────────────
  function render() {
    ctx.clearRect(0, 0, W, H);

    const expTop = docTop(expSection);
    const expHeight = Math.max(1, expSection.offsetHeight - window.innerHeight);
    const progressRaw = (scrollY - expTop) / expHeight;
    const progress = Math.max(0, Math.min(1, progressRaw));

    warpSpeed *= 0.88;

    // Only render warp if actively scrolling within section
    if (progressRaw >= -0.2 && progressRaw <= 1.2) {
      drawWarpStreaks();
    }

    const cameraZ = progress * Z_SCALE;

    // 1. Calculate base 3D coordinates for all planets
    const planet3D = PLANETS.map((planet, i) => {
      return {
        ...planet,
        x3d: planet.side * (W > 768 ? W * 0.35 : 0),
        y3d: planet.side === 0 ? 0 : ((i % 2 === 0 ? 150 : -150) + (Math.sin(i) * 200)),
        z3d: planetPositions[i] * Z_SCALE
      };
    });

    // 2. Progressive Path Drawing
    ctx.save();
    ctx.beginPath();
    let startedPath = false;

    for (let i = 0; i < planet3D.length - 1; i++) {
      const p1 = planet3D[i];
      const p2 = planet3D[i+1];

      // Draw segment between p1 and p2 if cameraZ is past p1.z3d
      if (cameraZ > p1.z3d) {
        // How much of this segment is drawn?
        const segZ = Math.min(cameraZ, p2.z3d);
        
        // Calculate the 3D position of the "tip" of the drawing line
        const t = (segZ - p1.z3d) / (p2.z3d - p1.z3d);
        const tipX3D = p1.x3d + (p2.x3d - p1.x3d) * t;
        const tipY3D = p1.y3d + (p2.y3d - p1.y3d) * t;

        // Project p1
        const proj1 = project(p1.x3d, p1.y3d, p1.z3d, cameraZ);
        // Project Tip
        const projTip = project(tipX3D, tipY3D, segZ, cameraZ);

        if (proj1 && projTip) {
          if (!startedPath) {
            ctx.moveTo(proj1.x, proj1.y);
            startedPath = true;
          } else {
            ctx.lineTo(proj1.x, proj1.y);
          }
          ctx.lineTo(projTip.x, projTip.y);
        }
      }
    }
    if (startedPath) {
      ctx.strokeStyle = 'rgba(124, 92, 252, 0.4)';
      ctx.lineWidth = 3;
      ctx.setLineDash([15, 15]);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Draw planets & resolve HUD
    let closestDelta = Infinity;
    let activeIndex = -1;
    const contents = viewport.querySelectorAll('.planet-content');

    const planetsToDraw = [];

    planet3D.forEach((p, i) => {
      const proj = project(p.x3d, p.y3d, p.z3d, cameraZ);
      if (!proj || proj.deltaZ < -1500 || proj.deltaZ > 8000) return;

      const baseRadius = Math.min(W, H) * 0.25; 
      let r = baseRadius * proj.scale;
      
      let alpha = 1;
      if (proj.deltaZ > 4000) {
        alpha = 1 - ((proj.deltaZ - 4000) / 4000);
      } else if (proj.deltaZ < 0) {
        alpha = 1 - Math.min(1, -proj.deltaZ / 800);
        r += -proj.deltaZ * 1.5; 
      }

      planetsToDraw.push({ proj, p, alpha, r, index: i });

      // Track closest planet for content activation
      if (Math.abs(proj.deltaZ) < Math.abs(closestDelta)) {
        closestDelta = proj.deltaZ;
        activeIndex = i;
      }
    });

    // Z-sort planets
    planetsToDraw.sort((a, b) => b.proj.deltaZ - a.proj.deltaZ);
    planetsToDraw.forEach(item => {
      drawPlanet(item.proj.x, item.proj.y, item.r, item.p.colors, item.p.ring, Math.max(0, item.alpha));
    });

    // Activate corresponding HTML content block
    contents.forEach((el, i) => {
      const p = planet3D[i];
      const proj = project(p.x3d, p.y3d, p.z3d, cameraZ);
      
      if (proj) {
        el.style.left = proj.x + 'px';
        el.style.top = proj.y + 'px';
      }

      // Content is active if it's the closest and within a certain Z threshold
      if (i === activeIndex && Math.abs(closestDelta) < 1800) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    requestAnimationFrame(render);
  }

  // ── Scroll tracking ───────────────────────────────────────────────────
  window.addEventListener('scroll', () => {
    const now = performance.now();
    const dt  = Math.max(1, now - lastScrollTime);
    const dy  = Math.abs(window.scrollY - lastScrollY);
    // Only apply warp speed if within the section
    const expTop = docTop(expSection);
    const expHeight = expSection.offsetHeight;
    if (window.scrollY >= expTop - window.innerHeight && window.scrollY <= expTop + expHeight) {
      warpSpeed = Math.min(1, warpSpeed + (dy / dt) * 0.8);
    }
    lastScrollY   = window.scrollY;
    lastScrollTime = now;
    scrollY = window.scrollY;
  }, { passive: true });

  function init() {
    resize();
    render();
  }

  window.addEventListener('resize', resize);
  setTimeout(init, 300);

})();
