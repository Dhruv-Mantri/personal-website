# Personal Portfolio Website — Design & Architecture Documentation

## 1. Overview
This portfolio is designed as a highly immersive, premium space-themed web experience. Rather than a traditional static layout, it utilizes dynamic canvas elements, localized scrolljacking, and continuous interaction mechanics to create a "scrollytelling" journey. The design focuses on dark mode aesthetics, glassmorphism, and neon gradients to communicate a modern, forward-thinking engineering brand.

## 2. Core Technologies
- **Structure**: Semantic HTML5.
- **Styling**: Vanilla CSS3, utilizing CSS Variables (Custom Properties) for a centralized design system. Avoids utility-class frameworks to maintain maximum flexibility over complex animations and responsive layouts.
- **Logic & Interactions**: Vanilla JavaScript (ES6+).
- **Graphics & Rendering**: HTML5 `<canvas>` API for high-performance procedural animations (Big Bang sequence, warp starfield, planet journey).

## 3. Thematic Design & Styling
The website relies heavily on an astronomical theme, reflecting scale, exploration, and cutting-edge technology.
- **Color Palette**: Deep space backgrounds (`#07070f`), accented with vibrant neon purples, blues, and teals.
- **Glassmorphism**: Elements like cards, the navbar, and HUD labels use `background: rgba(...)` paired with `backdrop-filter: blur(12px)` to mimic frosted glass floating in space.
- **Typography**: The *Inter* font family is used globally for its clean, geometric, and highly legible characteristics, emphasizing a modern tech aesthetic.
- **Ambient Lighting**: Fixed, heavily blurred "nebula" orbs (`filter: blur(120px)`) float in the background, providing dynamic ambient backlighting that drifts independently via CSS animations.

## 4. Key Sections & Technical Architecture

### 4.1. Big Bang Intro Sequence (`intro.js`)
- **Behavior**: When the user first loads the site, they are greeted with a procedural cinematic canvas animation simulating a "Big Bang" or constellation drawing, ending in a white flash transition to the main site.
- **Session Management**: Uses `sessionStorage` with a 30-minute cooldown so returning users aren't repeatedly forced to watch the intro during the same browsing session.

### 4.2. Global Warp Speed Starfield (`script.js`)
- **Implementation**: A fixed `<canvas id="starfield">` sits at `z-index: 0` behind all content.
- **Interactivity**: The starfield renders hundreds of 3D-projected stars. The base speed is constant, but hooking into the `window.addEventListener('scroll')` event modifies the `scrollSpeed` multiplier based on scroll velocity. This creates a hyper-drive "warp" effect when the user scrolls quickly.

### 4.3. Sticky-Scroll Experience Journey (`space.js` / `styles.css`)
- **Scrollytelling Mechanics**: The Experience section spans `1000vh`. A child `.sticky-viewport` is locked using `position: sticky; top: 0; height: 100vh;`.
- **Functionality**: As the user scrolls down the page, their actual scroll position is translated into progression along a 3D path. This creates a cinematic planet-hopping effect.
- **Content Coordination**: DOM elements (`.planet-content`) dynamically transition their opacity, visibility, and scale in sync with the canvas animation, fading in smoothly when the "camera" stops at a designated timeline milestone.

### 4.4. Edge-to-Edge Project Carousel
- **Layout**: The "Projects" section uses a horizontal slider that breaks out of the standard `1100px` container to bleed to the edges of the viewport (`width: 100%`).
- **Alignment Math**: The first project card is perfectly aligned with the centered `.container` content using a dynamic CSS calculation: `padding-left: max(1.5rem, calc((100% - 1100px) / 2 + 1.5rem))`.
- **Square Cards**: Cards are locked to a perfect square (`aspect-ratio: 1 / 1`) with a fixed width of `350px`, providing ample space for descriptions and technology tags.
- **Interaction**: Native scrollbars are hidden. Instead, `script.js` listens to `mousemove` events on the wrapper. Hovering near the left or right edges triggers a continuous `requestAnimationFrame` scroll loop, resulting in a smooth, frictionless navigation experience.

### 4.5. Scroll-Reveal & Parallax Grids
- **Staggered Entrances**: The Skills and Awards sections utilize the `IntersectionObserver` API. When sections enter the viewport, elements slide up and fade in. Siblings are automatically staggered using dynamic `transition-delay` based on their index.
- **Card Tilt (Mouse Parallax)**: Project cards track the mouse position on hover, applying a subtle 3D `rotateX` and `rotateY` transform via `perspective(600px)` to make the cards feel tangible and responsive.

## 5. Responsiveness & Accessibility
- **Fluid Typography & Spacing**: Fonts scale smoothly across device sizes using CSS `clamp()` functions (e.g., `font-size: clamp(2rem, 4vw, 2.8rem)`).
- **Mobile Navigation**: The desktop navbar gracefully collapses into a hamburger menu layout on screens smaller than `768px`.
- **Performance**: High-frequency visual updates (like the starfield, edge-hover scroll, and planet journey) are rigorously batched using `requestAnimationFrame` to maintain 60fps and avoid main-thread jank. Scroll event listeners are flagged as `{ passive: true }` to ensure smooth native scrolling.
