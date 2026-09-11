/**
 * Momentum PWA - Cloud Sync & Sanctum Auth Integration Layer
 * Unified with Bulldog Statbook Backend (Patch V1.1.2)
 */

const API_BASE_URL = (typeof localStorage !== 'undefined' && localStorage.getItem('momentum_api_url')
  ? localStorage.getItem('momentum_api_url')
  : 'https://statbook.bulldogstats.com/api/v1/training').replace(/\/+$/, '');

const AUTH_API_URL = (typeof localStorage !== 'undefined' && localStorage.getItem('momentum_auth_url')
  ? localStorage.getItem('momentum_auth_url')
  : 'https://statbook.bulldogstats.com/api/v1/auth').replace(/\/+$/, '');

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

          setToken(data.token);
          modal.classList.add('hidden');
          showToast('Connected to Bulldog Statbook', 'success');

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
      const payload = {
        session_id: sessionData.id || sessionData.session_id,
        workout_name: sessionData.canonicalTitle || sessionData.workoutName || sessionData.workout_name || 'Workout',
        phase: sessionData.phase || '',
        week: sessionData.week || '',
        day: sessionData.day || '',
        completed_at: sessionData.completedAt || sessionData.completed_at || sessionData.startedAt || new Date().toISOString(),
        coach_questions: sessionData.coachQuestions || sessionData.coach_questions || '',
        sets: (sessionData.sets || []).map(s => ({
          exercise_name: s.exerciseName || s.exercise || s.exercise_name || '',
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



function mapSessionToApiPayload(localSession) {
    var rawDate = localSession.session_date || localSession.sessionDate || localSession.date || new Date().toISOString().split('T');
    var cleanDate = String(rawDate).substring(0, 10);

    return {
        workout_name: localSession.workoutName || localSession.workout_name || localSession.title || 'Training Session',
        session_date: cleanDate,
        program_day: localSession.programDay || localSession.program_day ? parseInt(localSession.programDay || localSession.program_day, 10) : 1,
        gym_location: localSession.gymLocation || localSession.gym_location || localSession.location || 'Planet Fitness',
        general_notes: localSession.generalNotes || localSession.general_notes || localSession.notes || null,
        sets: (localSession.sets || []).map(function(s, index) {
            var tempoStr = s.tempo ? String(s.tempo).trim() : null;
            if (tempoStr && tempoStr.length > 20) {
                tempoStr = tempoStr.slice(0, 20);
            }

            var rirStr = s.rir ? String(s.rir).trim() : null;
            if (rirStr && rirStr.length > 20) {
                rirStr = rirStr.slice(0, 20);
            }

            return {
                set_number: parseInt(s.set_number || s.setNumber || (index + 1), 10),
                exercise_name: String(s.exercise_name || s.exerciseName || s.name || 'Exercise').trim(),
                section: 'primary',
                weight_lbs: s.weight_lbs !== undefined ? parseFloat(s.weight_lbs) : (s.weightLbs !== undefined ? parseFloat(s.weightLbs) : 0),
                reps: s.reps !== undefined && s.reps !== null && s.reps !== '' ? parseInt(s.reps, 10) : null,
                duration_seconds: s.duration_seconds !== undefined && s.duration_seconds !== null 
                    ? parseInt(s.duration_seconds, 10) 
                    : (s.durationSeconds ? parseInt(s.durationSeconds, 10) : null),
                tempo: tempoStr,
                rir: rirStr,
                set_notes: s.set_notes || s.notes || s.setNotes || null
            };
        })
    };
}


