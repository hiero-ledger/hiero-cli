/**
 * Mock manifest for topic plugin (used in tests)
 * When using dynamic import() on CommonJS modules, the entire module.exports
 * becomes the 'default' export. So this structure ensures manifest.default
 * contains the actual plugin manifest data.
 */
module.exports = {
  name: 'topic',
  version: '2.0.0',
  displayName: 'Topic Plugin',
  description: 'Manage Hedera topics',
  commands: [{ name: 'list' }, { name: 'create' }],
};
