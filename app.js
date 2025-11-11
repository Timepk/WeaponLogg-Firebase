// ====== Admin: Last ned full feil/fiks-historikk (CSV) ======
function lastNedFeilFiksLogg() {
  // Header for hendelseslogg
  const header = [
    'Våpen-ID','Serienummer','Fabrikat','Model','Dato feil','Feil-kommentar','Dato fikset','Fikset-kommentar','Medlem','Skyteleder'
  ];
  // Finn alle utlån med feil eller fiks-kommentar
  const rows = state.utlaan
    .filter(u => (u.feilKommentar && u.feilKommentar.trim() !== '') || (u.fiksetKommentar && u.fiksetKommentar.trim() !== ''))
    .map(u => {
      const v = state.vapen.find(x => x.id === u.vapenId) || {};
      const m = state.medlemmer.find(x => x.id === u.medlemId) || {};
      const s = state.skyteledere.find(x => x.id === u.skytelederId) || {};
      return [
        u.vapenId || '',
        v.serienummer || '',
        v.fabrikat || '',
        v.model || '',
        u.feilTid ? fmtDateTime(u.feilTid) : '',
        u.feilKommentar || '',
        u.fiksetTid ? fmtDateTime(u.fiksetTid) : '',
        u.fiksetKommentar || '',
        m.navn || '',
        s.navn || ''
      ];
    });
  const csv = [header, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(';')).join('\n');
  const date = new Date().toISOString().slice(0,10);
  download(`timepk-feilfikslogg-${date}.csv`, csv, 'text/csv;charset=utf-8');
}
// Legg til knapp for å laste ned feil/fiks-logg (for eksempel i admin-panelet)
if (document.getElementById('lastNedFeilFiksLoggBtn')) {
  document.getElementById('lastNedFeilFiksLoggBtn').onclick = lastNedFeilFiksLogg;
}
// Admin-passord håndtering (kun én kilde)
const PASSORD_KEY = 'tpk_admin_passord';
function getAdminPassord() {
  return localStorage.getItem(PASSORD_KEY) || 'TimePK';
}
function setAdminPassord(nytt) {
  localStorage.setItem(PASSORD_KEY, nytt);
}

// Bytt alle passord via admin-knapp i admin-panelet
const adminChangePassBtn = document.getElementById('adminChangePassBtn');
if (adminChangePassBtn) {
  adminChangePassBtn.addEventListener('click', () => {
    const gjeldende = prompt('Skriv inn gjeldende admin-passord:');
    if (gjeldende !== getAdminPassord()) {
      alert('Feil passord.');
      return;
    }
    let nytt = prompt('Vennligst tast nytt passord:');
    if (!nytt || !nytt.trim()) {
      alert('Passordet kan ikke være tomt.');
      return;
    }
    setAdminPassord(nytt.trim());
    alert('Alle admin-passord er nå byttet!');
  });
}
// Egendefinert Ja/Nei-dialog
function customConfirm(msg) {
  return new Promise(resolve => {
    const dialog = document.getElementById('customConfirm');
    const msgDiv = document.getElementById('customConfirmMsg');
    const yesBtn = document.getElementById('customConfirmYes');
    const noBtn = document.getElementById('customConfirmNo');
    msgDiv.textContent = msg;
    dialog.style.display = 'flex';
    function cleanup(result) {
      dialog.style.display = 'none';
      yesBtn.onclick = null;
      noBtn.onclick = null;
      resolve(result);
    }
    yesBtn.onclick = () => cleanup(true);
    noBtn.onclick = () => cleanup(false);
  });
}
// ====== Konstanter og "database" (localStorage) ======
const PUSS_THRESHOLD = 30; // alarmgrense: mer enn 30 treninger siden puss

const DB_KEYS = {
  medlemmer: 'tpk_medlemmer',
  vapen: 'tpk_vapen',
  utlaan: 'tpk_utlaan',
  skyteledere: 'tpk_skyteledere',
  settings: 'tpk_settings'
};

const db = {
  load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : structuredClone(fallback);
    } catch {
      return structuredClone(fallback);
    }
  },
  save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

let state = {
  medlemmer: db.load(DB_KEYS.medlemmer, []),
  vapen: db.load(DB_KEYS.vapen, []), // {id, navn, serienummer, totalBruk, brukSidenPuss, aktiv}
  utlaan: db.load(DB_KEYS.utlaan, []), // {id, medlemId, vapenId, start, slutt, skytelederId}
  skyteledere: db.load(DB_KEYS.skyteledere, []),
  settings: db.load(DB_KEYS.settings, { aktivSkytelederId: null }),
  ui: {
    valgtMedlemId: null,
    aktivTab: 'utlaan'
  }
};

// ====== Utils ======
function id() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function nowISO() { return new Date().toISOString(); }
function fmtDateTime(iso) {
  try { return new Date(iso).toLocaleString('no-NO', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return iso; }
}
function persist() {
  db.save(DB_KEYS.medlemmer, state.medlemmer);
  db.save(DB_KEYS.vapen, state.vapen);
  db.save(DB_KEYS.utlaan, state.utlaan);
  db.save(DB_KEYS.skyteledere, state.skyteledere);
  db.save(DB_KEYS.settings, state.settings);
}
function download(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}

// ====== Dom refs ======
const el = {
  // header/stat
  statBadge: document.getElementById('statBadge'),
  antallAktive: document.getElementById('antallAktive'),
  pussAlarmBadge: document.getElementById('pussAlarmBadge'),
  pussCount: document.getElementById('pussCount'),
  // tabs
  tabUtlån: document.getElementById('tabUtlån'),
  tabHistorikk: document.getElementById('tabHistorikk'),
  viewUtlån: document.getElementById('viewUtlån'),
  viewHistorikk: document.getElementById('viewHistorikk'),
  // skyteleder
  skytelederSelect: document.getElementById('skytelederSelect'),
  nySkytelederBtn: document.getElementById('nySkytelederBtn'),
  adminSkytelederBtn: document.getElementById('adminSkytelederBtn'),
  adminSkytelederPanel: document.getElementById('adminSkytelederPanel'),
  slettSkytelederBtn: document.getElementById('slettSkytelederBtn'),
  // medlemmer
  medlemsListe: document.getElementById('medlemsListe'),
  medlemSok: document.getElementById('medlemSok'),
  nyttMedlemBtn: document.getElementById('nyttMedlemBtn'),
  adminMedlemBtn: document.getElementById('adminMedlemBtn'),
  adminMedlemPanel: document.getElementById('adminMedlemPanel'),
  slettMedlemBtn: document.getElementById('slettMedlemBtn'),
  // våpen
  vapenListe: document.getElementById('vapenListe'),
  vapenSok: document.getElementById('vapenSok'),
  nyttVapenBtn: document.getElementById('nyttVapenBtn'),
  weaponCounter: document.getElementById('weaponCounter'),
  // aktive utlån
  aktiveUtlaan: document.getElementById('aktiveUtlaan'),
  // admin
  eksportBtn: document.getElementById('eksportBtn'),
  importBtn: document.getElementById('importBtn'),
  lastNedLoggBtn: document.getElementById('lastNedLoggBtn'),
  dataJson: document.getElementById('dataJson'),
  // historikk
  historikkSok: document.getElementById('historikkSok'),
  inkluderAktive: document.getElementById('inkluderAktive'),
  filterVapen: document.getElementById('filterVapen'),
  filterSkyteleder: document.getElementById('filterSkyteleder'),
  filterMedlem: document.getElementById('filterMedlem'),
  historikkListe: document.getElementById('historikkListe'),
  historikkStat: document.getElementById('historikkStat')
};

// ====== Business-logikk ======
// Admin-knapp for medlem
el.adminMedlemBtn?.addEventListener('click', () => {
  const pass = prompt('Skriv inn admin-passord:');
  if (pass === getAdminPassord()) {
    el.adminMedlemPanel.style.display = '';
    el.adminMedlemPanel.dataset.admin = '1';
  } else {
    alert('Feil passord.');
  }
});

// Slett medlem-knapp
el.slettMedlemBtn?.addEventListener('click', async () => {
  if (el.adminMedlemPanel.dataset.admin !== '1') {
    alert('Du må aktivere admin først.');
    return;
  }
  const mid = state.ui.valgtMedlemId;
  if (!mid) { alert('Velg et medlem først.'); return; }
  const m = state.medlemmer.find(x => x.id === mid);
  if (!m) { alert('Medlem ikke funnet.'); return; }
  const harAktiv = state.utlaan.some(u => u.medlemId === mid && u.slutt === null);
  if (harAktiv) { alert('Kan ikke fjerne medlem med aktivt utlån. Lever inn først.'); return; }
  const bekreft = await customConfirm(`Slette medlem "${m.navn}" permanent?`);
  if (!bekreft) return;
  state.medlemmer = state.medlemmer.filter(x => x.id !== mid);
  if (state.ui.valgtMedlemId === mid) state.ui.valgtMedlemId = null;
  persist();
  render();
  el.adminMedlemPanel.style.display = 'none';
  el.adminMedlemPanel.dataset.admin = '';
});

// Skjul adminpanel når man bytter medlem
el.medlemsListe?.addEventListener('click', () => {
  el.adminMedlemPanel.style.display = 'none';
  el.adminMedlemPanel.dataset.admin = '';
});
// Skyteleder
function leggTilSkyteleder(navn) {
  const s = { id: id(), navn: navn.trim() };
  state.skyteledere.push(s);
  if (!state.settings.aktivSkytelederId) state.settings.aktivSkytelederId = s.id;
  persist(); render();
}
function aktivSkyteleder() {
  return state.skyteledere.find(s => s.id === state.settings.aktivSkytelederId) || null;
}
function settAktivSkyteleder(idVal) {
  state.settings.aktivSkytelederId = idVal || null;
  persist(); render();
}
function fjernSkyteleder(sid) {
  if (state.skyteledere.length <= 1) {
    alert("Du må ha minst én skyteleder.");
    return;
  }
  const s = state.skyteledere.find(x => x.id === sid);
  if (!s) return;
  const bekreft = confirm(`Slette skyteleder "${s.navn}" permanent?`);
  if (!bekreft) return;
  const pass = prompt("Skriv inn passord for å slette skyteleder:");
  if (pass !== getAdminPassord()) {
    alert("Feil passord. Skyteleder ble ikke slettet.");
    return;
  }
  state.skyteledere = state.skyteledere.filter(x => x.id !== sid);
  if (state.settings.aktivSkytelederId === sid) {
    state.settings.aktivSkytelederId = state.skyteledere[0]?.id || null;
  }
  persist(); render();
}
// Medlemmer
function leggTilMedlem(navn, fodselsdato, telefon, kommentar) {
  state.medlemmer.push({ id: id(), navn: navn.trim(), fodselsdato: (fodselsdato||'').trim(), telefon: (telefon||'').trim(), kommentar: (kommentar||'').trim() });
  persist(); render();
}
function fjernMedlem(mid) {
  const harAktiv = state.utlaan.some(u => u.medlemId === mid && u.slutt === null);
  if (harAktiv) { alert('Kan ikke fjerne medlem med aktivt utlån. Lever inn først.'); return; }
  state.medlemmer = state.medlemmer.filter(m => m.id !== mid);
  if (state.ui.valgtMedlemId === mid) state.ui.valgtMedlemId = null;
  persist(); render();
}

// Våpen
function finnVapenMedSerienr(serienummer) {
  const sn = (serienummer || '').trim().toLowerCase();
  return state.vapen.find(v => v.serienummer.toLowerCase() === sn);
}
function leggTilVapenFull(data) {
  // data: {type, mekanisme, kaliber, fabrikat, model, serienummer, kommentar}
  if (!data.type || !data.type.trim()) { alert('Våpen art er påkrevd.'); return; }
  if (!data.mekanisme || !data.mekanisme.trim()) { alert('Mekanisme er påkrevd.'); return; }
  if (!data.kaliber || !data.kaliber.trim()) { alert('Kaliber er påkrevd.'); return; }
  if (!data.fabrikat || !data.fabrikat.trim()) { alert('Fabrikat er påkrevd.'); return; }
  if (!data.model || !data.model.trim()) { alert('Model er påkrevd.'); return; }
  if (!data.serienummer || !data.serienummer.trim()) { alert('Serienummer er påkrevd.'); return; }
  if (finnVapenMedSerienr(data.serienummer)) { alert('Et våpen med dette serienummeret finnes allerede.'); return; }
  state.vapen.push({
    id: id(),
    navn: data.type.trim(),
    type: data.type.trim(),
    mekanisme: data.mekanisme.trim(),
    kaliber: data.kaliber.trim(),
    fabrikat: data.fabrikat.trim(),
    model: data.model.trim(),
    serienummer: data.serienummer.trim(),
    kommentar: data.kommentar ? data.kommentar.trim() : '',
    totalBruk: 0,
    brukSidenPuss: 0,
    aktiv: true
  });
  persist(); render();
}
function fjernVapen(vid) {
  const utl = state.utlaan.some(u => u.vapenId === vid && u.slutt === null);
  if (utl) { alert('Kan ikke fjerne våpen som er utlånt. Lever inn først.'); return; }
  const v = state.vapen.find(x => x.id === vid);
  const bekreft = confirm(`Slette våpenet "${v?.navn || ''}" (${v?.serienummer || ''}) permanent?\nOBS: Total-bruken slettes fra registeret. Historikk beholdes.`);
  if (!bekreft) return;
  const pass = prompt("Skriv inn passord for å slette våpen:");
  if (pass !== getAdminPassord()) {
    alert("Feil passord. Våpenet ble ikke slettet.");
    return;
  }
  state.vapen = state.vapen.filter(v => v.id !== vid);
  persist(); render();
}
function resetPuss(vid) {
  const v = state.vapen.find(v => v.id === vid);
  if (!v) return;
  if (!confirm(`Nullstille "siden puss" for ${v.navn} (${v.serienummer})?`)) return;
  v.brukSidenPuss = 0;
  persist(); render();
}

function updateWeaponCounter() {
  if (!el.weaponCounter) return;
  const totalWeapons = state.vapen.length;
  const activeWeapons = state.vapen.filter(v => v.aktiv).length;
  
  if (totalWeapons === activeWeapons) {
    el.weaponCounter.textContent = `${totalWeapons} våpen`;
  } else {
    el.weaponCounter.textContent = `${activeWeapons}/${totalWeapons} våpen (aktive/totalt)`;
  }
  
  // Update tooltip to show breakdown
  if (totalWeapons !== activeWeapons) {
    el.weaponCounter.title = `${activeWeapons} aktive av ${totalWeapons} totalt`;
  } else {
    el.weaponCounter.title = `${totalWeapons} våpen totalt`;
  }
}

// Utlån
function aktivtUtlaanForVapen(vid) {
  return state.utlaan.find(u => u.vapenId === vid && u.slutt === null) || null;
}
function utlaan(vapenId, medlemId) {
  // Sjekk om medlemmet kun kan låne .22
  const medlem = state.medlemmer.find(m => m.id === medlemId);
  const vapen = state.vapen.find(v => v.id === vapenId);
  if (medlem && medlem.kun22 && vapen && vapen.kaliber) {
    const kaliber = vapen.kaliber.trim();
    // Tillat .22 og .177 (luftpistol) for medlemmer med "kun .22"
    if (kaliber !== '.22' && kaliber !== '.177') {
      alert('Dette medlemmet kan kun låne våpen med kaliber .22 eller .177');
      return;
    }
  }
  // Krev telling før utlån
  const log = JSON.parse(localStorage.getItem('weaponLog') || '[]');
  const sisteTelling = log.length > 0 ? log[log.length-1] : null;
  if (!sisteTelling || sisteTelling.phase !== 'før') {
    alert('Du må utføre telling av våpen (FØR) før utlån kan gjøres!');
    return;
  }
  const s = aktivSkyteleder();
  if (!s) { alert('Velg skyteleder før utlån.'); return; }
  if (!medlemId) { alert('Velg medlem før utlån.'); return; }
  if (aktivtUtlaanForVapen(vapenId)) { alert('Våpenet er allerede utlånt.'); return; }
  state.utlaan.push({ id: id(), medlemId, vapenId, start: nowISO(), slutt: null, skytelederId: s.id });
  state.ui.valgtMedlemId = null;//Lagt til slik at medlemmet ikke er valgt etter utlån
  persist(); render();
}
function leverInn(utlaanId) { //Ny funksjon for innlevering kommentar og kan leies ut og kan ikke leies ut
  const u = state.utlaan.find(x => x.id === utlaanId);
  if (!u || u.slutt) return;
  u.slutt = nowISO();
  const v = state.vapen.find(v => v.id === u.vapenId);
  if (v) {
    v.totalBruk += 1;
    v.brukSidenPuss += 1;

    // --- NYTT: Spør om feil ved innlevering ---
    let kommentar = prompt("Kommentar om feil på våpenet? (La stå tomt hvis alt er ok)");
    let status = "ok";
    let feilTid = null;
    if (kommentar && kommentar.trim() !== "") {
      // Bruk customConfirm for Ja/Nei-dialog
      customConfirm("Kan våpenet fortsatt lånes ut?").then(result => {
        const status = result ? "ok" : "feil";
        const feilTid = status === "feil" ? nowISO() : null;
        v.feilKommentar = kommentar || "";
        v.feilStatus = status;
        v.feilTid = feilTid;
        v.aktiv = result; // Sett aktiv til false hvis våpenet ikke kan lånes ut
        u.feilKommentar = kommentar || "";
        u.feilStatus = status;
        u.feilTid = feilTid;
        persist(); render();
      });
      return;
    }
    v.feilKommentar = kommentar || "";
    v.feilStatus = status;
    v.feilTid = feilTid;
    u.feilKommentar = kommentar || "";
    u.feilStatus = status;
    u.feilTid = feilTid;
  }
  persist(); render();
}

// ====== Render ======
function renderStat() {
  const aktive = state.utlaan.filter(u => u.slutt === null).length;
  el.antallAktive.textContent = aktive;
  if (aktive === 0) {
    el.statBadge.textContent = 'Ingen utleide våpen';
    el.statBadge.classList.add('ok'); el.statBadge.classList.remove('warn');
  } else {
    el.statBadge.textContent = 'Utleide våpen';
    el.statBadge.classList.add('warn'); el.statBadge.classList.remove('ok');
  }

  const antPussAlarm = state.vapen.filter(v => v.brukSidenPuss > PUSS_THRESHOLD).length;
  el.pussCount.textContent = antPussAlarm;
  el.pussAlarmBadge.style.display = antPussAlarm > 0 ? '' : 'none';
}

function renderSkyteledere() {
  const sel = el.skytelederSelect;
  sel.innerHTML = '';
  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = 'Velg skyteleder...';
  sel.appendChild(opt0);

  [...state.skyteledere]
    .sort((a,b)=>a.navn.localeCompare(b.navn,'no'))
    .forEach(s => {
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.navn;
      if (state.settings.aktivSkytelederId === s.id) o.selected = true;
      sel.appendChild(o);
    });
}

function renderMedlemmer() {
  // Fjern eventuell eksisterende boks
  let boxDiv = document.getElementById('medlem22Div');
  if (boxDiv) boxDiv.remove();
  // Vis avkrysningsboks for valgt medlem
  const valgt = state.medlemmer.find(m => m.id === state.ui.valgtMedlemId);
  if (valgt) {
    boxDiv = document.createElement('div');
    boxDiv.id = 'medlem22Div';
    boxDiv.style.marginTop = '0.7rem';
    const label = document.createElement('label');
    label.style.fontSize = '0.95em';
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = !!valgt.kun22;
    check.style.marginRight = '0.5em';
    check.onchange = (e) => {
      valgt.kun22 = !!e.target.checked;
      persist();
    };
    label.appendChild(check);
    label.appendChild(document.createTextNode('Kan kun låne .22'));
    boxDiv.appendChild(label);
    el.medlemsListe.parentNode.appendChild(boxDiv);
  }
  const q = (el.medlemSok.value || '').trim().toLowerCase();
  const list = el.medlemsListe;
  list.innerHTML = '';
  // Nedtrekksmeny for medlem
  if (!el.medlemSelect) {
    el.medlemSelect = document.createElement('select');
    el.medlemSelect.id = 'medlemSelect';
    el.medlemSelect.style.width = '100%';
    el.medlemsListe.parentNode.insertBefore(el.medlemSelect, el.medlemsListe);
  }
  el.medlemSelect.innerHTML = '';
  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = 'Velg medlem...';
  el.medlemSelect.appendChild(opt0);
  const filtrerte = [...state.medlemmer]
    .filter(m => !q || m.navn.toLowerCase().includes(q) || (m.telefon||'').toLowerCase().includes(q))
    .sort((a,b)=>a.navn.localeCompare(b.navn,'no'));
  filtrerte.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.navn} (${m.fodselsdato || '-'})`;
    if (state.ui.valgtMedlemId === m.id) opt.selected = true;
    el.medlemSelect.appendChild(opt);
  });
  el.medlemSelect.onchange = (e) => {
    state.ui.valgtMedlemId = e.target.value || null;
    render();
  };

  // Vis søkeresultater som liste under søkefeltet
  el.medlemsListe.innerHTML = '';
  if (q && filtrerte.length > 0) {
    filtrerte.forEach(m => {
      const div = document.createElement('div');
      div.className = 'item';
      div.style.cursor = 'pointer';
      div.textContent = `${m.navn} (${m.fodselsdato || '-'})`;
      div.onclick = () => {
        state.ui.valgtMedlemId = m.id;
        el.medlemSelect.value = m.id;
        render();
      };
      el.medlemsListe.appendChild(div);
    });
  }
}

function renderVapen() {
  const q = (el.vapenSok.value || '').trim().toLowerCase();
  const list = el.vapenListe;
  list.innerHTML = '';
  // Nedtrekksmeny for våpenvalg (kun for utlån, ikke for admin)
  if (!el.vapenSelect) {
    el.vapenSelect = document.createElement('select');
    el.vapenSelect.id = 'vapenSelect';
    el.vapenSelect.style.width = '100%';
    el.vapenListe.parentNode.insertBefore(el.vapenSelect, el.vapenListe);
  }
  el.vapenSelect.innerHTML = '';
  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = 'Velg våpen...';
  el.vapenSelect.appendChild(opt0);
  [...state.vapen]
    .filter(v => v.aktiv && (!q || v.navn?.toLowerCase().includes(q) || v.serienummer?.toLowerCase().includes(q)))
    .sort((a,b)=>a.navn.localeCompare(b.navn,'no'))
    .forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
  let sn = v.serienummer || '';
  let snLast4 = sn.slice(-4);
  opt.textContent = `${v.fabrikat || ''} ${v.model || ''} ${v.kaliber || ''} S/N ${sn}${snLast4 ? ' (' + snLast4 + ')' : ''}`;
      el.vapenSelect.appendChild(opt);
    });
  el.vapenSelect.onchange = (e) => {
    // Kan utvides til å vise detaljer om valgt våpen
  };
  const medlem = state.medlemmer.find(m => m.id === state.ui.valgtMedlemId) || null;
  const sld = aktivSkyteleder();

  // Tabelloppsett
  const table = document.createElement('table');
  table.className = 'weapon-table'; // CSS for padding mellom kolonner
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>
    <th>Fabrikat</th>
    <th>Model</th>
    <th>Kaliber</th>
    <th>Serienummer</th>
    <th>Aktiv</th>
    <th>Handling</th>
  </tr>`;
  table.appendChild(thead);
  const tbody = document.createElement('tbody');

  // Filtrer og sorter våpen
  const filtered = [...state.vapen]
    .filter(v => !q || (v.navn?.toLowerCase().includes(q) || v.serienummer?.toLowerCase().includes(q) || v.fabrikat?.toLowerCase().includes(q)))
    .sort((a,b)=>a.navn.localeCompare(b.navn,'no'));

  if (filtered.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 9;
    td.style.textAlign = 'center';
    td.style.color = '#888';
    td.textContent = 'Denne listen er tom: utfør telling av våpen';
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    filtered.forEach(v => {
      const utl = aktivtUtlaanForVapen(v.id);
      const needsPuss = v.brukSidenPuss > PUSS_THRESHOLD;
      const tr = document.createElement('tr');
  // Fjernet bakgrunnsfarge for inaktive våpen - bruker kun tekstfarge i Aktiv-kolonnen
  if (needsPuss) tr.classList.add('puss-alarm-row');

      // Fabrikat, model, kaliber, serienummer
      const tdFab = document.createElement('td'); tdFab.textContent = v.fabrikat || '-';
      const tdMod = document.createElement('td'); tdMod.textContent = v.model || '-';
      const tdKal = document.createElement('td'); tdKal.textContent = v.kaliber || '-';
      // Serienummer med utheving av 4 siste siffer
      const tdSer = document.createElement('td');
      if (v.serienummer) {
        const sn = v.serienummer;
        const snStart = sn.slice(0, -4);
        const snEnd = sn.slice(-4);
        tdSer.innerHTML = `${snStart}<b>${snEnd}</b>`;
      } else {
        tdSer.textContent = '-';
      }

  // Kommentar-kolonne fjernet

      // Aktiv
      const tdAktiv = document.createElement('td');
      tdAktiv.textContent = v.aktiv ? 'Ja' : 'Nei';
      tdAktiv.style.color = v.aktiv ? 'green' : 'red';

      // Handlinger
      const tdHand = document.createElement('td');
      tdHand.style.whiteSpace = 'nowrap';
  // Lån-knapp
  const btn = document.createElement('button');
  btn.textContent = medlem ? `Lån til ${medlem.navn}` : 'Velg medlem';
  btn.className = 'primary';
  btn.disabled = !medlem || !!utl || !sld || v.feilStatus === "feil" || !v.aktiv;
  if (v.feilStatus === "feil") btn.title = 'Våpenet har feil og kan ikke lånes ut';
  if (!sld) btn.title = 'Velg skyteleder';
  if (!v.aktiv) btn.title = 'Våpenet er tatt ut av drift';
  btn.onclick = () => utlaan(v.id, medlem.id);
  tdHand.appendChild(btn);
      // Reset puss
      const puss = document.createElement('button');
      puss.textContent = 'Reset puss';
      puss.className = 'warning';
      puss.onclick = () => resetPuss(v.id);
      tdHand.appendChild(puss);
      // Slett
      const fjern = document.createElement('button');
      fjern.textContent = 'Slett';
      fjern.className = 'danger';
      fjern.onclick = () => fjernVapen(v.id);
      tdHand.appendChild(fjern);
      // Feil/fikset
      if (v.feilStatus === "feil") {
        const feilDiv = document.createElement('div');
        feilDiv.style.color = 'red';
        feilDiv.textContent = `FEIL: ${v.feilKommentar || 'Ukjent feil'} (Kan ikke lånes ut)`;
        tdHand.appendChild(feilDiv);
        const fixBtn = document.createElement('button');
        fixBtn.textContent = "Fikset – klar til utlån";
        fixBtn.className = 'success';
        fixBtn.onclick = () => {
          // Spør etter kommentar om hva som er fikset
          const fiksetKommentar = prompt("Hva er fikset?")?.trim() || "";
          v.feilStatus = "ok";
          v.feilKommentar = fiksetKommentar;
          v.feilTid = null;
          v.aktiv = true; // Sett våpenet tilbake til aktiv når det er fikset
          // Oppdater siste utlån med feilstatus for dette våpenet
          const sisteFeilUtlaan = [...state.utlaan].reverse().find(u => u.vapenId === v.id && u.feilStatus === "feil");
          if (sisteFeilUtlaan) {
            sisteFeilUtlaan.fiksetKommentar = fiksetKommentar;
            sisteFeilUtlaan.fiksetTid = nowISO();
          }
          persist();
          render();
        };
        tdHand.appendChild(fixBtn);
      }

  tr.appendChild(tdFab);
  tr.appendChild(tdMod);
  tr.appendChild(tdKal);
  tr.appendChild(tdSer);
  tr.appendChild(tdAktiv);
  tr.appendChild(tdHand);
      tbody.appendChild(tr);
    });
  }
  table.appendChild(tbody);
  list.appendChild(table);

  // CSS for weapon-table flyttet til style.css for ryddighet
}

function renderAktive() {
  const list = el.aktiveUtlaan;
  list.innerHTML = '';
  const aktive = state.utlaan.filter(u => u.slutt === null);

  if (aktive.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'hint';
    empty.textContent = 'Ingen aktive utlån';
    list.appendChild(empty);
    return;
  }

  aktive
    .sort((a,b)=> new Date(a.start) - new Date(b.start))
    .forEach(u => {
      const v = state.vapen.find(x=>x.id===u.vapenId);
      const m = state.medlemmer.find(x=>x.id===u.medlemId);
      const s = state.skyteledere.find(x=>x.id===u.skytelederId);
      const needsPuss = (v?.brukSidenPuss || 0) > PUSS_THRESHOLD;

      const div = document.createElement('div'); 
      div.className='item' + (needsPuss ? ' alarm' : '');

      const meta = document.createElement('div'); meta.className='meta';
  const title = document.createElement('div'); title.className='title';
  // Vis kun fabrikat (eller 'Våpen' hvis mangler)
  title.textContent = `${v?.fabrikat || 'Våpen'} (${v?.serienummer || '?'}) → ${m?.navn || 'Medlem'}`;
      const sub = document.createElement('div'); sub.className='muted';
      sub.textContent = `Utlånt: ${fmtDateTime(u.start)} · Skyteleder: ${s?.navn || '-'}`;
      meta.appendChild(title); meta.appendChild(sub);

      const btns = document.createElement('div'); btns.className='row'; btns.style.justifyContent='flex-end';
      const lever = document.createElement('button'); lever.textContent='Lever inn'; lever.className='success';
      lever.onclick = () => leverInn(u.id);

      if (needsPuss) {
        const alarm = document.createElement('span');
        alarm.className = 'badge danger-text';
        alarm.textContent = 'Puss anbefalt';
        btns.appendChild(alarm);
      }

      btns.appendChild(lever);
      div.appendChild(meta); div.appendChild(btns);
      list.appendChild(div);
    });
}

function renderHistorikkFilters() {
  // Våpen-filter
  el.filterVapen.innerHTML = '';
  const optV0 = new Option('Alle våpen', '');
  el.filterVapen.add(optV0);
  [...state.vapen]
    .sort((a,b)=>a.navn.localeCompare(b.navn,'no'))
    .forEach(v => el.filterVapen.add(new Option(`${v.navn} (${v.serienummer})`, v.id)));

  // Skyteleder-filter
  el.filterSkyteleder.innerHTML = '';
  el.filterSkyteleder.add(new Option('Alle skyteledere', ''));
  [...state.skyteledere]
    .sort((a,b)=>a.navn.localeCompare(b.navn,'no'))
    .forEach(s => el.filterSkyteleder.add(new Option(s.navn, s.id)));

  // Medlems-filter
  el.filterMedlem.innerHTML = '';
  el.filterMedlem.add(new Option('Alle medlemmer', ''));
  [...state.medlemmer]
    .sort((a,b)=>a.navn.localeCompare(b.navn,'no'))
    .forEach(m => el.filterMedlem.add(new Option(m.navn, m.id)));
}

function renderHistorikk() {
  const q = (el.historikkSok.value || '').trim().toLowerCase();
  const inklAktive = el.inkluderAktive.checked;
  const vFilter = el.filterVapen.value || '';
  const sFilter = el.filterSkyteleder.value || '';
  const mFilter = el.filterMedlem.value || '';

  const list = el.historikkListe;
  list.innerHTML = '';

  let items = [...state.utlaan];

  if (!inklAktive) items = items.filter(u => u.slutt !== null);
  if (vFilter) items = items.filter(u => u.vapenId === vFilter);
  if (sFilter) items = items.filter(u => u.skytelederId === sFilter);
  if (mFilter) items = items.filter(u => u.medlemId === mFilter);

  if (q) {
    items = items.filter(u => {
      const v = state.vapen.find(x=>x.id===u.vapenId);
      const m = state.medlemmer.find(x=>x.id===u.medlemId);
      const s = state.skyteledere.find(x=>x.id===u.skytelederId);
      const hay = [
        v?.navn || '', v?.serienummer || '',
        m?.navn || '', m?.telefon || '',
        s?.navn || '',
        fmtDateTime(u.start), u.slutt ? fmtDateTime(u.slutt) : 'aktiv'
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  items.sort((a,b) => new Date(b.start) - new Date(a.start));

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'hint';
    empty.textContent = 'Ingen treff i historikk.';
    list.appendChild(empty);
  } else {
    items.forEach(u => {
      const v = state.vapen.find(x=>x.id===u.vapenId);
      const m = state.medlemmer.find(x=>x.id===u.medlemId);
      const s = state.skyteledere.find(x=>x.id===u.skytelederId);

      const div = document.createElement('div'); div.className='item';
      const meta = document.createElement('div'); meta.className='meta';

      // Våpeninfo med alle felter
      const t = document.createElement('div'); t.className='title';
      t.innerHTML =
        `<b>${v?.type || v?.navn || ''}</b> &ndash; ${v?.mekanisme || ''} &ndash; ${v?.kaliber || ''} &ndash; ${v?.fabrikat || ''} &ndash; ${v?.model || ''} <br>
        <span style='color:#888'>Serienr: ${v?.serienummer || ''}</span> <br>
        <span style='color:#888'>Kommentar: ${v?.kommentar || ''}</span> <br>
        <span style='color:#888'>→ ${m?.navn || 'Medlem'}${m ? ` (${m.fodselsdato || '-'}, ${m.telefon || '-'})` : ''}</span>`;

      const period = u.slutt ? `${fmtDateTime(u.start)} – ${fmtDateTime(u.slutt)}` : `${fmtDateTime(u.start)} (aktiv)`;
      const sub = document.createElement('div'); sub.className='muted';
      sub.textContent = `${period} · Skyteleder: ${s?.navn || '-'}`;

      meta.appendChild(t); meta.appendChild(sub);

      const right = document.createElement('div'); right.className='row'; right.style.justifyContent='flex-end';
      if (!u.slutt) {
        const lever = document.createElement('button'); lever.textContent='Lever inn'; lever.className='success';
        lever.onclick = () => leverInn(u.id);
        right.appendChild(lever);
      }

      div.appendChild(meta); div.appendChild(right);
      list.appendChild(div);
    });
  }

  const ant = items.length;
  const full = state.utlaan.length;
  el.historikkStat.textContent = `Viser ${ant} av ${full} utlån${el.inkluderAktive.checked ? ' (inkl. aktive)' : ''}.`;
}

function navnForMedlem(id) {
  const m = state.medlemmer.find(x=>x.id===id);
  return m ? m.navn : 'Ukjent';
}

function render() {
  renderStat();
  renderSkyteledere();
  renderMedlemmer();
  renderVapen();
  updateWeaponCounter();
  renderAktive();
  renderHistorikkFilters();
  renderHistorikk();
}

// ====== Admin: Last ned våpenlogg (CSV) ======
function lastNedVapenLogg() {
  // Utvidet CSV-header med alle relevante felter
  const header = [
    'Våpen art','Mekanisme','Kaliber','Fabrikat','Model','Serienummer','Kommentar',
    'Totalt antall treninger','Siden puss','Aktiv',
    'Feilstatus','Antall feil' // Antall registrerte feil på våpenet
  ];
  // Funksjon for å telle antall feil for hvert våpen
  // Teller antall utlån hvor det ble registrert feil ved innlevering
  function countFeilForVapen(vapenId) {
    return state.utlaan.filter(u =>
      u.vapenId === vapenId &&
      u.slutt &&
      u.feilStatus === 'feil' &&
      u.feilKommentar && u.feilKommentar.trim() !== ''
    ).length;
  }
  // Hent siste feilregistrering for våpenet (eller tom streng)
  function sisteFeilForVapen(vapenId) {
    const feilUtlaan = state.utlaan.filter(u =>
      u.vapenId === vapenId &&
      u.slutt &&
      u.feilStatus === 'feil' &&
      u.feilKommentar && u.feilKommentar.trim() !== ''
    );
    if (feilUtlaan.length === 0) return { kommentar: '', tid: '' };
    const siste = feilUtlaan[feilUtlaan.length - 1];
    return { kommentar: siste.feilKommentar, tid: siste.feilTid ? fmtDateTime(siste.feilTid) : '' };
  }
  const rows = state.vapen
    .sort((a, b) => a.navn.localeCompare(b.navn, 'no'))
    .map(v => [
      v.type || v.navn || '',
      v.mekanisme || '',
      v.kaliber || '',
      v.fabrikat || '',
      v.model || '',
      v.serienummer || '',
      v.kommentar || '',
      String(v.totalBruk),
      String(v.brukSidenPuss),
      v.aktiv ? 'Ja' : 'Nei',
      v.feilStatus === 'feil' ? 'Kan ikke lånes ut' : 'OK',
      countFeilForVapen(v.id) // Antall feil
    ]);
  // Semikolon-separert CSV for norsk Excel
  const csv = [header, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(';')).join('\n');
  const date = new Date().toISOString().slice(0,10);
  download(`timepk-vapenlogg-${date}.csv`, csv, 'text/csv;charset=utf-8');
}

// ====== UI Handlers ======
// Tabs
el.tabUtlån.addEventListener('click', () => {
  state.ui.aktivTab = 'utlaan';
  el.tabUtlån.classList.add('active'); el.tabHistorikk.classList.remove('active');
  el.viewUtlån.style.display = ''; el.viewHistorikk.style.display = 'none';
});
el.tabHistorikk.addEventListener('click', () => {
  state.ui.aktivTab = 'historikk';
  el.tabHistorikk.classList.add('active'); el.tabUtlån.classList.remove('active');
  el.viewHistorikk.style.display = ''; el.viewUtlån.style.display = 'none';
  renderHistorikkFilters(); renderHistorikk();
});

// Skyteleder
el.nySkytelederBtn.addEventListener('click', () => {
  const navn = prompt('Navn på skyteleder:');
  if (!navn || !navn.trim()) return;
  leggTilSkyteleder(navn);
});
// Admin-knapp for skyteleder
el.adminSkytelederBtn.addEventListener('click', () => {
  const pass = prompt('Skriv inn admin-passord:');
  if (pass === getAdminPassord()) {
    el.adminSkytelederPanel.style.display = '';
    el.adminSkytelederPanel.dataset.admin = '1';
  } else {
    alert('Feil passord.');
  }
});

// Slett skyteleder-knapp
el.slettSkytelederBtn.addEventListener('click', async () => {
  if (el.adminSkytelederPanel.dataset.admin !== '1') {
    alert('Du må aktivere admin først.');
    return;
  }
  const select = el.skytelederSelect;
  const id = select.value;
  if (!id) { alert('Velg en skyteleder først.'); return; }
  const s = state.skyteledere.find(x => x.id === id);
  if (!s) { alert('Skyteleder ikke funnet.'); return; }
  const bekreft = await customConfirm(`Slette skyteleder "${s.navn}" permanent?`);
  if (!bekreft) return;
  state.skyteledere = state.skyteledere.filter(x => x.id !== id);
  if (state.settings.aktivSkytelederId === id) state.settings.aktivSkytelederId = null;
  persist();
  renderSkyteledere();
  el.adminSkytelederPanel.style.display = 'none';
  el.adminSkytelederPanel.dataset.admin = '';
});

// Skjul adminpanel når man bytter skyteleder
el.skytelederSelect.addEventListener('change', () => {
  el.adminSkytelederPanel.style.display = 'none';
  el.adminSkytelederPanel.dataset.admin = '';
});

// Hent admin-passord fra eksisterende logikk (bruk samme som for sletting)
function getAdminPassord() {
  return localStorage.getItem(PASSORD_KEY) || 'TimePK';
}
el.skytelederSelect.addEventListener('change', e => settAktivSkyteleder(e.target.value || null));

// Medlemmer
el.nyttMedlemBtn.addEventListener('click', () => {
  const navn = prompt('Medlemsnavn:');
  if (!navn || !navn.trim()) return;
  let fd = prompt('Fødselsdato (ddmmåååå eller dd.mm.åååå):') || '';
  fd = fd.replace(/\D/g, '');
  if (fd.length === 8) {
    fd = fd.replace(/(\d{2})(\d{2})(\d{4})/, '$1.$2.$3');
  }
  const tlf = prompt('Telefon:') || '';
  leggTilMedlem(navn, fd, tlf, '');
  // Opprydding: Sjekk for .22-lån skjer kun ved faktisk utlån, ikke ved opprettelse av medlem
  // state.ui.valgtMedlemId og state.ui.valgtVapenId brukes i utlånsflyt
});
el.medlemSok.addEventListener('input', renderMedlemmer);

// Våpen
el.nyttVapenBtn.addEventListener('click', () => {
  // Skjema for alle felter
  const type = prompt('Våpen art (f.eks. Pistol, Revolver):');
  if (!type || !type.trim()) return;
  const mekanisme = prompt('Mekanisme (f.eks. Halvautomat, Repetér):');
  if (!mekanisme || !mekanisme.trim()) return;
  const kaliber = prompt('Kaliber (f.eks. 9mm, .22):');
  if (!kaliber || !kaliber.trim()) return;
  const fabrikat = prompt('Fabrikat (f.eks. Benelli, STI):');
  if (!fabrikat || !fabrikat.trim()) return;
  const model = prompt('Model (f.eks. PM 95E, Target master):');
  if (!model || !model.trim()) return;
  const serienummer = prompt('Serienummer (påkrevd):');
  if (!serienummer || !serienummer.trim()) { alert('Serienummer er påkrevd.'); return; }
  const kommentar = prompt('Kommentar (valgfritt):') || '';
  leggTilVapenFull({type, mekanisme, kaliber, fabrikat, model, serienummer, kommentar});
});
el.vapenSok.addEventListener('input', renderVapen);

// Admin eksport/import/logg
el.eksportBtn.addEventListener('click', () => {
  const payload = {
    medlemmer: state.medlemmer,
    vapen: state.vapen,
    utlaan: state.utlaan,
    skyteledere: state.skyteledere,
    settings: state.settings,
    weaponLog: JSON.parse(localStorage.getItem('weaponLog') || '[]'),
    feilFiksLogg: state.utlaan.filter(u => (u.feilKommentar && u.feilKommentar.trim() !== '') || (u.fiksetKommentar && u.fiksetKommentar.trim() !== '')),
    eksportTid: nowISO()
  };
  el.dataJson.value = JSON.stringify(payload, null, 2);
});
el.importBtn.addEventListener('click', () => {
  if (!el.dataJson.value.trim()) { alert('Lim inn JSON først.'); return; }
  if (!confirm('Import vil erstatte eksisterende data. Fortsette?')) return;
  try {
    const d = JSON.parse(el.dataJson.value);
    state.medlemmer = Array.isArray(d.medlemmer) ? d.medlemmer : [];
    state.vapen = Array.isArray(d.vapen) ? d.vapen : [];
    state.utlaan = Array.isArray(d.utlaan) ? d.utlaan : [];
    state.skyteledere = Array.isArray(d.skyteledere) ? d.skyteledere : [];
    state.settings = d.settings || { aktivSkytelederId: null };
    if (Array.isArray(d.weaponLog)) {
      localStorage.setItem('weaponLog', JSON.stringify(d.weaponLog));
    }
    // feilFiksLogg er kun for eksport, ikke import, da den genereres fra utlaan
    persist(); render();
    alert('Import fullført.');
  } catch {
    alert('Kunne ikke lese JSON. Sjekk formatet.');
  }
});
el.lastNedLoggBtn.addEventListener('click', lastNedVapenLogg);

// Historikk filter handlers
el.historikkSok.addEventListener('input', renderHistorikk);
el.inkluderAktive.addEventListener('change', renderHistorikk);
el.filterVapen.addEventListener('change', renderHistorikk);
el.filterSkyteleder.addEventListener('change', renderHistorikk);
el.filterMedlem.addEventListener('change', renderHistorikk);

// ====== Første init ======
(function bootstrap() {
  if (state.skyteledere.length === 0) {
    leggTilSkyteleder('Skyteleder');
  } else {
    render();
  }

  // Advarsel ved lukking når utlån er aktive
  window.addEventListener('beforeunload', (e) => {
    const aktive = state.utlaan.some(u => u.slutt === null);
    if (aktive) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
})();
// Lytter etter melding fra service worker om ny versjon
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data && event.data.type === "NEW_VERSION") {
      const banner = document.createElement("div");
      banner.style.position = "fixed";
      banner.style.bottom = "20px";
      banner.style.left = "50%";
      banner.style.transform = "translateX(-50%)";
      banner.style.background = "#1E88E5"; // TimePK-blå
      banner.style.color = "#fff";
      banner.style.padding = "0.8rem 1.2rem";
      banner.style.borderRadius = "8px";
      banner.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
      banner.style.display = "flex";
      banner.style.alignItems = "center";
      banner.style.gap = "1rem";
      banner.style.fontFamily = "'Segoe UI', sans-serif";
      banner.style.zIndex = "9999";
      banner.innerHTML = `
        <span style="font-size:0.95rem;">Ny versjon av TimePK er klar</span>
        <button id="reloadBtn" style="
          background:#fff;
          color:#1E88E5;
          border:none;
          padding:0.4rem 0.8rem;
          border-radius:6px;
          font-weight:600;
          cursor:pointer;
          transition:background 0.2s;
        ">Oppdater</button>
      `;
      document.body.appendChild(banner);

      const btn = document.getElementById("reloadBtn");
      btn.addEventListener("mouseover", () => btn.style.background = "#f0f0f0");
      btn.addEventListener("mouseout", () => btn.style.background = "#fff");
      btn.addEventListener("click", () => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
        }
        window.location.reload();
      });
    }
  });
}
// --- Teller og filter ---
// 1. Vis kun avvik som standard
let currentFilter = "deviations";

// 2. Fase-styring
let phaseLocked = false; // Låser fasevalg når det skal være låst

function renderWeaponLog() {
  const logList = document.getElementById("weaponLog");
  logList.innerHTML = "";

  // Hent logg fra localStorage
  const log = JSON.parse(localStorage.getItem('weaponLog') || '[]');

  // Beregn avvik for alle "etter"-poster (men ikke overskrev manuelt satte avvik)
  log.forEach((entry, index) => {
    if (entry.phase === "etter") {
      const lastBefore = [...log.slice(0, index)].reverse().find(e => e.phase === "før");
      // Ikke overskrev manuelt satte avvik (som stempelavvik)
      if (entry.deviation === undefined) {
        entry.deviation = lastBefore && entry.count !== lastBefore.count;
      }
    }
  });

  // Oppdater teller i knappen
  const deviationCount = log.filter(entry => entry.deviation && !entry.deviationApproved).length;
  document.getElementById("deviationCount").textContent = deviationCount;

  // Filtrer hvis nødvendig
  let filteredLog = log;
  if (currentFilter === "deviations") {
    filteredLog = log.filter(entry => entry.deviation && !entry.deviationApproved);
  }

  // Tegn listen (nyeste først)
  filteredLog.slice().reverse().forEach((entry, idx) => {
    const li = document.createElement('li');
    li.style.padding = '0.5rem';
    li.style.borderBottom = '1px solid #ddd';

    // Godkjent avvik vises hvitt i "Vis alle"
    if (entry.deviation && entry.deviationApproved) {
      li.style.color = '#fff';
      li.style.background = '#4caf50';
      li.innerHTML = `✔️ <strong>${entry.phase.toUpperCase()}</strong> – ${entry.count} våpen
        <br><small>${new Date(entry.timestamp).toLocaleString('no-NO')}</small>
        ${entry.note ? `<br><em>${entry.note}</em>` : ''}
        <br><strong>AVVIK GODKJENT AV VÅPENANSVARLIG</strong>
        ${entry.deviationApprovalComment ? `<br><em>Kommentar: ${entry.deviationApprovalComment}</em>` : ''}`;
    }
    // Ikke-godkjent avvik
    else if (entry.deviation) {
      li.style.color = 'red';
      li.innerHTML = `⚠️ <strong>${entry.phase.toUpperCase()}</strong> – ${entry.count} våpen
        <br><small>${new Date(entry.timestamp).toLocaleString('no-NO')}</small>
        ${entry.note ? `<br><em>${entry.note}</em>` : ''}
        <br><strong>AVVIK REGISTRERT</strong>
        <br><button class="approveBtn" data-timestamp="${entry.timestamp}" style="margin-top:0.5rem;">Godkjenn avvik</button>`;
    }
    // Vanlig logg
    else {
      li.innerHTML = `<strong>${entry.phase.toUpperCase()}</strong> – ${entry.count} våpen
        <br><small>${new Date(entry.timestamp).toLocaleString('no-NO')}</small>
        ${entry.note ? `<br><em>${entry.note}</em>` : ''}`;
    }

    logList.appendChild(li);
  });

  // Legg til godkjenn-knapp event
  document.querySelectorAll('.approveBtn').forEach(btn => {
    btn.onclick = function() {
      const timestamp = this.dataset.timestamp;
      const log = JSON.parse(localStorage.getItem('weaponLog') || '[]');
      const entryIndex = log.findIndex(entry => entry.timestamp === timestamp);
      const entry = log[entryIndex];
      if (!entry) return;
      const pass = prompt("Skriv inn passord for å godkjenne avvik:");
  if (pass === getAdminPassord()) {
        let kommentar = prompt("Kommentar til godkjenning av avvik (valgfritt):");
        entry.deviationApproved = true;
        entry.deviationApprovalComment = kommentar || "";
        localStorage.setItem('weaponLog', JSON.stringify(log));
        renderWeaponLog();
        alert("Avvik godkjent av våpenansvarlig.");
      } else {
        alert("Feil passord.");
      }
    };
  });
}

// --- Skjema for å lagre telling ---
// 2. Fase starter alltid på "før"
const phaseSelect = document.getElementById('phase');
phaseSelect.value = "før";
phaseSelect.disabled = true; // Låst til "før" ved oppstart

function resetPhase() {
  phaseSelect.value = "før";
  phaseSelect.disabled = true;
  phaseLocked = false;
}

document.getElementById('weaponForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const count = parseInt(document.getElementById('count').value, 10);
  const phase = phaseSelect.value;
  const note = document.getElementById('note').value.trim();
  const timestamp = new Date().toISOString();

  // Ikke tillat telling etter trening hvis det finnes aktive utlån
  if (phase === "etter") {
    const aktiveUtlån = state.utlaan.filter(u => u.slutt === null).length;
    if (aktiveUtlån > 0) {
      alert("Du kan ikke telle 'etter trening' før alle våpen er levert inn!");
      return;
    }
  }

  const logEntry = { count, phase, note, timestamp };
  const existingLog = JSON.parse(localStorage.getItem('weaponLog') || '[]');

  // Avviksvarsel i sanntid
  if (phase === "etter") {
    const lastBefore = [...existingLog].reverse().find(e => e.phase === "før");
    if (lastBefore && count !== lastBefore.count) {
      logEntry.deviation = true;
      if (!note) {
        alert("Du må legge inn en kommentar for å lagre telling med avvik!");
        return;
      }
      alert(`⚠️ AVVIK OPPDAGET!\nFør trening: ${lastBefore.count} våpen\nEtter trening: ${count} våpen`);
    }
  }

  existingLog.push(logEntry);
  localStorage.setItem('weaponLog', JSON.stringify(existingLog));

  this.reset();

  // Etter lagring: hvis "før", bytt til "etter" og lås feltet, ellers tilbakestill
  if (phase === "før") {
    phaseSelect.value = "etter";
    phaseSelect.disabled = true;
    phaseLocked = true;
  } else {
    resetPhase();
  }

  renderWeaponLog();
  
  // Spør om stempel i stedet for simpelt varsel
  customConfirm(`Telling lagret: ${count} våpen (${phase})\n\nEr stempelet i våpenskapet?`).then(result => {
    if (!result) {
      // Nei - registrer avvik for manglende stempel
      const stempelAvvik = {
        count: count,
        phase: phase,
        note: "Stempel mangler - Kontakt Våpenansvarlig",
        timestamp: new Date().toISOString(),
        deviation: true,
        deviationApproved: false
      };
      
      const log = JSON.parse(localStorage.getItem('weaponLog') || '[]');
      log.push(stempelAvvik);
      localStorage.setItem('weaponLog', JSON.stringify(log));
      renderWeaponLog();
      
      alert("AVVIK REGISTRERT: Stempel mangler - Kontakt Våpenansvarlig");
    }
  });
});

// 2. Lås fasevalg, brukeren kan ikke endre selv
phaseSelect.addEventListener('mousedown', function(e) {
  if (phaseSelect.disabled) e.preventDefault();
});
phaseSelect.addEventListener('keydown', function(e) {
  if (phaseSelect.disabled) e.preventDefault();
});

// --- Filterknapper ---
// 1. "Vis kun avvik" aktiv som standard
document.getElementById("showAll").addEventListener("click", () => {
  currentFilter = "all";
  document.getElementById("showAll").classList.add("active");
  document.getElementById("showDeviations").classList.remove("active");
  renderWeaponLog();
});

document.getElementById("showDeviations").addEventListener("click", () => {
  currentFilter = "deviations";
  document.getElementById("showDeviations").classList.add("active");
  document.getElementById("showAll").classList.remove("active");
  renderWeaponLog();
});

// --- Tegn loggen ved oppstart ---
// 1. Sett "Vis kun avvik" aktiv
document.getElementById("showDeviations").classList.add("active");
document.getElementById("showAll").classList.remove("active");

// Sjekk siste telling og sett riktig fase
function initializePhaseFromLog() {
  const log = JSON.parse(localStorage.getItem('weaponLog') || '[]');
  const sisteTelling = log.length > 0 ? log[log.length-1] : null;
  
  if (!sisteTelling) {
    // Ingen telling enda - start med "før"
    resetPhase();
  } else if (sisteTelling.phase === "før") {
    // Siste telling var "før" - nå skal det være "etter" (kan låne ut)
    phaseSelect.value = "etter";
    phaseSelect.disabled = true;
    phaseLocked = true;
  } else {
    // Siste telling var "etter" - tilbake til "før" for ny periode
    resetPhase();
  }
}

initializePhaseFromLog();
renderWeaponLog();
//updated 05.10.2025