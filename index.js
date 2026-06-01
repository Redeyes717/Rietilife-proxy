const https = require('https');
const http  = require('http');

const server = http.createServer((req, res) => {
  const qs   = req.url.split('?')[1] || '';
  const params = new URLSearchParams(qs);
  const path = params.get('path') || '/wp/v2/posts?per_page=12&_embed&orderby=date&order=desc';
  const url  = 'https://www.rietilife.com/wp-json' + path;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  https.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
  }, (r) => {
    let data = '';
    r.on('data', chunk => data += chunk);
    r.on('end', () => res.end(data));
  }).on('error', (e) => res.end(JSON.stringify({ error: e.message })));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Proxy running on port ' + PORT));
