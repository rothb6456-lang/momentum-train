/**
 * Momentum PWA — Cloud Sync & Sanctum Auth Integration Layer
 * Unified with Bulldog Statbook Backend
 */

const API_BASE_URL = 'https://statbook.bulldogstats.com/api/v1/training';
const AUTH_API_URL = 'https://statbook.bulldogstats.com/api/v1/auth';

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
            throw new Error(data.message || data.error || 'Authentication failed. Please verify your credentials.');
          }

          setToken(data.token);
          modal.classList.add('hidden');
          if (typeof toast === 'function') toast('Connected to Bulldog Statbook');

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

  async function pushSession(session) {
    if (!session) return;

    if (!isAuthenticated()) {
      showAuthModal(() => pushSession(session));
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          session_id: session.id,
          workout_name: session.canonicalTitle || session.workoutName || 'Workout',
          phase: session.phase || '',
          week: session.week || '',
          day: session.day || '',
          completed_at: session.completedAt || session.startedAt || new Date().toISOString(),
          coach_questions: session.coachQuestions || '',
          sets: (session.sets || []).map(s => ({
            exercise_name: s.exerciseName || s.exercise || '',
            load: s.load || '',
            reps_or_duration: s.reps || s.result || '',
            is_timed: !!s.timed,
            tempo: s.tempo || '',
            rir: s.rir || '',
            rest: s.rest || '',
            section: s.section || 'primary',
            optional: !!s.optional,
            notes: s.notes || ''
          }))
        })
      });

      if (res.status === 401) {
        setToken('');
        showAuthModal(() => pushSession(session));
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Sync failed with status ${res.status}`);
      }

      if (typeof toast === 'function') toast('Session synced to Bulldog Statbook');
    } catch (err) {
      if (typeof toast === 'function') toast(`Sync notice: ${err.message}`);
    }
  }

  async function generateCoachCard(promptText) {
    if (!isAuthenticated()) {
      showAuthModal(() => generateCoachCard(promptText));
      return null;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/coach/generate-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${getToken()}`
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

      if (typeof toast === 'function') toast('Workout card generated by Coach AI');
      return data.card || data.workout_card || data.text || '';
    } catch (err) {
      if (typeof toast === 'function') toast(`Coach AI notice: ${err.message}`);
      throw err;
    }
  }

  return {
    getToken,
    setToken,
    isAuthenticated,
    showAuthModal,
    pushSession,
    generateCoachCard
  };
})();

window.MomentumSync = MomentumSync;
