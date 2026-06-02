const https = require('https');
const http  = require('http');

function keepAlive() {
  const host = process.env.RENDER_EXTERNAL_HOSTNAME;
  if (!host) return;
  setInterval(function() {
    http.get('http://' + host + '/ping', function() {}).on('error', function() {});
  }, 14 * 60 * 1000);
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

  var target = img
    ? decodeURIComponent(img)
    : 'https://www.rietilife.com/wp-json' + path;

  https.get(target, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' },
    timeout: 25000
  }, function(r) {
    var chunks = [];
    r.on('data', function(c) { chunks.push(c); });
    r.on('end', function() {
      res.setHeader('Content-Type', r.headers['content-type'] || 'application/octet-stream');
      res.writeHead(r.statusCode);
      res.end(Buffer.concat(chunks));
    });
  }).on('error', function(e) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  });
});

var PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
  console.log('Proxy on port ' + PORT);
  keepAlive();
});