'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.testPluginManifest = void 0;
const foo_1 = require('./commands/foo');
const handler_1 = require('./commands/foo/handler');
exports.testPluginManifest = {
  name: 'test',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'For integration plugin',
  compatibility: {
    cli: '^1.0.0',
    core: '^1.0.0',
    api: '^1.0.0',
  },
  capabilities: ['test:read'],
  commands: [
    {
      name: 'foo',
      summary: 'Foo Test',
      description:
        'Does nothing, integration test only for plugin registration',
      options: [],
      handler: handler_1.fooTestOptions,
      output: {
        schema: foo_1.FooTestOutputSchema,
        humanTemplate: foo_1.FOO_TEST_TEMPLATE,
      },
    },
  ],
  stateSchemas: [],
  init: () => {
    console.log('[TEST PLUGIN] Initializing foo plugin...');
  },
  teardown: () => {
    console.log('[TEST PLUGIN] Tearing down foo plugin...');
  },
};
exports.default = exports.testPluginManifest;
//# sourceMappingURL=manifest.js.map
