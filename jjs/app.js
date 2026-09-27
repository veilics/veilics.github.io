const API = 'https://api.dread.vc';
const $ = (id) => document.getElementById(id);

const state = {
  file: null,
  tree: null,
  nodeMap: {},
  browseId: 'root',
  selected: null,
  search: '',
  output: '',
  compact: ''
};

function toast(msg) { $('statusText').textContent = msg; }

function rgbToHex(c) {
  const h = (n) => Math.max(0, Math.min(255, (c[n] | 0))).toString(16).padStart(2, '0');
  if (!c) return '#ffffff';
  return '#' + h('r') + h('g') + h('b');
}

function indexTree(node, map) {
  map[node.id] = node;
  (node.children || []).forEach((c) => indexTree(c, map));
}

function isFolder(n) {
  return n && (n.type === 'ParticleFolder' || /^(Folder|Configuration|Actor)$/i.test(n.className || ''));
}

function hostCount(n) {
  return n && Number.isFinite(Number(n.count)) ? Number(n.count) : 0;
}

function formOpts() {
  const fd = new FormData();
  fd.append('file', state.file);
  fd.append('duration', $('duration').value || '0');
  fd.append('position', $('position').value || '0, 0, 0');
  fd.append('packMode', $('packMode').checked ? 'true' : 'false');
  fd.append('recolor', $('recolor').checked ? 'true' : 'false');
  fd.append('skillName', $('skillName').value || 'converted');
  fd.append('skillKey', $('skillKey').value || '1');
  fd.append('main', $('mainHex').value);
  fd.append('accent', $('accentHex').value);
  fd.append('other', $('otherHex').value);
  if (state.selected && state.selected.id) fd.append('selectedId', state.selected.id);
  return fd;
}

async function callConvert() {
  const res = await fetch(API + '/api/convert', { method: 'POST', body: formOpts() });
  const text = await res.text();
  if (!res.ok) throw new Error(text.slice(0, 120) || ('HTTP ' + res.status));
  return JSON.parse(text);
}

function applyPalette(pal) {
  if (!pal) return;
  ['main', 'accent', 'other'].forEach((k) => {
    const hex = rgbToHex(pal[k]);
    $(k + 'Found').style.background = hex;
    if (!$('recolor').checked) {
      $(k + 'Color').value = hex;
      $(k + 'Hex').value = hex;
    }
  });
}

function renderTree() {
  const root = state.tree;
  const box = $('tree');
  box.innerHTML = '';
  if (!root) return;
  const node = state.nodeMap[state.browseId] || root;
  $('explorerPath').textContent = node.name || 'Workspace';
  if (node !== root) {
    const up = document.createElement('div');
    up.className = 'row';
    up.textContent = '← back';
    up.onclick = () => {
      const parent = Object.values(state.nodeMap).find((n) => (n.children || []).some((c) => c.id === node.id));
      state.browseId = parent ? parent.id : root.id;
      renderTree();
    };
    box.appendChild(up);
  }
  const q = ($('search').value || '').toLowerCase();
  (node.children || []).forEach((child) => {
    const hay = [child.name, child.className, child.type].join(' ').toLowerCase();
    if (q && hay.indexOf(q) < 0) return;
    const row = document.createElement('div');
    row.className = 'row' + (state.selected && state.selected.id === child.id ? ' on' : '');
    const folder = isFolder(child) && (child.children || []).length;
    row.textContent = (folder ? '▸ ' : '') + child.name + '  ' + hostCount(child);
    row.onclick = () => {
      if (folder) state.browseId = child.id;
      state.selected = child;
      renderTree();
      renderHud();
    };
    box.appendChild(row);
  });
}

function renderHud() {
  const n = state.selected || state.tree;
  const count = n ? hostCount(n) : 0;
  $('hudTitle').textContent = n ? n.name : 'No place loaded';
  $('hudMeta').textContent = n ? (count + ' emitters · ' + (n.className || n.type || '')) : 'Drop a place or model.';
  $('selCount').textContent = count + ' emitters';
}

async function loadFile(file) {
  state.file = file;
  $('skillName').value = String(file.name || 'converted').replace(/\.[^.]+$/, '');
  toast('Uploading ' + file.name + '…');
  try {
    const data = await callConvert();
    state.tree = data.tree;
    state.nodeMap = {};
    indexTree(state.tree, state.nodeMap);
    state.browseId = state.tree.id;
    state.selected = (state.tree.children && state.tree.children[0]) || state.tree;
    state.output = data.output || '';
    state.compact = data.compact || '';
    $('output').textContent = state.output;
    $('compactOut').textContent = state.compact;
    applyPalette(data.palette);
    toast('Loaded · ' + (data.count || 0) + ' emitters');
    renderTree();
    renderHud();
  } catch (e) {
    toast('Convert failed: ' + e.message);
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied.');
  } catch (e) {
    toast('Copy failed.');
  }
}

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
$('search').addEventListener('input', renderTree);
$('recolor').addEventListener('change', () => {
  $('recolorBox').classList.toggle('on', $('recolor').checked);
});
['main', 'accent', 'other'].forEach((k) => {
  $(k + 'Color').addEventListener('input', (e) => { $(k + 'Hex').value = e.target.value; });
});
$('exportBtn').addEventListener('click', async () => {
  if (!state.file) { toast('Open a file first.'); return; }
  toast('Exporting…');
  try {
    const data = await callConvert();
    state.output = data.output || '';
    state.compact = data.compact || '';
    $('output').textContent = state.output;
    $('compactOut').textContent = state.compact;
    toast('Exported.');
  } catch (e) {
    toast('Export failed: ' + e.message);
  }
});
$('copyJson').addEventListener('click', () => copyText(state.output));
$('copyCompact').addEventListener('click', () => copyText(state.compact));
toast('Ready · ' + API);
