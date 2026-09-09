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
        const forceSyncButton = document.getElementById('sync-force-button');
        if (forceSyncButton) {
            forceSyncButton.addEventListener('click', () => flushQueue());
        }

        window.addEventListener('online', () => {
            console.log('Network online re-established. Flushing sync queue...');
            flushQueue();
        });

        window.addEventListener('offline', () => {
            updateSyncUiStatus();
        });

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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', MomentumSync.init);
} else {
    MomentumSync.init();
}
