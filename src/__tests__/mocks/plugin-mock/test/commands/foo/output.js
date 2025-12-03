'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.FOO_TEST_TEMPLATE = exports.FooTestOutputSchema = void 0;
const zod_1 = require('zod');
exports.FooTestOutputSchema = zod_1.z.object({
  bar: zod_1.z.string().trim(),
});
exports.FOO_TEST_TEMPLATE = `
📝 FOO TEST Plugin
`.trim();
//# sourceMappingURL=output.js.map
