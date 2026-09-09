# Momentum PWA Client-Side Sync Module & Integration Specification

This document details the client-side JavaScript architecture and code required to wire the local-first **Momentum PWA** (`app.js`, `planner.js`, `index.html`) directly to the **Bulldog Statbook Laravel API** (`/api/v1/training/sessions`).

---

## 1. Architectural Strategy: Local-First with Background Sync

1. **Zero Gym-Floor Latency**: Workout logging remains 100% local. Set entries, reps, weights, tempos, and RIRs are written immediately to `localStorage` or `IndexedDB`.
2. **Pending Sync Queue**: When a workout session is finalized on the Review screen, it is saved locally and queued with a `sync_status: 'pending'`.
3. **Automatic Network Synchronization**:
   - Sync triggers automatically upon session completion if online.
   - Listens to `window.addEventListener('online')` to flush pending sessions when network connectivity is restored.
   - Flushes the queue upon app initialization in `app.js`.
4. **Idempotency**: Local session IDs (`S-YYYYMMDD-01`) or UUIDs prevent duplicate submissions on retries.

---

## 2. PWA Sync Engine (`sync.js`)

Add this dedicated API sync module to your Momentum frontend repository.

```javascript
/**
 * Momentum PWA Sync Engine (sync.js)
 * Manages authentication, payload mapping, background queueing, and network sync
 * with the Bulldog Statbook Laravel Backend API.
 */

const MomentumSync = (function () {
    const CONFIG = {
        apiBaseUrl: localStorage.getItem('momentum_api_url') || 'https://statbook.bulldogstats.com/api/v1',
        storageKeys: {
            token: 'bulldog_sanctum_token',
            queue: 'momentum_sync_queue',
            sessions: 'momentum_completed_sessions'
        }
    };

    /**
     * Retrieve the Sanctum bearer token.
     */
    function getToken() {
        return localStorage.getItem(CONFIG.storageKeys.token);
    }

    /**
     * Set Sanctum auth token (after user logs in via Statbook).
     */
    function setToken(token) {
        localStorage.setItem(CONFIG.storageKeys.token, token);
    }

    /**
     * Check if device is currently online.
     */
    function isOnline() {
        return navigator.onLine;
    }

    /**
     * Get pending sessions from local storage queue.
     */
    function getQueue() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.storageKeys.queue) || '[]');
        } catch (e) {
            console.error('Failed to parse sync queue:', e);
            return [];
        }
    }

    /**
     * Save queue state to local storage.
     */
    function saveQueue(queue) {
        localStorage.setItem(CONFIG.storageKeys.queue, JSON.stringify(queue));
    }

    /**
     * Transform Momentum PWA internal session format into Laravel API StoreTrainingSessionRequest payload.
     */
    function mapSessionToApiPayload(localSession) {
        return {
            workout_name: localSession.workoutName || localSession.title || 'Training Session',
            session_date: localSession.date || new Date().toISOString().split('T')[0],
            phase_number: localSession.phaseNumber ? parseInt(localSession.phaseNumber) : null,
            program_day: localSession.programDay ? parseInt(localSession.programDay) : null,
            gym_location: localSession.gymLocation || localSession.location || null,
            general_notes: localSession.generalNotes || localSession.notes || null,
            sets: (localSession.sets || []).map((s, index) => ({
                set_number: s.setNumber || (index + 1),
                exercise_name: s.exerciseName || s.name,
                weight_lbs: s.weightLbs !== undefined ? parseFloat(s.weightLbs) : (s.weight ? parseFloat(s.weight) : 0),
                reps: s.reps !== undefined && s.reps !== null ? parseInt(s.reps) : null,
                duration_seconds: s.durationSeconds !== undefined && s.durationSeconds !== null 
                    ? parseFloat(s.durationSeconds) 
                    : (s.duration ? parseFloat(s.duration) : null),
                tempo: s.tempo || null,
                rir: s.rir ? String(s.rir) : null,
                set_notes: s.notes || s.setNotes || null
            }))
        };
    }

    /**
     * Send a single session payload to Laravel API.
     */
    async function sendSessionToApi(localSession) {
        const token = getToken();
        if (!token) {
            throw new Error('No authentication token found. Please log in.');
        }

        const payload = mapSessionToApiPayload(localSession);

        const response = await fetch(`${CONFIG.apiBaseUrl}/training/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP Error ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Add completed session to the pending sync queue and trigger immediate sync attempt.
     */
    async function queueAndSyncSession(localSession) {
        let queue = getQueue();
        
        // Check if session already exists in queue
        const existingIndex = queue.findIndex(item => item.id === localSession.id);
        const queueItem = {
            id: localSession.id || `S-${Date.now()}`,
            session: localSession,
            status: 'pending',
            queuedAt: new Date().toISOString(),
            attempts: 0,
            lastError: null
        };

        if (existingIndex >= 0) {
            queue[existingIndex] = queueItem;
        } else {
            queue.push(queueItem);
        }

        saveQueue(queue);
        updateSyncUiStatus();

        // Attempt flush immediately if online
        if (isOnline()) {
            return await flushQueue();
        }

        return { synced: false, message: 'Saved locally (offline)' };
    }

    /**
     * Flush all pending sessions in queue to the server.
     */
    async function flushQueue() {
        if (!isOnline()) {
            updateSyncUiStatus();
            return { synced: false, message: 'Device is offline' };
        }

        const token = getToken();
        if (!token) {
            updateSyncUiStatus('Auth required');
            return { synced: false, message: 'Unauthenticated' };
        }

        let queue = getQueue();
        const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'failed');

        if (pendingItems.length === 0) {
            updateSyncUiStatus('Synced');
            return { synced: true, count: 0 };
        }

        updateSyncUiStatus('Syncing...');
        let successCount = 0;

        for (let item of queue) {
            if (item.status === 'synced') continue;

            try {
                item.attempts += 1;
                const result = await sendSessionToApi(item.session);
                
                item.status = 'synced';
                item.remoteId = result.data ? result.data.id : null;
                item.syncedAt = new Date().toISOString();
                item.prsDetected = result.data ? result.data.prs_detected : [];
                
                successCount++;

                // Notify UI if new PRs were detected by Laravel backend!
                if (item.prsDetected && item.prsDetected.length > 0) {
                    if (window.MomentumApp && MomentumApp.showPrNotification) {
                        MomentumApp.showPrNotification(item.prsDetected);
                    }
                }
            } catch (err) {
                console.warn(`Sync failed for session ${item.id}:`, err);
                item.status = 'failed';
                item.lastError = err.message;
            }
        }

        saveQueue(queue);
        
        const remainingPending = queue.filter(item => item.status === 'pending' || item.status === 'failed').length;
        if (remainingPending === 0) {
            updateSyncUiStatus('Synced');
        } else {
            updateSyncUiStatus(`${remainingPending} pending`);
        }

        return { synced: remainingPending === 0, count: successCount };
    }

    /**
     * Update sync badge indicator in PWA header.
     */
    function updateSyncUiStatus(customLabel) {
        const badge = document.getElementById('sync-status-badge');
        if (!badge) return;

        if (customLabel) {
            badge.textContent = customLabel;
            return;
        }

        if (!isOnline()) {
            badge.textContent = 'Offline (Saved)';
            badge.className = 'badge badge-offline';
            return;
        }

        const pending = getQueue().filter(i => i.status !== 'synced').length;
        if (pending > 0) {
            badge.textContent = `${pending} Pending Sync`;
            badge.className = 'badge badge-pending';
        } else {
            badge.textContent = '✓ Synced';
            badge.className = 'badge badge-synced';
        }
    }

    /**
     * Initialize event listeners.
     */
    function init() {
        window.addEventListener('online', () => {
            console.log('Network online re-established. Flushing sync queue...');
            flushQueue();
        });

        window.addEventListener('offline', () => {
            updateSyncUiStatus();
        });

        // Initial check on page load
        setTimeout(() => {
            if (isOnline()) {
                flushQueue();
            } else {
                updateSyncUiStatus();
            }
        }, 1000);
    }

    return {
        init: init,
        setToken: setToken,
        getToken: getToken,
        queueAndSyncSession: queueAndSyncSession,
        flushQueue: flushQueue,
        updateSyncUiStatus: updateSyncUiStatus
    };
})();

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', MomentumSync.init);
} else {
    MomentumSync.init();
}
```

---

## 3. Integration into `planner.js` & `app.js`

### A. Finalizing a Workout in `planner.js` or `Review` View

When the user taps **"Finish Workout"** on the Review screen:

```javascript
// Inside planner.js or Review screen finalize handler
async function finishAndSaveWorkout(sessionData) {
    // 1. Save locally to active completed sessions list
    const completedSessions = JSON.parse(localStorage.getItem('momentum_completed_sessions') || '[]');
    completedSessions.push(sessionData);
    localStorage.setItem('momentum_completed_sessions', JSON.stringify(completedSessions));

    // 2. Clear active session in local storage
    localStorage.removeItem('momentum_active_session');

    // 3. Queue and attempt background sync to Laravel API
    const syncResult = await MomentumSync.queueAndSyncSession(sessionData);

    if (syncResult.synced) {
        alert('Workout complete! Synced to Bulldog Statbook.');
    } else {
        alert('Workout complete! Saved locally to your phone. Will auto-sync when network connects.');
    }

    // 4. Navigate to History or Today
    navigateToScreen('history');
}
```

### B. Header Sync Status Badge (`index.html`)

Add a small, subtle status indicator in `index.html` header:

```html
<header class="app-header">
  <div class="brand">
    <span class="logo">⚡ Momentum</span>
  </div>
  <div class="sync-indicator">
    <span id="sync-status-badge" class="badge badge-synced">✓ Synced</span>
    <button onclick="MomentumSync.flushQueue()" class="btn-icon" title="Force Sync">🔄</button>
  </div>
</header>
```

---

## 4. Verification Checklist

1. **Gym-Floor Offline Mode**: Turn on Airplane mode, log a full workout, tap "Finish". Verify the workout saves locally, navigation succeeds, and badge reads `"Offline (Saved)"`.
2. **Network Re-Connection**: Turn off Airplane mode. Verify `window.addEventListener('online')` fires, `flushQueue()` executes, session POSTs to `/api/v1/training/sessions`, and badge updates to `"✓ Synced"`.
3. **Database Assertion**: Inspect Laravel `training_sessions`, `training_sets`, and `player_prs` tables to confirm sets and auto-detected PRs are written properly.
