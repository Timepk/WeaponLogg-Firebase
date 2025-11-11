// ====== Firebase-integrert WeaponLogg App ======
// Denne versjonen integrerer Firebase med den opprinnelige appen

// ====== Firebase state ======
let isAuthenticated = false;
let currentUser = null;

// ====== Konstanter og "database" (localStorage + Firebase) ======
const PUSS_THRESHOLD = 30;

const DB_KEYS = {
  medlemmer: 'tpk_medlemmer',
  vapen: 'tpk_vapen',
  utlaan: 'tpk_utlaan',
  skyteledere: 'tpk_skyteledere',
  settings: 'tpk_settings'
};

// Database wrapper som støtter både localStorage og Firebase
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

// Global state
let state = {
  medlemmer: db.load(DB_KEYS.medlemmer, []),
  vapen: db.load(DB_KEYS.vapen, []),
  utlaan: db.load(DB_KEYS.utlaan, []),
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

// ====== Firebase integration ======
let firebaseLoaded = false;
let firebaseAuth = null;
let firebaseDB = null;

async function loadFirebase() {
  if (firebaseLoaded) return true;
  
  try {
    console.log('[Firebase] Laster moduler...');
    const authModule = await import('./firebase-auth.js');
    const dbModule = await import('./firebase-db.js');
    
    firebaseAuth = authModule;
    firebaseDB = dbModule;
    firebaseLoaded = true;
    
    console.log('[Firebase] Moduler lastet');
    return true;
  } catch (error) {
    console.error('[Firebase] Kunne ikke laste moduler:', error);
    return false;
  }
}

async function syncToFirebase() {
  if (!isAuthenticated || !firebaseLoaded) return;
  
  try {
    // Sync alle samlinger
    const collections = ['medlemmer', 'vapen', 'utlaan', 'skyteledere'];
    for (const collName of collections) {
      const data = state[collName];
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.id) {
            await firebaseDB.setDocument(collName, item.id, item);
          }
        }
      }
    }
    
    // Sync settings
    await firebaseDB.setDocument('settings', 'main', state.settings);
    
    console.log('[Firebase] Alle data synkronisert');
  } catch (error) {
    console.error('[Firebase] Sync feil:', error);
  }
}

function persist() {
  // Lagre til localStorage
  db.save(DB_KEYS.medlemmer, state.medlemmer);
  db.save(DB_KEYS.vapen, state.vapen);
  db.save(DB_KEYS.utlaan, state.utlaan);
  db.save(DB_KEYS.skyteledere, state.skyteledere);
  db.save(DB_KEYS.settings, state.settings);
  
  // Sync til Firebase (asynkront)
  if (isAuthenticated) {
    syncToFirebase().catch(console.error);
  }
}

// ====== Authentication ======
function setupAuth() {
  const loginScreen = document.getElementById('loginScreen');
  const appContainer = document.getElementById('appContainer');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userEmail = document.getElementById('userEmail');

  if (!loginBtn) {
    console.error('[Auth] Login-knapp ikke funnet');
    return;
  }

  // Login handler
  loginBtn.addEventListener('click', async () => {
    console.log('[Auth] Login-knapp klikket');
    
    try {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Laster Firebase...';
      
      // Last Firebase
      const loaded = await loadFirebase();
      if (!loaded) {
        throw new Error('Kunne ikke laste Firebase');
      }
      
      loginBtn.textContent = 'Logger inn...';
      
      // Forsøk innlogging
      const user = await firebaseAuth.loginWithGoogle();
      console.log('[Auth] Innlogget som:', user.email);
      
    } catch (error) {
      console.error('[Auth] Login feil:', error);
      alert('Innlogging feilet: ' + error.message);
      loginBtn.disabled = false;
      loginBtn.textContent = 'Logg inn med Google';
    }
  });

  // Logout handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (firebaseAuth) {
        await firebaseAuth.logout();
      }
    });
  }

  // Auth state listener
  async function setupAuthListener() {
    if (!firebaseLoaded) return;
    
    firebaseAuth.onAuthChange(async (user) => {
      if (user) {
        // Innlogget
        currentUser = user;
        isAuthenticated = true;
        
        if (userEmail) userEmail.textContent = user.email;
        
        loginScreen.style.display = 'none';
        appContainer.style.display = 'block';
        
        // Last data fra Firebase
        await loadDataFromFirebase();
        
        // Start app
        initializeApp();
        
        console.log('[Auth] Bruker innlogget og app startet');
        
      } else {
        // Utlogget
        currentUser = null;
        isAuthenticated = false;
        
        loginScreen.style.display = 'flex';
        appContainer.style.display = 'none';
        
        loginBtn.disabled = false;
        loginBtn.textContent = 'Logg inn med Google';
        
        console.log('[Auth] Bruker utlogget');
      }
    });
  }

  // Last Firebase og sett opp lytter
  loadFirebase().then(() => {
    setupAuthListener();
  }).catch(error => {
    console.error('[Auth] Firebase-setup feilet:', error);
    // Tilby offline-modus
    loginBtn.textContent = 'Start offline (uten sync)';
    loginBtn.addEventListener('click', () => {
      loginScreen.style.display = 'none';
      appContainer.style.display = 'block';
      initializeApp();
    });
  });
}

async function loadDataFromFirebase() {
  if (!firebaseLoaded) return;
  
  try {
    console.log('[Firebase] Laster data...');
    
    const collections = ['medlemmer', 'vapen', 'utlaan', 'skyteledere'];
    for (const collName of collections) {
      const data = await firebaseDB.getCollection(collName);
      if (data && data.length > 0) {
        state[collName] = data;
        db.save(DB_KEYS[collName], data);
      }
    }
    
    // Last settings
    const settings = await firebaseDB.getCollection('settings');
    if (settings && settings.length > 0) {
      state.settings = { ...state.settings, ...settings[0] };
      db.save(DB_KEYS.settings, state.settings);
    }
    
    console.log('[Firebase] Data lastet');
  } catch (error) {
    console.error('[Firebase] Kunne ikke laste data:', error);
  }
}

// ====== Din opprinnelige app-logikk kommer her ======
// (Kopier alt fra den opprinnelige app.js fra "Business-logikk" og nedover)

// Placeholder for nå - erstatt med din fullstendige app-logikk
function initializeApp() {
  console.log('[App] Initialiserer app...');
  
  // Her skulle all din eksisterende logikk vært
  // For nå, bare en enkel test
  document.querySelector('main').innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h2>🎯 WeaponLogg Firebase Edition</h2>
      <p>Firebase-integrasjon fungerer!</p>
      <p>Bruker: ${currentUser ? currentUser.email : 'Offline'}</p>
      <p>Medlemmer: ${state.medlemmer.length}</p>
      <p>Våpen: ${state.vapen.length}</p>
      <p>Utlån: ${state.utlaan.length}</p>
    </div>
  `;
}

// ====== Start app ======
document.addEventListener('DOMContentLoaded', () => {
  console.log('[App] DOM klar, starter auth...');
  setupAuth();
});

console.log('[App] Firebase WeaponLogg lastet');