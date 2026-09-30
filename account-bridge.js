/* Runs before app.js loads: account changes must never reuse another athlete's workspace. */
window.MomentumAccount = (() => {
  const OWNER = 'momentum.account-owner.v1';
  const ARCHIVE = 'momentum.account-archive.v1.';
  const shared = new Set(['momentum_api_url', 'momentum_auth_url', 'momentum_exercise_catalog', 'momentum_body_structures', OWNER]);
  const personalKeys = () => Object.keys(localStorage).filter(key =>
    /^momentum[._:]/.test(key) && !key.startsWith(ARCHIVE) && !shared.has(key) && key !== 'momentum_sanctum_token');
  function activate(id) {
    const old = localStorage.getItem(OWNER) || 'local';
    if (old === id) { localStorage.setItem(OWNER, id); return; }
    // Store first; quota errors leave the current workspace intact.
    const keys = personalKeys();
    const oldPrefix = ARCHIVE + old + '.';
    // Remove obsolete archived fields so deleted workouts do not reappear.
    for (const key of Object.keys(localStorage).filter(key => key.startsWith(oldPrefix))) {
      if (!keys.includes(key.slice(oldPrefix.length))) localStorage.removeItem(key);
    }
    for (const key of keys) localStorage.setItem(ARCHIVE + old + '.' + key, localStorage.getItem(key));
    for (const key of keys) localStorage.removeItem(key);
    const prefix = ARCHIVE + id + '.';
    for (const key of Object.keys(localStorage).filter(key => key.startsWith(prefix))) {
      localStorage.setItem(key.slice(prefix.length), localStorage.getItem(key));
    }
    localStorage.setItem(OWNER, id);
  }
  async function connect(data) {
    if (!data.user?.id || !data.token) throw new Error('The Bulldog account could not be verified.');
    activate(data.user.id);
    localStorage.setItem('momentum_sanctum_token', data.token);
    localStorage.setItem('momentum.account-name.v1', data.user.name || 'Athlete');
  }
  window.addEventListener('storage', event => {
    if (event.key === OWNER) location.reload();
  });
  const ready = (async () => {
    const hash = new URLSearchParams(location.hash.slice(1));
    const code = hash.get('bulldog_launch');
    if (!code) return;
    history.replaceState(null, '', location.pathname + location.search);
    const auth = window.MOMENTUM_CONFIG?.authUrl || localStorage.getItem('momentum_auth_url') || 'https://statbook.bulldogstats.com/api/v1/auth';
    try {
      const res = await fetch(auth.replace(/\/$/, '') + '/exchange', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Launch expired. Open Momentum again from the Bulldog hub.');
      await connect(data);
    } catch (error) {
      // Keep the old local workspace; do not present it as the launched account.
      localStorage.removeItem('momentum_sanctum_token');
      window.momentumLaunchError = error.message;
    }
  })();
  return { ready, connect, activate, owner: () => localStorage.getItem(OWNER) || 'local' };
})();
