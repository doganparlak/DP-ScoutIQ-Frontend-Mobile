const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(file, imports) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (!(name in imports)) throw Error(`Unexpected import ${name}`);
    return imports[name];
  }, __DEV__: false, console, Map });
  return module.exports;
}
(async () => {
  const defaults = load('src/services/remoteConfigDefaults.ts', {});
  for (const bad of ['', 'abc', 0, 1, -3, 2.5, Infinity, 101, null, true]) {
    assert.equal(defaults.validatedFrequency('ads_report_every', bad), 3);
  }
  assert.equal(defaults.validatedFrequency('ads_report_every', '5'), 5);
  let active = {}, fetched = {}, fail = false, fetches = 0;
  const rc = load('src/services/remoteConfig.ts', {
    './remoteConfigDefaults': defaults,
    'react-native': { AppState: { addEventListener: () => ({ remove() {} }) } },
    '@react-native-firebase/remote-config': {
      getRemoteConfig: () => ({}), ensureInitialized: async () => {},
      getValue: (_, key) => ({ asString: () => String(active[key] ?? defaults.remoteConfigDefaults[key]) }),
      fetchAndActivate: async () => { fetches++; if (fail) throw Error('offline'); active = fetched; },
    },
  });
  assert.equal(rc.getAdFrequency('ads_report_every'), 3);
  fetched = { ads_report_every: 5, ads_matchup_add_every: 5, ads_season_search_every: 0 };
  await Promise.all([rc.refreshRemoteConfig(), rc.refreshRemoteConfig()]);
  assert.equal(fetches, 1);
  assert.equal(rc.getAdFrequency('ads_report_every'), 5);
  assert.equal(rc.getAdFrequency('ads_season_search_every'), 4);
  fail = true;
  await rc.refreshRemoteConfig();
  assert.equal(rc.getAdFrequency('ads_report_every'), 5);
  const stored = new Map();
  const ads = load('src/ads/adGating.ts', {
    '../services/remoteConfig': rc,
    '@react-native-async-storage/async-storage': { default: {
      getItem: async key => stored.get(key), setItem: async (key, value) => stored.set(key, value),
    } },
  });
  const results = await Promise.all(['leagueMatchupAdd', 'seasonMatchupAdd', 'dailyScoutMatchupAdd',
    'portfolioPlayerMatchupAdd', 'leagueMatchupAdd'].map(ads.incrementWorkspaceActionAndShouldShowAd));
  assert.deepEqual(results, [false, false, false, false, true]);
  await ads.incrementReportActionCount();
  for (const action of ['teamAnalysisReport', 'preMatchReport', 'postMatchReport']) {
    assert.equal(await ads.incrementWorkspaceActionAndShouldShowAd(action), false);
  }
  assert.equal(ads.shouldShowReportActionInterstitial(await ads.incrementReportActionCount()), true);
  assert.equal(ads.shouldShowPlayerCardPlanNudge(3), true);
  console.log('Remote Config checks passed: validation, deduplication, offline fallback, shared counters, unchanged plan nudges.');
})().catch(error => { console.error(error); process.exitCode = 1; });
