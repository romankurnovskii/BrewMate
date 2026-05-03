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
        let stream: NodeJS.ReadableStream = res;
        const encoding = res.headers?.['content-encoding'];

        if (encoding === 'gzip') {
          stream = res.pipe(zlib.createGunzip());
        } else if (encoding === 'deflate') {
          stream = res.pipe(zlib.createInflate());
        } else if (encoding === 'br') {
          stream = res.pipe(zlib.createBrotliDecompress());
        }

        // Must handle stream errors (e.g., zlib errors)
        stream.on('error', reject);
        // Also ensure network aborts don't crash
        res.on('error', reject);

        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
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
