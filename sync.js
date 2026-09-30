/**
 * Momentum PWA - Cloud Sync & Sanctum Auth Integration Layer
 * Unified with Bulldog Statbook Backend (Patch V1.1.2)
 */

const API_BASE_URL = (window.MOMENTUM_CONFIG?.apiUrl || (typeof localStorage !== 'undefined' && localStorage.getItem('momentum_api_url')
  ? localStorage.getItem('momentum_api_url')
  : 'https://statbook.bulldogstats.com/api/v1/training')).replace(/\/+$/, '');

const AUTH_API_URL = (window.MOMENTUM_CONFIG?.authUrl || (typeof localStorage !== 'undefined' && localStorage.getItem('momentum_auth_url')
  ? localStorage.getItem('momentum_auth_url')
  : 'https://statbook.bulldogstats.com/api/v1/auth')).replace(/\/+$/, '');

const MomentumSync = (() => {
  const TOKEN_KEY = 'momentum_sanctum_token';

  function parseDuration(value) {
    const text = String(value || '').trim();
    if (/^\d+:\d{2}$/.test(text)) { const [m, s] = text.split(':').map(Number); return m * 60 + s; }
    const match = text.match(/^(\d+(?:\.\d+)?)\s*(sec(?:onds?)?|s|min(?:utes?)?|m)?$/i);
    return match ? Math.round(Number(match[1]) * (/^m/i.test(match[2] || '') ? 60 : 1)) : null;
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  function isAuthenticated() {
    return !!getToken();
  }

  let profileTimer;
  function syncProfile(profile) {
    clearTimeout(profileTimer);
    const owner = window.MomentumAccount?.owner();
    const token = getToken();
    if (!token || !navigator.onLine) return;
    const payload = {
      experience_level: profile.experienceLevel || null,
      goals: (profile.goals || []).filter(goal => goal.status === 'active').map(goal => ({ title: goal.title }))
    };
    profileTimer = setTimeout(async () => {
      if (window.MomentumAccount?.owner() !== owner || getToken() !== token) return;
      try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        if (!response.ok) showToast('Profile saved on this device. Cloud profile sync is pending.', 'error');
      } catch (_) { /* Local profile remains available while offline. */ }
    }, 500);
  }

  function showToast(msg, type = 'info') {
    if (typeof window.toast === 'function') {
      window.toast(msg);
    } else {
      console.log(`[Toast ${type}]: ${msg}`);
    }
  }

  function showAuthModal(onSuccess) {
    const modal = document.getElementById('sanctumModal');
    const errEl = document.getElementById('sanctumError');
    if (!modal) return;

    if (errEl) {
      errEl.textContent = '';
      errEl.classList.add('hidden');
    }
    modal.classList.remove('hidden');

    const form = document.getElementById('sanctumForm');
    const cancel = document.getElementById('sanctumCancelBtn');

    if (cancel) {
      cancel.onclick = () => {
        modal.classList.add('hidden');
      };
    }

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const emailEl = document.getElementById('sanctumEmail');
        const passEl = document.getElementById('sanctumPassword');
        const btn = document.getElementById('sanctumLoginBtn');

        const email = emailEl ? emailEl.value.trim() : '';
        const password = passEl ? passEl.value : '';

        if (!email || !password) return;

        if (btn) btn.textContent = 'Connecting...';
        try {
          let res = await fetch(`${AUTH_API_URL}/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              email,
              password,
              device_name: 'Momentum PWA'
            })
          });

          if (res.status === 404 || res.status === 405) {
            res = await fetch(`${AUTH_API_URL}/token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                email,
                password,
                device_name: 'Momentum PWA'
              })
            });
          }

          const data = await res.json().catch(() => ({}));

          if (!res.ok || !data.token) {
            throw new Error(data.message || data.error || 'Authentication failed. Please verify credentials.');
          }

          if (window.MomentumAccount) await MomentumAccount.connect(data);
          setToken(data.token);
          modal.classList.add('hidden');
          showToast('Connected to Bulldog Statbook', 'success');
          location.reload();
          return;

          if (typeof onSuccess === 'function') {
            onSuccess(data.token);
          }
        } catch (err) {
          if (errEl) {
            errEl.textContent = err.message || 'Login error occurred';
            errEl.classList.remove('hidden');
          }
        } finally {
          if (btn) btn.textContent = 'Sign In & Connect';
        }
      };
    }
  }

  // ISSUE 3 Fix: Detailed error handling & Sanctum token auth
  async function syncSessionToStatbook(sessionData) {
    if (!sessionData) return;
    const token = getToken();
    if (!token) {
      showAuthModal(() => syncSessionToStatbook(sessionData));
      return;
    }

    try {
      const rawSessionDate = sessionData.session_date || sessionData.sessionDate || sessionData.date
        || sessionData.completedAt || sessionData.completed_at || sessionData.startedAt || new Date().toISOString();

      const payload = {
        session_id: sessionData.id || sessionData.session_id,
        workout_name: sessionData.canonicalTitle || sessionData.workoutName || sessionData.workout_name || 'Workout',
        session_date: String(rawSessionDate).slice(0, 10),
        phase: sessionData.phase || '',
        week: sessionData.week || '',
        day: sessionData.day || '',
        completed_at: sessionData.completedAt || sessionData.completed_at || sessionData.startedAt || new Date().toISOString(),
        coach_questions: sessionData.coachQuestions || sessionData.coach_questions || '',
        sets: (sessionData.sets || []).map((s, index) => ({
          set_number: parseInt(s.set_number || s.setNumber || (index + 1), 10),
          exercise_name: s.exerciseName || s.exercise || s.exercise_name || '',
          exercise_id: s.exerciseId || s.exercise_id || undefined,
          weight_lbs: /^\d+(\.\d+)?$/.test(String(s.load ?? '').trim()) ? Number(s.load) : null,
          reps: !(s.timed || s.is_timed) && /^\d+$/.test(String(s.reps ?? s.result ?? '').trim()) ? Number(s.reps ?? s.result) : null,
          duration_seconds: (s.timed || s.is_timed) ? parseDuration(s.reps ?? s.result ?? s.reps_or_duration) : null,
          set_notes: [s.notes, s.load ? 'Logged load: ' + s.load : '', 'Logged result: ' + (s.reps ?? s.result ?? s.reps_or_duration ?? '')].filter(Boolean).join(' | '),
          load: s.load || '',
          reps_or_duration: s.reps || s.result || s.reps_or_duration || '',
          is_timed: !!(s.timed || s.is_timed),
          tempo: s.tempo || '',
          rir: s.rir || '',
          rest: s.rest || '',
          section: s.section || 'primary',
          optional: !!(s.optional || s.is_optional),
          notes: s.notes || ''
        }))
      };

      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        setToken('');
        showAuthModal(() => syncSessionToStatbook(sessionData));
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const result = await response.json();
      showToast('Workout Synced to Statbook!', 'success');
      return result;
    } catch (err) {
      console.error('Statbook Sync Error:', err);
      showToast(`Sync Failed: ${err.message}`, 'error');
    }
  }

  async function generateCoachCard(promptText) {
    const token = getToken();
    if (!token) {
      showAuthModal(() => generateCoachCard(promptText));
      return null;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/coach/generate-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: promptText || '' })
      });

      if (res.status === 401) {
        setToken('');
        showAuthModal(() => generateCoachCard(promptText));
        return null;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Coach AI generation failed');

      showToast('Workout card generated by Coach AI', 'success');
      return data.card || data.workout_card || data.text || '';
    } catch (err) {
      showToast(`Coach AI: ${err.message}`, 'error');
      throw err;
    }
  }

  return {
    getToken,
    setToken,
    isAuthenticated,
    syncProfile,
    showAuthModal,
    pushSession: syncSessionToStatbook,
    syncSessionToStatbook,
    generateCoachCard
  };
})();

window.MomentumSync = MomentumSync;
window.MomentumAuthModal = {
  open: MomentumSync.showAuthModal,
  close: () => document.getElementById('sanctumModal')?.classList.add('hidden')
};
window.syncSessionToStatbook = MomentumSync.syncSessionToStatbook;
