import { getPerformance, trace } from '@react-native-firebase/perf';

// Native auto-instrumentation measures startup and supported HTTP/S requests.
// These diagnostics run only when explicitly invoked in development.
if (__DEV__) {
  Object.assign(globalThis, {
    scoutwisePerformanceTest: {
      status() {
        const performance = getPerformance();
        return {
          collectionEnabled: performance.dataCollectionEnabled,
          instrumentationEnabled: performance.instrumentationEnabled,
        };
      },
      async trace() {
        const sample = trace(getPerformance(), 'scoutwise_perf_setup_test');
        sample.putAttribute('source', 'manual_development_test');
        sample.start();
        try {
          await new Promise<void>(resolve => setTimeout(resolve, 250));
          sample.putMetric('test_runs', 1);
        } finally {
          sample.stop();
        }
        return 'scoutwise_perf_setup_test submitted to native SDK';
      },
      async network() {
        // Read-only public health endpoint. Automatic native instrumentation
        // records the request; do not add a duplicate manual HTTP metric.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch('https://dp-scoutiq-backend-mobile.onrender.com/health', {
            signal: controller.signal,
          });
          await response.text();
          return { status: response.status, ok: response.ok };
        } finally {
          clearTimeout(timeout);
        }
      },
    },
  });
}
