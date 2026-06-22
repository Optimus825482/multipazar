// Capafy explore sayfasından toplam agent sayısını + kategori dağılımını çıkar
// SSR data'sını HTML içinden bulmaya çalış
const https = require('https');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: data }));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('timeout')));
  });
}

(async () => {
  console.log('=== 1) Capafy explore sayfası ===');
  const explore = await fetch('https://capafy.ai/explore', {
    headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0', 'Accept': 'text/html' }
  });
  console.log('STATUS:', explore.status, '| size:', explore.text.length);

  // SSR data
  const ssrMatches = explore.text.match(/window\.__[A-Z_]+\s*=\s*\{/g) || [];
  console.log('SSR data holders found:', ssrMatches.length, ssrMatches.slice(0, 5));

  // Sayfadaki başlıklar (agent isimleri)
  const titles = [...explore.text.matchAll(/"title":"([^"]{5,80})"/g)].map(m => m[1]).slice(0, 30);
  console.log('Sample titles found in HTML:', titles);

  // categoryId geçen yerler
  const catIds = [...new Set([...explore.text.matchAll(/"categoryId":(\d+)/g)].map(m => +m[1]))];
  console.log('Unique categoryIds on /explore:', catIds.length, 'IDs:', catIds);

  // Statik kategori mapping
  const categoryMap = {
    1: 'Writing & Content',
    2: 'Marketing',
    3: 'Education',
    4: 'Programming',
    5: 'Design',
    18: 'AI Prompts',
    19: 'Legal',
    26: 'Compliance',
    27: 'Productivity',
  };
  console.log('\n=== 2) Kategori başına agent sayısı (search API farklı sorgularla) ===');
  const queries = ['AI', 'a', 'AI writing', 'prompt', 'chatbot', 'image', 'video', 'audio'];
  for (const q of queries) {
    try {
      const r = await fetch('https://api.capafy.ai/agent/agents/search?pageSize=50&page=1', {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      // Node https post
      const { request } = require('https');
      const postData = JSON.stringify({ query: q });
      const data = await new Promise((resolve, reject) => {
        const req = request({
          hostname: 'api.capafy.ai',
          path: '/agent/agents/search?pageSize=50&page=1',
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        }, (res) => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => resolve(body));
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
      });
      const j = JSON.parse(data);
      const items = j.data?.list || [];
      const catDist = {};
      items.forEach(it => { catDist[it.categoryId] = (catDist[it.categoryId] || 0) + 1; });
      console.log('  query="' + q + '" -> count=' + items.length + ' | categories:', Object.entries(catDist).map(([k,v]) => `${k}(${categoryMap[k]||'?'}):${v}`).join(', '));
    } catch (e) {
      console.log('  query="' + q + '" HATA:', e.message);
    }
  }
})();
