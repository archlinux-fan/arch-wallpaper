// Arch wallpaper generator: a vertical gradient in one colour, ordered dithering and the Arch logo.
const NORD = [
  ['Polar Night', 0, ['#2E3440', '#3B4252', '#434C5E', '#4C566A']],
  ['Snow Storm', 4, ['#D8DEE9', '#E5E9F0', '#ECEFF4']],
  ['Frost', 7, ['#8FBCBB', '#88C0D0', '#81A1C1', '#5E81AC']],
  ['Aurora', 11, ['#BF616A', '#D08770', '#EBCB8B', '#A3BE8C', '#B48EAD']],
];
const DEFAULTS = { bg: '#5e81ac', top: 100, bottom: 70, logo: '#ffffff', size: 9.8, tone: false, shade: 60, w: 3840, h: 2160 };
const MIN_PX = 16, MAX_PX = 7680;
// 8x8 Bayer matrix: rounding to 8 bits without visible bands
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];
// Logo layout at 3840 wide: left and top of each part, its width
const PARTS = [[LOGO.icon, 1840.5, 925.5, 159], [LOGO.text, 1731, 1114.5, 376.5]]
  .map(([part, x, y, w]) => ({ box: part.box, x, y, w, paths: part.paths.map(([d, rule]) => [new Path2D(d), rule]) }));

const $ = id => document.getElementById(id);
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const luma = hex => { const [r, g, b] = rgb(hex); return .299 * r + .587 * g + .114 * b; };
const isBright = hex => luma(hex) > 100;
const defaultShade = hex => isBright(hex) ? 60 : 105;
let s = { ...DEFAULTS };

function normalHex(value) {
  const m = value.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1];
  return '#' + h.toLowerCase();
}

function logoColour() {
  if (!s.tone) return s.logo;
  return `rgb(${rgb(s.bg).map(c => Math.min(255, c * s.shade / 100)).join(' ')})`;
}

function draw(cv) {
  const W = cv.width, H = cv.height, c = cv.getContext('2d', { alpha: false });
  const img = c.createImageData(W, H), px = img.data, [r, g, b] = rgb(s.bg);
  for (let y = 0, i = 0; y < H; y++) {
    const f = (s.top + (s.bottom - s.top) * (H > 1 ? y / (H - 1) : 0)) / 100;
    const R = r * f, G = g * f, B = b * f;
    for (let x = 0; x < W; x++, i += 4) {
      const d = (BAYER[(y & 7) << 3 | x & 7] + .5) / 64;
      px[i] = R + d | 0; px[i + 1] = G + d | 0; px[i + 2] = B + d | 0; px[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);

  const k = W * s.size / 100 / 376.5;
  c.fillStyle = logoColour();
  for (const p of PARTS) {
    const f = p.w * k / p.box[2];
    c.setTransform(f, 0, 0, f, W / 2 + (p.x - 1920) * k - f * p.box[0], H / 2 + (p.y - 1080) * k - f * p.box[1]);
    for (const [path, rule] of p.paths) c.fill(path, rule);
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
}

function paint() {
  const cv = $('preview'), k = Math.min(1280 / s.w, 800 / s.h, 1);
  const w = Math.max(1, Math.round(s.w * k)), h = Math.max(1, Math.round(s.h * k));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  draw(cv);
}

let queued = 0;
function redraw() {
  queued ||= requestAnimationFrame(() => { queued = 0; paint(); });
}

function sync() {
  for (const k of ['top', 'bottom', 'size', 'shade']) { $(k).value = s[k]; $(k + 'Out').textContent = s[k] + ' %'; }
  $('mid').textContent = (s.top + s.bottom) / 2 + ' %';
  for (const k of ['bg', 'logo']) {
    $(k + 'Pick').value = s[k];
    if (document.activeElement !== $(k + 'Hex')) { $(k + 'Hex').value = s[k].toUpperCase(); $(k + 'Hex').removeAttribute('aria-invalid'); }
  }
  $('tone').checked = s.tone;
  $('shadeRow').hidden = !s.tone;
  document.querySelectorAll('[data-key]').forEach(b => {
    const on = b.dataset.hex === s[b.dataset.key] && !(b.dataset.key === 'logo' && s.tone);
    b.setAttribute('aria-pressed', on);
  });
  for (const k of ['w', 'h']) if (document.activeElement !== $(k)) { $(k).value = s[k]; $(k).removeAttribute('aria-invalid'); }
  const preset = `${s.w}x${s.h}`;
  $('preset').value = [...$('preset').options].some(o => o.value === preset) ? preset : 'custom';
  redraw();
}

function setColour(key, hex) {
  if (key === 'bg' && isBright(hex) !== isBright(s.bg)) s.shade = defaultShade(hex);
  s[key] = hex;
  if (key === 'logo') s.tone = false;
  sync();
}

function swatches(box, key, numbered) {
  for (const [group, first, colours] of NORD) {
    const wrap = document.createElement('div');
    colours.forEach((hex, i) => {
      const b = document.createElement('button'), n = first + i, value = hex.toLowerCase();
      b.type = 'button';
      b.style.background = hex;
      b.style.color = luma(hex) > 140 ? '#2E3440' : '#ECEFF4';
      b.title = `nord${n} ${hex}`;
      b.dataset.key = key;
      b.dataset.hex = value;
      b.setAttribute('aria-label', `nord${n}, ${group}, ${hex}`);
      if (numbered) b.textContent = n;
      b.onclick = () => setColour(key, value);
      wrap.append(b);
    });
    if (numbered) box.append(wrap); else box.append(...wrap.children);
  }
}

swatches($('bgSwatches'), 'bg', true);
swatches($('logoSwatches'), 'logo', false);

for (const k of ['top', 'bottom', 'size', 'shade']) $(k).oninput = e => { s[k] = +e.target.value; sync(); };

for (const k of ['bg', 'logo']) {
  $(k + 'Pick').oninput = e => setColour(k, e.target.value);
  $(k + 'Hex').oninput = e => {
    const hex = normalHex(e.target.value);
    e.target.setAttribute('aria-invalid', !hex);
    if (hex) setColour(k, hex);
  };
  $(k + 'Hex').onblur = sync;
}

$('tone').onchange = e => { s.tone = e.target.checked; sync(); };

for (const k of ['w', 'h']) {
  $(k).oninput = e => {
    const v = +e.target.value, ok = Number.isInteger(v) && v >= MIN_PX && v <= MAX_PX;
    e.target.setAttribute('aria-invalid', !ok);
    $('sizeHint').hidden = ok;
    if (ok) { s[k] = v; sync(); }
  };
  $(k).onblur = () => { $('sizeHint').hidden = true; sync(); };
}

$('preset').onchange = e => {
  if (e.target.value === 'custom') return;
  [s.w, s.h] = e.target.value.split('x').map(Number);
  sync();
};

$('reset').onclick = () => { s = { ...DEFAULTS }; $('status').textContent = ''; sync(); };

$('download').onclick = () => {
  const name = `arch_${s.bg.slice(1)}_${s.w}x${s.h}.png`, button = $('download');
  button.disabled = true;
  $('status').textContent = `Making ${s.w} × ${s.h} PNG…`;
  // A moment for the message to show: drawing a large image blocks the page
  setTimeout(() => {
    const cv = document.createElement('canvas');
    cv.width = s.w; cv.height = s.h;
    draw(cv);
    cv.toBlob(blob => {
      button.disabled = false;
      if (!blob) { $('status').textContent = 'This browser could not make an image this large. Try a smaller size.'; return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      $('status').textContent = `Downloaded ${name}`;
    }, 'image/png');
  }, 30);
};

sync();
paint();
