/**
 * Categorization Script
 * Fetches all Homebrew apps and assigns categories based on keywords in categories.json
 * Outputs a populated categories.json with casks/formulae mappings
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

const CATEGORIES_JSON_PATH = path.join(__dirname, '../src/assets/categories.json');
const HOMEBREW_CASKS_URL = 'https://formulae.brew.sh/api/cask.json';
const HOMEBREW_FORMULAS_URL = 'https://formulae.brew.sh/api/formula.json';

// Load existing categories.json
function loadCategories() {
  const content = fs.readFileSync(CATEGORIES_JSON_PATH, 'utf-8');
  return JSON.parse(content);
}

// Fetch JSON from URL with timeout and compression support
function fetchJSON(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: timeout,
    };

    const req = https.get(url, options, (res) => {
      let stream = res;

      // Handle decompression
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

      const chunks = [];
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
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    });
  });
}

// Categorize an app based on its name and description
function categorizeApp(app, categories) {
  const searchStr = `${app.name} ${app.desc || ''}`.toLowerCase();
  
  // Try keyword matching for each category (excluding 'other')
  for (const [catId, catData] of Object.entries(categories)) {
    if (catId === 'other') continue;
    if (catData.keywords && catData.keywords.some(kw => searchStr.includes(kw.toLowerCase()))) {
      return catId;
    }
  }
  
  return 'other';
}

async function main() {
  console.log('🔄 Loading existing categories...');
  const categoriesData = loadCategories();
  const categories = categoriesData.categories;
  
  console.log('📦 Fetching Homebrew casks...');
  const casks = await fetchJSON(HOMEBREW_CASKS_URL);
  console.log(`   Found ${casks.length} casks`);
  
  console.log('📦 Fetching Homebrew formulas...');
  const formulas = await fetchJSON(HOMEBREW_FORMULAS_URL);
  console.log(`   Found ${formulas.length} formulas`);
  
  console.log('🏷️  Categorizing casks...');
  const caskMappings = {};
  let caskCategoryCounts = {};
  
  for (const cask of casks) {
    const catId = categorizeApp(cask, categories);
    caskMappings[cask.token || cask.name] = catId;
    caskCategoryCounts[catId] = (caskCategoryCounts[catId] || 0) + 1;
  }
  
  console.log('🏷️  Categorizing formulas...');
  const formulaMappings = {};
  let formulaCategoryCounts = {};
  
  for (const formula of formulas) {
    const catId = categorizeApp(formula, categories);
    formulaMappings[formula.name] = catId;
    formulaCategoryCounts[catId] = (formulaCategoryCounts[catId] || 0) + 1;
  }
  
  // Combine counts
  const allCategoryCounts = {};
  for (const [cat, count] of Object.entries(caskCategoryCounts)) {
    allCategoryCounts[cat] = (allCategoryCounts[cat] || 0) + count;
  }
  for (const [cat, count] of Object.entries(formulaCategoryCounts)) {
    allCategoryCounts[cat] = (allCategoryCounts[cat] || 0) + count;
  }
  
  // Update categories.json
  categoriesData.casks = caskMappings;
  categoriesData.formulae = formulaMappings;
  
  // Write back
  fs.writeFileSync(CATEGORIES_JSON_PATH, JSON.stringify(categoriesData, null, 2));
  
  console.log('\n✅ Categorization complete!');
  console.log('\n📊 Category Distribution:');
  console.log('┌──────────────────────┬──────────┬──────────┬──────────┐');
  console.log('│ Category             │ Casks    │ Formulas │ Total    │');
  console.log('├──────────────────────┼──────────┼──────────┼──────────┤');
  
  const sortedCats = Object.entries(allCategoryCounts).sort((a, b) => b[1] - a[1]);
  for (const [catId, count] of sortedCats) {
    const label = categories[catId]?.label || catId;
    const caskCount = caskCategoryCounts[catId] || 0;
    const formulaCount = formulaCategoryCounts[catId] || 0;
    console.log(`│ ${label.padEnd(20)} │ ${String(caskCount).padStart(8)} │ ${String(formulaCount).padStart(8)} │ ${String(count).padStart(8)} │`);
  }
  
  console.log('└──────────────────────┴──────────┴──────────┴──────────┘');
  console.log(`\n📝 Updated ${CATEGORIES_JSON_PATH}`);
  console.log(`   Casks mapped: ${Object.keys(caskMappings).length}`);
  console.log(`   Formulas mapped: ${Object.keys(formulaMappings).length}`);
}

main().catch(console.error);