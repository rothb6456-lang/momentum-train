/* Ecosystem navigation, install guidance, and an optional Log walkthrough. */
(() => {
  const bar = document.createElement('aside');
  bar.className = 'card';
  bar.setAttribute('aria-label', 'Bulldog account and app help');
  bar.style.cssText = 'margin:12px 0;display:flex;gap:12px;align-items:center;flex-wrap:wrap';
  const hub = document.createElement('a');
  hub.href = 'https://statbook.bulldogstats.com/dashboard'; hub.textContent = 'Bulldog home base ↗';
  const label = document.createElement('span');
  label.textContent = window.momentumLaunchError || (localStorage.getItem('momentum_sanctum_token')
    ? 'Connected: ' + (localStorage.getItem('momentum.account-name.v1') || 'Bulldog account') : 'Local workspace · saved on this device');
  label.setAttribute('role', 'status');
  bar.append(hub, label);
  const install = document.createElement('button'); install.className = 'secondary'; install.textContent = 'Install Momentum';
  let installEvent;
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installEvent = event; install.hidden = false; });
  install.hidden = window.matchMedia('(display-mode: standalone)').matches;
  install.onclick = async () => {
    if (installEvent) { await installEvent.prompt(); installEvent = null; }
    else { label.textContent = /iPhone|iPad/.test(navigator.userAgent) ? 'In Safari, tap Share, then Add to Home Screen.' : 'Open your browser menu and choose Install app or Add to Home Screen when available.'; }
  };
  window.addEventListener('appinstalled', () => { install.hidden = true; });
  bar.append(install);
  const tutorialButton = document.createElement('button'); tutorialButton.className = 'secondary'; tutorialButton.textContent = 'Log walkthrough';
  tutorialButton.onclick = () => { show('log'); tutorial(true); };
  bar.append(tutorialButton);
  document.querySelector('main.app')?.prepend(bar);
  function tutorial(force = false) {
    const log = document.getElementById('log');
    if (!log?.classList.contains('active') || document.getElementById('logTutorial')) return;
    if (!force && localStorage.getItem('momentum.log-tutorial.v1')) return;
    const section = document.createElement('section'); section.id = 'logTutorial'; section.className = 'card';
    section.innerHTML = '<div class="eyebrow">Coach / Your first session</div><h2>One set at a time.</h2><ol><li>Choose an exercise from your plan or the exercise library.</li><li>Enter the weight and reps you actually performed. For timed work, enter your duration.</li><li>Log the set, then use the rest timer. RIR means reps you could still do; tempo describes the pace of each rep.</li><li>Finish the workout to save it locally. Review compares your performed sets with your original plan.</li></ol>';
    const done = document.createElement('button'); done.className = 'primary'; done.textContent = 'Got it';
    done.onclick = () => { localStorage.setItem('momentum.log-tutorial.v1', 'seen'); section.remove(); };
    section.append(done); log.prepend(section);
  }
  const log = document.getElementById('log');
  if (log) new MutationObserver(() => tutorial()).observe(log, { attributes: true, attributeFilter: ['class'], childList: true });
  tutorial();
  // Reuse the established SVG vocabulary across the primary navigation.
  const icons = { home: 'pulse', today: 'calendar', log: 'dumbbell', review: 'check', history: 'trending' };
  document.querySelectorAll('.nav-item[data-view]').forEach(button => {
    const marker = button.querySelector('b');
    if (marker && typeof profileIcon === 'function') { marker.innerHTML = profileIcon(icons[button.dataset.view]); marker.setAttribute('aria-hidden','true'); }
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
})();
