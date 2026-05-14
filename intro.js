/* ─── intro.js ─── */
(function() {
  const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
  const lastPlayed = sessionStorage.getItem('lastIntroPlayed');
  const now = Date.now();

  const overlay = document.getElementById('intro-overlay');
  const whiteFlash = document.getElementById('white-flash');
  
  if (!overlay || !whiteFlash) return;

  if (lastPlayed && (now - parseInt(lastPlayed, 10)) < COOLDOWN_MS) {
    // Skip intro if within 5 mins
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

    let energy = 0;
    let phase = 'buildup'; // 'buildup', 'explosion', 'done'
    let particles = [];
    
    let currentMouse = { x: W/2, y: H/2 };
    let lastMouse = { x: W/2, y: H/2 };
    let isMoving = false;
    let moveTimeout = null;

    // Build energy based on mouse movement distance (shake)
    window.addEventListener('mousemove', (e) => {
      if (phase !== 'buildup') return;
      
      currentMouse.x = e.clientX;
      currentMouse.y = e.clientY;
      
      let dx = currentMouse.x - lastMouse.x;
      let dy = currentMouse.y - lastMouse.y;
      let dist = Math.sqrt(dx*dx + dy*dy);
      
      energy += dist * 0.08; // sensitivity
      if (energy > 500) energy = 500;

      // Spawn extra sparks precisely on mouse move
      let spawnCount = Math.floor(Math.random() * 3) + 1 + Math.floor(energy * 0.05);
      for (let i = 0; i < spawnCount; i++) {
        particles.push(new Spark(currentMouse.x, currentMouse.y, energy));
      }

      lastMouse.x = currentMouse.x;
      lastMouse.y = currentMouse.y;
      
      isMoving = true;
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => { isMoving = false; }, 100);
    });

    class Spark {
      constructor(x, y, e) {
        let spread = e * 0.5;
        this.x = x + (Math.random() - 0.5) * spread;
        this.y = y + (Math.random() - 0.5) * spread;
        
        let speedMult = e * 0.05 + 1;
        this.vx = (Math.random() - 0.5) * 4 * speedMult;
        this.vy = (Math.random() - 0.5) * 4 * speedMult;
        
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.01 + ((100 - e) * 0.0002);
        
        this.size = Math.random() * (e * 0.06 + 1) + 1;
        // Colors from yellow to bright orange to white based on energy
        let hue = Math.random() * 40 + 10; 
        let light = 50 + (e * 0.5); // Gets whiter at high energy
        this.color = `hsl(${hue}, 100%, ${light}%)`;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
      }
      draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }

    class ExplosionParticle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 30 + 10;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.size = Math.random() * 6 + 2;
        const colors = ['#ffffff', '#ffffff', '#00d4ff', '#7c5cfc'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.life = 1.0;
        this.decay = Math.random() * 0.015 + 0.005;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.size *= 0.96;
        this.life -= this.decay;
      }
      draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }

    function render() {
      // Create a slight trailing effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, W, H);

      if (phase === 'buildup') {
        if (!isMoving) {
          energy -= 0.4; // Decay energy when not moving
          if (energy < 0) energy = 0;
        }

        // Add ambient sparks based on energy
        if (energy > 10) {
          let ambientCount = Math.floor(energy / 15);
          for (let i = 0; i < ambientCount; i++) {
            particles.push(new Spark(currentMouse.x, currentMouse.y, energy));
          }
        }

        // Trigger Explosion
        if (energy >= 500) {
          phase = 'explosion';
          // Massive burst
          for (let i = 0; i < 600; i++) {
            particles.push(new ExplosionParticle(currentMouse.x, currentMouse.y));
          }
          
          // Flash white nearly immediately
          setTimeout(() => {
            whiteFlash.classList.add('flash');
            
            // Create and position the clone
            const heroName = document.querySelector('.hero-name');
            const rect = heroName.getBoundingClientRect();
            
            const nameClone = heroName.cloneNode(false);
            nameClone.style.position = 'absolute';
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

            // Fade in first name
            setTimeout(() => {
              firstSpan.style.opacity = '1';
            }, 2000);
            
            // Fade in last name after 1 second
            setTimeout(() => {
              lastSpan.style.opacity = '1';
            }, 4000);
            
            // Hold the flash for 6 seconds total
            setTimeout(() => {
              phase = 'done';
              endSequence();
            }, 6000); 

          }, 50); // 50ms delay for near-instant flash
        }
      }

      // Update & Draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.update();
        if (p.life <= 0 || p.size <= 0.1) {
          particles.splice(i, 1);
        } else {
          p.draw(ctx);
        }
      }

      if (phase !== 'done') {
        requestAnimationFrame(render);
      }
    }

    requestAnimationFrame(render);
  }
})();
