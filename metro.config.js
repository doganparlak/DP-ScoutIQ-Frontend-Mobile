const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const escapePath = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Use the JS crawler so ignored native/iCloud project directories are skipped
// before traversal, rather than letting macOS find wait on their downloads.
config.resolver.useWatchman = false;
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList || []),
  new RegExp(`^${escapePath(__dirname)}/(?:ios|android|\\.git)(?:/|$)`),
  /\.(?:xcodeproj|xcworkspace)(?:\/|$)/,
];

module.exports = config;
