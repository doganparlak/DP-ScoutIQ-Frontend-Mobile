const { withMainApplication } = require('@expo/config-plugins');

function configureMainApplication(source) {
  const marker = '// ScoutWise installed-ABI SoLoader workaround';
  if (source.includes(marker)) return source;
  const anchor = '    loadReactNative(this)';
  if (!source.includes(anchor)) throw new Error('SoLoader: MainApplication startup anchor missing');
  // SoLoader 0.12.1 can choose a reported ABI that differs from the installed ABI.
  // Keep normal installs on React Native's existing initialization path.
  return source.replace(anchor, `    ${marker}
    val installedAbi = when (java.io.File(applicationInfo.nativeLibraryDir).name) {
      "arm" -> "armeabi-v7a"
      "arm64" -> "arm64-v8a"
      "x86" -> "x86"
      "x86_64" -> "x86_64"
      else -> null
    }
    if (installedAbi != null && com.facebook.soloader.SysUtil.getSupportedAbis().firstOrNull() != installedAbi) {
      com.facebook.soloader.SoLoader.init(this, com.facebook.react.soloader.OpenSourceMergedSoMapping)
      val apks = listOf(applicationInfo.sourceDir) + applicationInfo.splitSourceDirs.orEmpty()
      val paths = apks.mapTo(LinkedHashSet()) { "$it!/lib/$installedAbi" }
      com.facebook.soloader.SoLoader.prependSoSource(com.facebook.soloader.DirectApkSoSource(paths))
    }
${anchor}`);
}

module.exports = config => withMainApplication(config, mod => {
  if (mod.modResults.language !== 'kt') throw new Error('SoLoader expects Kotlin MainApplication');
  mod.modResults.contents = configureMainApplication(mod.modResults.contents);
  return mod;
});
module.exports.configureMainApplication = configureMainApplication;
