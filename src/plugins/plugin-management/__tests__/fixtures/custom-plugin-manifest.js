/**
 * Mock manifest for custom plugin (used in tests)
 * When using dynamic import() on CommonJS modules, the entire module.exports
 * becomes the 'default' export. So this structure ensures manifest.default
 * contains the actual plugin manifest data.
 */
module.exports = {
  name: 'custom-plugin',
};
