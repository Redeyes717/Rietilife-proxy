cat << 'EOF'
const https = require('https');
const http  = require('http');

// Keep-alive: pinga se stesso ogni 14 minuti per non addormentarsi
function keepAlive() {
  const host = process.env.RENDER_EXTERNAL_HOSTNAME;
  if (!host) return;
  setInterval(function() {
    http.get('http://' + host + '/ping', function(r) {
      console.log('Keep-alive ping: ' + r.statusCode);
    }).on('error', function(e) {
      console.log('Keep-alive error: ' + e.message);
    });
  }, 14 * 60 * 1000);
}

const server = http.createServer(function(req, res) {
  // Health check
  if (req.url === '/ping') {
    res.writeHead(200); res.end('pong'); return;
  }

  var qs   = req.url.split('?')[1] || '';
  var params = new URLSearchParams(qs);
  var path = params.get('path') || '/wp/v2/posts?per_page=12&_embed&orderby=date&order=desc';
  var target = 'https://www.rietilife.com/wp-json' + path;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  console.log('Fetch: ' + target);

  var request = https.get(target, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RietiLifeApp/1.0)',
      'Accept': 'application/json'
    },
    timeout: 25000
  }, function(r) {
    var data = '';
    r.on('data', function(chunk) { data += chunk; });
    r.on('end', function() {
      res.writeHead(r.statusCode);
      res.end(data);
    });
  });

  request.on('timeout', function() {
    request.destroy();
    res.writeHead(504);
    res.end(JSON.stringify({ error: 'Gateway timeout' }));
  });

  request.on('error', function(e) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  });
});

var PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
  console.log('Proxy running on port ' + PORT);
  keepAlive();
});
EOF
