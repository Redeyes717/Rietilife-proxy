const https = require('https');
const http  = require('http');

function keepAlive() {
  const host = process.env.RENDER_EXTERNAL_HOSTNAME;
  if (!host) return;
  setInterval(function() {
    http.get('http://' + host + '/ping', function() {}).on('error', function() {});
  }, 14 * 60 * 1000);
}

function fetchUrl(target, res, contentType) {
  https.get(target, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' },
    timeout: 25000
  }, function(r) {
    var chunks = [];
    r.on('data', function(c) { chunks.push(c); });
    r.on('end', function() {
      var ct = contentType || r.headers['content-type'] || 'application/octet-stream';
      res.setHeader('Content-Type', ct);
      res.writeHead(r.statusCode);
      res.end(Buffer.concat(chunks));
    });
  }).on('error', function(e) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  });
}

const server = http.createServer(function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.url === '/ping') {
    res.writeHead(200); res.end('pong'); return;
  }

  var qs = (req.url.split('?')[1] || '');
  var params = new URLSearchParams(qs);
  var path = params.get('path') || '';
  var img  = params.get('img')  || '';

  // Endpoint speciale: recupera le aziende amiche dalla pagina WP
  if (path === '/aziende-amiche') {
    var wpUrl = 'https://www.rietilife.com/wp-json/wp/v2/posts?categories=24733&per_page=20&_embed&orderby=date&order=desc';
    fetchUrl(wpUrl, res, 'application/json');
    return;
  }

  var target = img
    ? decodeURIComponent(img)
    : 'https://www.rietilife.com/wp-json' + path;

  fetchUrl(target, res);
});

var PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
  console.log('Proxy on port ' + PORT);
  keepAlive();
});