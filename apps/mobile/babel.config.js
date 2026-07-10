// demo/sdk54 branch only (companion to metro.config.js): npm nests expo-router
// under apps/mobile/node_modules to give it this app's react 19.1.0 (the admin
// app hoists react 19.2 to the root). babel-preset-expo lives at the root, so
// its internal `require.resolve('expo-router')` check fails and it silently
// skips the router plugin that inlines EXPO_ROUTER_APP_ROOT — every bundle then
// dies on `require.context(process.env.EXPO_ROUTER_APP_ROOT, ...)`. Adding the
// plugin explicitly restores the inlining; it is a no-op if the preset ever
// starts adding it itself.
const { expoRouterBabelPlugin } = require('babel-preset-expo/build/expo-router-plugin');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [expoRouterBabelPlugin],
  };
};
