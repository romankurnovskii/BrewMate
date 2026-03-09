import https from 'https';
import zlib from 'zlib';

export function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // ⚡ Bolt: Request compressed responses to reduce network payload
    // (Homebrew JSON APIs can be 30MB+ uncompressed, down to ~4.6MB with brotli)
    const options = {
      headers: { 'Accept-Encoding': 'gzip, deflate, br' },
    };

    https
      .get(url, options, (res) => {
        let stream: NodeJS.ReadableStream = res;

        // Handle decompression based on the content-encoding header
        const encoding = res.headers['content-encoding'];
        if (encoding === 'br') {
          stream = res.pipe(zlib.createBrotliDecompress());
        } else if (encoding === 'gzip') {
          stream = res.pipe(zlib.createGunzip());
        } else if (encoding === 'deflate') {
          stream = res.pipe(zlib.createInflate());
        }

        let data = '';
        // Explicitly set encoding to ensure we receive strings, not buffers
        stream.setEncoding('utf8');

        stream.on('data', (chunk) => {
          data += chunk;
        });

        stream.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });

        // Pass any stream errors to the reject handler
        stream.on('error', reject);
      })
      .on('error', reject);
  });
}
