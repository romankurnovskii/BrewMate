import * as path from 'path';
import * as os from 'os';
import { loadFromCache, saveToCache, getCachePath } from '../cache';
import { App } from '../../types';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

describe('cache utilities', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockExistsSync = fs.existsSync as jest.MockedFunction<
    typeof fs.existsSync
  >;
  const mockReadFileSync = fs.readFileSync as jest.MockedFunction<
    typeof fs.readFileSync
  >;
  const mockWriteFileSync = fs.writeFileSync as jest.MockedFunction<
    typeof fs.writeFileSync
  >;
  const mockMkdirSync = fs.mkdirSync as jest.MockedFunction<
    typeof fs.mkdirSync
  >;

  const mockApps: App[] = [
    {
      name: 'test-app',
      description: 'Test app',
      homepage: 'https://example.com',
      version: '1.0.0',
      type: 'cask',
    },
    {
      name: 'another-app',
      description: 'Another test app',
      homepage: 'https://example2.com',
      version: '2.0.0',
      type: 'formula',
    },
  ];

  const cacheDir = path.join(os.homedir(), '.brewmate');
  const cacheFile = path.join(cacheDir, 'apps-cache.json');

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset existsSync to return false by default
    mockExistsSync.mockReturnValue(false);
  });

  describe('getCachePath', () => {
    it('should return the correct cache file path', () => {
      const cachePath = getCachePath();
      expect(cachePath).toBe(cacheFile);
    });
  });

  describe('saveToCache', () => {
    it('should create cache directory if it does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      saveToCache(mockApps);

      expect(mockExistsSync).toHaveBeenCalledWith(cacheDir);
      expect(mockMkdirSync).toHaveBeenCalledWith(cacheDir, {
        recursive: true,
      });
    });

    it('should not create cache directory if it already exists', () => {
      mockExistsSync.mockReturnValue(true);

      saveToCache(mockApps);

      expect(mockMkdirSync).not.toHaveBeenCalled();
    });

    it('should write apps to cache file with timestamp', () => {
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
      mockExistsSync.mockReturnValue(true);

      saveToCache(mockApps);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        cacheFile,
        JSON.stringify({
          timestamp: 1234567890,
          apps: mockApps,
        }),
        'utf8',
      );

      mockDateNow.mockRestore();
    });

    it('should handle empty apps array', () => {
      saveToCache([]);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        cacheFile,
        expect.stringContaining('"apps":[]'),
        'utf8',
      );
    });
  });

  describe('loadFromCache', () => {
    it('should return null if cache file does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = loadFromCache();

      expect(result).toBeNull();
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });

    it('should return apps if cache is valid and not expired', () => {
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
      const cacheData = {
        timestamp: 1234567890 - 1000, // 1 second ago (within 24h)
        apps: mockApps,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(cacheData));

      const result = loadFromCache();

      expect(result).toEqual(mockApps);
      expect(mockReadFileSync).toHaveBeenCalledWith(cacheFile, 'utf8');

      mockDateNow.mockRestore();
    });

    it('should return null if cache is expired', () => {
      const twentyFiveHours = 25 * 60 * 60 * 1000;
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
      const cacheData = {
        timestamp: 1234567890 - twentyFiveHours, // 25 hours ago (expired)
        apps: mockApps,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(cacheData));

      const result = loadFromCache();

      expect(result).toBeNull();

      mockDateNow.mockRestore();
    });

    it('should return null if cache file is corrupted (invalid JSON)', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('invalid json');

      const result = loadFromCache();

      expect(result).toBeNull();
    });

    it('should return null if cache file has wrong structure', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ wrong: 'structure' }));

      const result = loadFromCache();

      expect(result).toBeNull();
    });

    it('should handle file read errors gracefully', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = loadFromCache();

      expect(result).toBeNull();
    });
  });

  describe('cache integration', () => {
    it('should save and load cache correctly', () => {
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
      let savedContent = '';

      // First call: check if cache directory exists (false)
      // Second call: check if cache file exists when loading (true)
      mockExistsSync
        .mockReturnValueOnce(false) // Directory doesn't exist when saving
        .mockReturnValueOnce(true); // File exists when loading

      mockWriteFileSync.mockImplementation((file, content) => {
        savedContent = content as string;
      });

      // After save, when loadFromCache is called, it should read the saved content
      mockReadFileSync.mockImplementation(() => {
        return savedContent;
      });

      saveToCache(mockApps);
      const loaded = loadFromCache();

      expect(loaded).toEqual(mockApps);
      expect(mockWriteFileSync).toHaveBeenCalled();
      expect(mockReadFileSync).toHaveBeenCalledWith(cacheFile, 'utf8');

      mockDateNow.mockRestore();
    });
  });
});
