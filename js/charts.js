/* Tiny dependency-free SVG charts (line + bar) with hover/touch tooltips. Colours come from CSS. */
(function () {
  'use strict';

  function niceStep(raw) {
    if (!(raw > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  const fmt = (v, dp) => Number(v.toFixed(dp)).toLocaleString(undefined, { maximumFractionDigits: dp });

  function empty(el, msg, H) {
    el.style.height = '';
    el.innerHTML = '<div class="chart-empty" style="height:' + H + 'px">' + (msg || 'No data yet') + '</div>';
  }

  function interactive(el, marks, H, P) {
    const svg = el.querySelector('svg');
    const tip = el.querySelector('.c-tip');
    const cur = svg.querySelector('.c-cursor');
    const hl = svg.querySelector('.c-hl');
    const W = +svg.getAttribute('width');
    const show = e => {
      const r = svg.getBoundingClientRect();
      const x = e.clientX - r.left;
      let best = marks[0];
      for (const m of marks) if (Math.abs(m.cx - x) < Math.abs(best.cx - x)) best = m;
      tip.innerHTML = best.text;
      tip.style.left = Math.min(Math.max(best.cx, 56), W - 56) + 'px';
      tip.style.top = best.cy + 'px';
      tip.classList.add('show');
      if (cur) { cur.setAttribute('x1', best.cx); cur.setAttribute('x2', best.cx); cur.style.opacity = 1; }
      if (hl) { hl.setAttribute('cx', best.cx); hl.setAttribute('cy', best.cy); hl.style.opacity = 1; }
    };
    const hide = () => {
      tip.classList.remove('show');
      if (cur) cur.style.opacity = 0;
      if (hl) hl.style.opacity = 0;
    };
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointerleave', hide);
  }

  function yAxis(lo, hi, step, W, H, P, sy, yfmt) {
    let s = '';
    const dp = step < 1 ? (step < 0.1 ? 2 : 1) : 0;
    for (let v = lo; v <= hi + step / 2; v += step) {
      const y = sy(v).toFixed(1);
      s += '<line class="c-grid" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y + '" y2="' + y + '"/>' +
        '<text class="c-lbl" x="' + (P.l - 8) + '" y="' + (+y + 4) + '" text-anchor="end">' + (yfmt ? yfmt(v) : fmt(v, dp)) + '</text>';
    }
    return s;
  }

  function line(el, pts, o = {}) {
    const H = o.height || 210;
    if (!pts.length) return empty(el, o.empty, H);
    const W = Math.max(el.clientWidth, 240);
    const P = { l: 44, r: 14, t: 14, b: 28 };
    const ys = pts.map(p => p.y);
    let lo = Math.min(...ys), hi = Math.max(...ys);
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const step = niceStep((hi - lo) / 4);
    lo = Math.floor(lo / step) * step;
    hi = Math.ceil(hi / step) * step;
    const x0 = pts[0].x, x1 = pts[pts.length - 1].x;
    const sx = x => x1 === x0 ? (P.l + W - P.r) / 2 : P.l + (x - x0) / (x1 - x0) * (W - P.l - P.r);
    const sy = y => P.t + (hi - y) / (hi - lo) * (H - P.t - P.b);

    let s = '<svg width="' + W + '" height="' + H + '" role="img" aria-label="' + (o.label || 'Line chart') + '">';
    s += yAxis(lo, hi, step, W, H, P, sy, o.yfmt);

    const n = Math.min(pts.length, W < 420 ? 3 : 5);
    const idx = [...new Set(n === 1 ? [0] : Array.from({ length: n }, (_, i) => Math.round(i * (pts.length - 1) / (n - 1))))];
    idx.forEach((i, k) => {
      const anchor = idx.length === 1 ? 'middle' : k === 0 ? 'start' : k === idx.length - 1 ? 'end' : 'middle';
      s += '<text class="c-lbl" x="' + sx(pts[i].x).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + anchor + '">' + o.xfmt(pts[i].x) + '</text>';
    });

    const d = pts.map((p, i) => (i ? 'L' : 'M') + sx(p.x).toFixed(1) + ',' + sy(p.y).toFixed(1)).join('');
    const area = d + 'L' + sx(x1).toFixed(1) + ',' + (H - P.b) + 'L' + sx(x0).toFixed(1) + ',' + (H - P.b) + 'Z';
    s += '<line class="c-cursor" x1="0" x2="0" y1="' + P.t + '" y2="' + (H - P.b) + '"/>';
    s += '<path class="c-area" d="' + area + '"/><path class="c-line" d="' + d + '"/>';
    if (pts.length <= 40) pts.forEach(p => { s += '<circle class="c-dot" r="3.5" cx="' + sx(p.x).toFixed(1) + '" cy="' + sy(p.y).toFixed(1) + '"/>'; });
    const last = pts[pts.length - 1];
    s += '<circle class="c-dot-last" r="5.5" cx="' + sx(last.x).toFixed(1) + '" cy="' + sy(last.y).toFixed(1) + '"/>';
    s += '<circle class="c-hl" r="6" cx="0" cy="0"/></svg><div class="c-tip"></div>';

    el.style.height = H + 'px';
    el.innerHTML = s;
    interactive(el, pts.map(p => ({ cx: sx(p.x), cy: sy(p.y), text: o.tip(p) })), H, P);
  }

  function bar(el, bars, o = {}) {
    const H = o.height || 210;
    if (!bars.length || !bars.some(b => b.value > 0)) return empty(el, o.empty, H);
    const W = Math.max(el.clientWidth, 240);
    const P = { l: 40, r: 10, t: 14, b: 28 };
    const max = Math.max(...bars.map(b => b.value));
    const step = niceStep(max / 4);
    const hi = Math.ceil(max / step) * step || 1;
    const sy = y => P.t + (hi - y) / hi * (H - P.t - P.b);
    const bw = (W - P.l - P.r) / bars.length;
    const barW = Math.max(3, Math.min(34, bw * 0.62));

    let s = '<svg width="' + W + '" height="' + H + '" role="img" aria-label="' + (o.label || 'Bar chart') + '">';
    s += yAxis(0, hi, step, W, H, P, sy, o.yfmt);
    const every = Math.ceil(bars.length / (W < 420 ? 5 : 9));
    const marks = [];
    bars.forEach((b, i) => {
      const cx = P.l + i * bw + bw / 2;
      const y = sy(b.value), h = Math.max(0, sy(0) - y);
      s += '<rect class="c-bar' + (b.muted ? ' muted' : '') + '" x="' + (cx - barW / 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barW.toFixed(1) +
        '" height="' + h.toFixed(1) + '" rx="' + Math.min(6, barW / 2).toFixed(1) + '"/>';
      if ((bars.length - 1 - i) % every === 0) s += '<text class="c-lbl" x="' + cx.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + b.label + '</text>';
      marks.push({ cx, cy: y, text: b.tip });
    });
    s += '</svg><div class="c-tip"></div>';
    el.style.height = H + 'px';
    el.innerHTML = s;
    interactive(el, marks, H, P);
  }

  window.Charts = { line, bar };
})();
