'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.fooTestOptions = fooTestOptions;
const constants_1 = require('../../../../../../../dist/core/shared/constants');
const errors_1 = require('../../../../../../../dist/core/utils/errors');
async function fooTestOptions(args) {
  const { logger } = args;
  try {
    logger.info('Test Foo');
    const output = {
      bar: 'Foo',
    };
    return {
      status: constants_1.Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error) {
    return {
      status: constants_1.Status.Failure,
      errorMessage: (0, errors_1.formatError)(
        'Failed to list configuration options',
        error,
      ),
    };
  }
}
//# sourceMappingURL=handler.js.map
