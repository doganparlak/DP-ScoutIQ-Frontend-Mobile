# Firebase configuration

These are the source configuration files used by the Expo config in `app.json`.
Keep them outside `ios/` and `android/` so native project regeneration preserves them.

- `GoogleService-Info.plist`: Firebase project `scoutwise-prod`, iOS bundle `com.anonymous.dp-scoutiq`.
- `google-services.json`: Firebase project `scoutwise-prod`, Android package `com.dpformance.dpscoutiq`.

The native copies are `ios/ScoutWise/GoogleService-Info.plist` and
`android/app/google-services.json`. Update these source files when downloading
replacement Firebase configuration, then synchronize the native copies.

Installed: Firebase core, Analytics, Crashlytics, and Cloud Messaging.
Firebase changes require a native app rebuild; Metro reload alone is insufficient.

## Analytics and Crashlytics

Installed `@react-native-firebase/analytics` and `@react-native-firebase/crashlytics`.
Analytics collects automatic lifecycle events and React Navigation screen views.
Screen tracking includes route names only, without route parameters or message text.
iOS Analytics uses the SDK without advertising ID support.
Crashlytics captures native crashes and uncaught JavaScript errors, with the last
screen and `build_type` (`debug` / `release`) attached as context.

Crash reporting is enabled in debug builds to allow simulator testing; use the
`build_type` attribute to distinguish development reports. Set
`crashlytics_debug_enabled` to false in `firebase.json` and rebuild to stop normal
debug collection. Test errors and crashes are never triggered automatically.

In React Native DevTools (development builds only):

```js
await scoutwiseFirebaseTest.check()
await scoutwiseFirebaseTest.analytics() // scoutwise_setup_test
scoutwiseFirebaseTest.nonFatal() // one labeled nonfatal error
scoutwiseFirebaseTest.crash() // intentionally closes the app; relaunch to upload
```

For Analytics DebugView, launch iOS with `-FIRDebugEnabled`; disable with
`-FIRDebugDisabled`. Android: `adb shell setprop debug.firebase.analytics.app
com.dpformance.dpscoutiq`; disable with `.none.`. Inspect Analytics > DebugView
and Crashlytics in Firebase Console for `scoutwise-prod`. Console ingestion can
lag behind the SDK accepting an event/report. Use an Analytics developer-traffic filter if you want development events
excluded from reports and exports.

## Verified setup (2026-09-15)

- Android: Analytics/Crashlytics Java compilation, Google Services processing,
  Crashlytics build-ID injection, and final manifest build passed.
- iOS: signed simulator build passed and was installed on iPhone 16 Pro.
- Analytics: `scoutwise_setup_test` was logged in debug mode; native logs showed
  a successful upload with HTTP 204.
- Crashlytics: recorded a labeled nonfatal error, intentionally crashed the
  simulator app, then relaunched it. `didCrashOnPreviousExecution` returned true
  and native logs showed completed report submission.
- Firebase Console ingestion was not independently inspected.

The local Expo plugin preserves iOS dSYM generation and disables the ads SDK's
competing crash handlers so Crashlytics owns crash reporting. Use a signed
simulator build (normal Expo/Xcode simulator signing); disabling signing caused
Firebase Installations keychain access to fail during verification.

## Cloud Messaging

Firebase Messaging is configured for iOS and Android. Notification permission is
requested once after sign-in. Android 13+ uses its notification permission dialog;
iOS uses the Apple dialog. Users who decline can enable notifications in system
settings. FCM tokens are cached on-device and refreshed when Firebase rotates them.
No token is sent to the ScoutWise backend yet; personalized backend notifications
will require a separate authenticated token-registration endpoint and sender.
Firebase Console notification campaigns and token-targeted test messages can be
used once the platform credentials are configured.

- iOS: push entitlement, remote-notification/background-fetch modes, and foreground
  banner/sound presentation. Distribution archives must use a push-enabled
  provisioning profile; allow EAS to sync Apple capabilities on the next build.
- Android: POST_NOTIFICATIONS permission, `scoutwise_updates` notification channel,
  foreground alert, and OS-displayed background notification payloads.
- Tapping a notification opens the app. Custom destination routing is not added.
- Background messages are handled without mounting the interactive app UI.

### Required Apple/Firebase configuration

In Firebase Console > Project settings > Cloud Messaging > Apple app configuration,
select `com.anonymous.dp-scoutiq`. Verify an APNs authentication key is uploaded.
If absent, upload the Apple Push Notifications `.p8` key with its Key ID and Apple
Team ID (`73X2Z4YQ7J`). The GoogleService-Info.plist does not contain this key, and
an APNs key stored in EAS is not automatically uploaded to Firebase. Keep the `.p8`
private; never put it in the app bundle. This console configuration has not been
verified from this workspace.

### Development tests

In React Native DevTools:

```js
await scoutwisePushTest.requestPermission()
await scoutwisePushTest.status() // permissions, token availability, received events
await scoutwisePushTest.getToken() // copy privately into Firebase's Send test message
```

Use a real iPhone with APNs configured, or an Android device/emulator with Google
Play services, to test actual FCM delivery. Test once with the app open and once
in the background, then tap the notification. A simulated iOS `.apns` payload
checks local delivery/presentation; it does not test Firebase-to-APNs delivery.
This simulator returned an APNs token during testing; cloud delivery still needs
the Firebase APNs credentials and an authenticated FCM sender.
New native builds are required; iOS 103 and Android 34 predate this integration.

### Messaging verification (2026-09-16)

- Android: app Kotlin compilation, Messaging Java compilation, and manifest build passed.
- iOS: signed simulator build passed. Permission was granted, and both APNs and FCM
  tokens were obtained successfully.
- Simulated foreground push: native banner displayed and `onMessage` received the
  expected message ID.
- Simulated background push: the OS banner displayed while another app was open.
  Silent background JavaScript execution and notification-tap routing were not
  independently verified.
- Permission/token logic checks passed: denied permissions, concurrent startup,
  one-time prompting, missing APNs token, Android permission, and token rotation.
- End-to-end FCM/APNs delivery is still unverified; APNs key upload in Firebase
  has not been confirmed. No production push campaign was sent.
