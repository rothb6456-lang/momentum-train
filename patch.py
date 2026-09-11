import os, re, time

def apply_momentum_patch():
    print("🚀 Running Momentum Master Patch...")

    # 1. FIX SYNC.JS (Payload sanitization & 422 error prevention)
    if os.path.exists('sync.js'):
        with open('sync.js', 'r', encoding='utf-8') as f:
            sync_code = f.read()

        new_map_js = """function mapSessionToApiPayload(localSession) {
    var rawDate = localSession.session_date || localSession.sessionDate || localSession.date || new Date().toISOString().split('T');
    var cleanDate = String(rawDate).substring(0, 10);

    return {
        workout_name: String(localSession.workoutName || localSession.workout_name || localSession.title || 'Training Session').substring(0, 255).trim(),
        session_date: cleanDate,
        program_day: localSession.programDay || localSession.program_day ? parseInt(localSession.programDay || localSession.program_day, 10) : 1,
        gym_location: String(localSession.gymLocation || localSession.gym_location || localSession.location || 'Planet Fitness').substring(0, 255).trim(),
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
                exercise_name: String(s.exercise_name || s.exerciseName || s.name || 'Exercise').substring(0, 255).trim(),
                section: String(s.section || 'primary').trim(),
                weight_lbs: s.weight_lbs !== undefined && s.weight_lbs !== null ? parseFloat(s.weight_lbs) : (s.weightLbs !== undefined && s.weightLbs !== null ? parseFloat(s.weightLbs) : 0),
                reps: s.reps !== undefined && s.reps !== null && s.reps !== '' ? parseInt(s.reps, 10) : null,
                duration_seconds: s.duration_seconds !== undefined && s.duration_seconds !== null && s.duration_seconds !== '' 
                    ? parseInt(s.duration_seconds, 10) 
                    : (s.durationSeconds ? parseInt(s.durationSeconds, 10) : null),
                tempo: tempoStr,
                rir: rirStr,
                set_notes: s.set_notes || s.notes || s.setNotes || null
            };
        })
    };
}"""

        if 'function mapSessionToApiPayload' in sync_code:
            start_idx = sync_code.find('function mapSessionToApiPayload')
            brace_count = 0
            end_idx = -1
            for i in range(start_idx, len(sync_code)):
                if sync_code[i] == '{':
                    brace_count += 1
                elif sync_code[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_idx = i + 1
                        break
            if end_idx != -1:
                sync_code = sync_code[:start_idx] + new_map_js + sync_code[end_idx:]
        else:
            sync_code += '\n' + new_map_js + '\n'

        with open('sync.js', 'w', encoding='utf-8') as f:
            f.write(sync_code)
        print("✓ Fixed sync.js payload mapping.")

    # 2. FIX APP.JS (Unlock tab navigation & global click listeners)
    if os.path.exists('app.js'):
        with open('app.js', 'r', encoding='utf-8') as f:
            app_code = f.read()

        nav_js = r"""
// GLOBAL NAVIGATION CONTROLLER
window.navigateToScreen = function(screenId) {
  if (!screenId) return;
  screenId = String(screenId).toLowerCase().replace('-screen', '').replace('screen-', '');
  console.log("Navigating to screen:", screenId);

  var screens = document.querySelectorAll('.screen, [id$="-screen"], #today-screen, #plan-screen, #log-screen, #review-screen, #history-screen');
  screens.forEach(function(s) {
    var sId = (s.id || '').toLowerCase().replace('-screen', '');
    if (sId === screenId) {
      s.style.display = 'block';
      s.style.visibility = 'visible';
      s.style.opacity = '1';
      s.classList.add('active');
      s.classList.remove('hidden', 'd-none');
    } else {
      s.style.display = 'none';
      s.classList.remove('active');
      s.classList.add('hidden');
    }
  });

  var tabs = document.querySelectorAll('.nav-tab, .tab-item, [data-screen], .tab-btn, header nav a, header nav button');
  tabs.forEach(function(t) {
    var target = t.getAttribute('data-screen') || t.getAttribute('onclick') || t.getAttribute('href') || '';
    if (target && target.toLowerCase().indexOf(screenId) !== -1) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

if (!window.__navDelegationBound) {
  window.__navDelegationBound = true;
  document.addEventListener('click', function(e) {
    var target = e.target.closest('.nav-tab, .tab-item, [data-screen], .tab-btn');
    if (target) {
      var screenName = target.getAttribute('data-screen');
      if (!screenName) {
        var onclickVal = target.getAttribute('onclick') || '';
        var match = onclickVal.match(/navigateToScreen\\(['"]([^'"]+)['"]\\)/);
        if (match) screenName = match[1];
      }
      if (screenName) {
        e.preventDefault();
        window.navigateToScreen(screenName);
      }
    }
  });
}
"""
        if 'window.navigateToScreen =' in app_code:
            start_idx = app_code.find('window.navigateToScreen =')
            brace_count = 0
            end_idx = -1
            for i in range(start_idx, len(app_code)):
                if app_code[i] == '{':
                    brace_count += 1
                elif app_code[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_idx = i + 1
                        break
            if end_idx != -1:
                app_code = app_code[:start_idx] + nav_js.strip() + app_code[end_idx:]
        else:
            app_code += '\n' + nav_js.strip() + '\n'

        with open('app.js', 'w', encoding='utf-8') as f:
            f.write(app_code)
        print("✓ Bound global navigation controller in app.js.")

    # 3. FIX APP.CSS (Theme uniformity, hide secondary tabs, style rest timer HUD)
    if os.path.exists('app.css'):
        master_css = """

/* ==========================================================================
   BULLDOG STATBOOK BRAND THEME & NAVIGATION REPAIR
   ========================================================================== */

header, .app-header, .nav-tabs, .tab-bar, header nav {
  position: relative !important;
  z-index: 99999 !important;
  pointer-events: auto !important;
  display: flex !important;
  visibility: visible !important;
  background-color: #FFFFFF !important;
  border-bottom: 1px solid #E2E8F0 !important;
}

.nav-tab, .tab-item, .nav-link, button.tab-btn, [data-screen] {
  pointer-events: auto !important;
  cursor: pointer !important;
  opacity: 1 !important;
  color: #64748B !important;
  font-weight: 600 !important;
  font-size: 0.95rem !important;
  padding: 8px 16px !important;
  border-radius: 6px !important;
  border: none !important;
  background: transparent !important;
  text-decoration: none !important;
  transition: all 0.15s ease !important;
}

.nav-tab:hover, .tab-item:hover, button.tab-btn:hover {
  color: #0F172A !important;
  background-color: #F1F5F9 !important;
}

.nav-tab.active, .tab-item.active, button.tab-btn.active {
  color: #FFFFFF !important;
  background-color: #0F172A !important;
  font-weight: 700 !important;
}

/* Hide un-styled secondary / lower-left workbook tabs */
.workbook-tabs,
.sheet-tabs,
.bottom-nav-floating,
.pwa-bottom-bar,
.excel-tabs,
footer.nav-tabs,
.tab-bar-floating,
#bottom-tab-bar {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  overflow: hidden !important;
}

.screen, [id$="-screen"] {
  position: relative !important;
  z-index: 1 !important;
}

/* UNIFIED ACTION BUTTONS (DEEP NAVY #0F172A) */
.btn-primary,
.btn-add-set,
.btn-next-exercise,
.btn-log-set,
.btn-start-workout,
.btn-resume-workout,
.btn-coach-ai,
.btn-submit,
.btn-finish,
button.btn-next-exercise,
button.btn-add-set,
button.btn-primary {
  background-color: #0F172A !important;
  color: #FFFFFF !important;
  font-weight: 700 !important;
  border: none !important;
  border-radius: 8px !important;
  min-height: 48px !important;
  text-shadow: none !important;
  cursor: pointer !important;
}

.btn-primary:hover, .btn-next-exercise:hover, .btn-add-set:hover {
  background-color: #1E293B !important;
}

/* RIR BUTTONS (SOLID KELLY GREEN WHEN SELECTED) */
.rir-chip, .btn-rir {
  background: #1E293B !important;
  color: #94A3B8 !important;
  border: 1px solid #334155 !important;
  font-weight: 600 !important;
  border-radius: 6px !important;
  padding: 8px 14px !important;
}

.rir-chip.active, .rir-chip.selected, .btn-rir.active, .btn-rir.selected {
  background-color: #16A34A !important;
  color: #FFFFFF !important;
  border-color: #15803D !important;
  font-weight: 700 !important;
}

/* REST TIMER HUD & SKIP BUTTON FIX */
.rest-timer-bar, .rest-timer-hud, .rest-timer-box, #rest-timer-container {
  background-color: #0F172A !important;
  border: 1px solid #334155 !important;
  color: #F8FAFC !important;
  padding: 12px 16px !important;
  border-radius: 8px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

.btn-skip-rest, #btn-skip-rest, button.btn-skip {
  background-color: #334155 !important;
  color: #FFFFFF !important;
  border: 1px solid #475569 !important;
  font-weight: 700 !important;
  padding: 8px 16px !important;
  border-radius: 6px !important;
  visibility: visible !important;
  display: inline-block !important;
  opacity: 1 !important;
  cursor: pointer !important;
}

/* BRAND LOGO SCALING */
.logo-bulldog-head,
.brand-logo-head,
header .logo-img,
header img {
  transform: scale(1.10) !important;
  transform-origin: left center !important;
}
"""
        with open('app.css', 'a', encoding='utf-8') as f:
            f.write(master_css)
        print("✓ Patched app.css with Statbook theme and button colors.")

    # 4. FIX INDEX.HTML (Guardrails wording & auto cache flush)
    if os.path.exists('index.html'):
        with open('index.html', 'r', encoding='utf-8') as f:
            html = f.read()

        html = html.replace('PlayerTrainingAssumption', 'Movement & Physical Guardrails')
        html = html.replace('Player Training Assumptions', 'Movement & Physical Guardrails')

        flush_snippet = """
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (var reg of registrations) { registration.unregister(); }
    });
  }
  if ('caches' in window) {
    caches.keys().then(function(names) {
      for (var name of names) caches.delete(name);
    });
  }
</script>
"""
        if 'navigator.serviceWorker.getRegistrations' not in html:
            html = html.replace('<head>', '<head>\n' + flush_snippet)

        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("✓ Patched index.html (Guardrails wording & auto cache flush).")

    # 5. BUMP SW.JS CACHE VERSION
    if os.path.exists('sw.js'):
        with open('sw.js', 'r', encoding='utf-8') as f:
            sw_code = f.read()

        cache_key = f"momentum-v{int(time.time())}"
        sw_code = re.sub(r"const\s+(CACHE_NAME|CACHE_VERSION)\s*=\s*['\"][^'\"]+['\"];?", f"const CACHE_NAME = '{cache_key}';", sw_code)

        with open('sw.js', 'w', encoding='utf-8') as f:
            f.write(sw_code)
        print(f"✓ Bumped sw.js cache key to {cache_key}.")

    print("🎉 All fixes applied successfully!")

if __name__ == '__main__':
    apply_momentum_patch()