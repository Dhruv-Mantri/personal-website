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
    { colors: ['#e8e0ff', '#9c7dfc', '#2a0a60'], ring: false, side: 0, lightAngle: Math.PI * 1.25 },   // Top-left
    { colors: ['#80deea', '#00838f', '#00212a'], ring: false, side: -1, lightAngle: Math.PI * 1.7 },   // Top-right
    { colors: ['#ffcc80', '#e65100', '#2a1000'], ring: true, side: 1, lightAngle: Math.PI * 0.8 },     // Bottom-left
    { colors: ['#ef9a9a', '#b71c1c', '#1a0000'], ring: false, side: -1, lightAngle: Math.PI * 1.1 },   // Left
    { colors: ['#ce93d8', '#7b1fa2', '#1a0030'], ring: false, side: 0, lightAngle: Math.PI * 1.5 }     // Top
  ];

  // ── State ─────────────────────────────────────────────────────────────
  let W, H;
  let scrollY = 0;
  let planetPositions = PLANETS.map((_, i) => i / (PLANETS.length - 1));
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
  function drawPlanet(x, y, r, colors, ring, alpha, lightAngle = Math.PI * 1.25) {
    if (alpha < 0.01 || r < 1) return;
    ctx.save();
    ctx.globalAlpha = alpha;

    const lx = Math.cos(lightAngle);
    const ly = Math.sin(lightAngle);

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
      x + r * 0.4 * lx, y + r * 0.4 * ly, r * 0.05,
      x - r * 0.1 * lx, y - r * 0.1 * ly, r
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
      x + r * 0.5 * lx, y + r * 0.5 * ly, 0,
      x + r * 0.2 * lx, y + r * 0.2 * ly, r * 0.7
    );
    hi.addColorStop(0, 'rgba(255,255,255,0.28)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // terminator shadow
    const shadow = ctx.createRadialGradient(
      x - r * 0.35 * lx, y - r * 0.35 * ly, r * 0.4,
      x - r * 0.50 * lx, y - r * 0.50 * ly, r * 1.1
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


  // Helper to project 3D to 2D
  function project(x3d, y3d, z3d, camX, camY, camZ) {
    const deltaZ = z3d - camZ;
    const fov = 1000;
    // Don't render behind camera
    if (deltaZ < -fov) return null;
    const zDepth = Math.max(1, deltaZ + fov); 
    const scale = fov / zDepth;
    return {
      x: W / 2 + ((x3d - camX) * scale),
      y: H / 2 + ((y3d - camY) * scale),
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

    // Apply a sine-wave easing to slow down the camera near each planet.
    // This creates a "locked in place" scrollytelling effect.
    const segments = PLANETS.length - 1;
    const maxAmount = 1 / (2 * Math.PI * segments);
    const amount = maxAmount * 0.85; // 85% slowdown at the nodes
    
    let easedProgress = progress - amount * Math.sin(progress * Math.PI * 2 * segments);
    const cameraZ = easedProgress * Z_SCALE;

    // 1. Calculate base 3D coordinates for all planets
    const planet3D = PLANETS.map((planet, i) => {
      return {
        ...planet,
        x3d: planet.side * (W > 768 ? W * 0.75 : 0),
        y3d: planet.side === 0 ? 0 : ((i % 2 === 0 ? 100 : -100) + (Math.sin(i) * 100)),
        z3d: planetPositions[i] * Z_SCALE
      };
    });

    // Calculate dynamic camera X and Y to follow the path loosely
    let cameraX = 0;
    let cameraY = 0;
    
    if (cameraZ <= planet3D[0].z3d) {
      cameraX = planet3D[0].x3d * 0.6;
      cameraY = planet3D[0].y3d * 0.6;
    } else if (cameraZ >= planet3D[planet3D.length - 1].z3d) {
      const last = planet3D[planet3D.length - 1];
      cameraX = last.x3d * 0.6;
      cameraY = last.y3d * 0.6;
    } else {
      for (let i = 0; i < planet3D.length - 1; i++) {
        if (cameraZ >= planet3D[i].z3d && cameraZ <= planet3D[i+1].z3d) {
          const p1 = planet3D[i];
          const p2 = planet3D[i+1];
          const t = (cameraZ - p1.z3d) / (p2.z3d - p1.z3d);
          const smoothT = t * t * (3 - 2 * t);
          cameraX = (p1.x3d + (p2.x3d - p1.x3d) * smoothT) * 0.6;
          cameraY = (p1.y3d + (p2.y3d - p1.y3d) * smoothT) * 0.6;
          break;
        }
      }
    }

    // 2. Progressive Connected Path Drawing
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(124, 92, 252, 0.4)';
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 15]);

    const lookahead = 1000; // How far ahead of the camera the line progressively draws
    const maxDrawZ = cameraZ + lookahead;

    let startedPath = false;

    for (let i = 0; i < planet3D.length - 1; i++) {
      let p1 = planet3D[i];
      let p2 = planet3D[i+1];

      // If segment is entirely behind camera's near plane, skip
      const nearZ = cameraZ - 990;
      if (p2.z3d < nearZ) continue; 
      
      // If segment hasn't been reached by the drawing tip yet, skip
      if (p1.z3d > maxDrawZ) continue;
      
      let startX = p1.x3d;
      let startY = p1.y3d;
      let startZ = p1.z3d;
      
      // Clamp start to near plane if it passed behind us
      if (startZ < nearZ) {
        const t = (nearZ - p1.z3d) / (p2.z3d - p1.z3d);
        startX = p1.x3d + (p2.x3d - p1.x3d) * t;
        startY = p1.y3d + (p2.y3d - p1.y3d) * t;
        startZ = nearZ;
      }

      // Clamp end to maxDrawZ for the progressive drawing effect
      let endX = p2.x3d;
      let endY = p2.y3d;
      let endZ = p2.z3d;
      
      if (endZ > maxDrawZ) {
        const t = (maxDrawZ - p1.z3d) / (p2.z3d - p1.z3d);
        endX = p1.x3d + (p2.x3d - p1.x3d) * t;
        endY = p1.y3d + (p2.y3d - p1.y3d) * t;
        endZ = maxDrawZ;
      }

      const proj1 = project(startX, startY, startZ, cameraX, cameraY, cameraZ);
      const proj2 = project(endX, endY, endZ, cameraX, cameraY, cameraZ);

      if (proj1 && proj2) {
        if (!startedPath) {
          ctx.moveTo(proj1.x, proj1.y);
          startedPath = true;
        } else {
          ctx.lineTo(proj1.x, proj1.y);
        }
        ctx.lineTo(proj2.x, proj2.y);
      }
    }
    if (startedPath) ctx.stroke();
    ctx.restore();

    // 3. Draw planets & resolve HUD
    let closestDelta = Infinity;
    let activeIndex = -1;
    const contents = viewport.querySelectorAll('.planet-content');

    const planetsToDraw = [];

    planet3D.forEach((p, i) => {
      const proj = project(p.x3d, p.y3d, p.z3d, cameraX, cameraY, cameraZ);
      if (!proj || proj.deltaZ < -1500 || proj.deltaZ > 8000) return;

      const baseRadius = Math.min(W, H) * 0.25; 
      let r = baseRadius * proj.scale;
      
      let alpha = 1;
      if (proj.deltaZ > 4000) {
        alpha = 1 - ((proj.deltaZ - 4000) / 4000);
      } else if (proj.deltaZ < 0) {
        alpha = 1 - Math.min(1, -proj.deltaZ / 1500);
        r += -proj.deltaZ * 1.0; 
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
      drawPlanet(item.proj.x, item.proj.y, item.r, item.p.colors, item.p.ring, Math.max(0, item.alpha), item.p.lightAngle);
    });

    // Activate corresponding HTML content block
    contents.forEach((el, i) => {
      const p = planet3D[i];
      const proj = project(p.x3d, p.y3d, p.z3d, cameraX, cameraY, cameraZ);
      
      if (proj) {
        let offsetX = 0;
        if (W > 768) {
          if (p.side === -1) offsetX = 280;
          if (p.side === 1)  offsetX = -280;
        }
        el.style.left = (proj.x + offsetX) + 'px';
        el.style.top = proj.y + 'px';
      }

      // Content is active if it's the closest and within a certain Z threshold
      if (i === activeIndex && Math.abs(closestDelta) < 2500) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    requestAnimationFrame(render);
  }

  // ── Scroll tracking ───────────────────────────────────────────────────
  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
  }, { passive: true });

  function init() {
    resize();
    render();
  }

  window.addEventListener('resize', resize);
  setTimeout(init, 300);

})();
