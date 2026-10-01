/* Theme preference is device-wide and independent of athlete/workout data. */
(() => {
  const choices = ['system', 'dark', 'light'];
  const root = document.documentElement;
  let preference = choices.includes(root.dataset.themePreference) ? root.dataset.themePreference : 'dark';
  let media = null;
  try { media = window.matchMedia('(prefers-color-scheme: dark)'); } catch {}
  let listening = false;
  let control;
  let toastTimer;

  function resolved() {
    return preference === 'system' ? (media?.matches ? 'dark' : 'light') : preference;
  }

  function update() {
    root.setAttribute('data-theme-preference', preference);
    root.setAttribute('data-theme', resolved());
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved() === 'dark' ? '#0b1117' : '#ffffff');
    if (control) control.value = preference;
  }

  function systemChanged() { update(); }

  function listenForSystem() {
    if (!media) return;
    const needed = preference === 'system';
    if (needed === listening) return;
    if (needed) {
      if (media.addEventListener) media.addEventListener('change', systemChanged);
      else if (media.addListener) media.addListener(systemChanged);
    } else {
      if (media.removeEventListener) media.removeEventListener('change', systemChanged);
      else if (media.removeListener) media.removeListener(systemChanged);
    }
    listening = needed;
  }

  function announce() {
    const message = `Theme: ${preference[0].toUpperCase()}${preference.slice(1)}`;
    // This also works before the asynchronous app.js load has supplied toast().
    if (typeof window.toast === 'function') window.toast(message);
    else {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
      }
    }
  }

  function set(value) {
    if (!choices.includes(value)) return false;
    preference = value;
    try { localStorage.setItem('momentum-theme', preference); } catch {}
    listenForSystem();
    update();
    announce();
    return true;
  }

  function mount() {
    const header = document.querySelector('header.top');
    if (!header || document.getElementById('momentumThemeControl')) return;
    const label = document.createElement('label');
    label.className = 'theme-control';
    label.textContent = 'Theme';
    control = document.createElement('select');
    control.id = 'momentumThemeControl';
    control.setAttribute('aria-label', 'Color theme');
    for (const value of choices) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value[0].toUpperCase() + value.slice(1);
      control.append(option);
    }
    control.value = preference;
    control.addEventListener('change', () => set(control.value));
    label.append(control);
    header.append(label);
    const toast = document.getElementById('toast');
    if (toast) { toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite'); }
  }

  // A future settings gear can call open(), set(value), or get().
  window.MomentumTheme = Object.freeze({
    get: () => preference,
    resolved,
    set,
    open: () => { mount(); control?.focus(); }
  });
  listenForSystem();
  update();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once: true});
  else mount();
})();
