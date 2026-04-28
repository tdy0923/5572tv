/**
 * Parse a storage key in the format "source+id" safely.
 * Uses indexOf + slice instead of split('+') to correctly
 * handle IDs that may contain '+' characters.
 */
export function parseStorageKey(key: string): { source: string; id: string } {
  const separatorIndex = key.indexOf('+');
  if (separatorIndex === -1) {
    return { source: '', id: key };
  }
  return {
    source: key.slice(0, separatorIndex),
    id: key.slice(separatorIndex + 1),
  };
}
