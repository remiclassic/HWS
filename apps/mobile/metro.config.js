const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force a single React instance across the monorepo. expo-router@6 declares
// peer react:"*" which causes npm to nest react@19.2.5 inside apps/mobile/
// node_modules. extraNodeModules loses to local resolution; resolveRequest
// intercepts first and wins unconditionally.
const rootNodeModules = path.resolve(__dirname, '../../node_modules');
const SINGLETON_MODULES = new Set(['react', 'react-dom', 'react-native', 'react/jsx-runtime', 'react/jsx-dev-runtime']);

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (SINGLETON_MODULES.has(moduleName)) {
    return context.resolveRequest(
      { ...context, originModulePath: rootNodeModules + '/.' },
      moduleName,
      platform,
    );
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
