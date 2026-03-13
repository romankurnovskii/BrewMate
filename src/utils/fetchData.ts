import https from 'https';
import zlib from 'zlib';

export function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          // ⚡ Bolt: Request compressed responses (gzip/deflate/brotli)
          // 💡 What: Tell the server we accept compressed responses
          // 🎯 Why: Homebrew JSON APIs are ~28MB uncompressed. Compression reduces payload to ~4.5MB.
          // 📊 Impact: Significantly faster network transfer and lower memory footprint.
          headers: {
            'Accept-Encoding': 'gzip, deflate, br',
          },
        },
        (res) => {
          let stream: NodeJS.ReadableStream = res;

          // ⚡ Bolt: Dynamically decompress the response based on the server's encoding
          const encoding = res.headers['content-encoding'];
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
