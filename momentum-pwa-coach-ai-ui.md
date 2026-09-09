# Momentum PWA — Coach AI Card Generator UI Component

This specification details the HTML, CSS, and JavaScript implementation for adding a **"Generate Card with Coach AI"** interactive button inside the Momentum PWA (`index.html`, `planner.js`, and `app.css`).

---

## 1. HTML Markup (`index.html`)

Add this component block to the `#plan-screen` container in `index.html` (under the *"Build and queue the workout"* section):

```html
<!-- Coach AI Generator Card -->
<div class="coach-ai-card-container">
  <div class="coach-ai-header">
    <div class="coach-ai-badge">
      <span class="badge-icon">✨</span>
      <span class="badge-text">Clinical AI Engine</span>
    </div>
    <h3>Generate Today's Workout</h3>
    <p class="coach-ai-description">
      Inconvenience-free prescription powered by your active joint profile, PR milestones, and recent session bio-feedback.
    </p>
  </div>

  <button id="btn-generate-coach-card" class="btn-coach-ai" onclick="MomentumPlanner.generateCoachCard()">
    <span class="btn-text">Generate Card with Coach AI</span>
    <span class="btn-spinner hidden" id="coach-ai-spinner"></span>
  </button>

  <div id="coach-ai-status" class="coach-ai-status-message hidden"></div>
</div>
```

---

## 2. CSS Styling (`app.css`)

Mobile-first styles optimized for high contrast and gym-floor readability:

```css
/* Coach AI Generator Component Styles */
.coach-ai-card-container {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

.coach-ai-header {
  margin-bottom: 14px;
}

.coach-ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: 20px;
  margin-bottom: 8px;
}

.coach-ai-header h3 {
  color: #f8fafc;
  font-size: 1.15rem;
  font-weight: 700;
  margin: 4px 0;
}

.coach-ai-description {
  color: #94a3b8;
  font-size: 0.85rem;
  line-height: 1.4;
  margin: 0;
}

.btn-coach-ai {
  width: 100%;
  background: #2563eb;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  padding: 14px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease;
  min-height: 50px; /* Touch friendly for gym floor */
}

.btn-coach-ai:hover {
  background: #1d4ed8;
}

.btn-coach-ai:disabled {
  background: #475569;
  cursor: not-allowed;
  opacity: 0.8;
}

/* Spinner Animation */
.btn-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.coach-ai-status-message {
  margin-top: 12px;
  padding: 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  line-height: 1.4;
}

.coach-ai-status-message.info {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.coach-ai-status-message.error {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.coach-ai-status-message.success {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}
```

---

## 3. Client Logic (`planner.js`)

Add the `generateCoachCard` handler method to `MomentumPlanner`:

```javascript
/**
 * Momentum Planner Module Extension
 * Handles AI Card Generation requests against Laravel API
 */
const MomentumPlanner = (function () {

  async function generateCoachCard() {
    const btn = document.getElementById('btn-generate-coach-card');
    const spinner = document.getElementById('coach-ai-spinner');
    const statusDiv = document.getElementById('coach-ai-status');

    // 1. Check Offline Status
    if (!navigator.onLine) {
      showStatus(statusDiv, 'Offline Mode: You must be connected to network to generate new AI cards. You can still paste or select starter cards.', 'error');
      return;
    }

    // 2. Set Loading UI State
    btn.disabled = true;
    spinner.classList.remove('hidden');
    btn.querySelector('.btn-text').textContent = 'Evaluating Guardrails & Generating...';
    showStatus(statusDiv, 'Coach is compiling your active joint profile, PRs, and recent session notes...', 'info');

    try {
      // 3. Obtain Sanctum Auth Token from Sync Engine
      const token = MomentumSync ? MomentumSync.getAuthToken() : localStorage.getItem('momentum_auth_token');
      
      if (!token) {
        throw new Error('User not authenticated. Please log in via Statbook setting.');
      }

      // 4. API Endpoint Call
      const response = await fetch('/api/v1/training/coach/generate-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          request_type: 'queue_next'
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to generate card from Coach AI.');
      }

      // 5. Parse Generated Card Text into Momentum Plan Queue
      const rawMarkdownCard = result.workout_card;
      
      // Call Momentum's built-in parser function
      if (typeof parseAndQueueWorkoutCard === 'function') {
        parseAndQueueWorkoutCard(rawMarkdownCard);
      } else {
        // Fallback: paste into planner text input & submit
        const pasteInput = document.getElementById('planner-paste-input');
        if (pasteInput) {
          pasteInput.value = rawMarkdownCard;
          if (typeof processPastedCard === 'function') {
            processPastedCard();
          }
        }
      }

      // 6. Success Feedback UI
      showStatus(statusDiv, `✓ Workout Card successfully generated and queued! (${result.metadata.active_assumptions_count} active guardrails enforced).`, 'success');
      
      // Auto-hide success status after 4 seconds
      setTimeout(() => {
        statusDiv.classList.add('hidden');
      }, 4000);

    } catch (error) {
      console.error('Coach AI Generation Error:', error);
      showStatus(statusDiv, `Error: ${error.message}`, 'error');
    } finally {
      // 7. Reset Button UI State
      btn.disabled = false;
      spinner.classList.add('hidden');
      btn.querySelector('.btn-text').textContent = 'Generate Card with Coach AI';
    }
  }

  function showStatus(element, message, type) {
    element.className = `coach-ai-status-message ${type}`;
    element.textContent = message;
    element.classList.remove('hidden');
  }

  return {
    generateCoachCard,
    // ... existing MomentumPlanner exports
  };
})();
