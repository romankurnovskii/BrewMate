import https from 'https';
import { fetchJSON } from '../fetchData';
import { PassThrough } from 'stream';

// Mock https module
jest.mock('https');

describe('fetchData utilities', () => {
  const mockHttps = https as jest.Mocked<typeof https>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchJSON', () => {
    it('should fetch and parse JSON successfully', (done) => {
      const mockData = { key: 'value', number: 123 };

      const mockResponse = new PassThrough() as any;
      mockResponse.headers = {};

      (mockHttps.get as jest.Mock).mockImplementation((url, options, callback) => {
        // Handle (url, callback) vs (url, options, callback)
        const cb = callback || options;
        if (typeof cb === 'function') {
          setTimeout(() => {
            cb(mockResponse);
            mockResponse.emit('data', Buffer.from(JSON.stringify(mockData)));
            mockResponse.emit('end');
          }, 0);
        }
        return { on: jest.fn() };
      });

      fetchJSON('https://example.com/api')
        .then((result) => {
          expect(result).toEqual(mockData);
          expect(mockHttps.get).toHaveBeenCalledWith(
            'https://example.com/api',
            expect.objectContaining({
              headers: expect.objectContaining({
                'Accept-Encoding': 'gzip, deflate, br',
              }),
            }),
            expect.any(Function)
          );
          done();
        })
        .catch(done);
    });

    it('should handle multiple data chunks', (done) => {
      const mockData = { large: 'data', array: [1, 2, 3] };
      const jsonString = JSON.stringify(mockData);
      const chunks = [jsonString.substring(0, 10), jsonString.substring(10)];

      const mockResponse = new PassThrough() as any;
      mockResponse.headers = {};

      (mockHttps.get as jest.Mock).mockImplementation((url, options, callback) => {
        const cb = callback || options;
        if (typeof cb === 'function') {
          setTimeout(() => {
            cb(mockResponse);
            chunks.forEach((chunk) => {
              mockResponse.emit('data', Buffer.from(chunk));
            });
            mockResponse.emit('end');
          }, 0);
        }
        return { on: jest.fn() };
      });

      fetchJSON('https://example.com/api')
        .then((result) => {
          expect(result).toEqual(mockData);
          done();
        })
        .catch(done);
    });

    it('should reject on invalid JSON', (done) => {
      const mockResponse = new PassThrough() as any;
      mockResponse.headers = {};

      (mockHttps.get as jest.Mock).mockImplementation((url, options, callback) => {
        const cb = callback || options;
        if (typeof cb === 'function') {
          setTimeout(() => {
            cb(mockResponse);
            mockResponse.emit('data', Buffer.from('invalid json'));
            mockResponse.emit('end');
          }, 0);
        }
        return { on: jest.fn() };
      });

      fetchJSON('https://example.com/api')
        .then(() => {
          done(new Error('Should have rejected'));
        })
        .catch((error) => {
          expect(error).toBeInstanceOf(Error);
          done();
        });
    });

    it('should reject on network error', (done) => {
      const mockError = new Error('Network error');

      const mockRequest: any = {
        on: jest.fn((event: string, callback: (error?: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => callback(mockError), 0);
          }
          return mockRequest;
        }),
      };

      (mockHttps.get as jest.Mock).mockReturnValue(mockRequest);

      fetchJSON('https://example.com/api')
        .then(() => {
          done(new Error('Should have rejected'));
        })
        .catch((error) => {
          expect(error).toBe(mockError);
          done();
        });
    });

    it('should handle empty response', (done) => {
      const mockResponse = new PassThrough() as any;
      mockResponse.headers = {};

      (mockHttps.get as jest.Mock).mockImplementation((url, options, callback) => {
        const cb = callback || options;
        if (typeof cb === 'function') {
          setTimeout(() => {
            cb(mockResponse);
            mockResponse.emit('data', Buffer.from(''));
            mockResponse.emit('end');
          }, 0);
        }
        return { on: jest.fn() };
      });

      fetchJSON('https://example.com/api')
        .then(() => {
          done(new Error('Should have rejected'));
        })
        .catch((error) => {
          expect(error).toBeInstanceOf(Error);
          done();
        });
    });

    it('should handle large JSON responses', (done) => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
        })),
      };

      const mockResponse = new PassThrough() as any;
      mockResponse.headers = {};

      (mockHttps.get as jest.Mock).mockImplementation((url, options, callback) => {
        const cb = callback || options;
        if (typeof cb === 'function') {
          setTimeout(() => {
            cb(mockResponse);
            mockResponse.emit('data', Buffer.from(JSON.stringify(largeData)));
            mockResponse.emit('end');
          }, 0);
        }
        return { on: jest.fn() };
      });

      fetchJSON('https://example.com/api')
        .then((result) => {
          expect(result).toEqual(largeData);
          expect((result as any).items).toHaveLength(1000);
          done();
        })
        .catch(done);
    });

    it('should handle different URL formats', (done) => {
      const mockData = { test: 'data' };
      const testUrls = [
        'https://api.example.com/v1/data',
        'https://example.com/data.json',
        'https://subdomain.example.com/path/to/data',
      ];

      (mockHttps.get as jest.Mock).mockImplementation((url, options, callback) => {
        const cb = callback || options;
        const mockResponse = new PassThrough() as any;
        mockResponse.headers = {};

        if (typeof cb === 'function') {
          setTimeout(() => {
            cb(mockResponse);
            mockResponse.emit('data', Buffer.from(JSON.stringify(mockData)));
            mockResponse.emit('end');
          }, 0);
        }
        return { on: jest.fn() };
      });

      Promise.all(testUrls.map((url) => fetchJSON(url)))
        .then((results) => {
          results.forEach((result) => {
            expect(result).toEqual(mockData);
          });
          expect(mockHttps.get).toHaveBeenCalledTimes(testUrls.length);
          done();
        })
        .catch(done);
    });
  });
});
