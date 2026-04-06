import https from 'https';
import { fetchJSON } from '../fetchData';

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
      const mockResponse: any = {
        on: jest.fn((event: string, callback: (data?: any) => void) => {
          if (event === 'data') {
            callback(Buffer.from(JSON.stringify(mockData)));
          } else if (event === 'end') {
            callback();
          }
          return mockResponse;
        }),
      };

      (mockHttps.get as jest.Mock).mockImplementation((url, callback) => {
        if (callback) {
          setTimeout(() => callback(mockResponse), 0);
        }
        return mockResponse;
      });

      fetchJSON('https://example.com/api')
        .then((result) => {
          expect(result).toEqual(mockData);
          expect(mockHttps.get).toHaveBeenCalledWith(
            'https://example.com/api',
            expect.any(Function),
          );
          done();
        })
        .catch(done);
    });

    it('should handle multiple data chunks', (done) => {
      const mockData = { large: 'data', array: [1, 2, 3] };
      const jsonString = JSON.stringify(mockData);
      const chunks = [jsonString.substring(0, 10), jsonString.substring(10)];

      let dataCallbacks: Array<(data: Buffer) => void> = [];
      let endCallback: (() => void) | null = null;

      const mockResponse: any = {
        on: jest.fn((event: string, callback: (data?: any) => void) => {
          if (event === 'data') {
            dataCallbacks.push(callback);
            // Simulate multiple chunks synchronously for test
            setTimeout(() => {
              chunks.forEach((chunk) => {
                callback(Buffer.from(chunk));
              });
              // Call end after all data chunks
              if (endCallback) {
                setTimeout(endCallback, 0);
              }
            }, 0);
          } else if (event === 'end') {
            endCallback = callback;
          }
          return mockResponse;
        }),
      };

      (mockHttps.get as jest.Mock).mockImplementation((url, callback) => {
        if (callback) {
          setTimeout(() => callback(mockResponse), 0);
        }
        return mockResponse;
      });

      fetchJSON('https://example.com/api')
        .then((result) => {
          expect(result).toEqual(mockData);
          done();
        })
        .catch(done);
    }, 10000); // Increase timeout for this test

    it('should reject on invalid JSON', (done) => {
      const mockResponse: any = {
        on: jest.fn((event: string, callback: (data?: any) => void) => {
          if (event === 'data') {
            callback(Buffer.from('invalid json'));
          } else if (event === 'end') {
            callback();
          }
          return mockResponse;
        }),
      };

      (mockHttps.get as jest.Mock).mockImplementation((url, callback) => {
        if (callback) {
          setTimeout(() => callback(mockResponse), 0);
        }
        return mockResponse;
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
      const mockResponse: any = {
        on: jest.fn((event: string, callback: (data?: any) => void) => {
          if (event === 'data') {
            callback(Buffer.from(''));
          } else if (event === 'end') {
            callback();
          }
          return mockResponse;
        }),
      };

      (mockHttps.get as jest.Mock).mockImplementation((url, callback) => {
        if (callback) {
          setTimeout(() => callback(mockResponse), 0);
        }
        return mockResponse;
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
      const mockResponse: any = {
        on: jest.fn((event: string, callback: (data?: any) => void) => {
          if (event === 'data') {
            // Call data callback synchronously
            callback(Buffer.from(JSON.stringify(largeData)));
            // Then call end callback
            setTimeout(() => {
              const endCallback = (
                mockResponse.on as jest.Mock
              ).mock.calls.find((call: any[]) => call[0] === 'end')?.[1];
              if (endCallback) {
                endCallback();
              }
            }, 0);
          } else if (event === 'end') {
            // Store end callback for later
          }
          return mockResponse;
        }),
      };

      (mockHttps.get as jest.Mock).mockImplementation((url, callback) => {
        if (callback) {
          setTimeout(() => callback(mockResponse), 0);
        }
        return mockResponse;
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

      // Create a mock response factory
      const createMockResponse = () => {
        const mockResponse: any = {
          on: jest.fn((event: string, callback: (data?: any) => void) => {
            if (event === 'data') {
              // Call data callback synchronously
              callback(Buffer.from(JSON.stringify(mockData)));
            } else if (event === 'end') {
              // Call end callback synchronously after data
              setTimeout(callback, 0);
            }
            return mockResponse;
          }),
        };
        return mockResponse;
      };

      const testUrls = [
        'https://api.example.com/v1/data',
        'https://example.com/data.json',
        'https://subdomain.example.com/path/to/data',
      ];

      // Mock get to return a new response for each call
      (mockHttps.get as jest.Mock).mockImplementation((url, callback) => {
        const mockResponse = createMockResponse();
        // Call the callback immediately with the mock response
        if (callback) {
          setTimeout(() => callback(mockResponse), 0);
        }
        return mockResponse;
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
    }, 10000); // Increase timeout for this test
  });
});
