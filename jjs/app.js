const $ = (id) => document.getElementById(id);

const state = {
  fileName: '',
  tree: null,
  nodeMap: {},
  browseId: 'root',
  selected: null,
  checked: {},
  search: '',
  duration: 0,
  position: '0, 0, 0',
  skillName: 'converted',
  skillKey: 1,
  packMode: false,
  recolor: false,
  colors: { main: '#ff3355', accent: '#ffcc66', other: '#ffffff' },
  detected: null,
  output: '',
  compact: '',
  packs: []
};

function toast(msg) {
  $('statusText').textContent = msg;
}

function sanitizeFilename(name) {
  return String(name || 'file').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 80);
}

function collectNodeParticles(node) {
  const out = [];
  (node.particles || []).forEach((p) => out.push(p));
  (node.children || []).forEach((c) => collectNodeParticles(c).forEach((p) => out.push(p)));
  return out;
}

function indexTree(node, map) {
  map[node.id] = node;
  (node.children || []).forEach((c) => indexTree(c, map));
}

function isFolder(n) {
  return n && (n.type === 'ParticleFolder' || /^(Folder|Configuration|Actor)$/i.test(n.className || ''));
}

function hostCount(n) {
  if (!n) return 0;
  if (Number.isFinite(Number(n.count))) return Number(n.count);
  return collectNodeParticles(n).length;
}

function collectLeaves(node) {
  const out = [];
  function walk(n) {
    if (!n) return;
    const kids = n.children || [];
    const folder = isFolder(n) && kids.length;
    if (!folder && hostCount(n) > 0) out.push(n);
    kids.forEach(walk);
  }
  walk(node);
  return out;
}

function parseRgbList(str) {
  const out = [];
  const re = /(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g;
  let m;
  const s = String(str || '');
  while ((m = re.exec(s))) out.push({ r: +m[1], g: +m[2], b: +m[3] });
  return out;
}

function hexToRgb(hex) {
  const s = String(hex || '').trim().replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(s)) {
    return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
  }
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return { r: parseInt(s[0] + s[0], 16), g: parseInt(s[1] + s[1], 16), b: parseInt(s[2] + s[2], 16) };
  }
  const m = String(hex).match(/(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  return { r: 255, g: 255, b: 255 };
}

function rgbToHex(c) {
  const h = (n) => Math.max(0, Math.min(255, n | 0)).toString(16).padStart(2, '0');
  return '#' + h(c.r) + h(c.g) + h(c.b);
}

function rgbKey(c) { return `${c.r},${c.g},${c.b}`; }
function rgbDist(a, b) {
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

function detectPalette(particles) {
  const counts = {};
  (particles || []).forEach((p) => parseRgbList(p.COLOR).forEach((c) => {
    if (c.r + c.g + c.b < 12) return;
    const k = rgbKey(c);
    counts[k] = counts[k] || { c, n: 0 };
    counts[k].n++;
  }));
  const items = Object.values(counts).sort((a, b) => b.n - a.n);
  if (!items.length) return { main: { r: 255, g: 255, b: 255 }, accent: { r: 200, g: 200, b: 200 }, other: { r: 40, g: 40, b: 40 } };
  const main = items[0].c;
  let accent = items[1] ? items[1].c : main;
  let best = -1;
  items.forEach((it, i) => {
    if (!i) return;
    const score = Math.sqrt(rgbDist(it.c, main));
    if (score > best) { best = score; accent = it.c; }
  });
  const other = items[Math.min(2, items.length - 1)].c;
  return { main, accent, other };
}

function remapColorString(str, detected, next) {
  const parts = parseRgbList(str);
  if (!parts.length) return str;
  return parts.map((c) => {
    const dMain = rgbDist(c, detected.main);
    const dAcc = rgbDist(c, detected.accent);
    const dOth = rgbDist(c, detected.other);
    const role = (dMain <= dAcc && dMain <= dOth) ? 'main' : (dAcc <= dOth ? 'accent' : 'other');
    return rgbKey(next[role]);
  }).join(' ');
}

function lineFromParticle(p, i, over) {
  return {
    SIZE: String(p.SIZE || '0.0000'),
    SPEED: String(p.SPEED || '0.00, 0.00'),
    NAME: String(p.NAME || p.Name || ('PARTICLE_' + (i + 1))).slice(0, 80),
    'PART SIZE': '0, 0, 0',
    'LIGHT EMISSION': Number(p['LIGHT EMISSION']) || 0,
    'EMIT COUNT': Number(p['EMIT COUNT']) || 0,
    TEXTURE: Number(p.TEXTURE) || 0,
    DURATION: Number(over.duration) || 0,
    BRIGHTNESS: p.BRIGHTNESS != null ? Number(p.BRIGHTNESS) : 1,
    LIFETIME: String(p.LIFETIME || '0.00, 0.00'),
    ZOFFSET: Number(p.ZOFFSET) || 0,
    COLOR: over.recolor
      ? remapColorString(p.COLOR || '255,255,255 255,255,255', over.detected, over.next)
      : String(p.COLOR || '255,255,255 255,255,255'),
    ACCELERATION: String(p.ACCELERATION || '0, 0, 0'),
    POSITION: String(over.position || '0, 0, 0'),
    'RUN ON SERVER': p['RUN ON SERVER'] !== false,
    'LIGHT INFLUENCE': Number(p['LIGHT INFLUENCE']) || 0,
    'FLIPBOOK FRAMERATE': String(p['FLIPBOOK FRAMERATE'] || '1.00, 1.00'),
    'FLIPBOOK SIZE': String(p['FLIPBOOK SIZE'] != null ? p['FLIPBOOK SIZE'] : '1, 1'),
    K_NAME: 'PARTICLE',
    TRANSPARENCY: String(p.TRANSPARENCY || '0.00,0.00'),
    ROTATION: String(p.ROTATION || '0.00, 0.00'),
    RATE: p.RATE != null ? Number(p.RATE) : 20,
    'ROT SPEED': String(p['ROT SPEED'] || '0.00, 0.00'),
    'ORIENTATION TYPE': String(p['ORIENTATION TYPE'] || 'FacingCamera'),
    'EMISSION DIRECTION': String(p['EMISSION DIRECTION'] || 'Top'),
    'LOCK TO PART': p['LOCK TO PART'] !== false,
    'SPREAD ANGLE': String(p['SPREAD ANGLE'] || '0.00, 0.00, 0.00'),
    'FLIPBOOK MODE': String(p['FLIPBOOK MODE'] || 'OneShot'),
    DRAG: Number(p.DRAG) || 0,
    SQUASH: String(p.SQUASH || '0.00,0.00')
  };
}

function buildSkill(lines, meta) {
  return {
    ADD: false,
    NAME: String(meta.name || 'converted').slice(0, 80),
    COOLDOWN: 0,
    KEY: Number(meta.key) || 1,
    K_NAME: 'SKILL',
    DATA: JSON.stringify({ Line: lines, Prop: [], Req: [] }),
    'TOOL TIP': ''
  };
}
function buildSkillJson(lines, meta) {
  return JSON.stringify([buildSkill(lines, meta)]);
}

function visibleChildren(node) {
  const q = String(state.search || '').trim().toLowerCase();
  const kids = (node && node.children) || [];
  if (!q) return kids;
  const out = [];
  const seen = new Set();
  function walk(n) {
    if (!n || seen.has(n.id)) return;
    const hay = [n.name, n.className, n.path, n.type].join(' ').toLowerCase();
    if (hay.includes(q)) { seen.add(n.id); out.push(n); return; }
    (n.children || []).forEach(walk);
  }
  kids.forEach(walk);
  return out;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderTree() {
  const root = state.tree;
  const box = $('tree');
  box.innerHTML = '';
  if (!root) {
    box.innerHTML = '<div class="hint" style="padding:8px">Open an .rbxl / .rbxm / .rbxlx.</div>';
    return;
  }
  const node = state.nodeMap[state.browseId] || root;
  const crumbs = [];
  let walk = node;
  while (walk && walk.id !== root.id) {
    crumbs.unshift(walk);
    walk = state.nodeMap[walk.parentId];
  }
  $('explorerPath').textContent = crumbs.length ? crumbs.map((c) => c.name).join(' / ') : 'Workspace';
  if (node.id !== root.id) {
    const back = document.createElement('div');
    back.className = 'row';
    back.innerHTML = '<span class="dot folder"></span><span class="name">..</span><span class="meta">up</span>';
    back.onclick = () => { state.browseId = node.parentId || root.id; renderTree(); };
    box.appendChild(back);
  }
  visibleChildren(node).forEach((child, i) => {
    const row = document.createElement('div');
    row.className = 'row' + (state.selected && state.selected.id === child.id ? ' on' : '');
    row.style.animationDelay = (i * 12) + 'ms';
    const count = hostCount(child);
    const folder = isFolder(child) && (child.children || []).length;
    const emitter = !folder && (
      /particle/i.test(child.className || '') ||
      /particle/i.test(child.type || '') ||
      count > 0
    );
    const checked = !!state.checked[child.id];
    const kind = folder ? 'folder' : (emitter ? 'emitter' : 'part');
    row.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''} data-id="${child.id}"><span class="dot ${kind}"></span><span class="name">${escapeHtml(child.name || child.className)}</span><span class="meta">${count}</span>`;
    row.querySelector('input').onclick = (e) => {
      e.stopPropagation();
      if (e.target.checked) state.checked[child.id] = true;
      else delete state.checked[child.id];
    };
    row.onclick = () => {
      if (folder) state.browseId = child.id;
      state.selected = child;
      applyDetected(collectNodeParticles(child));
      renderTree();
      renderHud();
    };
    box.appendChild(row);
  });
}

function applyDetected(particles) {
  state.detected = detectPalette(particles);
  ['main', 'accent', 'other'].forEach((k) => {
    const hex = rgbToHex(state.detected[k]);
    $(k + 'Found').style.background = hex;
    $(k + 'FoundLabel').textContent = rgbKey(state.detected[k]);
    if (!state.recolor) {
      state.colors[k] = hex;
      $(k + 'Color').value = hex;
      $(k + 'Hex').value = hex;
    }
  });
}

function renderHud() {
  const n = state.selected;
  const count = n ? hostCount(n) : (state.tree ? hostCount(state.tree) : 0);
  $('hudTitle').textContent = n ? n.name : (state.fileName || 'No place loaded');
  $('hudMeta').innerHTML = n
    ? `<b>${count}</b> emitters · ${escapeHtml(n.className || n.type || '')}`
    : 'Drop a Roblox place or model.';
  $('emptyState').style.display = state.tree ? 'none' : 'grid';
  $('selCount').textContent = count + ' emitters';
}

function currentTargets() {
  const ids = Object.keys(state.checked);
  if (ids.length) {
    return ids.map((id) => state.nodeMap[id]).filter(Boolean);
  }
  if (state.packMode) {
    const node = state.selected || state.tree;
    const leaves = collectLeaves(node);
    return leaves.length ? leaves : (node ? [node] : []);
  }
  return state.selected ? [state.selected] : (state.tree ? [state.tree] : []);
}

function over() {
  return {
    duration: state.duration,
    position: state.position,
    recolor: state.recolor,
    detected: state.detected || detectPalette([]),
    next: {
      main: hexToRgb(state.colors.main),
      accent: hexToRgb(state.colors.accent),
      other: hexToRgb(state.colors.other)
    }
  };
}

function exportCurrent() {
  const targets = currentTargets();
  if (!targets.length) { toast('Nothing selected.'); return; }
  const packs = [];
  targets.forEach((node, idx) => {
    const particles = collectNodeParticles(node);
    if (!particles.length) return;
    const lines = particles.map((p, i) => { const line = lineFromParticle(p, i, over()); line['SPREAD ANGLE'] = sanitizeSpread(line['SPREAD ANGLE']); return line; });
    const name = sanitizeFilename(node.name || state.skillName || 'pack') + (targets.length > 1 ? '' : '');
    const skill = buildSkill(lines, { name: name, key: state.skillKey + idx });
    packs.push({ name: name, skill: skill, json: JSON.stringify([skill]), count: lines.length });
  });
  if (!packs.length) { toast('No emitters in selection.'); return; }
  state.packs = packs;
  // JJS import is ONE JSON array. Never concatenate multiple arrays.
  state.output = JSON.stringify(packs.map((p) => p.skill));
  $('output').textContent = state.output;
  toast(state.packMode || packs.length > 1
    ? ('Packed ' + packs.length + ' skills, ' + packs.reduce((n, p) => n + p.count, 0) + ' emitters.')
    : ('Exported ' + packs[0].count + ' particles from ' + packs[0].name + '.'));
  compressMaybe(state.output);
}

async function compressMaybe(json) {
  $('compactOut').textContent = 'Compressing with zstd…';
  try {
    if (!window.JJSZstd) throw new Error('zstd helper missing');
    state.compact = await window.JJSZstd.compressText(json, 22);
    $('compactOut').textContent = state.compact;
  } catch (e) {
    console.error(e);
    state.compact = '';
    $('compactOut').textContent = 'zstd failed: ' + (e && e.message ? e.message : e) + ' — copy JSON instead.';
  }
}

function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied.');
  } catch (e) {
    toast('Copy failed — long-press the box.');
  }
}


function looksLikePlaceName(name) {
  return /\.(rbxlx?|rbxmx?)$/i.test(String(name || ''));
}
function looksLikeImportName(name) {
  return /\.(txt|json|particle\.txt|particle\.json)$/i.test(String(name || ''));
}
function b64ToU8(s) {
  const clean = String(s || '').replace(/\s+/g, '');
  const bin = atob(clean);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}
function decodeImportText(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('empty file');
  if (/^KLUv\//.test(raw) || (raw.indexOf('KLUv') === 0)) {
    const fz = window.fzstd || window.FZstd;
    if (!fz || typeof fz.decompress !== 'function') throw new Error('fzstd missing for KLUv');
    const out = fz.decompress(b64ToU8(raw));
    const json = new TextDecoder().decode(out);
    return JSON.parse(json);
  }
  if (raw[0] === '[' || raw[0] === '{') return JSON.parse(raw);
  const start = raw.search(/[\[{]/);
  if (start >= 0) return JSON.parse(raw.slice(start));
  throw new Error('not JSON or KLUv');
}
function linesFromSkill(skill) {
  let data = skill && skill.DATA;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (e) { data = {}; }
  }
  data = data || {};
  if (Array.isArray(data.Line)) return data.Line;
  if (data.Line && typeof data.Line === 'object' && !Array.isArray(data.Line)) {
    return Object.keys(data.Line).map(function (k) { return data.Line[k]; });
  }
  if (data.Branch) {
    const out = [];
    Object.keys(data.Branch).forEach(function (k) {
      const br = data.Branch[k] || {};
      if (Array.isArray(br.Line)) br.Line.forEach(function (p) { out.push(p); });
    });
    return out;
  }
  return [];
}
function treeFromSkills(skills, fileName) {
  const children = (skills || []).map(function (skill, i) {
    const lines = linesFromSkill(skill).map(function (p) {
      if (p && p['SPREAD ANGLE']) p['SPREAD ANGLE'] = sanitizeSpread(p['SPREAD ANGLE']);
      return p;
    });
    return {
      id: 'pack' + i,
      name: String(skill.NAME || skill.Name || ('Pack ' + (i + 1))),
      className: 'Skill',
      type: 'ParticleHost',
      children: [],
      particles: lines,
      count: lines.length,
      parentId: 'root'
    };
  });
  return {
    tree: { id: 'root', name: fileName || 'Import', className: 'Folder', type: 'ParticleFolder', children: children, particles: [], count: children.reduce(function (n, c) { return n + c.count; }, 0) },
    hosts: children,
    particles: children.reduce(function (a, c) { return a.concat(c.particles); }, [])
  };
}
function sanitizeSpread(v) {
  if (window.JJSParser && typeof window.JJSParser.spreadToStr === 'function') return window.JJSParser.spreadToStr(v);
  const n = String(v || '0, 0, 0').split(/[,\s]+/).map(Number).filter(function (x) { return Number.isFinite(x); });
  let x = n[0] || 0;
  let y = n[1] || 0;
  if (Math.abs(x) > 720 && Math.abs(y) < 1) {
    const s = String(Math.round(Math.abs(x)));
    if (s.length >= 4 && s.length % 2 === 0) {
      x = Number(s.slice(0, s.length / 2));
      y = Number(s.slice(s.length / 2));
    }
  }
  if (x > 720) x = 720;
  if (y > 720) y = 720;
  return x.toFixed(2) + ', ' + y.toFixed(2) + ', 0.00';
}

async function loadFile(file) {
  toast('Reading ' + file.name + '…');
  $('hudTitle').textContent = file.name;
  const buf = new Uint8Array(await file.arrayBuffer());
  toast('Parsing ' + file.name + ' (' + (buf.length / 1024).toFixed(0) + ' KB)…');
  await new Promise((r) => setTimeout(r, 30));
  let parsed;
  try {
    const textHead = new TextDecoder().decode(buf.slice(0, 24));
    if (!looksLikePlaceName(file.name) && (looksLikeImportName(file.name) || textHead.indexOf('KLUv') === 0 || textHead[0] === '[' || textHead[0] === '{')) {
      const text = new TextDecoder().decode(buf);
      const skills = decodeImportText(text);
      const list = Array.isArray(skills) ? skills : [skills];
      parsed = treeFromSkills(list, file.name);
    } else {
      if (!window.JJSParser) throw new Error('Parser failed to load.');
      parsed = window.JJSParser.parsePlace(window.JJSParser.Buffer.from(buf), file.name);
    }
  } catch (e) {
    console.error(e);
    toast('Parse failed: ' + (e && e.message ? e.message : e));
    return;
  }
  state.fileName = file.name;
  state.tree = parsed.tree || { id: 'root', name: 'Root', type: 'ParticleFolder', children: parsed.hosts || [], particles: parsed.particles || [] };
  state.nodeMap = {};
  indexTree(state.tree, state.nodeMap);
  state.browseId = state.tree.id || 'root';
  state.selected = (state.tree.children && state.tree.children[0]) || state.tree;
  state.checked = {};
  state.skillName = sanitizeFilename(file.name).replace(/\.[^.]+$/, '') || 'converted';
  $('skillName').value = state.skillName;
  applyDetected(collectNodeParticles(state.selected));
  toast('Loaded ' + file.name + ' · ' + hostCount(state.tree) + ' emitters');
  renderTree();
  renderHud();
}

function bind() {
  $('fileInput').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) loadFile(f);
  });
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });
  $('search').addEventListener('input', (e) => { state.search = e.target.value; renderTree(); });
  $('skillName').addEventListener('input', (e) => { state.skillName = e.target.value; });
  $('skillKey').addEventListener('input', (e) => { state.skillKey = Number(e.target.value) || 1; });
  $('duration').addEventListener('input', (e) => { state.duration = Number(e.target.value) || 0; });
  $('position').addEventListener('input', (e) => { state.position = e.target.value || '0, 0, 0'; });
  $('packMode').addEventListener('change', (e) => { state.packMode = e.target.checked; });
  $('recolor').addEventListener('change', (e) => {
    state.recolor = e.target.checked;
    $('recolorBox').style.opacity = state.recolor ? '1' : '.5';
  });
  ['main', 'accent', 'other'].forEach((k) => {
    $(k + 'Color').addEventListener('input', (e) => { state.colors[k] = e.target.value; $(k + 'Hex').value = e.target.value; });
    $(k + 'Hex').addEventListener('input', (e) => { state.colors[k] = e.target.value; });
    $(k + 'Found').addEventListener('click', () => {
      if (!state.detected) return;
      const hex = rgbToHex(state.detected[k]);
      state.colors[k] = hex;
      $(k + 'Color').value = hex;
      $(k + 'Hex').value = hex;
    });
  });
  $('exportBtn').addEventListener('click', exportCurrent);
  $('copyJson').addEventListener('click', () => copyText(state.output || $('output').textContent));
  $('copyCompact').addEventListener('click', () => copyText(state.compact || $('compactOut').textContent));
  $('dlJson').addEventListener('click', () => {
    if (state.packs.length > 1) {
      state.packs.forEach((p) => download(p.name + '.particle.json', p.json));
    } else download((state.skillName || 'skill') + '.particle.json', state.output || $('output').textContent);
  });
  $('dlCompact').addEventListener('click', () => download((state.skillName || 'skill') + '.particle.txt', state.compact || $('compactOut').textContent));
}

bind();
renderTree();
renderHud();
toast('Ready.');
