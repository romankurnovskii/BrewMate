import { getInstalledApps, getOutdatedApps, getCacheSize } from '../brew';
import { getEnvWithBrewPath } from '../path';
import { exec } from 'child_process';
import { promisify } from 'util';

// Mock child_process module
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('../path');

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn().mockResolvedValue([]),
    stat: jest.fn().mockResolvedValue({ size: 0, isDirectory: () => false, isFile: () => true }),
  },
}));

// Mock util.promisify to return our mock function
// Use a global variable to avoid hoisting issues
jest.mock('util', () => {
  const actual = jest.requireActual('util');
  // Create the mock function inside the factory
  const mockFn = jest.fn();
  // Store it globally so we can access it in tests
  (global as any).__mockExecAsync = mockFn;
  return {
    ...actual,
    promisify: jest.fn(() => mockFn),
  };
});

// Access the mock function from the global store
// The factory sets this during hoisting, so it should be available
const mockExecAsync: jest.Mock = (global as any).__mockExecAsync || jest.fn();

describe('brew utilities', () => {
  const mockGetEnvWithBrewPath = getEnvWithBrewPath as jest.MockedFunction<
    typeof getEnvWithBrewPath
  >;

  beforeEach(() => {
    // Reset the mock to clear any chained return values from previous tests
    mockExecAsync.mockReset();
    jest.clearAllMocks();
    mockGetEnvWithBrewPath.mockReturnValue({
      ...process.env,
      PATH: '/opt/homebrew/bin:/usr/local/bin',
    });
  });

  describe('getInstalledApps', () => {
    it('should return installed casks and formulas (newline-separated)', async () => {
      mockExecAsync
        .mockResolvedValueOnce({
          stdout: 'cask1\ncask2\ncask3',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: 'formula1\nformula2',
          stderr: '',
        });

      const result = await getInstalledApps();

      expect(result).toHaveLength(5);
      expect(result).toEqual(
        expect.arrayContaining([
          { name: 'cask1', type: 'cask' },
          { name: 'cask2', type: 'cask' },
          { name: 'cask3', type: 'cask' },
          { name: 'formula1', type: 'formula' },
          { name: 'formula2', type: 'formula' },
        ])
      );
    });

    it('should return installed casks and formulas (space-separated)', async () => {
      mockExecAsync
        .mockResolvedValueOnce({
          stdout: 'cask1 cask2 cask3',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: 'formula1 formula2',
          stderr: '',
        });

      const result = await getInstalledApps();

      expect(result).toHaveLength(5);
      expect(result).toEqual(
        expect.arrayContaining([
          { name: 'cask1', type: 'cask' },
          { name: 'cask2', type: 'cask' },
          { name: 'cask3', type: 'cask' },
          { name: 'formula1', type: 'formula' },
          { name: 'formula2', type: 'formula' },
        ])
      );
    });

    it('should return installed casks and formulas (mixed whitespace)', async () => {
      mockExecAsync
        .mockResolvedValueOnce({
          stdout: 'cask1  cask2\tcask3',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: 'formula1\tformula2',
          stderr: '',
        });

      const result = await getInstalledApps();

      expect(result).toHaveLength(5);
      expect(result).toEqual(
        expect.arrayContaining([
          { name: 'cask1', type: 'cask' },
          { name: 'cask2', type: 'cask' },
          { name: 'cask3', type: 'cask' },
          { name: 'formula1', type: 'formula' },
          { name: 'formula2', type: 'formula' },
        ])
      );
    });

    it('should use getEnvWithBrewPath for environment', async () => {
      const mockEnv = {
        ...process.env,
        PATH: '/custom/path',
      };
      mockGetEnvWithBrewPath.mockReturnValue(mockEnv);
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockResolvedValueOnce({ stdout: '', stderr: '' });

      await getInstalledApps();

      expect(mockGetEnvWithBrewPath).toHaveBeenCalled();
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ env: mockEnv })
      );
    });

    it('should handle empty installed apps', async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockResolvedValueOnce({ stdout: '', stderr: '' });

      const result = await getInstalledApps();

      expect(result).toEqual([]);
    });

    it('should handle whitespace and empty lines in output', async () => {
      mockExecAsync
        .mockResolvedValueOnce({
          stdout: '  cask1  \n\ncask2\n  \n',
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: '\nformula1\n\n',
          stderr: '',
        });

      const result = await getInstalledApps();

      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([
          { name: 'cask1', type: 'cask' },
          { name: 'cask2', type: 'cask' },
          { name: 'formula1', type: 'formula' },
        ])
      );
    });

    it('should return empty array on error', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('brew command failed'));

      const result = await getInstalledApps();

      expect(result).toEqual([]);
    });

    it('should handle errors from brew list --formula', async () => {
      mockExecAsync
        .mockResolvedValueOnce({
          stdout: 'cask1',
          stderr: '',
        })
        .mockRejectedValueOnce(new Error('formula list failed'));

      const result = await getInstalledApps();

      expect(result).toEqual([]);
    });

    it('should handle errors from brew list --casks', async () => {
      mockExecAsync
        .mockRejectedValueOnce(new Error('cask list failed'))
        .mockResolvedValueOnce({
          stdout: 'formula1',
          stderr: '',
        });

      const result = await getInstalledApps();

      expect(result).toEqual([]);
    });

    it('should preserve app names exactly as returned by brew', async () => {
      mockExecAsync
        .mockResolvedValueOnce({
          stdout: 'app-with-dashes\napp_with_underscores\napp.with.dots',
          stderr: '',
        })
        .mockResolvedValueOnce({ stdout: '', stderr: '' });

      const result = await getInstalledApps();

      expect(result).toEqual(
        expect.arrayContaining([
          { name: 'app-with-dashes', type: 'cask' },
          { name: 'app_with_underscores', type: 'cask' },
          { name: 'app.with.dots', type: 'cask' },
        ])
      );
    });
  });

  describe('getCacheSize', () => {
    it('should calculate cache directory size recursively', async () => {
      const fs = require('fs');
      fs.promises.readdir
        .mockResolvedValueOnce([
          { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
          { name: 'subdir', isDirectory: () => true, isFile: () => false },
        ])
        .mockResolvedValueOnce([
          { name: 'file2.txt', isDirectory: () => false, isFile: () => true },
        ]);
      fs.promises.stat.mockResolvedValue({ size: 1024 });

      mockExecAsync.mockResolvedValueOnce({
        stdout: '/Users/r/Library/Caches/Homebrew',
        stderr: '',
      });

      const result = await getCacheSize();
      expect(result).toBe(2048); // 1024 * 2 files
    });

    it('should return 0 on error', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('brew failed'));
      const result = await getCacheSize();
      expect(result).toBe(0);
    });
  });

  describe('getOutdatedApps', () => {
    it('should parse outdated cask and formulas correctly', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          formulae: [
            {
              name: 'sqlite',
              installed_versions: ['3.43.0'],
              current_version: '3.44.0',
            },
          ],
          casks: [
            {
              name: 'google-chrome',
              installed_versions: ['119.0.6045.159'],
              current_version: '120.0.6099.71',
            },
          ],
        }),
        stderr: '',
      });

      const result = await getOutdatedApps();
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        {
          name: 'sqlite',
          type: 'formula',
          installedVersion: '3.43.0',
          latestVersion: '3.44.0',
        },
        {
          name: 'google-chrome',
          type: 'cask',
          installedVersion: '119.0.6045.159',
          latestVersion: '120.0.6099.71',
        },
      ]);
    });

    it('should return empty array on error', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('brew failed'));
      const result = await getOutdatedApps();
      expect(result).toEqual([]);
    });
  });
});
