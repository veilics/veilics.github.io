if (location.protocol === "http:") {
  location.replace(location.href.replace(/^http:/, "https:"));
}

document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
document.addEventListener('keydown', function (e) {
  const k = e.key || '';
  if (
    k === 'F12' ||
    (e.ctrlKey && e.shiftKey && (k === 'I' || k === 'i' || k === 'J' || k === 'j' || k === 'C' || k === 'c')) ||
    (e.ctrlKey && (k === 'U' || k === 'u'))
  ) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
});

const commands = [
  { name: '/user', cat: 'Lookup', desc: 'Lookup a specific roblox user & get detailed results.' },
  { name: '/inventory', cat: 'Lookup', desc: 'View someone\'s entire inventory.' },
  { name: '/offsales', cat: 'Lookup', desc: 'Check what rare offsales a user has.' },
  { name: '/verified', cat: 'Lookup', desc: 'Check when and how someone was verified.' },
  { name: '/outfits', cat: 'Lookup', desc: 'Every outfit with item links and robux totals.' },
  { name: '/explore', cat: 'Utility', also: ['Games'], desc: 'Browse dumped game sounds, search, pick, and rip audio assets.' },




  { name: '/verify', cat: 'Account', desc: 'Prove you own a Roblox account with a 12-word bio phrase.' },
  { name: '/skincheck', cat: 'Media', desc: 'Render an offsale skincheck image and DM it. Admin / dread special access only.' },
  { name: '/bypass', cat: 'Media', desc: 'Bypass an audio, with an intro feature included.' },
  { name: '/bypassv2', cat: 'Media', desc: 'Bypass an audio without an intro.' },
  { name: '/imgtolua', cat: 'Media', also: ['Utility'], desc: 'Convert an image into compact Lua pixel data.' },
  { name: '/exploits status', cat: 'Utility', desc: 'Live exploit statuses from whatexpsare.online.' },
  { name: '/setup', cat: 'Server', desc: 'Setup a server.' },
  { name: '/autorole', cat: 'Server', desc: 'Set or inspect the join role.' },
  { name: '/server settings', cat: 'Server', desc: 'Edit the setup options.' },
  { name: '/dread grant', cat: 'Access', desc: 'Give a user access to special commands.' },
  { name: '/dread revoke', cat: 'Access', desc: 'Remove special-command access.' },
  { name: '/generate-keys', cat: 'Access', desc: 'Generate roblox API keys, 1 per cookie.' }
];

const filters = document.getElementById('filters');
const list = document.getElementById('cmdList');
const search = document.getElementById('cmdSearch');
const cats = ['All', ...new Set(commands.flatMap(c => [c.cat].concat(c.also || [])))];
let active = 'All';

cats.forEach(cat => {
  const b = document.createElement('button');
  b.textContent = cat;
  if (cat === 'All') b.classList.add('on');
  b.addEventListener('click', () => {
    active = cat;
    [...filters.children].forEach(x => x.classList.toggle('on', x === b));
    render();
  });
  filters.appendChild(b);
});

function catsOf(c) {
  return [c.cat].concat(c.also || []);
}
function render() {
  const q = (search.value || '').toLowerCase();
  list.innerHTML = '';
  commands.filter(c => {
    const cats = catsOf(c);
    const okCat = active === 'All' || cats.indexOf(active) !== -1;
    const okQ = !q || (c.name + ' ' + c.desc + ' ' + cats.join(' ')).toLowerCase().includes(q);
    return okCat && okQ;
  }).forEach(c => {
    const el = document.createElement('article');
    el.className = 'cmd';
    el.innerHTML = '<code>' + c.name + '</code><p>' + c.desc + '</p>';
    list.appendChild(el);
  });
}
search.addEventListener('input', render);
render();

const card = document.getElementById('card3d');
const stage = document.querySelector('.stage');
if (card && stage) {
  stage.addEventListener('mousemove', e => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 14}deg) translateZ(24px)`;
  });
  stage.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateY(0) rotateX(0)';
  });
}


const OWNER_IDS = ['1069534819920396349', '711444103010844672'];

function extFromHash(hash) {
  return hash && String(hash).startsWith('a_') ? 'gif' : 'png';
}

async function fetchDiscordUser(id) {
  try {
    const res = await fetch('https://japi.rest/discord/v1/user/' + id);
    const json = await res.json();
    const user = json.data || json;
    if (user && (user.username || user.avatar || user.banner)) {
      user.id = user.id || id;
      return user;
    }
  } catch (e) {}
  try {
    const res = await fetch('https://api.lanyard.rest/v1/users/' + id);
    const json = await res.json();
    const user = json && json.data && json.data.discord_user;
    if (user) {
      user.id = user.id || id;
      return user;
    }
  } catch (e) {}
  return { id: id };
}

function renderOwnerCard(user) {
  const wrap = document.createElement('article');
  wrap.className = 'owner';

  const banner = document.createElement(user.banner ? 'img' : 'div');
  banner.className = 'owner-banner' + (user.banner ? '' : ' is-empty');
  if (user.banner) {
    banner.alt = '';
    banner.src = 'https://cdn.discordapp.com/banners/' + user.id + '/' + user.banner + '.' + extFromHash(user.banner) + '?size=1024';
    banner.onerror = function () { banner.remove(); };
  } else if (user.accent_color || user.banner_color) {
    banner.style.background = user.banner_color || ('#' + Number(user.accent_color).toString(16).padStart(6, '0'));
  }

  const body = document.createElement('div');
  body.className = 'owner-body';

  const av = document.createElement('img');
  av.className = 'owner-avatar';
  const nick = user.global_name || user.display_name || user.username || 'Unknown';
  av.alt = nick;
  if (user.avatar) {
    av.src = 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.' + extFromHash(user.avatar) + '?size=256';
  } else {
    av.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
  }

  const meta = document.createElement('div');
  meta.className = 'owner-meta';
  const n = document.createElement('div');
  n.className = 'owner-nick';
  n.textContent = nick;
  const u = document.createElement('div');
  u.className = 'owner-user';
  u.textContent = user.username ? '@' + user.username : '';
  meta.appendChild(n);
  if (user.username) meta.appendChild(u);

  body.appendChild(av);
  body.appendChild(meta);
  wrap.appendChild(banner);
  wrap.appendChild(body);
  return wrap;
}

async function loadOwners() {
  const grid = document.getElementById('ownersGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const id of OWNER_IDS) {
    const user = await fetchDiscordUser(id);
    grid.appendChild(renderOwnerCard(user));
  }
}
loadOwners();

