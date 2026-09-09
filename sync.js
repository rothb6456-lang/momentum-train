/**
 * Momentum PWA � Cloud Sync & Sanctum Auth Integration Layer
 * Unified with Bulldog Statbook Backend (Patch V1.1.2)
 */

const API_BASE_URL = localStorage.getItem('momentum_api_url') || 'https://statbook.bulldogstats.com/api/v1/training';
const AUTH_API_URL = API_BASE_URL.replace(/\/training\/?$/, '/auth');

const MomentumSync = (() => {
  const TOKEN_KEY = 'momentum_sanctum_token';

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
          const res = await fetch(`${AUTH_API_URL}/token`, {
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

          const data = await res.json().catch(() => ({}));

          if (!res.ok || !data.token) {
            throw new Error(data.message || data.error || 'Authentication failed. Please verify credentials.');
          }

          setToken(data.token);
          modal.classList.add('hidden');
          showToast('? Connected to Bulldog Statbook', 'success');

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
      const numericValue = value => {
        const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
        return match ? Number(match[0]) : null;
      };
      const apiSection = value => {
        const section = String(value || '').toLowerCase();
        return ['primary', 'warmup', 'cooldown', 'accessory'].includes(section) ? section : 'accessory';
      };
      const sessionDate = (sessionData.completedAt || sessionData.completed_at || sessionData.startedAt || new Date().toISOString()).slice(0, 10);

      const payload = {
        session_id: sessionData.id || sessionData.session_id,
        workout_name: sessionData.canonicalTitle || sessionData.workoutName || sessionData.workout_name || 'Workout',
        session_date: sessionData.sessionDate || sessionData.session_date || sessionDate,
        program_day: numericValue(sessionData.day || sessionData.programDay),
        phase: sessionData.phase || '',
        week: sessionData.week || '',
        day: sessionData.day || '',
        completed_at: sessionData.completedAt || sessionData.completed_at || sessionData.startedAt || new Date().toISOString(),
        coach_questions: sessionData.coachQuestions || sessionData.coach_questions || '',
        sets: (sessionData.sets || []).map((s, index) => ({
          set_number: Number(s.setNumber || s.set_number || index + 1),
          exercise_name: s.exerciseName || s.exercise || s.exercise_name || '',
          weight_lbs: numericValue(s.weightLbs ?? s.weight_lbs ?? s.load),
          reps: (s.timed || s.is_timed) ? null : numericValue(s.reps ?? s.result ?? s.reps_or_duration),
          duration_seconds: (s.timed || s.is_timed) ? numericValue(s.durationSeconds ?? s.duration_seconds ?? s.reps ?? s.result ?? s.reps_or_duration) : null,
          tempo: s.tempo || '',
          rir: s.rir || '',
          section: apiSection(s.section),
          set_notes: s.notes || s.set_notes || ''
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
      showToast('? Workout Synced to Statbook!', 'success');
      return result;
    } catch (err) {
      console.error('Statbook Sync Error:', err);
      showToast(`Sync failed (${API_BASE_URL}): ${err.message}`, 'error');
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
      if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}: Coach AI generation failed`);

      showToast('? Workout card generated by Coach AI', 'success');
      return data.card_markdown || data.card || data.workout_card || data.text || '';
    } catch (err) {
      showToast(`Coach AI failed (${API_BASE_URL}): ${err.message}`, 'error');
      throw err;
    }
  }

  return {
    getToken,
    setToken,
    isAuthenticated,
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
