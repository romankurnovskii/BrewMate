/**
 * Test for version truncation logic
 */
import { truncateVersion } from '../format';

describe('truncateVersion', () => {
  it('should not truncate short versions', () => {
    expect(truncateVersion('1.0.0')).toBe('1.0.0');
    expect(truncateVersion('1.2.3-beta')).toBe('1.2.3-beta');
  });

  it('should truncate long versions to exactly maxLength', () => {
    const longVersion = '1.2.3-alpha.20240524.abcdef1234567890';
    const truncated = truncateVersion(longVersion, 15);
    expect(truncated).toBe('1.2.3-...567890');
    expect(truncated.length).toBe(15);
  });

  it('should handle boundary lengths', () => {
    expect(truncateVersion('123456789012345', 15)).toBe('123456789012345');
    expect(truncateVersion('1234567890123456', 15)).toBe('123456...123456');
    expect(truncateVersion('1234567890123456', 15).length).toBe(15);
  });

  it('should handle small maxLength', () => {
    expect(truncateVersion('1.2.3', 3)).toBe('1.2');
    expect(truncateVersion('1.2.3', 2)).toBe('1.');
  });

  it('should handle empty or null input', () => {
    expect(truncateVersion('')).toBe('');
    expect(truncateVersion(null as any)).toBe('');
    expect(truncateVersion(undefined as any)).toBe('');
  });
});
