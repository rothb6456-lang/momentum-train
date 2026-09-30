const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const storage = {};
Object.defineProperties(storage, {
  getItem: { value: key => storage[key] ?? null },
  setItem: { value: (key, value) => { storage[key] = String(value); } },
  removeItem: { value: key => { delete storage[key]; } }
});
const context = { localStorage: storage, location: { hash: '' }, URLSearchParams, window: { addEventListener() {} } };
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../account-bridge.js'), 'utf8'), context);
const account = context.window.MomentumAccount;
(async () => {
  storage.setItem('momentum.sessions.v3', 'local-workout');
  storage.setItem('momentum_exercise_catalog', 'shared-catalog');
  await account.connect({ user: { id: 'athlete-a', name: 'A' }, token: 'test-only-token-a' });
  assert.equal(storage.getItem('momentum.sessions.v3'), null);
  assert.equal(storage.getItem('momentum_exercise_catalog'), 'shared-catalog');
  storage.setItem('momentum.sessions.v3', 'a-workout');
  await account.connect({ user: { id: 'athlete-b' }, token: 'test-only-token-b' });
  assert.equal(storage.getItem('momentum.sessions.v3'), null);
  account.activate('athlete-a');
  assert.equal(storage.getItem('momentum.sessions.v3'), 'a-workout');
  storage.removeItem('momentum.sessions.v3');
  account.activate('athlete-b'); account.activate('athlete-a');
  assert.equal(storage.getItem('momentum.sessions.v3'), null, 'Deleted workouts must not resurrect');
  account.activate('local');
  assert.equal(storage.getItem('momentum.sessions.v3'), 'local-workout');
  console.log('Account isolation: 6 assertions passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
