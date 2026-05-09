import https from 'https';
import zlib from 'zlib';

export function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Optimization: Request compressed responses to significantly reduce download time and bandwidth
    const options = {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
      },
    };

    https
      .get(url, options, (res) => {
        let stream: import('stream').Readable = res;

        // Optimization: Handle decompression dynamically based on response headers
        const encoding = res.headers['content-encoding'];
        if (encoding === 'gzip') {
          stream = res.pipe(zlib.createGunzip());
        } else if (encoding === 'deflate') {
          stream = res.pipe(zlib.createInflate());
        } else if (encoding === 'br') {
          stream = res.pipe(zlib.createBrotliDecompress());
        }

        res.on('error', reject);
        stream.on('error', reject);

        // Optimization: Accumulate chunks in an array instead of using string concatenation (data += chunk).
        // This avoids O(N^2) time complexity and memory overhead, and safely handles multi-byte characters.
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        stream.on('end', () => {
          try {
            const data = Buffer.concat(chunks).toString('utf8');
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}
