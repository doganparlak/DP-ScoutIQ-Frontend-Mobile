# Remote Config

The mobile app reads ad intervals from Firebase Remote Config. Defaults preserve the current behavior; plan eligibility, qualifying actions, shared counters, plan-discovery nudges, and backend credits are unchanged.

## Firebase Console setup

Open scoutwise-prod → Remote Config (use Search for products). Create the parameters below as Number values, then Publish changes. `remote-config-parameters.json` contains the same definitions for reference; do not replace an existing project template blindly.

| Parameter | Default | Action |
|---|---:|---|
| ads_report_every | 3 | Shared player/team/pre-match/post-match reports |
| ads_matchup_add_every | 4 | Shared qualifying matchup additions |
| ads_matchup_launch_every | 3 | Run comparison |
| ads_potential_every | 4 | Potential reveal |
| ads_missing_score_action_every | 3 | Player pool missing-score action |
| ads_portfolio_lineup_every | 4 | Portfolio lineup |
| ads_save_match_every | 4 | Save match |
| ads_daily_hidden_portfolio_every | 3 | Daily Scout portfolio add, hidden scores |
| ads_daily_revealed_portfolio_every | 4 | Daily Scout portfolio add, revealed scores |
| ads_season_search_every | 4 | Season search |

Only whole numbers 2–100 are accepted. Missing/invalid values use the corresponding in-app default. This does not create guaranteed ad impressions: existing eligibility, ad availability, and other checks still apply.

Fetch/activate runs at launch and when returning to the foreground, without blocking UI. Production fetches use a one-hour minimum cache interval; debug builds use zero. Offline failures retain activated values, or bundled defaults if nothing was fetched. Changes affect subsequent actions, preserving cumulative counters (they do not reset the count).

## Verify

New native builds are required for both platforms. Remote Config has no Expo config plugin; native modules autolink, and RNFBRemoteConfig is included in iOS static linking settings.

Run `node scripts/test-remote-config.cjs` for validation and shared-counter regression checks.

In a debug build, evaluate `scoutwiseRemoteConfigTest.status()` in React Native DevTools. Inspect values, sources (`remote` versus `default`), and lastError. Publish a value such as ads_season_search_every = 5, then run `await scoutwiseRemoteConfigTest.refresh()` and inspect status again. Restore 4 afterward if this was only a test. Publishing changes without targeting also affects other supported builds in this Firebase project.

Firebase Console publication and a live remote-value fetch must be verified separately from local compilation/tests. No server access credentials or paid-access decisions belong in Remote Config.

## Verification on 2026-09-16

- Android Remote Config native compilation and app manifest merge passed.
- iOS simulator build passed; installed and launched on iPhone 16 Pro (iOS 18.6).
- Runtime refresh completed with `lastError: null`; all ten parameters currently report `default` as their source and retain the expected 3/4 intervals. A published remote override has not yet been verified.
- Regression script passed. Full TypeScript check still reports nine existing errors in unrelated SafeAreaView imports and leaguePool; none in the modified Remote Config, ad gating, or App files.
