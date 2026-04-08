import https from 'https';
import zlib from 'zlib';

export function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'Accept-Encoding': 'gzip, deflate, br',
          },
        },
        (res) => {
          let stream: NodeJS.ReadableStream = res;

          // ⚡ Bolt: Handle compression to minimize network transfer time and memory pressure.
          // The Homebrew JSON APIs are extremely large (up to 30MB+ uncompressed).
          const encoding = res.headers['content-encoding'];
          if (encoding === 'gzip') {
            stream = res.pipe(zlib.createGunzip());
          } else if (encoding === 'br') {
            stream = res.pipe(zlib.createBrotliDecompress());
          } else if (encoding === 'deflate') {
            stream = res.pipe(zlib.createInflate());
          }

          let data = '';
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

          stream.on('error', reject);
        }
      )
      .on('error', reject);
  });
}
