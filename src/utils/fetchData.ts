import https from 'https';
import zlib from 'zlib';

export function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
      },
    };

    https
      .get(url, options, (res) => {
        let stream: import('stream').Readable = res;

        // Handle compressed responses
        const encoding = res.headers?.['content-encoding'];
        if (encoding === 'gzip') {
          stream = res.pipe(zlib.createGunzip());
        } else if (encoding === 'deflate') {
          stream = res.pipe(zlib.createInflate());
        } else if (encoding === 'br') {
          stream = res.pipe(zlib.createBrotliDecompress());
        }

        // Optimization: Collect Buffer chunks instead of string concatenation
        // Avoids O(n^2) complexity and memory overhead for large responses (like 30MB+ brew APIs)
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

        stream.on('error', reject);
      })
      .on('error', reject);
  });
}
