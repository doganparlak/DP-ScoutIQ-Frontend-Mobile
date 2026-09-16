const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(file, imports, extra = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => { if (!(name in imports)) throw Error(name); return imports[name]; }, setTimeout, clearTimeout, ...extra });
  return exports;
}
(async () => {
  let states = [], cursor = 0, cleanup, paid = false, due = true, shown = false, performed = 0;
  const timers = [];
  const React = {
    useRef: value => { const i = cursor++; return states[i] ??= { current: value }; },
    useState: value => { const i = cursor++; if (!(i in states)) states[i] = value; return [states[i], v => { states[i] = v; }]; },
    useEffect: fn => { cleanup = fn(); },
    createElement: (type, props) => ({ type, props }),
  };
  const hook = load('src/ads/useWorkspaceActionAd.tsx', {
    react: { default: React }, '@/services/api': { getMe: async () => ({ plan: paid ? 'Pro Monthly' : 'Free' }) },
    '@/components/Tutorial': { useTutorial: () => ({ active: false }) },
    './PlusProUpsellScreen': { PlusProUpsellScreen: 'Upsell' },
    './adGating': { incrementWorkspaceActionAndShouldShowAd: async () => due },
    './interstitial': { showInterstitialAndWaitSafely: async () => shown },
  }, { setTimeout: fn => timers.push(fn) }).useWorkspaceActionAd;
  const render = () => { cursor = 0; return hook(); };
  const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  const pending = render().run('teamAnalysisReport', async () => { performed++; });
  await flush();
  assert.equal(render().fallback.props.visible, true);
  assert.equal(performed, 0, 'Report must not open over the upsell');
  render().fallback.props.onClose();
  assert.equal(render().fallback.props.visible, false);
  assert.equal(performed, 0, 'Wait for native dismissal');
  timers.shift()(); await pending;
  assert.equal(performed, 1); assert.equal(render().busy, false);
  shown = true; await render().run('teamAnalysisReport', async () => { performed++; });
  paid = true; shown = false; await render().run('teamAnalysisReport', async () => { performed++; });
  assert.equal(performed, 3);
  paid = false;
  const cancelled = render().run('teamAnalysisReport', async () => { performed++; });
  await flush(); cleanup(); await cancelled;
  assert.equal(performed, 3, 'Unmount must not open a stale report');

  // Actual interstitial module: rejected show resolves false instead of hanging.
  const listeners = new Map();
  const emit = type => { for (const fn of listeners.get(type) || []) fn(); };
  const ad = {
    addAdEventListener: (type, fn) => { const set = listeners.get(type) || new Set(); set.add(fn); listeners.set(type, set); return () => set.delete(fn); },
    load: () => queueMicrotask(() => emit('loaded')),
    show: () => Promise.reject(Error('presentation rejected')),
  };
  const interstitial = load('src/ads/interstitial.ts', {
    'react-native-google-mobile-ads': { InterstitialAd: { createForAdRequest: () => ad }, AdEventType: { LOADED: 'loaded', OPENED: 'opened', CLOSED: 'closed', ERROR: 'error' } },
    'react-native': { Platform: { OS: 'ios' }, Keyboard: { dismiss() {} }, InteractionManager: { runAfterInteractions: fn => fn() } },
    './logging': { logAdLifecycle() {} },
  }, { setTimeout: (fn, ms) => setTimeout(fn, ms === 400 ? 0 : ms) });
  assert.equal(await interstitial.showInterstitialAndWaitSafely(), false);
  assert.equal(await interstitial.showInterstitialAndWaitSafely(), false, 'A failed show must release the lock for retry');
  console.log('Workspace ad flow passed: report after popup dismissal, paid/success paths, unmount cancellation, rejected ad presentation and retry.');
})().catch(error => { console.error(error); process.exitCode = 1; });
