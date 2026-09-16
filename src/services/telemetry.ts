import './performance';
import { getApp } from '@react-native-firebase/app';
import { getAnalytics, logEvent, logScreenView } from '@react-native-firebase/analytics';
import {
  getCrashlytics, log, setAttribute, recordError, crash, didCrashOnPreviousExecution,
} from '@react-native-firebase/crashlytics';

const reportTelemetryFailure = (error: unknown) => {
  if (__DEV__) console.warn('[Telemetry]', error);
};

export function initializeTelemetry() {
  const reporter = getCrashlytics();
  void setAttribute(reporter, 'build_type', __DEV__ ? 'debug' : 'release')
    .catch(reportTelemetryFailure);
  log(reporter, 'App mounted');
}

export function trackScreen(screen: string) {
  // Route names only: never send route params, chat text, or account details.
  void logScreenView(getAnalytics(), { screen_name: screen, screen_class: screen })
    .catch(reportTelemetryFailure);
  log(getCrashlytics(), `Screen: ${screen}`);
  void setAttribute(getCrashlytics(), 'screen', screen).catch(reportTelemetryFailure);
}

// Explicitly invoked from React Native DevTools; never runs tests at startup.
if (__DEV__) {
  Object.assign(globalThis, {
    scoutwiseFirebaseTest: {
      async check() {
        const app = getApp();
        return {
          project: app.options.projectId,
          crashlyticsEnabled: getCrashlytics().isCrashlyticsCollectionEnabled,
          crashedPreviously: await didCrashOnPreviousExecution(getCrashlytics()),
        };
      },
      async analytics() {
        await logEvent(getAnalytics(), 'scoutwise_setup_test', { source: 'manual_development_test' });
        return 'scoutwise_setup_test submitted to native SDK';
      },
      nonFatal() {
        recordError(getCrashlytics(), new Error('ScoutWise Firebase setup test: nonfatal'));
        return 'Test nonfatal recorded';
      },
      crash() {
        log(getCrashlytics(), 'ScoutWise manual Firebase setup crash');
        crash(getCrashlytics());
      },
    },
  });
}
