const { withAppDelegate, withXcodeProject } = require('@expo/config-plugins');

function configureAppDelegate(source) {
  if (!source.includes('import GoogleMobileAds')) {
    source = source.replace('import Expo', 'import Expo\nimport GoogleMobileAds');
  }
  if (!source.includes('MobileAds.shared.disableSDKCrashReporting()')) {
    const anchor = '    let delegate = ReactNativeDelegate()';
    if (!source.includes(anchor)) throw new Error('Firebase diagnostics: AppDelegate startup anchor missing');
    source = source.replace(anchor,
      '    // Let Crashlytics own crash reporting; avoid competing ads SDK handlers.\n' +
      '    MobileAds.shared.disableSDKCrashReporting()\n' + anchor);
  }
  return source;
}

function configureSymbols(project) {
  for (const config of Object.values(project.pbxXCBuildConfigurationSection())) {
    if (config && config.buildSettings) {
      config.buildSettings.DEBUG_INFORMATION_FORMAT = '"dwarf-with-dsym"';
    }
  }
  return project;
}

module.exports = function withFirebaseDiagnostics(config) {
  config = withAppDelegate(config, mod => {
    if (mod.modResults.language !== 'swift') throw new Error('Firebase diagnostics expects Swift AppDelegate');
    mod.modResults.contents = configureAppDelegate(mod.modResults.contents);
    return mod;
  });
  return withXcodeProject(config, mod => {
    configureSymbols(mod.modResults);
    return mod;
  });
};
module.exports.configureAppDelegate = configureAppDelegate;
module.exports.configureSymbols = configureSymbols;
