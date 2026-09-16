const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(file, imports) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (!(name in imports)) throw Error(`Unexpected import ${name}`);
    return imports[name];
  }, console, Map });
  return module.exports;
}
(async () => {
  const stored = new Map();
  const frequencies = load('src/services/remoteConfigDefaults.ts', {}).remoteConfigDefaults;
  const ads = load('src/ads/adGating.ts', {
    '../services/remoteConfig': { getAdFrequency: key => frequencies[key] },
    '@react-native-async-storage/async-storage': { default: {
      getItem: async key => stored.get(key), setItem: async (key, value) => stored.set(key, value),
    } },
  });
  let states = [], cursor = 0, plan = 'Free', tutorial = false, impressions = 0, deliver = true;
  let saved = 0, added = 0, reports = 0, reveals = 0, errors = [];
  const matchup = { mode: 2, rows: [null, null, null, null], add: () => { added++; } };
  const React = {
    useState: initial => { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef: initial => { const i = cursor++; if (!(i in states)) states[i] = { current: initial }; return states[i]; },
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  };
  const Card = load('src/components/WeeklyPopularPlayerCard.tsx', {
    react: { default: React }, 'react-native': { View: 'View', Alert: { alert: (...args) => errors.push(args) } },
    'react-i18next': { useTranslation: () => ({ t: (_key, fallback) => fallback }) },
    '@/context/MatchupContext': { useMatchup: () => matchup }, './Tutorial': { useTutorial: () => ({ active: tutorial }) },
    './PlayerCard': { default: 'PlayerCard' }, './ScoutingReport': { default: 'ScoutingReport' },
    '@/ads/PlusProUpsellScreen': { PlusProUpsellScreen: 'Upsell' },
    '@/ads/interstitial': { showInterstitialAndWaitSafely: async () => { impressions++; return deliver; } },
    '@/ads/adGating': ads, '@/theme': { ACCENT: 'green' },
    '@/services/api': {
      getMe: async () => ({ plan }), addFavoritePlayer: async payload => { assert.equal(payload.playerId, 'p'); saved++; },
      revealPlayerPoolPotential: async () => { reveals++; return { potential: 80 }; },
      revealPlayerPoolForm: async () => { reveals++; return { form: 70 }; },
      getPlayerPoolScoutingReportProgress: async () => { reports++; return { status: 'ready', content_json: {} }; },
      getPlayerPoolScoutingReportSection: async () => ({}),
    },
  }).default;
  const props = { id: 'p', player: { name: 'Player', stats: [], meta: { sportmonksId: 123 } } };
  const render = () => { cursor = 0; return Card(props); };
  const action = name => render().children[0].props[name]();
  const reset = () => { states = []; };

  // Portfolio shares the player-pool missing-score counter. One revealed card does not count again.
  await ads.incrementPlayerPoolMissingScoreActionCount();
  await ads.incrementPlayerPoolMissingScoreActionCount();
  assert.equal(await action('onAddFavorite'), true);
  assert.equal(impressions, 1); assert.equal(saved, 1); assert.equal(reveals, 2);
  await action('onMatchup');
  assert.equal(impressions, 1); assert.equal(added, 1); assert.equal(reveals, 2);
  assert.equal(stored.get('ads.shared.matchupAddCount.v1'), undefined);

  // Weekly missing-score add continues the shared counter from other screens.
  reset();
  for (const source of ['leagueMatchupAdd', 'seasonMatchupAdd', 'dailyScoutMatchupAdd']) await ads.incrementWorkspaceActionAndShouldShowAd(source);
  await action('onMatchup');
  assert.equal(impressions, 2); assert.equal(added, 2);
  assert.equal(stored.get('ads.shared.matchupAddCount.v1'), '4');

  // Reports use their own shared cadence, even after scores are visible.
  await ads.incrementWorkspaceActionAndShouldShowAd('teamAnalysisReport');
  await ads.incrementWorkspaceActionAndShouldShowAd('preMatchReport');
  await action('onGenerateReport');
  assert.equal(impressions, 3); assert.equal(reports, 1);
  assert.equal(render().children[1].type, 'ScoutingReport');
  assert.equal(render().children[1].props.visible, true);
  assert.equal(typeof render().children[1].props.loadReportSection, 'function');

  // Paid and tutorial requests do not advance ad counters.
  const counts = JSON.stringify([...stored]);
  plan = 'Pro Monthly'; reset(); await action('onGenerateReport'); await action('onAddFavorite');
  plan = 'No Ads Monthly'; reset(); await action('onMatchup');
  plan = 'Free'; tutorial = true; reset(); await action('onGenerateReport'); tutorial = false;
  assert.equal(JSON.stringify([...stored]), counts); assert.equal(impressions, 3);

  // No ad or mutation when matchup is full or already contains this player.
  matchup.rows = [{ id: 'other' }, { id: 'second' }, null, null]; reset();
  const beforeAdded = added;
  assert.equal(render().children[0].props.matchupDisabled, true); await action('onMatchup');
  matchup.rows = [{ id: 'p' }, null, null, null]; reset(); await action('onMatchup');
  assert.equal(added, beforeAdded); assert.equal(JSON.stringify([...stored]), counts);
  matchup.rows = [null, null, null, null];

  // If the scheduled report ad cannot show, use the upsell without a report request.
  stored.set('ads.shared.reportActionCount.v1', '5'); deliver = false; reset();
  const beforeReports = reports; await action('onGenerateReport');
  assert.equal(reports, beforeReports); assert.equal(render().children[2].props.visible, true);
  assert.deepEqual(errors, []);
  console.log('Weekly player action checks passed: shared ad counters, revealed scores, paid/tutorial bypass, report wiring, duplicates/full slots and ad fallback.');
})().catch(error => { console.error(error); process.exitCode = 1; });
