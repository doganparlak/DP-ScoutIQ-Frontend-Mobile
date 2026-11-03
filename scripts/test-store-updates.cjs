const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
  const module = {exports: {}};
  new Function('require', 'module', 'exports', code)(name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`); return dependencies[name];
  }, module, module.exports);
  return module.exports;
}
const policy = load('src/utils/storeUpdatePolicy.ts');
assert.ok(policy.isNewerStoreVersion('2.10.0', '2.9.9'));
assert.ok(policy.isNewerStoreVersion('3.0', '2.99.99'));
assert.ok(!policy.isNewerStoreVersion('2.3.0', '2.3'));
assert.ok(!policy.isNewerStoreVersion('2.2.1', '2.3.0'));
for (const bad of ['', '2.3-beta', '2.3evil', '-1', 'https://example.com', '99999999999999999999']) assert.ok(!policy.isNewerStoreVersion(bad, '2.2.1'));
assert.ok(!policy.shouldOfferStoreUpdate('2.2.1', '2.2.1', null)); // new downloads/reinstalls on latest
assert.ok(!policy.shouldOfferStoreUpdate('2.2.1', '2.3.0', '2.3'));
assert.ok(policy.shouldOfferStoreUpdate('2.2.1', '2.4', '2.3.0'));

(async () => {
  const storage = new Map(); const opened = []; let nativeFails = false; let version = '2.2.1', latest = '2.3.0', failed = false;
  const api = load('src/services/storeUpdates.ts', {
    '@react-native-async-storage/async-storage': {__esModule: true, default: {
      multiGet: async keys => keys.map(key => [key, storage.get(key) || null]),
      getItem: async key => storage.get(key) || null,
      setItem: async (key, value) => {storage.set(key, value);},
    }},
    '@react-native-firebase/app': {getUtils: () => ({appVersion: version})},
    '@react-native-firebase/remote-config': {getRemoteConfig: () => ({}), getValue: () => ({asString: () => latest})},
    'react-native': {Platform: {OS: 'ios'}, Linking: {openURL: async url => {opened.push(url); if (nativeFails && url.startsWith('itms-apps:')) throw new Error('No store handler');}}},
    './remoteConfig': {refreshRemoteConfig: async () => {if (failed) throw new Error('Offline');}},
    '@/utils/storeUpdatePolicy': policy,
  });
  assert.equal(await api.isExistingStoreUpdateInstall(), false); // fresh/reinstalled first session
  assert.equal(await api.isExistingStoreUpdateInstall(), true); // later app session
  storage.clear(); storage.set('auth_token', 'existing-install-test');
  assert.equal(await api.isExistingStoreUpdateInstall(), true);
  const update = await api.availableStoreUpdate();
  assert.equal(update.url, 'https://apps.apple.com/app/scoutwise/id6755595849');
  assert.equal(update.installedVersion, version);
  await api.openStoreUpdate(update);
  assert.deepEqual(opened, ['itms-apps://apps.apple.com/app/id6755595849']);
  opened.length = 0; nativeFails = true;
  await api.openStoreUpdate(update);
  assert.deepEqual(opened, ['itms-apps://apps.apple.com/app/id6755595849', update.url]);
  await api.acknowledgeStoreUpdate(latest);
  assert.equal(await api.availableStoreUpdate(), null);
  latest = '2.4.0'; assert.ok(await api.availableStoreUpdate());
  version = latest; assert.equal(await api.availableStoreUpdate(), null);
  version = undefined; assert.equal(await api.availableStoreUpdate(), null);
  version = '2.2.1'; latest = ''; assert.equal(await api.availableStoreUpdate(), null);
  failed = true; await assert.rejects(api.availableStoreUpdate(), /Offline/);
  assert.equal(policy.STORE_UPDATE_URLS.android, 'https://play.google.com/store/apps/details?id=com.dpformance.dpscoutiq');
  console.log('Store-update checks passed: version comparison, native version, latest-install suppression, first-session eligibility, per-release dismissal, offline failure, and store destinations.');
})().catch(error => {console.error(error); process.exitCode = 1;});
