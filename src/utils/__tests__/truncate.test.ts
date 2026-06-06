/**
 * Standalone test for version truncation logic used in renderer.ts
 */

function truncateVersion(version: string, maxLength: number = 15): string {
  if (!version || version.length <= maxLength) {
    return version;
  }
  // Keep the beginning and end, truncate the middle
  const halfLength = Math.floor(maxLength / 2);
  return version.substring(0, halfLength) + '...' + version.substring(version.length - halfLength);
}

describe('truncateVersion', () => {
  it('should not truncate short versions', () => {
    expect(truncateVersion('1.0.0')).toBe('1.0.0');
    expect(truncateVersion('1.2.3-beta')).toBe('1.2.3-beta');
  });

  it('should truncate long versions', () => {
    const longVersion = '1.2.3-alpha.20240524.abcdef1234567890';
    const truncated = truncateVersion(longVersion, 15);
    expect(truncated.length).toBeLessThanOrEqual(18); // 15 chars + '...' which is 3 chars = 18? 
    // Wait, the logic is: halfLength (7) + '...' (3) + halfLength (7) = 17 chars.
    expect(truncated).toBe('1.2.3-a...4567890');
    expect(truncated.length).toBe(17);
  });

  it('should handle boundary lengths', () => {
    expect(truncateVersion('123456789012345', 15)).toBe('123456789012345');
    expect(truncateVersion('1234567890123456', 15)).toBe('1234567...0123456');
  });

  it('should handle empty or null input', () => {
    expect(truncateVersion('')).toBe('');
    expect(truncateVersion(null as any)).toBe(null);
  });
});
