import * as path from 'path';

export function getDefaultPluginPath(name: string): string {
  return path.resolve(__dirname, '../../plugins', name);
}
