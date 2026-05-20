export function hasTypedData(data: {
  domain?: unknown;
  types?: unknown;
  message?: unknown;
}): boolean {
  return (
    data.domain !== undefined ||
    data.types !== undefined ||
    data.message !== undefined
  );
}
