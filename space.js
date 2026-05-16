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

  // ── Create global debris canvas ──────────────────────────────────────
  const dCanvas = document.createElement('canvas');
  dCanvas.id = 'global-debris';
  dCanvas.style.cssText = `
    position: fixed; inset: 0;
    z-index: 9999;
    pointer-events: none;
  `;
  document.body.appendChild(dCanvas);
  const dCtx = dCanvas.getContext('2d');

  // ── Planet definitions (one per content stop) ────────────────────────
  const PLANETS = [
    { colors: ['#e8e0ff', '#9c7dfc', '#2a0a60'], ring: false, side: 0, lightAngle: Math.PI * 1.25 },   // Top-left
    { colors: ['#80deea', '#00838f', '#00212a'], ring: false, side: -1, lightAngle: Math.PI * 1.7 },   // Top-right
    { colors: ['#ffcc80', '#e65100', '#2a1000'], ring: true, side: 1, lightAngle: Math.PI * 0.8 },     // Bottom-left
    { colors: ['#ef9a9a', '#b71c1c', '#1a0000'], ring: false, side: -1, lightAngle: Math.PI * 1.1 },   // Left
    { colors: ['#fff176', '#ff6d00', '#b71c1c'], ring: false, side: 0, lightAngle: Math.PI * 1.5 }     // Sun
  ];

  // ── State ─────────────────────────────────────────────────────────────
  let W, H;
  let scrollY = 0;
  let planetPositions = PLANETS.map((_, i) => i / (PLANETS.length - 1));
  const Z_SCALE = 10000;

  let shatterParticles = [];
  let globalDebris = [];
  let hasExploded = false;
  let lastTime = performance.now();

  function triggerExplosion(projX, projY, pColor) {
    if (hasExploded) return;
    hasExploded = true;
    
    // 3D shatter particles (attached to the planet)
    for (let i=0; i<80; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 1000 + Math.random() * 4000;
      shatterParticles.push({
        dx: speed * Math.sin(phi) * Math.cos(theta),
        dy: speed * Math.sin(phi) * Math.sin(theta),
        dz: speed * Math.cos(phi),
        r: Math.random() * 12 + 4,
        color: pColor[Math.floor(Math.random() * pColor.length)],
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 10
      });
    }

    // Foreground global falling debris (2D document space)
    for (let i=0; i<50; i++) {
      globalDebris.push({
        x: projX,
        y: window.scrollY + projY, 
        vx: (Math.random() - 0.5) * 1400, 
        vy: (Math.random() - 0.5) * 1400 - 800, 
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 8,
        color: pColor[Math.floor(Math.random() * pColor.length)],
        r: Math.random() * 10 + 4
      });
    }
  }

  // ── Create the Three.js canvas ────────────────────────────────────────
  const threeCanvas = document.createElement('canvas');
  threeCanvas.id = 'three-journey';
  threeCanvas.style.cssText = `
    position: absolute; inset: 0;
    z-index: 2; /* above 2D canvas, below DOM content */
    pointer-events: none;
  `;
  viewport.insertBefore(threeCanvas, canvas.nextSibling);

  const scene = new THREE.Scene();
  // Simple centered orthographic camera.
  // Camera sits at z=50, looking toward z=0 where all meshes live.
  // Frustum: near=1, far=100 => visible range z=[49, -50].
  // Mesh at z=0 is exactly 50 units in front. Unambiguously within frustum.
  const W0 = window.innerWidth, H0 = window.innerHeight;
  // Camera at z=5000. Meshes at z=0. Distance = 5000 units.
  // Planet radius r is in pixels (max ~300px). Scale is set to r in Three.js units.
  // The camera can NEVER clip into the sphere because 5000 >> any r value.
  const camera = new THREE.OrthographicCamera(-W0/2, W0/2, H0/2, -H0/2, 1, 10000);
  camera.position.z = 5000;
  const renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputEncoding = THREE.sRGBEncoding;
  
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
  dirLight.position.set(-1, -1, 1);
  scene.add(dirLight);

  const textureLoader = new THREE.TextureLoader();
  const PLANET_DATA = [
    { tex: 'textures/2k_neptune.jpg', ring: false, emissive: 0, color: 0x00838f },
    { tex: 'textures/8k_mars.jpg', ring: false, emissive: 0, color: 0xb71c1c },
    { tex: 'textures/8k_saturn.jpg', ring: 'textures/8k_saturn_ring_alpha.png', emissive: 0, color: 0xe65100 },
    { tex: 'textures/8k_jupiter.jpg', ring: false, emissive: 0, color: 0x80deea },
    { tex: 'textures/8k_sun.jpg', ring: false, emissive: 1, color: 0xffcc80 } // Sun glows
  ];

  const planetMeshes = PLANET_DATA.map((data, i) => {
    const group = new THREE.Group();
    const geo = new THREE.SphereGeometry(1, 64, 64);
    
    const tex = textureLoader.load(data.tex);
    tex.encoding = THREE.sRGBEncoding;

    const matArgs = {
      color: new THREE.Color(data.color), // Fallback if texture fails
      map: tex,
      roughness: 0.6,
      metalness: 0.1,
      transparent: true,
      opacity: 1
    };
    if (data.emissive) {
      matArgs.emissiveMap = tex;
      matArgs.emissive = new THREE.Color(0xffffff);
      matArgs.emissiveIntensity = 1.0;
    }
    
    const mat = new THREE.MeshStandardMaterial(matArgs);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.z = Math.PI * 0.1; // axial tilt
    group.add(mesh);
    
    if (data.ring) {
      // Create a ring geometry with custom UVs so the texture wraps correctly
      const ringGeo = new THREE.RingGeometry(1.2, 2.2, 64);
      const pos = ringGeo.attributes.position;
      const uvs = ringGeo.attributes.uv;
      for (let j = 0; j < pos.count; j++) {
        const x = pos.getX(j);
        const y = pos.getY(j);
        const len = Math.sqrt(x*x + y*y);
        // Map inner radius (1.2) to u=0, outer radius (2.2) to u=1
        uvs.setXY(j, (len - 1.2) / (2.2 - 1.2), 0.5);
      }
      ringGeo.attributes.uv.needsUpdate = true;

      const ringTex = textureLoader.load(data.ring);
      ringTex.encoding = THREE.sRGBEncoding;
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: ringTex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        roughness: 0.8
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2 - 0.2; // tilt the ring
      group.add(ringMesh);
    }
    
    group.visible = false;
    scene.add(group);
    return group;
  });

  // ── Resize ────────────────────────────────────────────────────────────
  function resize() {
    W = canvas.width = dCanvas.width = window.innerWidth;
    H = canvas.height = dCanvas.height = window.innerHeight;
    
    if (typeof camera !== 'undefined') {
      camera.left   = -W/2;
      camera.right  =  W/2;
      camera.top    =  H/2;
      camera.bottom = -H/2;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    }
  }

  function docTop(el) {
    let top = 0;
    let node = el;
    while (node) { top += node.offsetTop; node = node.offsetParent; }
    return top;
  }

  // ── Draw a single planet's glow ───────────────────────────────────────
  function drawPlanetGlow(x, y, r, colors, alpha) {
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

    const now = performance.now();
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    const expTop = docTop(expSection);
    const expHeight = Math.max(1, expSection.offsetHeight - window.innerHeight);
    const progressRaw = (scrollY - expTop) / expHeight;
    const progress = Math.max(0, Math.min(1, progressRaw));

    // 0 to 0.8 maps to the physical 3D space journey
    const journeyProgress = Math.max(0, Math.min(1, progress / 0.8));
    const shakeT = Math.max(0, Math.min(1, (progress - 0.8) / 0.1));
    const explosionT = Math.max(0, Math.min(1, (progress - 0.9) / 0.1));

    // Apply a sine-wave easing to slow down the camera near each planet.
    const segments = PLANETS.length - 1;
    const maxAmount = 1 / (2 * Math.PI * segments);
    const amount = maxAmount * 0.85; // 85% slowdown at the nodes
    
    let easedProgress = journeyProgress - amount * Math.sin(journeyProgress * Math.PI * 2 * segments);
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

    // Shake Phase 
    if (shakeT > 0 && explosionT === 0) {
      const intensity = shakeT * 50; 
      cameraX += (Math.random() - 0.5) * intensity;
      cameraY += (Math.random() - 0.5) * intensity;
      
      // Screen flash
      ctx.fillStyle = `rgba(255, 160, 0, ${shakeT * 0.18})`;
      ctx.fillRect(0, 0, W, H);
    }

    // 2. Progressive Connected Path Drawing
    ctx.save();
    if (explosionT > 0) {
      ctx.globalAlpha = Math.max(0, 1 - explosionT * 2); // Fade out quickly
    }
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(124, 92, 252, 0.4)';
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 15]);

    const lookahead = 800; // How far ahead of the camera the line progressively draws
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
      if (i === planet3D.length - 1 && explosionT > 0) return; // Hide exploding planet

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
    
    planetMeshes.forEach(m => m.visible = false);

    planetsToDraw.forEach(item => {
      // Draw 2D glow
      drawPlanetGlow(item.proj.x, item.proj.y, item.r, item.p.colors, Math.max(0, item.alpha));
      
      // Update Three.js mesh.
      // Convert screen-space (proj.x, proj.y) to centered camera space:
      //   cameraX = proj.x - W/2   (screen center -> 0)
      //   cameraY = -(proj.y - H/2) (flip Y: screen top=0 -> camera top=+H/2)
      // Mesh lives at z=0, camera at z=50 => 50 units in front, within frustum.
      const pGroup = planetMeshes[item.index];
      pGroup.visible = true;
      pGroup.position.set(item.proj.x - W/2, -(item.proj.y - H/2), 0);
      pGroup.scale.set(item.r, item.r, item.r);
      
      // Rotate planet
      pGroup.children[0].rotation.y += dt * 0.15;
      if (pGroup.children.length > 1) { // ring
        pGroup.children[1].rotation.z -= dt * 0.1;
      }
      
      // Exploding planet fade out
      let opacity = Math.max(0, item.alpha);
      if (item.index === planet3D.length - 1 && explosionT > 0) {
        opacity *= Math.max(0, 1 - Math.pow(explosionT, 0.5)); // fast fade out
      }
      
      pGroup.children.forEach(child => {
        if (child.geometry.type === 'RingGeometry') {
          child.material.opacity = 0.9 * opacity;
        } else {
          child.material.opacity = opacity;
        }
      });
    });

    renderer.render(scene, camera);

    // Draw 3D shatter pieces for the last planet
    if (explosionT > 0) {
      const lastP = planet3D[planet3D.length - 1];
      const baseProj = project(lastP.x3d, lastP.y3d, lastP.z3d, cameraX, cameraY, cameraZ);
      
      if (!hasExploded && baseProj) {
        triggerExplosion(baseProj.x, baseProj.y, lastP.colors);
      }

      // Solar burst flash — a radial bloom at the explosion epicentre
      if (baseProj) {
        const flashAlpha = Math.max(0, 1 - explosionT * 2.5);
        if (flashAlpha > 0) {
          const burstR = Math.min(W, H) * 0.35 * (1 + explosionT * 3);
          const flash = ctx.createRadialGradient(baseProj.x, baseProj.y, 0, baseProj.x, baseProj.y, burstR);
          flash.addColorStop(0,   `rgba(255, 255, 220, ${flashAlpha})`);
          flash.addColorStop(0.15, `rgba(255, 210, 60, ${flashAlpha * 0.85})`);
          flash.addColorStop(0.4,  `rgba(255, 100, 0, ${flashAlpha * 0.5})`);
          flash.addColorStop(0.7,  `rgba(180, 30, 0, ${flashAlpha * 0.2})`);
          flash.addColorStop(1,   'transparent');
          ctx.save();
          ctx.fillStyle = flash;
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(baseProj.x, baseProj.y, burstR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      const t = 1 - Math.pow(1 - explosionT, 3); // cubic ease out
      shatterParticles.forEach(p => {
        const px = lastP.x3d + p.dx * t;
        const py = lastP.y3d + p.dy * t;
        const pz = lastP.z3d + p.dz * t;

        const proj = project(px, py, pz, cameraX, cameraY, cameraZ);
        if (proj && proj.deltaZ > -1000) {
          const particleAlpha = Math.max(0, 1 - explosionT * 1.5);
          ctx.save();
          ctx.translate(proj.x, proj.y);
          ctx.rotate(p.rot + p.rotSpeed * t);
          ctx.globalAlpha = particleAlpha;
          const s = p.r * proj.scale;
          // Hot-core radial glow on each particle
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.5);
          grad.addColorStop(0,   '#fffff0');  // white-hot core
          grad.addColorStop(0.3, p.color);    // particle's assigned solar color
          grad.addColorStop(1,   'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, s * 1.5, 0, Math.PI * 2);
          ctx.fill();
          // Shard shape on top
          ctx.globalAlpha = particleAlpha * 0.8;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(-s, -s); ctx.lineTo(s, -s*0.5); ctx.lineTo(s*0.8, s); ctx.lineTo(-s*0.5, s*0.8);
          ctx.fill();
          ctx.restore();
        }
      });
    }

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
      if (i === activeIndex && Math.abs(closestDelta) < 2500 && (i !== PLANETS.length - 1 || explosionT === 0)) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Global Debris Physics & Render
    dCtx.clearRect(0, 0, W, H);
    if (hasExploded) {
      globalDebris.forEach(d => {
        // gravity & drag
        d.vy += 1200 * dt; 
        d.vy *= 0.98; 
        d.vx *= 0.98;
        
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.rot += d.rotV * dt;

        const screenY = d.y - window.scrollY;
        
        // Draw if on screen
        if (screenY > -50 && screenY < H + 50) {
          dCtx.save();
          dCtx.translate(d.x, screenY);
          dCtx.rotate(d.rot);
          dCtx.fillStyle = d.color;
          dCtx.globalAlpha = 0.9;
          dCtx.beginPath();
          const s = d.r;
          dCtx.moveTo(-s, -s); dCtx.lineTo(s, -s*0.5); dCtx.lineTo(s*0.8, s); dCtx.lineTo(-s*0.5, s*0.8);
          dCtx.fill();
          dCtx.restore();
        }
      });
    }

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
