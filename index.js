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
  req.on('error', function(e) { res.writeHead(500); res.end(JSON.stringify({error:e.message})); });
  req.on('timeout', function() { req.destroy(); res.writeHead(504); res.end(JSON.stringify({error:'timeout'})); });
}

function scrapeVideos(res) {
  var url = 'https://www.rietilife.com/?video-category=cronaca';
  https.get(url, { headers: {'User-Agent':'Mozilla/5.0'}, timeout: 25000 }, function(r) {
    var data = '';
    r.on('data', function(c) { data += c; });
    r.on('end', function() {
      var videos = [];
      var seen = {};
      // Trova tutti i link /video/
      var links = data.match(/https?:\/\/www\.rietilife\.com\/video\/[a-z0-9\-]+\//g) || [];
      links.forEach(function(link) {
        if (seen[link]) return;
        seen[link] = true;
        // Solo i veri video con slug rietilife-tv-
        if (link.indexOf('/video/rietilife-tv-') === -1 && link.indexOf('/video/rietlife-tv-') === -1) return;
        // Cerca il titolo vicino al link
        var idx = data.indexOf(link);
        var nearby = data.substring(idx, idx + 500);
        var titleMatch = nearby.match(/<h3[^>]*>[^<]*<a[^>]*>([^<]+)<\/a>/);
        var imgMatch = data.substring(Math.max(0, idx - 300), idx + 300).match(/src="(https:\/\/www\.rietilife\.com\/wp-content\/uploads\/[^"]+\.(?:jpg|jpeg|png))"/);
        var title = titleMatch ? titleMatch[1].trim() : link.split('/').slice(-2,-1)[0].replace(/-/g,' ');
        var thumb = imgMatch ? imgMatch[1].replace(/-300x200\./, '-655x437.') : '';
        videos.push({ link: link, thumb: thumb, title: title, date: '' });
      });
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(videos));
    });
  }).on('error', function(e) {
    res.writeHead(500);
    res.end(JSON.stringify({error: e.message}));
  });
}

const server = http.createServer(function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  if (req.url === '/ping') { res.writeHead(200); res.end('pong'); return; }
  var params = new URLSearchParams((req.url.split('?')[1] || ''));
  var path  = params.get('path')  || '';
  var img   = params.get('img')   || '';
  var video = params.get('video') || '';
  var vlist = params.get('vlist') || '';

  if (vlist) { scrapeVideos(res); return; }

  if (video) {
    https.get(decodeURIComponent(video), { headers:{'User-Agent':'Mozilla/5.0'}, timeout:20000 }, function(r) {
      var data = '';
      r.on('data', function(c) { data += c; });
      r.on('end', function() {
        var match = data.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
        res.setHeader('Content-Type','application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ youtubeId: match ? match[1] : '' }));
      });
    }).on('error', function(e) { res.writeHead(500); res.end(JSON.stringify({error:e.message})); });
    return;
  }

  fetchUrl(img ? decodeURIComponent(img) : 'https://www.rietilife.com/wp-json' + path, res);
});

var PORT = process.env.PORT || 3000;
server.listen(PORT, function() { console.log('Proxy on port ' + PORT); keepAlive(); });
