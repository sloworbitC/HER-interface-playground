// ===== CORE LOGIC =====
const receiptLogs = document.getElementById('receipt-logs');
const mainCursor = document.getElementById('main-cursor');
const mainStage = document.getElementById('main-stage');
let scrollWarningShown = false;

let mouseX = 0, mouseY = 0;
let velX = 0, velY = 0;
let blurIntensity = 0;
let zIndexCounter = 200;
let systemLocked = false;

function getTime() {
  const d = new Date();
  return `[${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}]`;
}

function logEvent(action, detail, isAlert = false) {

  const p = document.createElement('div');
  p.className = 'log-entry' + (isAlert ? ' log-alert' : '');

  // random distortions
  const randomRotate = (Math.random() - 0.5) * 8;
  const randomX = (Math.random() - 0.5) * 14;
  const randomSize = 12 + Math.random() * 8;
  const randomY = (Math.random() - 0.5) * 6;
const randomWeight = 300 + Math.random() * 300;

p.style.transform =
  `translate(${randomX}px, ${randomY}px) rotate(${randomRotate}deg)`;
p.style.fontWeight = randomWeight;
  p.style.fontSize = `${randomSize}px`;

  p.innerHTML =
    `${getTime()} <b>${action}</b>: ${detail}`;

  receiptLogs.appendChild(p);

  if (receiptLogs.children.length > 12) {
    receiptLogs.removeChild(receiptLogs.firstChild);
  }

}

// ===== CURSOR ENGINE (TRAILS & JITTER) =====
const numTrails = 20;
const trails = [];
for (let i = 0; i < numTrails; i++) {
  let t = document.createElement('div');
  t.className = 'cursor-trail';
  document.body.appendChild(t);
  trails.push({ el: t, x: 0, y: 0 });
}

document.addEventListener('mousemove', (e) => {
  velX = e.clientX - mouseX;
  velY = e.clientY - mouseY;
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function renderCursor() {
  const speed = Math.abs(velX) + Math.abs(velY);
  let jX = 0, jY = 0;

  // Jitter if moving fast
  if (speed > 15) {
    jX = (Math.random() - 0.5) * (speed * 0.4);
    jY = (Math.random() - 0.5) * (speed * 0.4);
  }

  mainCursor.style.left = (mouseX + jX) + 'px';
  mainCursor.style.top = (mouseY + jY) + 'px';

  // Trail physics (Lerp)
  let prevX = mouseX, prevY = mouseY;
  trails.forEach((trail, i) => {
    trail.x += (prevX - trail.x) * 0.45;
    trail.y += (prevY - trail.y) * 0.45;

    trail.el.style.left = trail.x + 'px';
    trail.el.style.top = trail.y + 'px';

    // Trails fade out when moving slow, appear when fast
    const base = 1 - (i / numTrails);
    trail.el.style.opacity = base * 0.6;

    const scale = 1 - (i / numTrails) * 0.8;
    trail.el.style.transform =
      `translate(-50%, -50%) scale(${scale})`;

    prevX = trail.x;
    prevY = trail.y;
  });

  velX *= 0.7; velY *= 0.7;
  requestAnimationFrame(renderCursor);
}
renderCursor();

document.addEventListener('mousedown', () => mainCursor.classList.add('grip'));
document.addEventListener('mouseup', () => mainCursor.classList.remove('grip'));

// Habitual Click Punishment
document.addEventListener('click', (e) => {
  if (!e.target.closest('.draggable') && !e.target.closest('.target-zone')) {
    logEvent('CLICK', 'VOID INTERACTION', true);
    document.body.style.filter = 'invert(1)';
    setTimeout(() => document.body.style.filter = 'none', 50);
  }
});

// ===== SCROLL PUNISHMENT =====
window.addEventListener('wheel', (e) => {

  e.preventDefault();
  blurIntensity = Math.min(blurIntensity + 2, 20);
  mainStage.style.filter =
    `blur(${blurIntensity}px) contrast(150%) saturate(0)`;

  logEvent('SCROLL', `BLUR ++ (${blurIntensity})`, blurIntensity > 10);

  if (blurIntensity >= 11.5 && !systemLocked) {
    systemLocked = true;
    document.body.classList.add("system-lock");
    showScrollWarning();

  }

}, { passive: false });

function showScrollWarning() {
  const sticker = document.getElementById("scroll-warning");
  sticker.classList.remove("hide");   // ← critical
  sticker.classList.add("show");
  logEvent("SYSTEM", "WAIT – PROCESSING");
}

function hideScrollWarning() {
  const sticker = document.getElementById("scroll-warning");
  sticker.classList.remove("show");
  sticker.classList.add("hide");
}

setInterval(() => {

  if (blurIntensity > 0) {
    blurIntensity = Math.max(blurIntensity - 0.5, 0);
    mainStage.style.filter =
      blurIntensity > 0
        ? `blur(${blurIntensity}px) contrast(120%)`
        : 'none';

  }

  // reset system when blur ends
  if (blurIntensity === 0 && systemLocked) {

    systemLocked = false;
    document.body.classList.remove("system-lock");
    hideScrollWarning();
  }

}, 200);



// ===== DRAG & DROP ENGINE =====
const desk = document.getElementById("desk");

// Track start coordinates globally
let activeEl = null;
let startMouseX = 0, startMouseY = 0;
let startElLeft = 0, startElTop = 0;

function bringToFront(el) {
  zIndexCounter++;
  el.style.zIndex = zIndexCounter;
}

document.addEventListener("mousedown", (e) => {
  if (systemLocked) return;

  const el = e.target.closest(".draggable");
  if (!el) return;

  activeEl = el;

  // 1. Get exact pixel coordinates from Computed Styles. 
  // This smoothly handles percentages and ignores CSS transforms perfectly.
  const style = window.getComputedStyle(el);
  startElLeft = parseFloat(style.left) || 0;
  startElTop = parseFloat(style.top) || 0;

  // 2. Track where the mouse started
  startMouseX = e.clientX;
  startMouseY = e.clientY;

  // 3. Lock to left/top positioning and clear right/bottom anchors
  el.style.left = startElLeft + "px";
  el.style.top = startElTop + "px";
  el.style.right = "auto";
  el.style.bottom = "auto";

  bringToFront(el);
  el.classList.add("dragging");
  mainCursor.classList.add("grip");

  e.preventDefault();
  logEvent("GRAB", el.id || "UI_ELEMENT");
});

document.addEventListener("mousemove", (e) => {
  if (!activeEl) return;

  // 1. Calculate how far the mouse has moved (Delta)
  const deltaX = e.clientX - startMouseX;
  const deltaY = e.clientY - startMouseY;

  // 2. Apply delta to the initial layout position
  let newLeft = startElLeft + deltaX;
  let newTop = startElTop + deltaY;

  // 3. BOUNDARY CONSTRAINTS
  const deskRect = desk.getBoundingClientRect();
  const minVisible = 40; // Pixels that must stay on screen

  // Calculate the "danger zones"
  const minX = -activeEl.offsetWidth + minVisible;
  const minY = -activeEl.offsetHeight + minVisible;
  const maxX = deskRect.width - minVisible;
  const maxY = deskRect.height - minVisible;

  // 4. Clamp the values so they can't escape
  newLeft = Math.max(minX, Math.min(newLeft, maxX));
  newTop = Math.max(minY, Math.min(newTop, maxY));

  activeEl.style.left = newLeft + "px";
  activeEl.style.top = newTop + "px";

  // 5. Detachment logic for expanded notes
  if (activeEl.classList.contains("expanded")) {
    const target = document.querySelector(`.target-zone[data-id="${activeEl.id}"]`);
    if (target) {
      const r1 = activeEl.getBoundingClientRect();
      const r2 = target.getBoundingClientRect();
      const overlap = !(
        r1.right < r2.left ||
        r1.left > r2.right ||
        r1.bottom < r2.top ||
        r1.top > r2.bottom
      );

      if (!overlap) {
        activeEl.classList.remove("expanded");
        logEvent("SYSTEM", `${activeEl.id} DETACHED`);
      }
    }
  }
});

document.addEventListener("mouseup", () => {
  if (!activeEl) return;

  activeEl.classList.remove("dragging");
  mainCursor.classList.remove("grip");

  if (activeEl.classList.contains("action-memo")) {
    checkDropZone(activeEl);
  }

  activeEl = null;
});


// ===== HOVER CURSOR STATE (global, stable) =====
document.addEventListener("mousemove", (e) => {
  if (systemLocked) return;
  if (activeEl) return;

  const hoveredPhoto = e.target.closest(".photo-img");

  // PHOTO takes priority
  if (hoveredPhoto && !hoveredPhoto.classList.contains("developed")) {
    mainCursor.classList.remove("expand");
    return;
  }

  // normal draggable hover
  const hoverDrag = e.target.closest(".draggable");

  if (hoverDrag) mainCursor.classList.add("expand");
  else mainCursor.classList.remove("expand");
});


// In-place Expansion Logic
function checkDropZone(memo) {

  const targets = document.querySelectorAll('.target-zone');
  const rect1 = memo.getBoundingClientRect();

  targets.forEach(target => {

    if (target.dataset.id !== memo.id) return;

    const rect2 = target.getBoundingClientRect();

    const overlap =
      !(rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom);

    if (!overlap) return;

    // NEW: check if another draggable is covering the memo
    const blocked = [...document.querySelectorAll('.draggable')]
      .some(el => {

        if (el === memo) return false;

        const r = el.getBoundingClientRect();

        const collide =
          !(rect1.right < r.left ||
            rect1.left > r.right ||
            rect1.bottom < r.top ||
            rect1.top > r.bottom);

        return collide;

      });

    if (blocked) {
      memo.classList.add("blocked");
      setTimeout(() => memo.classList.remove("blocked"), 300);
      logEvent("SYSTEM", `${memo.id} BLOCKED`, true);
      return;

    }

    // only expand if nothing blocks it
    logEvent('SYSTEM', `${memo.id} RESTRUCTURED`, true);
    memo.classList.add("expanded");

  });

}


function updateRing(progress) {
  const ring = mainCursor.querySelector(".cursor-progress");
  if (!ring) return;

  const angle = (progress * 3.6) + "deg";
  ring.style.setProperty("--ring-angle", angle);
}




// ===== POLAROID MULTI-RING DEVELOPER =====
// ===== POLAROID DEVELOP (ring fill + gradual filter) =====

function isPolaroid(el) {
  return el.classList.contains("polaroid");
}

const photos = document.querySelectorAll(".photo-img");

function setRingProgress(pct){
  // pct: 0~100
  const ring = mainCursor.querySelector(".cursor-progress");
  if (!ring) return;
  ring.style.setProperty("--ring-angle", (pct * 3.6) + "deg");
}

function resetRing(){
  setRingProgress(0);
  mainCursor.classList.remove("ring-active");
}

photos.forEach((photo) => {
  let devProgress = 0;
  let devInterval = null;

  const startDevelop = () => {
    if (systemLocked) return;
    if (activeEl) return; 
    if (photo.classList.contains("developed")) return;

    mainCursor.classList.add("ring-active");
    mainCursor.classList.remove("expand");

    setRingProgress(devProgress);

    const photoId = photo.closest(".polaroid")?.id || "PHOTO";
    logEvent("FOCUS", photoId);

    clearInterval(devInterval);
    devInterval = setInterval(() => {

      if (systemLocked || activeEl) return;

      const speed = Math.abs(velX) + Math.abs(velY);
   
      if (speed < 6) devProgress += 1.2;
      else devProgress -= 1.5;

      devProgress = Math.max(0, Math.min(devProgress, 100));

      // ring fill
      setRingProgress(devProgress);

      const g = 50 - (devProgress * 0.5);        // 50% -> 0%
      const b = 0.2 + (devProgress / 100) * 0.8; // 0.2 -> 1.0
      const c = 0.3 + (devProgress / 100) * 1.0; // 0.3 -> 1.3
      const s = 0.2 + (devProgress / 100) * 0.9; // 0.2 -> 1.1

      photo.style.filter = `grayscale(${g}%) brightness(${b}) contrast(${c}) saturate(${s}) sepia(0.2)`;

      if (devProgress >= 100) {
        clearInterval(devInterval);
        devInterval = null;

        photo.classList.add("developed");
        // 交回 CSS 的 developed 規則（如果你希望用 CSS 控）
        photo.style.filter = "";

        resetRing();

        logEvent("RENDER", photoId, true);
      }
    }, 50);
  };

  const stopDevelop = (reset = true) => {
    clearInterval(devInterval);
    devInterval = null;

    if (photo.classList.contains("developed")) {
      resetRing();
      return;
    }

    if (reset) {
      if (devProgress > 0) {
        const photoId = photo.closest(".polaroid")?.id || "PHOTO";
        logEvent("ABORT", `FOCUS LOST AT ${Math.floor(devProgress)}% (${photoId})`, true);
      }
      devProgress = 0;
      photo.style.filter = "";
      resetRing();
    }
  };

  photo.addEventListener("mouseenter", startDevelop);

  photo.addEventListener("mouseleave", () => {
    stopDevelop(true);
  });
});

const lockObserver = setInterval(() => {
  if (systemLocked) {
    resetRing();
  }
}, 100);


function randRange(min, max){
  return Math.random() * (max - min) + min;
}

function shredText(selector, options = {}) {
  const el = document.querySelector(selector);
  if (!el) return;

  const text = el.textContent;
  el.innerHTML = "";

  const baseStyle = getComputedStyle(el);

  const baseSize = parseFloat(baseStyle.fontSize) || 16;
  const baseSpacing = parseFloat(baseStyle.letterSpacing) || 0;
  const baseWeight = parseInt(baseStyle.fontWeight) || 400;
  const baseOpacity = parseFloat(baseStyle.opacity) || 1;

  const settings = {
    x: options.x ?? 4,
    y: options.y ?? 4,
    rotation: options.rotation ?? 6,
    size: options.size ?? 2,
    opacity: options.opacity ?? 0.2,
    weight: options.weight ?? 200,
    spacing: options.spacing ?? 1
  };

  [...text].forEach(char => {
    if (char === " ") {
      el.appendChild(document.createTextNode(" "));
      return;
    }

    const span = document.createElement("span");
    span.className = "shred-letter";
    span.textContent = char;

    // all are total ranges centered on base value
    const x = randRange(-settings.x / 2, settings.x / 2);
    const y = randRange(-settings.y / 2, settings.y / 2);
    const rot = randRange(-settings.rotation / 2, settings.rotation / 2);

    const sizeOffset = randRange(-settings.size / 2, settings.size / 2);
    span.style.fontSize = (baseSize + sizeOffset) + "px";

    const spacingOffset = randRange(-settings.spacing / 2, settings.spacing / 2);
    span.style.letterSpacing = (baseSpacing + spacingOffset) + "px";

    const weightOffset = randRange(-settings.weight / 2, settings.weight / 2);
    const weight = Math.max(100, Math.min(900, baseWeight + weightOffset));
    span.style.fontWeight = weight;

    const opacityOffset = randRange(-settings.opacity / 2, settings.opacity / 2);
    const opacity = Math.max(0, Math.min(1, baseOpacity + opacityOffset));
    span.style.opacity = opacity;

    span.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;

    el.appendChild(span);
  });
}

shredText("#memo_rightplace .shred-letter", {
  size: 30,
  rotation: 5,
  x: 6,
  y: 4,
  spacing: 2,
  weight: 150,
  opacity: 1.5
});

shredText("#memo_hci .shred-letter", {
  size: 30,
  rotation: 5,
  x: 6,
  y: 4,
  spacing: 2,
  weight: 500,
  opacity: 1
});



shredText("#memo_messup .shred-letter", {
  size: 15,
  rotation: 3,
  x: 3,
  y: 3,
  spacing: 1,
  weight: 100,
  opacity: 1
});