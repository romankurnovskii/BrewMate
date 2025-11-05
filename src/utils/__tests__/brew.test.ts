import { getInstalledApps } from '../brew';
import { getEnvWithBrewPath } from '../path';
import { exec } from 'child_process';
import { promisify } from 'util';

// Mock child_process module
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('../path');

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
    it('should return installed casks and formulas', async () => {
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
        ]),
      );

      expect(mockExecAsync).toHaveBeenCalledWith(
        'brew list --casks',
        expect.objectContaining({ env: expect.any(Object) }),
      );
      expect(mockExecAsync).toHaveBeenCalledWith(
        'brew list --formula',
        expect.objectContaining({ env: expect.any(Object) }),
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
        expect.objectContaining({ env: mockEnv }),
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
        ]),
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
        ]),
      );
    });
  });
});
