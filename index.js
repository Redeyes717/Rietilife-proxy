bash
cat << 'ENDOFFILE'
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
  var req = https.get(target, {
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
  });
  req.on('error', function(e) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  });
  req.on('timeout', function() {
    req.destroy();
    res.writeHead(504);
    res.end(JSON.stringify({ error: 'timeout' }));
  });
}

const server = http.createServer(function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.url === '/ping') {
    res.writeHead(200); res.end('pong'); return;
  }

  var qs     = (req.url.split('?')[1] || '');
  var params = new URLSearchParams(qs);
  var path   = params.get('path') || '';
  var img    = params.get('img')  || '';
  var video  = params.get('video') || '';

  // Proxy video page to extract YouTube embed ID
  if (video) {
    var videoUrl = decodeURIComponent(video);
    https.get(videoUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 20000
    }, function(r) {
      var data = '';
      r.on('data', function(c) { data += c; });
      r.on('end', function() {
        // Extract YouTube embed URL
        var match = data.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
        var ytId = match ? match[1] : '';
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ youtubeId: ytId }));
      });
    }).on('error', function(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    });
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
ENDOFFILE

Output
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
  var req = https.get(target, {
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
  });
  req.on('error', function(e) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  });
  req.on('timeout', function() {
    req.destroy();
    res.writeHead(504);
    res.end(JSON.stringify({ error: 'timeout' }));
  });
}

const server = http.createServer(function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.url === '/ping') {
    res.writeHead(200); res.end('pong'); return;
  }

  var qs     = (req.url.split('?')[1] || '');
  var params = new URLSearchParams(qs);
  var path   = params.get('path') || '';
  var img    = params.get('img')  || '';
  var video  = params.get('video') || '';

  // Proxy video page to extract YouTube embed ID
  if (video) {
    var videoUrl = decodeURIComponent(video);
    https.get(videoUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 20000
    }, function(r) {
      var data = '';
      r.on('data', function(c) { data += c; });
      r.on('end', function() {
        // Extract YouTube embed URL
        var match = data.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
        var ytId = match ? match[1] : '';
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ youtubeId: ytId }));
      });
    }).on('error', function(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    });
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
