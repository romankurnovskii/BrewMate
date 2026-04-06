import { getEnvWithBrewPath } from '../path';

describe('path utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env for each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('getEnvWithBrewPath', () => {
    it('should add brew paths to empty PATH', () => {
      delete process.env.PATH;
      const env = getEnvWithBrewPath();

      expect(env.PATH).toBeDefined();
      const paths = env.PATH!.split(':');

      expect(paths).toContain('/opt/homebrew/bin');
      expect(paths).toContain('/usr/local/bin');
      expect(paths).toContain('/opt/homebrew/sbin');
      expect(paths).toContain('/usr/local/sbin');
      expect(paths).toContain('/home/linuxbrew/.linuxbrew/bin');
    });

    it('should prepend brew paths to existing PATH', () => {
      process.env.PATH = '/usr/bin:/bin';
      const env = getEnvWithBrewPath();

      const paths = env.PATH!.split(':');

      // Brew paths should be at the beginning (in reverse order of array due to unshift)
      // When we iterate in reverse and unshift, the last item in array becomes first in PATH
      expect(paths[0]).toBe('/opt/homebrew/bin');
      expect(paths[1]).toBe('/usr/local/bin');
      expect(paths[2]).toBe('/opt/homebrew/sbin');
      expect(paths[3]).toBe('/usr/local/sbin');
      expect(paths[4]).toBe('/home/linuxbrew/.linuxbrew/bin');

      // Original paths should still be present
      expect(paths).toContain('/usr/bin');
      expect(paths).toContain('/bin');
    });

    it('should not duplicate existing brew paths', () => {
      process.env.PATH = '/opt/homebrew/bin:/usr/local/bin:/usr/bin';
      const env = getEnvWithBrewPath();

      const paths = env.PATH!.split(':');
      const brewPathCount = paths.filter(
        (p) => p === '/opt/homebrew/bin' || p === '/usr/local/bin',
      ).length;

      // Each brew path should appear only once
      expect(brewPathCount).toBe(2);
    });

    it('should preserve all existing paths', () => {
      const originalPath = '/custom/path1:/custom/path2:/usr/bin';
      process.env.PATH = originalPath;
      const env = getEnvWithBrewPath();

      const paths = env.PATH!.split(':');

      expect(paths).toContain('/custom/path1');
      expect(paths).toContain('/custom/path2');
      expect(paths).toContain('/usr/bin');
    });

    it('should handle PATH with only one existing brew path', () => {
      process.env.PATH = '/opt/homebrew/bin';
      const env = getEnvWithBrewPath();

      const paths = env.PATH!.split(':');

      // Should add missing brew paths
      expect(paths).toContain('/usr/local/bin');
      expect(paths).toContain('/opt/homebrew/sbin');
      expect(paths).toContain('/usr/local/sbin');

      // Should keep existing one (no duplicate)
      const homebrewCount = paths.filter(
        (p) => p === '/opt/homebrew/bin',
      ).length;
      expect(homebrewCount).toBe(1);
    });

    it('should not modify original process.env', () => {
      const originalPath = process.env.PATH;
      getEnvWithBrewPath();

      expect(process.env.PATH).toBe(originalPath);
    });

    it('should return a new env object', () => {
      const env1 = getEnvWithBrewPath();
      const env2 = getEnvWithBrewPath();

      expect(env1).not.toBe(env2);
      expect(env1.PATH).toBe(env2.PATH);
    });

    it('should include all other environment variables', () => {
      process.env.CUSTOM_VAR = 'test-value';
      process.env.HOME = '/test/home';

      const env = getEnvWithBrewPath();

      expect(env.CUSTOM_VAR).toBe('test-value');
      expect(env.HOME).toBe('/test/home');
    });
  });
});
