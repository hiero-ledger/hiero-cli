/**
 * Registers @/ path alias at runtime so require('@/core/...') resolves when
 * running the compiled CLI (dist/). Needed when path aliases in emitted JS
 * were not rewritten by tsc-alias (e.g. partial build or different env).
 */
import * as path from 'path';

// When this file lives in dist/core/utils/, dist root is two levels up
const distRoot = path.join(__dirname, '..', '..');

const Mod = require('module') as NodeModule & {
  _resolveFilename(
    request: string,
    parent: object,
    isMain: boolean,
    options?: object,
  ): string;
};
const origResolve = Mod._resolveFilename;

Mod._resolveFilename = function (
  request: string,
  parent: object,
  isMain: boolean,
  options?: object,
): string {
  if (request.startsWith('@/')) {
    const resolved = path.join(distRoot, request.slice(2));
    return origResolve.call(this, resolved, parent, isMain, options);
  }
  return origResolve.apply(this, [request, parent, isMain, options] as never);
};
