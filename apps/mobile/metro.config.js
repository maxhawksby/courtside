// demo/sdk54 branch only: the admin app hoists react 19.2 to the monorepo root,
// so every `react` import must be pinned to this app's copy or the renderer and
// components load two different Reacts (invalid-hook-call crash).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const reactDir = path.resolve(__dirname, 'node_modules/react');
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  let target = moduleName;
  if (moduleName === 'react') {
    target = reactDir;
  } else if (moduleName.startsWith('react/')) {
    target = path.join(reactDir, moduleName.slice('react/'.length));
  }
  const resolve = defaultResolveRequest ?? context.resolveRequest;
  return resolve(context, target, platform);
};

module.exports = config;
