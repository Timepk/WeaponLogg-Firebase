// ===== TimePK WeaponLogg - Firebase Version =====
// Real-time cloud sync for multiple users
import { loginWithGoogle, logout, onAuthChange, getCurrentUser } from './firebase-auth.js';
import fbDb, { setupRealtimeSync, stopRealtimeSync } from './firebase-db.js';

// ===== Constants =====
const PUSS_THRESHOLD = 30;
const PASSORD_KEY = 'tpk_admin_passord';

// ===== Application State (synced with Firebase Firestore) =====
let state = {
  medlemmer: [],
  vapen: [],
  utlaan: [],
  skyteledere: [],
  settings: { aktivSkytelederId: null },
  ui: { valgtMedlemId: null, aktivTab: 'utlaan' }
};

// ===== DOM Elements Cache =====
const el = {
  loginScreen: document.getElementById('loginScreen'),
  appContainer: document.getElementById('appContainer'),
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  userEmail: document.getElementById('userEmail'),
  statBadge: document.getElementById('statBadge'),
  antallAktive: document.getElementById('antallAktive'),
  pussAlarmBadge: document.getElementById('pussAlarmBadge'),
  pussCount: document.getElementById('pussCount'),
  tabUtlån: document.getElementById('tabUtlån'),
  tabMedlem: document.getElementById('tabMedlem'),
  tabVapen: document.getElementById('tabVapen'),
  tabHistorikk: document.getElementById('tabHistorikk'),
  tabAdmin: document.getElementById('tabAdmin'),
  viewUtlån: document.getElementById('viewUtlån'),
  viewMedlem: document.getElementById('viewMedlem'),
  viewVapen: document.getElementById('viewVapen'),
  viewHistorikk: document.getElementById('viewHistorikk'),
  viewAdmin: document.getElementById('viewAdmin'),
  medlemSelect: document.getElementById('medlemSelect'),
  vapenSelect: document.getElementById('vapenSelect'),
  skytelederSelect: document.getElementById('skytelederSelect'),
  utlanBtnNew: document.getElementById('utlanBtnNew'),
  utlanBtnReturnWeapon: document.getElementById('utlanBtnReturnWeapon'),
  medlemsListe: document.getElementById('medlemsListe'),
  medlemSok: document.getElementById('medlemSok'),
  nyttMedlemBtn: document.getElementById('nyttMedlemBtn'),
  medlemForm: document.getElementById('medlemForm'),
  adminMedlemBtn: document.getElementById('adminMedlemBtn'),
  adminMedlemPanel: document.getElementById('adminMedlemPanel'),
  vapenListe: document.getElementById('vapenListe'),
  vapenSok: document.getElementById('vapenSok'),
  nyttVapenBtn: document.getElementById('nyttVapenBtn'),
  weaponForm: document.getElementById('weaponForm'),
  weaponCounter: document.getElementById('weaponCounter'),
  aktiveUtlaan: document.getElementById('aktiveUtlaan'),
  showDeviations: document.getElementById('showDeviations'),
  nySkytelederBtn: document.getElementById('nySkytelederBtn'),
  adminSkytelederBtn: document.getElementById('adminSkytelederBtn'),
  adminSkytelederPanel: document.getElementById('adminSkytelederPanel'),
  slettSkytelederBtn: document.getElementById('slettSkytelederBtn'),
  eksportBtn: document.getElementById('eksportBtn'),
  importBtn: document.getElementById('importBtn'),
  importTextarea: document.getElementById('importTextarea'),
  adminPasswordInput: document.getElementById('adminPasswordInput'),
  adminPasswordBtn: document.getElementById('adminPasswordBtn'),
  customConfirm: document.getElementById('customConfirm'),
  customConfirmMsg: document.getElementById('customConfirmMsg'),
  customConfirmYes: document.getElementById('customConfirmYes'),
  customConfirmNo: document.getElementById('customConfirmNo')
};

// ===== INITIALIZATION =====
onAuthChange(handleAuthChange);

function handleAuthChange(user) {
  console.log('[App] Auth state changed:', user?.email || 'Unauthorized');
  if (user) {
    el.loginScreen.style.display = 'none';
    el.appContainer.style.display = 'grid';
    el.userEmail.textContent = user.email;
    initFirebaseSync();
  } else {
    el.loginScreen.style.display = 'flex';
    el.appContainer.style.display = 'none';
    el.userEmail.textContent = '';
    state = {
      medlemmer: [],
      vapen: [],
      utlaan: [],
      skyteledere: [],
      settings: { aktivSkytelederId: null },
      ui: { valgtMedlemId: null, aktivTab: 'utlaan' }
    };
    stopRealtimeSync();
  }
}

async function initFirebaseSync() {
  console.log('[App] Initializing Firebase sync...');
  try {
    setupRealtimeSync(async (collName, snapshot) => {
      console.log(`[App] Update from ${collName}`);
      const data = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      state[collName] = data;
      render();
    });
    console.log('[App] Firebase sync initialized');
  } catch (err) {
    console.error('[App] Firebase sync error:', err);
  }
}

// ===== EVENT LISTENERS =====
el.loginBtn?.addEventListener('click', async () => {
  try {
    await loginWithGoogle();
  } catch (err) {
    console.error('[App] Login failed:', err);
    alert('Innlogging feilet: ' + err.message);
  }
});

el.logoutBtn?.addEventListener('click', async () => {
  try {
    await logout();
  } catch (err) {
    console.error('[App] Logout failed:', err);
  }
});

// Medlem button
el.nyttMedlemBtn?.addEventListener('click', () => {
  el.medlemForm.reset();
  el.adminMedlemPanel.style.display = 'block';
  el.adminMedlemBtn.textContent = 'Legg til medlem';
});

el.adminMedlemBtn?.addEventListener('click', async () => {
  const navn = document.getElementById('medlemNavn').value;
  const fodselsdato = document.getElementById('medlemFodselsdato').value;
  const telefon = document.getElementById('medlemTelefon').value;
  const kommentar = document.getElementById('medlemKommentar').value;
  if (!navn) {
    alert('Navn er påkrevd');
    return;
  }
  try {
    const newMember = { navn, fodselsdato, telefon, kommentar, createdAt: new Date().toISOString() };
    await fbDb.setDocument('medlemmer', Date.now().toString(), newMember);
    el.adminMedlemPanel.style.display = 'none';
  } catch (err) {
    console.error('[App] Error adding member:', err);
    alert('Feil: ' + err.message);
  }
});

// Vapen button
el.nyttVapenBtn?.addEventListener('click', () => {
  el.weaponForm.reset();
  el.adminMedlemPanel.style.display = 'block';
  el.adminMedlemBtn.textContent = 'Legg til våpen';
});

// Utlån button
el.utlanBtnNew?.addEventListener('click', async () => {
  const medlemId = el.medlemSelect.value;
  const vapenId = el.vapenSelect.value;
  const skytelederId = el.skytelederSelect.value;
  if (!medlemId || !vapenId || !skytelederId) {
    alert('Velg medlem, våpen og skyteleder');
    return;
  }
  try {
    const newUtlaan = {
      medlemId, vapenId, skytelederId,
      start: new Date().toISOString(),
      slutt: null,
      feilKommentar: '', feilTid: null,
      fiksetKommentar: '', fiksetTid: null,
      godkjentAvvik: false
    };
    await fbDb.setDocument('utlaan', Date.now().toString(), newUtlaan);
    el.medlemSelect.value = '';
    el.vapenSelect.value = '';
  } catch (err) {
    console.error('[App] Error creating loan:', err);
    alert('Feil: ' + err.message);
  }
});

el.utlanBtnReturnWeapon?.addEventListener('click', async () => {
  const aktivUtlaan = state.utlaan.filter(u => !u.slutt);
  if (aktivUtlaan.length === 0) {
    alert('Ingen aktive utlån');
    return;
  }
  try {
    for (const utlaan of aktivUtlaan) {
      if (utlaan.medlemId === el.medlemSelect.value && utlaan.vapenId === el.vapenSelect.value) {
        await fbDb.updateDocument('utlaan', utlaan.id, { slutt: new Date().toISOString() });
      }
    }
  } catch (err) {
    console.error('[App] Error returning:', err);
    alert('Feil: ' + err.message);
  }
});

// Skyteleder
el.nySkytelederBtn?.addEventListener('click', async () => {
  const navn = prompt('Navn på skyteleder:');
  if (!navn) return;
  try {
    await fbDb.setDocument('skyteledere', Date.now().toString(), { navn, createdAt: new Date().toISOString() });
  } catch (err) {
    console.error('[App] Error adding skyteleder:', err);
    alert('Feil: ' + err.message);
  }
});

// Admin - Export
el.eksportBtn?.addEventListener('click', async () => {
  try {
    const allData = await fbDb.exportAllData();
    const json = JSON.stringify(allData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timepk-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[App] Export error:', err);
    alert('Feil: ' + err.message);
  }
});

// Admin - Import
el.importBtn?.addEventListener('click', async () => {
  const json = el.importTextarea?.value;
  if (!json) {
    alert('Lim inn JSON-data først');
    return;
  }
  try {
    const data = JSON.parse(json);
    await fbDb.importData(data);
    el.importTextarea.value = '';
    alert('Data importert!');
  } catch (err) {
    console.error('[App] Import error:', err);
    alert('Feil: ' + err.message);
  }
});

// ===== RENDER FUNCTION =====
function render() {
  const aktivUtlaan = state.utlaan.filter(u => !u.slutt);
  el.statBadge.textContent = aktivUtlaan.length;
  el.antallAktive.textContent = aktivUtlaan.length;
  
  const pussNeeded = state.vapen.filter(v => v.brukSidenPuss > PUSS_THRESHOLD);
  el.pussAlarmBadge.style.display = pussNeeded.length > 0 ? 'inline' : 'none';
  el.pussCount.textContent = pussNeeded.length;
  
  renderMedlemmer();
  renderVapen();
  renderUtlaan();
  updateSelects();
}

function renderMedlemmer() {
  const container = el.medlemsListe;
  if (!container) return;
  const filterText = el.medlemSok?.value?.toLowerCase() || '';
  const filtered = state.medlemmer.filter(m => m.navn.toLowerCase().includes(filterText));
  container.innerHTML = filtered.map(medlem => `
    <div class="list-item">
      <strong>${medlem.navn}</strong>
      <div style="font-size: 0.85em; color: var(--text-secondary);">
        ${medlem.fodselsdato ? 'Født: ' + medlem.fodselsdato : ''}
        ${medlem.telefon ? ' | ' + medlem.telefon : ''}
      </div>
    </div>
  `).join('');
}

function renderVapen() {
  const container = el.vapenListe;
  if (!container) return;
  const filterText = el.vapenSok?.value?.toLowerCase() || '';
  const filtered = state.vapen.filter(v => v.navn.toLowerCase().includes(filterText) || v.serienummer.toLowerCase().includes(filterText));
  container.innerHTML = filtered.map(vapen => {
    const isPussAlarm = vapen.brukSidenPuss > PUSS_THRESHOLD;
    return `
      <div class="list-item ${isPussAlarm ? 'puss-alarm-row' : ''}">
        <strong>${vapen.navn}</strong>
        <div style="font-size: 0.85em; color: var(--text-secondary);">
          ${vapen.type} | ${vapen.kaliber} | S/N: ${vapen.serienummer}
        </div>
      </div>
    `;
  }).join('');
  el.weaponCounter.textContent = filtered.length;
}

function renderUtlaan() {
  const container = el.aktiveUtlaan;
  if (!container) return;
  const active = state.utlaan.filter(u => !u.slutt);
  container.innerHTML = active.map(utlaan => {
    const medlem = state.medlemmer.find(m => m.id === utlaan.medlemId);
    const vapen = state.vapen.find(v => v.id === utlaan.vapenId);
    const skyteleder = state.skyteledere.find(s => s.id === utlaan.skytelederId);
    const startDate = new Date(utlaan.start);
    const daysAgo = Math.floor((Date.now() - startDate) / (1000 * 60 * 60 * 24));
    return `
      <div class="list-item">
        <strong>${medlem?.navn || 'Ukjent'}</strong> - ${vapen?.navn || 'Ukjent våpen'}
        <div style="font-size: 0.85em; color: var(--text-secondary);">
          Skyteleder: ${skyteleder?.navn || 'Ukjent'} | Lånt: ${daysAgo} dager siden
        </div>
      </div>
    `;
  }).join('');
}

function updateSelects() {
  if (el.medlemSelect) {
    el.medlemSelect.innerHTML = '<option value="">-- Velg medlem --</option>' + 
      state.medlemmer.map(m => `<option value="${m.id}">${m.navn}</option>`).join('');
  }
  if (el.vapenSelect) {
    el.vapenSelect.innerHTML = '<option value="">-- Velg våpen --</option>' + 
      state.vapen.filter(v => v.aktiv).map(v => `<option value="${v.id}">${v.navn}</option>`).join('');
  }
  if (el.skytelederSelect) {
    el.skytelederSelect.innerHTML = '<option value="">-- Velg skyteleder --</option>' + 
      state.skyteledere.map(s => `<option value="${s.id}">${s.navn}</option>`).join('');
  }
}

// Search listeners
el.medlemSok?.addEventListener('input', () => renderMedlemmer());
el.vapenSok?.addEventListener('input', () => renderVapen());

console.log('[App] Loaded successfully');