/**
 * Utility functions for formatting strings and data
 */

/**
 * Truncates a version string to a maximum length, preserving the start and end.
 * Example: "1.2.3-alpha.20240524.abcdef1234567890" -> "1.2.3-...567890"
 *
 * @param version The version string to truncate
 * @param maxLength The maximum allowed length (default: 15)
 * @returns The truncated version string
 */
export function truncateVersion(
  version: string | null | undefined,
  maxLength: number = 15
): string {
  if (!version) {
    return '';
  }
  if (version.length <= maxLength) {
    return version;
  }
  if (maxLength <= 3) {
    return version.substring(0, maxLength);
  }
  const len = version.length;
  const available = maxLength - 3;
  // Optimization: Use bitwise right shift for faster integer division
  const rightLen = available >> 1;
  const leftLen = available - rightLen;
  return version.substring(0, leftLen) + '...' + version.substring(len - rightLen);
}
