if (location.protocol === "http:") {
  location.replace(location.href.replace(/^http:/, "https:"));
}

const commands = [
  { name: '/user', cat: 'Lookup', desc: 'Profile embed: friends, followers, RAP, verified items, offsale count, outfits dropdown.' },
  { name: '/inventory', cat: 'Lookup', desc: 'Walk or cloud-scan owned items with obtained dates, offsale tags, and copy counts.' },
  { name: '/offsales', cat: 'Lookup', desc: 'Match a public inventory against offsales.json. Lowest copies first, 25 per page.' },
  { name: '/verified', cat: 'Lookup', desc: 'Shows Hat, Knight, Gift, and Sign ownership plus obtained dates.' },
  { name: '/outfits', cat: 'Lookup', desc: 'Every outfit with item links and robux totals. Optional canvas page per outfit.' },
  { name: '/explore', cat: 'Games', desc: 'Browse dumped game sounds, search, pick, and rip audio assets.' },
  { name: '/roblox link', cat: 'Account', desc: 'Link your Roblox account with a one-time About code.' },
  { name: '/roblox verify', cat: 'Account', desc: 'Confirm the code is on your profile.' },
  { name: '/roblox cookie', cat: 'Account', desc: 'Save an encrypted .ROBLOSECURITY cookie for outfit apply.' },
  { name: '/roblox unlink', cat: 'Account', desc: 'Remove the saved link and cookie.' },
  { name: '/roblox outfit', cat: 'Account', desc: 'Outfit control panel — preview, apply, save, export.' },
  { name: '/verify', cat: 'Account', desc: 'Prove you own a Roblox account with a 12-word bio phrase.' },
  { name: '/skincheck', cat: 'Media', desc: 'Render an offsale skincheck image and DM it. Admin / dread gated.' },
  { name: '/bypass', cat: 'Media', desc: 'Process intro + main audio for Roblox playback.' },
  { name: '/bypassv2', cat: 'Media', desc: 'Aura-oriented audio bypass, same settings pipeline.' },
  { name: '/imgtolua', cat: 'Media', desc: 'Convert an image into compact Lua pixel data.' },
  { name: '/exploits status', cat: 'Utility', desc: 'Live exploit status board from whatexpsare.online.' },
  { name: '/setup', cat: 'Server', desc: 'Admin wizard for member role, image perms, muted categories, autorole.' },
  { name: '/autorole', cat: 'Server', desc: 'Set or inspect the join role.' },
  { name: '/server settings', cat: 'Server', desc: 'Edit setup options after the first run.' },
  { name: '/dread grant', cat: 'Access', desc: 'Give a user access to special commands.' },
  { name: '/dread revoke', cat: 'Access', desc: 'Remove special-command access.' },
  { name: '/generate-keys', cat: 'Access', desc: 'Mint Roblox Open Cloud keys and DM them.' }
];

const filters = document.getElementById('filters');
const list = document.getElementById('cmdList');
const search = document.getElementById('cmdSearch');
const cats = ['All', ...new Set(commands.map(c => c.cat))];
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

function render() {
  const q = (search.value || '').toLowerCase();
  list.innerHTML = '';
  commands.filter(c => {
    const okCat = active === 'All' || c.cat === active;
    const okQ = !q || (c.name + c.desc + c.cat).toLowerCase().includes(q);
    return okCat && okQ;
  }).forEach(c => {
    const el = document.createElement('article');
    el.className = 'cmd';
    el.innerHTML = `<div><code>${c.name}</code><div class="tag">${c.cat}</div></div><p>${c.desc}</p>`;
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
