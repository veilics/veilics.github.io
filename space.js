(function () {
  const canvas = document.getElementById('space');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const stars = [];
  let w = 0, h = 0, t = 0;

  function resize() {
    w = canvas.width = window.innerWidth * devicePixelRatio;
    h = canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    stars.length = 0;
    const n = Math.min(320, Math.floor((w * h) / 12000));
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 0.8 + 0.2,
        r: Math.random() * 1.4 + 0.2,
        tw: Math.random() * Math.PI * 2
      });
    }
  }

  function frame() {
    t += 0.008;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#07080d';
    ctx.fillRect(0, 0, w, h);

    const gx = w * (0.35 + Math.sin(t * 0.15) * 0.08);
    const gy = h * (0.3 + Math.cos(t * 0.12) * 0.06);
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.55);
    g.addColorStop(0, 'rgba(90, 120, 210, 0.28)');
    g.addColorStop(0.45, 'rgba(30, 24, 70, 0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const g2 = ctx.createRadialGradient(w * 0.75, h * 0.7, 0, w * 0.75, h * 0.7, Math.max(w, h) * 0.4);
    g2.addColorStop(0, 'rgba(70, 110, 180, 0.16)');
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    stars.forEach(function (s) {
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.4 + s.tw));
      ctx.beginPath();
      ctx.fillStyle = 'rgba(240,246,255,' + (0.35 + tw * s.z) + ')';
      ctx.arc(s.x, s.y, s.r * s.z * devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();
      s.y += s.z * 0.12;
      if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
    });
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
