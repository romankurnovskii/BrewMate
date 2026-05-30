import * as path from 'path';
import * as os from 'os';
import { loadFromCache, saveToCache, getCachePath } from '../cache';
import { App } from '../../types';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
}));

describe('cache utilities', () => {
  const mockReadFile = fs.promises.readFile as jest.MockedFunction<
    typeof fs.promises.readFile
  >;
  const mockWriteFile = fs.promises.writeFile as jest.MockedFunction<
    typeof fs.promises.writeFile
  >;
  const mockMkdir = fs.promises.mkdir as jest.MockedFunction<typeof fs.promises.mkdir>;

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
  });

  describe('getCachePath', () => {
    it('should return the correct cache file path', () => {
      const cachePath = getCachePath();
      expect(cachePath).toBe(cacheFile);
    });
  });

  describe('saveToCache', () => {
    it('should create cache directory', async () => {
      await saveToCache(mockApps);

      expect(mockMkdir).toHaveBeenCalledWith(cacheDir, {
        recursive: true,
      });
    });

    it('should write apps to cache file with timestamp', async () => {
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890);

      await saveToCache(mockApps);

      expect(mockWriteFile).toHaveBeenCalledWith(
        cacheFile,
        JSON.stringify({
          timestamp: 1234567890,
          apps: mockApps,
        }),
        'utf8'
      );

      mockDateNow.mockRestore();
    });

    it('should handle empty apps array', async () => {
      await saveToCache([]);

      expect(mockWriteFile).toHaveBeenCalledWith(
        cacheFile,
        expect.stringContaining('"apps":[]'),
        'utf8'
      );
    });
  });

  describe('loadFromCache', () => {
    it('should return null if cache file read fails', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));

      const result = await loadFromCache();

      expect(result).toBeNull();
    });

    it('should return apps if cache is valid and not expired', async () => {
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
      const cacheData = {
        timestamp: 1234567890 - 1000, // 1 second ago (within 24h)
        apps: mockApps,
      };

      mockReadFile.mockResolvedValue(JSON.stringify(cacheData));

      const result = await loadFromCache();

      expect(result).toEqual(mockApps);
      expect(mockReadFile).toHaveBeenCalledWith(cacheFile, 'utf8');

      mockDateNow.mockRestore();
    });

    it('should return null if cache is expired', async () => {
      const twentyFiveHours = 25 * 60 * 60 * 1000;
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
      const cacheData = {
        timestamp: 1234567890 - twentyFiveHours, // 25 hours ago (expired)
        apps: mockApps,
      };

      mockReadFile.mockResolvedValue(JSON.stringify(cacheData));

      const result = await loadFromCache();

      expect(result).toBeNull();

      mockDateNow.mockRestore();
    });

    it('should return null if cache file is corrupted (invalid JSON)', async () => {
      mockReadFile.mockResolvedValue('invalid json');

      const result = await loadFromCache();

      expect(result).toBeNull();
    });

    it('should return null if cache file has wrong structure', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ wrong: 'structure' }));

      const result = await loadFromCache();

      expect(result).toBeNull();
    });

    it('should handle file read errors gracefully', async () => {
      mockReadFile.mockRejectedValue(new Error('File read error'));

      const result = await loadFromCache();

      expect(result).toBeNull();
    });
  });

  describe('cache integration', () => {
    it('should save and load cache correctly', async () => {
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
      let savedContent = '';

      mockWriteFile.mockImplementation((file, content) => {
        savedContent = content as string;
        return Promise.resolve();
      });

      // After save, when loadFromCache is called, it should read the saved content
      mockReadFile.mockImplementation(() => {
        return Promise.resolve(savedContent);
      });

      await saveToCache(mockApps);
      const loaded = await loadFromCache();

      expect(loaded).toEqual(mockApps);
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockReadFile).toHaveBeenCalledWith(cacheFile, 'utf8');

      mockDateNow.mockRestore();
    });
  });
});
