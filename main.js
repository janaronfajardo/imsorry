(() => {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  let DPR = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0, height = 0;

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(width * DPR));
    canvas.height = Math.max(1, Math.floor(height * DPR));
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  function drawHeartPath(c, size) {
    const s = size / 15;
    c.beginPath();
    c.moveTo(0, -3 * s);
    c.bezierCurveTo(3 * s, -6 * s, 9 * s, -2 * s, 0, 8 * s);
    c.bezierCurveTo(-9 * s, -2 * s, -3 * s, -6 * s, 0, -3 * s);
    c.closePath();
  }

  class Heart {
    constructor(init = false) { this.reset(init); }
    reset(init = false) {
      this.x = Math.random() * width;
      this.y = init ? Math.random() * height : height + 20 + Math.random() * 60;
      const scale = width < 480 ? 0.85 : 1;
      this.size = (6 + Math.random() * 12) * scale;
      this.alpha = 0.5 + Math.random() * 0.5;
      this.speed = 14 + Math.random() * 24; // px/sec
      this.swing = 0.6 + Math.random() * 0.8; // sway factor
      this.rot = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() * 1.4 - 0.7) * 0.6;
      this.hue = 346 + Math.random() * 20; // rose hues
    }
    update(dt, t) {
      this.y -= this.speed * dt;
      this.x += Math.sin(t * 0.7 + this.y * 0.02) * this.swing;
      this.rot += this.rotSpeed * dt;
      if (this.y < -40) this.reset(false);
    }
    draw(c) {
      c.save();
      c.globalAlpha = this.alpha * 0.9;
      c.translate(this.x, this.y);
      c.rotate(this.rot);
      c.fillStyle = `hsla(${this.hue},80%,62%,${this.alpha})`;
      drawHeartPath(c, this.size);
      c.fill();
      c.restore();
    }
  }

  const hearts = [];
  function setDensity() {
    const target = Math.min(Math.max(24, Math.floor((width * height) / 5200)), 110);
    if (hearts.length < target) {
      const toAdd = target - hearts.length;
      for (let i = 0; i < toAdd; i++) hearts.push(new Heart(true));
    } else if (hearts.length > target) {
      hearts.length = target;
    }
  }
  setDensity();
  window.addEventListener('resize', setDensity, { passive: true });

  let running = !prefersReduced;
  let last = performance.now();
  function loop(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 1 / 30); // clamp for stability
    last = now;

    ctx.clearRect(0, 0, width, height);
    const grd = ctx.createLinearGradient(0, 0, 0, height);
    grd.addColorStop(0, 'rgba(255,255,255,0.35)');
    grd.addColorStop(1, 'rgba(255,240,244,0.15)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);

    const t = now / 1000;
    for (let i = 0; i < hearts.length; i++) {
      const h = hearts[i];
      h.update(dt, t);
      h.draw(ctx);
    }

    requestAnimationFrame(loop);
  }
  if (!prefersReduced) requestAnimationFrame(loop);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
    } else {
      if (prefersReduced) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }
  });

  // UI interactions
  const yes = document.getElementById('btn-yes');
  const later = document.getElementById('btn-later');
  const card = document.getElementById('card');
  const mainEl = document.querySelector('main');
  const modal = document.getElementById('video-modal');
  const modalBackdrop = modal ? modal.querySelector('[data-modal-backdrop]') : null;
  const modalPanel = modal ? modal.querySelector('[data-modal-panel]') : null;
  const modalClose = document.getElementById('modal-close');
  const videoEl = document.getElementById('apology-video');
  if (later) { later.classList.add('relative', 'z-20'); }
  if (yes) { yes.classList.add('relative', 'z-20'); }

  function openModal() {
    if (!modal) return;
    modal.classList.remove('hidden');
    // allow layout to apply before transitions
    requestAnimationFrame(() => {
      modalBackdrop && modalBackdrop.classList.add('opacity-100');
      if (modalPanel) {
        modalPanel.classList.remove('opacity-0', 'scale-95');
        modalPanel.classList.add('opacity-100', 'scale-100');
      }
      mainEl && mainEl.classList.add('blur-sm', 'scale-[.98]');
      if (videoEl) {
        try {
          videoEl.currentTime = 0;
          const p = videoEl.play();
          if (p && typeof p.then === 'function') p.catch(() => {});
        } catch (_) {}
      }
    });
  }

  function closeModal() {
    if (!modal) return;
    modalBackdrop && modalBackdrop.classList.remove('opacity-100');
    if (modalPanel) {
      modalPanel.classList.remove('opacity-100', 'scale-100');
      modalPanel.classList.add('opacity-0', 'scale-95');
    }
    mainEl && mainEl.classList.remove('blur-sm', 'scale-[.98]');
    setTimeout(() => {
      try { videoEl && videoEl.pause(); } catch (_) {}
      modal.classList.add('hidden');
    }, 250);
  }

  function ripple(e, el) {
    const rect = el.getBoundingClientRect();
    const cx = (e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? (rect.left + rect.width / 2)) - rect.left;
    const cy = (e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? (rect.top + rect.height / 2)) - rect.top;

    const host = document.createElement('span');
    host.style.position = 'absolute';
    host.style.inset = '0';
    host.style.overflow = 'hidden';
    host.style.borderRadius = getComputedStyle(el).borderRadius;

    const circle = document.createElement('span');
    const d = Math.max(rect.width, rect.height) * 1.8;
    Object.assign(circle.style, {
      position: 'absolute',
      left: cx + 'px',
      top: cy + 'px',
      width: d + 'px',
      height: d + 'px',
      marginLeft: -(d / 2) + 'px',
      marginTop: -(d / 2) + 'px',
      background: 'rgba(255,255,255,0.35)',
      borderRadius: '50%',
      transform: 'scale(0)',
      transition: 'transform 500ms ease-out, opacity 700ms ease-out',
    });

    host.appendChild(circle);
    el.appendChild(host);
    requestAnimationFrame(() => {
      circle.style.transform = 'scale(1)';
      circle.style.opacity = '0';
    });
    setTimeout(() => { try { el.removeChild(host); } catch (_) {} }, 800);
  }

  yes?.addEventListener('click', (e) => {
    ripple(e, yes);
    try { navigator.vibrate && navigator.vibrate(20); } catch (_) {}
    celebrate(card);
    // attempt immediate play on user gesture for best autoplay compatibility
    if (videoEl) {
      try {
        videoEl.currentTime = 0;
        const p = videoEl.play();
        if (p && typeof p.then === 'function') p.catch(() => {});
      } catch (_) {}
    }
    openModal();
    try { localStorage.setItem('apology_status', 'bati'); } catch (_) {}
  }, { passive: true });

  const witty = ['dili ko', 'sure ka?', 'sige na baby', 'pls'];
  let clickN = 0;
  later?.addEventListener('click', (e) => {
    ripple(e, later);
    try { navigator.vibrate && navigator.vibrate([8, 30, 8]); } catch (_) {}
    clickN++;
    later.textContent = witty[clickN % witty.length];
    // wobble animation for fun
    later.classList.add('animate-wobble');
    setTimeout(() => later.classList.remove('animate-wobble'), 520);
    // playful hop inside the card bounds using accumulated offset
    const pr = card.getBoundingClientRect();
    const r = later.getBoundingClientRect();
    const cur = later.dataset.offset ? JSON.parse(later.dataset.offset) : { x: 0, y: 0 };
    const step = 36 + Math.random() * 44;
    const ang = Math.random() * Math.PI * 2;
    let dx = Math.cos(ang) * step;
    let dy = Math.sin(ang) * step;
    // predict new rect and clamp to parent with padding
    const pad = 8;
    let newLeft = r.left + dx;
    let newRight = r.right + dx;
    let newTop = r.top + dy;
    let newBottom = r.bottom + dy;
    if (newLeft < pr.left + pad) dx += (pr.left + pad) - newLeft;
    if (newRight > pr.right - pad) dx -= newRight - (pr.right - pad);
    if (newTop < pr.top + pad) dy += (pr.top + pad) - newTop;
    // keep a little more headroom from the card bottom to avoid footer overlap
    const bottomLimit = pr.bottom - pad - 56;
    if (newBottom > bottomLimit) dy -= newBottom - bottomLimit;
    const nx = cur.x + dx;
    const ny = cur.y + dy;
    later.dataset.offset = JSON.stringify({ x: nx, y: ny });
    later.style.transform = `translate(${nx}px, ${ny}px)`;
  }, { passive: true });

  // modal close handlers
  modalClose?.addEventListener('click', closeModal, { passive: true });
  modalBackdrop?.addEventListener('click', closeModal, { passive: true });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  function celebrate(container) {
    const r = container.getBoundingClientRect();
    const origin = { x: r.left + r.width / 2, y: r.top + r.height / 3 };
    spawnBurst(origin.x, origin.y, 26);
  }

  function spawnBurst(x, y, n) {
    const particles = [];
    for (let i = 0; i < n; i++) {
      const ang = Math.PI * 2 * (i / n) + Math.random() * 0.2;
      particles.push({
        x, y,
        vx: Math.cos(ang) * (80 + Math.random() * 120),
        vy: Math.sin(ang) * (80 + Math.random() * 120) - 40,
        g: 160 + Math.random() * 80,
        life: 0,
        ttl: 1.2 + Math.random() * 0.4,
        size: 6 + Math.random() * 8,
        hue: 345 + Math.random() * 30,
      });
    }

    const overlay = document.createElement('canvas');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '10';
    document.body.appendChild(overlay);
    const octx = overlay.getContext('2d');

    function setSize() {
      overlay.width = Math.floor(window.innerWidth * DPR);
      overlay.height = Math.floor(window.innerHeight * DPR);
      octx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    setSize();
    const onResize = () => setSize();
    window.addEventListener('resize', onResize, { passive: true });

    let start = performance.now();
    function frame(now) {
      const dt = 1 / 60;
      const t = (now - start) / 1000;
      octx.clearRect(0, 0, overlay.width, overlay.height);
      particles.forEach(p => {
        p.life += dt;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const a = Math.max(0, 1 - p.life / p.ttl);
        octx.save();
        octx.globalAlpha = a;
        octx.translate(p.x, p.y);
        octx.rotate(p.life * 6);
        octx.fillStyle = `hsl(${p.hue},80%,60%)`;
        drawHeartPath(octx, p.size);
        octx.fill();
        octx.restore();
      });
      if (t < 1.6) requestAnimationFrame(frame);
      else {
        window.removeEventListener('resize', onResize);
        try { document.body.removeChild(overlay); } catch (_) {}
      }
    }
    requestAnimationFrame(frame);
  }

  // No restore state mutations on load to avoid auto-changing the message
})();
