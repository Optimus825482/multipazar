// Capafy OpenAPI şema analizi — gerçek veri yapısı
const fs = require('fs');
const spec = JSON.parse(fs.readFileSync('D:/MULPAZ/scripts/__capafy_openapi.json', 'utf8'));

console.log('Title:', spec.info.title, 'v' + spec.info.version);
console.log('Total paths:', Object.keys(spec.paths).length);

function resolveRef(obj, root) {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj['$ref']) {
    const path = obj['$ref'].replace('#/components/schemas/', '').split('/');
    let cur = root;
    for (const p of path) cur = cur && cur[p];
    return resolveRef(cur, root);
  }
  if (Array.isArray(obj)) return obj.map(o => resolveRef(o, root));
  const out = {};
  for (const k of Object.keys(obj)) out[k] = resolveRef(obj[k], root);
  return out;
}

function fmtType(v) {
  if (!v) return 'unknown';
  if (v.type === 'array') return 'array<' + fmtType(v.items) + '>';
  if (v.type) return v.type;
  if (v.anyOf) return v.anyOf.map(x => fmtType(x)).join(' | ');
  if (v.$ref) return v.$ref.split('/').pop();
  return 'object';
}

const search = spec.paths['/agent/agents/search'].post;
console.log('\n=== /agent/agents/search parameters ===');
for (const p of (search.parameters || [])) {
  console.log('  ' + p.name + ' (in=' + p.in + ', required=' + !!p.required + ', type=' + fmtType(p.schema) + ')');
}

console.log('\n=== Request body schema ===');
if (search.requestBody) {
  const reqSchema = resolveRef(search.requestBody.content['application/json'].schema, spec);
  for (const [k, v] of Object.entries(reqSchema.properties || {})) {
    console.log('  ' + k + ': ' + fmtType(v));
  }
  console.log('Required:', reqSchema.required);
}

console.log('\n=== Response 200 schema ===');
const respSchema = resolveRef(search.responses['200'].content['application/json'].schema, spec);
for (const [k, v] of Object.entries(respSchema.properties || {})) {
  console.log('  ' + k + ': ' + fmtType(v));
}
console.log('Required:', respSchema.required);

if (respSchema.properties && respSchema.properties.data) {
  console.log('\n=== data field ===');
  const dataSchema = resolveRef(respSchema.properties.data, spec);
  for (const [k, v] of Object.entries(dataSchema.properties || {})) {
    console.log('  ' + k + ': ' + fmtType(v));
  }
  console.log('Required:', dataSchema.required);

  if (dataSchema.properties && dataSchema.properties.list) {
    console.log('\n=== list item schema ===');
    const listSchema = resolveRef(dataSchema.properties.list.items, spec);
    for (const [k, v] of Object.entries(listSchema.properties || {})) {
      console.log('  ' + k + ': ' + fmtType(v));
    }
    console.log('Required:', listSchema.required);
  }
}

console.log('\n=== Category/explore related endpoints ===');
const catPaths = Object.keys(spec.paths).filter(p => /categor|explore|tag/i.test(p));
catPaths.forEach(p => console.log('  ' + p + ' [' + Object.keys(spec.paths[p]).join(',') + ']'));

// Toplam kaç path var ve search dışında veri çekmeye yarar hangisi?
console.log('\n=== Tüm path\'ler ===');
Object.keys(spec.paths).forEach(p => console.log('  ' + p));
