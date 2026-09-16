const { withMainApplication } = require('@expo/config-plugins');
function configureMainApplication(source) {
  if (source.includes('// ScoutWise notification channel')) return source;
  const anchor = '    super.onCreate()';
  if (!source.includes(anchor)) throw new Error('Messaging: MainApplication startup anchor missing');
  return source.replace(anchor, `${anchor}
    // ScoutWise notification channel
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      val channel = android.app.NotificationChannel(
        "scoutwise_updates", "ScoutWise", android.app.NotificationManager.IMPORTANCE_DEFAULT
      )
      getSystemService(android.app.NotificationManager::class.java).createNotificationChannel(channel)
    }`);
}
module.exports = config => withMainApplication(config, mod => {
  if (mod.modResults.language !== 'kt') throw new Error('Messaging expects Kotlin MainApplication');
  mod.modResults.contents = configureMainApplication(mod.modResults.contents);
  return mod;
});
module.exports.configureMainApplication = configureMainApplication;
