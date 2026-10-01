const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const lessons = JSON.parse(fs.readFileSync(path.join(root, 'education-lessons.json')));
assert.deepEqual(lessons, JSON.parse(fs.readFileSync(path.join(root, '../Bulldog-backend/resources/education/lessons.json'))), 'Client and server must ship the same lesson version');
assert.equal(new Set(lessons.lessons.map(x => x.id)).size, lessons.lessons.length);
const anatomy = JSON.parse(fs.readFileSync(path.join(root, 'education-anatomy.json')));
assert.equal(Object.keys(anatomy.structures).length, 32);
for (const [, source] of Object.values(anatomy.structures)) assert.ok(anatomy.sources[source]);
for (const lesson of lessons.lessons) {
  assert.equal(lesson.choices.length, 3);
  assert.ok(lesson.choices[lesson.answer]);
  assert.match(lesson.source, /^https:\/\/(openstax\.org|doi\.org)\//);
}
const storage = new Map();
const key = 'momentum.education.v1';
let account='a', requestCount=0, mode='fail';
const context = {
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  navigator:{onLine:true},
  window:{MomentumAccount:{owner:()=>account},addEventListener(){}},
  fetch:async()=>{requestCount++; if(mode==='fail') throw new Error('offline'); if(mode==='switch') account='b'; return {ok:true,json:async()=>({data:{completed:true,awarded:false,xp:0}})};}
};
vm.runInNewContext(fs.readFileSync(path.join(root,'education.js'),'utf8'),context);
(async()=>{
  storage.set('momentum_sanctum_token','test-only');
  storage.set(key,JSON.stringify({'tendon-transfer':{status:'pending',version:1,answer:1}}));
  await context.window.MomentumEducation.sync();
  assert.equal(JSON.parse(storage.get(key))['tendon-transfer'].status,'pending');
  mode='success'; await context.window.MomentumEducation.sync();
  assert.equal(JSON.parse(storage.get(key))['tendon-transfer'].status,'confirmed');
  const count=requestCount; await context.window.MomentumEducation.sync(); assert.equal(requestCount,count);
  storage.set(key,JSON.stringify({'ligament-support':{status:'pending',version:1,answer:2}}));
  mode='switch'; await context.window.MomentumEducation.sync();
  assert.equal(JSON.parse(storage.get(key))['ligament-support'].status,'pending','An old account response must not write progress to the new workspace');
  console.log('Education: lesson contract, retry, duplicate suppression and account-switch checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
