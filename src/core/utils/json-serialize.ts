// Make this file a module so we can use 'declare global' to augment global types.
// Without this export, TypeScript treats it as a script and global augmentations fail.
export {};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function () {
  return String(this);
};
