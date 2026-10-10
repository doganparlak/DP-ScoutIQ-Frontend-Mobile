const { withInfoPlist } = require('@expo/config-plugins');

// Client IDs are public. The matching reversed URL scheme must be present at build time.
module.exports = (config, options = {}) => withInfoPlist(config, cfg => {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || options.iosClientId;
  if (!clientId) return cfg;
  if (!/^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
    throw new Error('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID must be a Google iOS OAuth client ID');
  }
  const scheme = clientId.split('.').reverse().join('.');
  const types = cfg.modResults.CFBundleURLTypes || [];
  if (!types.some(type => (type.CFBundleURLSchemes || []).includes(scheme))) {
    types.push({ CFBundleURLSchemes: [scheme] });
  }
  cfg.modResults.CFBundleURLTypes = types;
  return cfg;
});
