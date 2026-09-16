# Firebase Performance Monitoring

Configured with @react-native-firebase/perf 26.4.0 for both native platforms.

- Automatic native app-start/lifecycle measurements.
- Supported HTTP/S network request timing, response status and payload metrics. Android uses the Firebase Performance Gradle plugin; iOS uses native automatic instrumentation.
- Native screen-rendering metrics are not equivalent to individual React Navigation screens; per-screen React performance and end-to-end report generation require additional custom instrumentation.

Collection is enabled in firebase.json (`perf_auto_collection_enabled`). The Expo plugin and static-linking configuration preserve setup during native regeneration. New native production builds are required.

## Verify in development

The tests are opt-in and never run automatically in production. In React Native DevTools:

```js
scoutwisePerformanceTest.status()
await scoutwisePerformanceTest.trace()
await scoutwisePerformanceTest.network()
```

The trace is named `scoutwise_perf_setup_test`. The network test issues a read-only GET to the public production `/health` endpoint, with a 15-second timeout. Native auto-instrumentation records it without a duplicate manual HTTP metric.

On iOS, launch with `-FIRDebugEnabled` during verification and inspect Firebase/Performance logs for `Logging trace metric` and `Logging network request trace`. Remove that launch flag (or launch once with `-FIRDebugDisabled`) after testing. Nothing modifies release scheme flags.

Open Firebase Console → Performance (find it with Search for products). Inspect app start, network requests, and the custom trace. SDK logs establish collection; console visibility must be confirmed separately, after Firebase processes the data. Debug/simulator timings are not representative of release-device performance.

## Verification — 2026-09-16

- Android `:app:transformDebugClassesWithAsm`, `:react-native-firebase_perf:compileDebugJavaWithJavac`, and `:app:processDebugMainManifest` passed with two workers. A full multi-architecture assemble was stopped due to host resource pressure; no full Android APK/runtime test is claimed.
- iOS simulator Debug build succeeded, installed and launched on iPhone 16 Pro / iOS 18.6.
- Runtime reported collectionEnabled=true and instrumentationEnabled=true.
- Native FirebasePerformance logs confirmed `_as` startup trace (1556.982 ms), `scoutwise_perf_setup_test` (269.083 ms), and automatic HTTPS `/health` trace (HTTP 200, 349.333 ms). These are single debug/simulator samples, not performance benchmarks.
- Debug logging disabled again after verification. Console ingestion/visibility has not been independently confirmed.
- TypeScript reported no errors in the changed performance/telemetry files; existing unrelated project errors remain.
- Local verification logs: /tmp/scoutwise-perf-android-check.log, /tmp/scoutwise-perf-ios.log, /tmp/scoutwise-perf-native-events.log.
