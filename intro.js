/* ─── intro.js ─── */
(function() {
  // Always force the page to the very top before anything renders
  // This prevents the browser's scroll-restoration from starting mid-page
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
  const lastPlayed = sessionStorage.getItem('lastIntroPlayed');
  const now = Date.now();

  const overlay = document.getElementById('intro-overlay');
  
  if (!overlay) return;

  if (lastPlayed && (now - parseInt(lastPlayed, 10)) < COOLDOWN_MS) {
    // Skip intro if within 30 mins
    skipIntro();
    return;
  }

  // Initialize Big Bang
  initIntro();

  function skipIntro() {
    document.body.classList.remove('no-scroll');
    overlay.style.display = 'none';
  }

  function endSequence() {
    sessionStorage.setItem('lastIntroPlayed', Date.now().toString());
    overlay.style.opacity = '0';
    setTimeout(() => {
      skipIntro();
    }, 1500); // Wait for CSS transition opacity 1.5s
  }

  function initIntro() {
    const canvas = document.getElementById('intro-canvas');
    const ctx = canvas.getContext('2d');
    let W, H;
    
    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    let phase = 'constellation'; 

    // Constellation state
    let constelPoints = [];
    let constelLines = [];
    let pointOrder = [];
    let lineOrder = [];
    let polarisPos = {x:0, y:0};
    let constelTimer = 0;
    let nameRevealTimer = 0;
    let ringPulse = 0;
    
    let camX = 0, camY = 0;
    let targetCamX = 0, targetCamY = 0;
    let camScale = 1;
    let targetCamScale = 1;
    
    let typedText = "";
    let fullText = "--> This is the North Star\n--> Also known as Dhruv\n\nClick to continue";
    let typeIndex = 0;
    let typeInterval = null;

    function initConstellation() {
      const cx = W / 2;
      const cy = H / 2;
      const scale = Math.min(W, H) * 0.25;
      
      const basePoints = [
        // Ursa Minor (0-6)
        {x: 0.6, y: -0.5}, // 0 (Polaris)
        {x: 0.3, y: -0.3},
        {x: 0.1, y: -0.1},
        {x: -0.2, y: -0.0},
        {x: -0.4, y: 0.3},
        {x: -0.1, y: 0.5},
        {x: 0.1, y: 0.2},
        // Ursa Major (7-13)
        {x: -0.3, y: -1.2},
        {x: -0.5, y: -1.0},
        {x: -0.8, y: -0.9},
        {x: -0.6, y: -1.3},
        {x: -1.0, y: -0.7},
        {x: -1.2, y: -0.4},
        {x: -1.5, y: -0.2},
        // Cassiopeia (14-18)
        {x: 1.2, y: 0.2},
        {x: 1.0, y: 0.5},
        {x: 0.8, y: 0.3},
        {x: 0.6, y: 0.7},
        {x: 0.4, y: 0.5}
      ];
      constelPoints = basePoints.map((p, i) => ({
        x: cx + p.x * scale,
        y: cy + p.y * scale,
        isPolaris: i === 0
      }));
      polarisPos = constelPoints[0];
      constelLines = [ 
        [0,1], [1,2], [2,3], [3,4], [4,5], [5,6], [6,3], // Ursa Minor
        [7,8], [8,9], [9,10], [10,7], [9,11], [11,12], [12,13], // Ursa Major
        [14,15], [15,16], [16,17], [17,18] // Cassiopeia
      ];
      
      // Shuffle point fade-in order
      pointOrder = Array.from({length: constelPoints.length}, (_, i) => i);
      for (let i = pointOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pointOrder[i], pointOrder[j]] = [pointOrder[j], pointOrder[i]];
      }
      
      // Shuffle line draw order
      lineOrder = Array.from({length: constelLines.length}, (_, i) => i);
      for (let i = lineOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lineOrder[i], lineOrder[j]] = [lineOrder[j], lineOrder[i]];
      }

      canvas.style.cursor = 'crosshair';
    }

    function showNameCutscene() {
      canvas.style.pointerEvents = 'none';
      
      const heroName = document.querySelector('.hero-name');
      // getBoundingClientRect is only reliable when the page is at scroll=0.
      // We force scroll to top before computing so the clone is always on-screen.
      window.scrollTo(0, 0);
      const rect = heroName.getBoundingClientRect();
      
      const nameClone = heroName.cloneNode(false);
      nameClone.style.position = 'fixed'; // fixed instead of absolute so it tracks viewport, not overlay scroll
      nameClone.style.top = rect.top + 'px';
      nameClone.style.left = rect.left + 'px';
      nameClone.style.width = rect.width + 'px';
      nameClone.style.height = rect.height + 'px';
      nameClone.style.margin = '0';
      nameClone.style.animation = 'none';
      nameClone.style.zIndex = '10001';
      nameClone.style.background = 'none';
      nameClone.style.webkitTextFillColor = '#000';
      nameClone.style.color = '#000';
      
      const firstSpan = document.createElement('span');
      firstSpan.textContent = 'Dhruv';
      firstSpan.style.opacity = '0';
      firstSpan.style.transition = 'opacity 0.8s ease';
      
      const space = document.createTextNode(' ');
      
      const lastSpan = document.createElement('span');
      lastSpan.textContent = 'Mantri';
      lastSpan.style.opacity = '0';
      lastSpan.style.transition = 'opacity 0.8s ease';

      nameClone.appendChild(firstSpan);
      nameClone.appendChild(space);
      nameClone.appendChild(lastSpan);
      overlay.appendChild(nameClone);

      // Wait 1s for constellation to fade, then reveal names
      setTimeout(() => { firstSpan.style.opacity = '1'; }, 3000);
      setTimeout(() => { lastSpan.style.opacity = '1'; }, 4500);
      
      setTimeout(() => {
        phase = 'done';
        endSequence();
      }, 7000); 
    }

    // No mousemove listener needed for buildup phase

    const advanceIntro = (e) => {
      let clientX = e.clientX;
      let clientY = e.clientY;

      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }

      if (phase === 'constellation' && constelTimer > 410) { // 19 points * 10 + 40 + 18 lines * 10
        let screenX = (polarisPos.x - camX) * camScale;
        let screenY = (polarisPos.y - camY) * camScale;
        let dx = clientX - screenX;
        let dy = clientY - screenY;
        if (Math.sqrt(dx*dx + dy*dy) < 60) {
          phase = 'zoom';
          targetCamScale = 2.5;
          targetCamX = polarisPos.x - (W * 0.2) / targetCamScale;
          targetCamY = polarisPos.y - (H * 0.3) / targetCamScale;
          canvas.style.cursor = 'default';
        }
      } else if (phase === 'typing') {
        if (typeIndex < fullText.length) {
          typeIndex = fullText.length;
          typedText = fullText;
        } else {
          phase = 'name_reveal';
          showNameCutscene();
        }
      }
    };
    canvas.addEventListener('click', advanceIntro);
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      advanceIntro(e);
    }, { passive: false });

    initConstellation();

    function render() {
      if (phase === 'constellation' || phase === 'zoom' || phase === 'typing' || phase === 'name_reveal') {
        ctx.clearRect(0, 0, W, H);
        
        if (phase === 'zoom') {
          camX += (targetCamX - camX) * 0.05;
          camY += (targetCamY - camY) * 0.05;
          camScale += (targetCamScale - camScale) * 0.05;
          
          if (Math.abs(targetCamScale - camScale) < 0.01) {
            phase = 'typing';
            typeInterval = setInterval(() => {
              if (typeIndex < fullText.length) {
                typedText += fullText[typeIndex];
                typeIndex++;
              } else clearInterval(typeInterval);
            }, 50);
          }
        }

        ctx.save();
        ctx.scale(camScale, camScale);
        ctx.translate(-camX, -camY);
        
        constelTimer += 1;
        if (phase === 'name_reveal') nameRevealTimer += 1;
        
        // Over 50 frames (~0.85s), fade everything except Polaris to 0
        let fadeOutAlpha = (phase === 'name_reveal') 
          ? Math.max(0, 1 - (nameRevealTimer / 120)) 
          : 1;
        
        let N = constelPoints.length;
        let M = constelLines.length;
        let pointsDoneTime = N * 10 + 40; 
        let linesDoneTime = pointsDoneTime + M * 10;
        
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#000';
        ctx.lineWidth = 1.5;
        
        // Lines — fade out completely on name_reveal
        if (constelTimer > pointsDoneTime && fadeOutAlpha > 0) {
          let lineAnimTimer = constelTimer - pointsDoneTime;
          let currentSegIndex = Math.floor(lineAnimTimer / 10);
          
          for (let j = 0; j <= currentSegIndex && j < M; j++) {
            let actualSegment = lineOrder[j];
            let pair = constelLines[actualSegment];
            let p1 = constelPoints[pair[0]];
            let p2 = constelPoints[pair[1]];
            
            ctx.globalAlpha = fadeOutAlpha;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            
            if (j === currentSegIndex && phase !== 'name_reveal') {
              let progress = Math.min(1, Math.max(0, (lineAnimTimer % 10) / 10));
              let curX = p1.x + (p2.x - p1.x) * progress;
              let curY = p1.y + (p2.y - p1.y) * progress;
              ctx.lineTo(curX, curY);
            } else {
              ctx.lineTo(p2.x, p2.y);
            }
            ctx.stroke();
          }
        }
        
        // Points — non-Polaris fade out, Polaris always stays at full opacity
        constelPoints.forEach((p, i) => {
          let orderIndex = pointOrder.indexOf(i);
          let pStart = orderIndex * 10;
          let pAlpha = Math.min(1, Math.max(0, (constelTimer - pStart) / 40)); 
          
          if (p.isPolaris) {
            // Polaris stays fully visible always
            ctx.globalAlpha = 1.0;
          } else {
            // All other dots fade out during name_reveal
            ctx.globalAlpha = pAlpha * fadeOutAlpha;
            if (ctx.globalAlpha <= 0) return;
          }
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
          ctx.fill();
          
          if (p.isPolaris && constelTimer > linesDoneTime && phase !== 'name_reveal') {
            ringPulse += 0.05;
            let r = 12 + Math.sin(ringPulse) * 4;
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI*2);
            ctx.stroke();
          }
        });
        
        ctx.restore();

        // Text: only during zoom/typing, fully vanishes in name_reveal
        if ((phase === 'typing' || phase === 'zoom') && fadeOutAlpha > 0) {
          ctx.fillStyle = '#000';
          let lines = typedText.split('\n');
          let screenX = (polarisPos.x - camX) * camScale;
          let screenY = (polarisPos.y - camY) * camScale;
          
          lines.forEach((line, i) => {
            if (i === 3) {
              // "Click to continue" flashes
              ctx.font = 'bold 16px "Courier New", Courier, monospace';
              ctx.globalAlpha = 0.5 + 0.5 * Math.sin(constelTimer * 0.1);
            } else {
              ctx.font = 'bold 22px "Courier New", Courier, monospace';
              ctx.globalAlpha = 1.0;
            }
            ctx.fillText(line, screenX + 40, screenY + 20 + (i * 32));
          });
          ctx.globalAlpha = 1.0;
        }
      }

      if (phase !== 'done') requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }
})();
