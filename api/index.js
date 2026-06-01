const https = require('https');

module.exports = (req, res) => {
  const path = req.url.replace('/?path=', '') || '/wp/v2/posts?per_page=12&_embed';
  const url  = 'https://www.rietilife.com/wp-json' + decodeURIComponent(path);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  https.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
  }, (r) => {
    let data = '';
    r.on('data', chunk => data += chunk);
    r.on('end', () => res.end(data));
  }).on('error', (e) => res.end(JSON.stringify({ error: e.message })));
};
