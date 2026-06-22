// Capafy'den toplam agent sayısını + kategori dağılımını çıkar
// Farklı sorgularla union yaparak kapsamı tahmin et
const https = require('https');

function postJSON(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname, path, method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const queries = [
  'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z',
  'AI','ai','SEO','chat','image','video','audio','data','code','design','marketing','business',
  'writing','prompt','agent','bot','skill','tool','generator','automation','education','legal','finance',
  'health','productivity','assistant','research','social','translate','resume','logo','music','voice',
  'clone','studio','photo','art','copy','blog','email','sales','lead','seo','crypto','gaming',
  'fashion','food','travel','real estate','crypto','defi','trading','resume','interview','career',
  'data analytics','gpt','claude','midjourney','sora','runway','elevenlabs','langchain','n8n'
];

const seen = new Map(); // agentId -> {title, categoryId, salesVolume, rating, developerName}
const catDist = {};
const devDist = {};

(async () => {
  for (const q of queries) {
    try {
      const r = await postJSON('api.capafy.ai', '/agent/agents/search?pageSize=50&page=1', { query: q });
      if (r.status !== 200) continue;
      const j = JSON.parse(r.body);
      const list = j.data?.list || [];
      for (const a of list) {
        if (!seen.has(a.agentId)) {
          seen.set(a.agentId, {
            title: a.title,
            categoryId: a.categoryId,
            salesVolume: a.salesVolume,
            rating: a.rating,
            developerName: a.developerName,
            tags: a.tags,
          });
          catDist[a.categoryId] = (catDist[a.categoryId] || 0) + 1;
          devDist[a.developerName] = (devDist[a.developerName] || 0) + 1;
        }
      }
    } catch (e) {
      // skip
    }
  }

  console.log('=== TOPLAM KEŞFEDİLEN BENZERSİZ AGENT ===');
  console.log('Unique agents:', seen.size);

  console.log('\n=== KATEGORİ DAĞILIMI ===');
  const sorted = Object.entries(catDist).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([k, v]) => console.log('  categoryId=' + k + ': ' + v + ' agent'));

  console.log('\n=== EN AKTİF DEVELOPER\'LAR ===');
  Object.entries(devDist).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .forEach(([k, v]) => console.log('  ' + k + ': ' + v + ' agent'));

  console.log('\n=== GERÇEK SCRAPER\'IN 12 KATEGORİSİ vs CAPAFY GERÇEK ===');
  // Scraper mapping
  const scraperCats = {
    'prompt-engineering': 'prompt engineering',
    'ai-chatbot-agent': 'AI chatbot agent assistant',
    'ai-video-generation': 'AI video generation',
    'ai-image-generation': 'AI image generation',
    'ai-audio-voice': 'AI voice audio speech',
    'ai-automation': 'AI automation workflow',
    'ai-development': 'AI development API',
    'ai-marketing': 'AI marketing content',
    'ai-data-analytics': 'AI data analytics',
    'ai-education': 'AI education learning',
    'ai-writing': 'AI writing copywriting',
    'ai-business': 'AI business productivity',
  };
  for (const [slug, q] of Object.entries(scraperCats)) {
    const r = await postJSON('api.capafy.ai', '/agent/agents/search?pageSize=50&page=1', { query: q });
    const j = JSON.parse(r.body);
    const list = j.data?.list || [];
    const cats = new Set(list.map(a => a.categoryId));
    console.log('  ' + slug + ' (query="' + q + '") -> ' + list.length + ' agent | capafy catIds: ' + [...cats].join(','));
  }
})();
