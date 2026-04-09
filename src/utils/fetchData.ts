import https from 'https';
import zlib from 'zlib';

export function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // ⚡ Bolt: Adding Accept-Encoding to fetch compressed JSON to drastically
    // reduce network transfer times and memory pressure for large files like Homebrew APIs (~30MB+ uncompressed).
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

          const encoding = res.headers ? res.headers['content-encoding'] : undefined;
          if (encoding === 'gzip') {
            stream = res.pipe(zlib.createGunzip());
          } else if (encoding === 'deflate') {
            stream = res.pipe(zlib.createInflate());
          } else if (encoding === 'br') {
            stream = res.pipe(zlib.createBrotliDecompress());
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
