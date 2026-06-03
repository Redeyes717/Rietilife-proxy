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
  https.get('https://www.rietilife.com/rieti-life-tv/', {
    headers: {'User-Agent':'Mozilla/5.0'},
    timeout: 25000
  }, function(r) {
    var data = '';
    r.on('data', function(c) { data += c; });
    r.on('end', function() {
      var videos = [];
      var seen = {};
      // Estrae coppie: link permalink + img src + titolo h3
      // Pattern: <a href="PERMALINK"><img src="THUMB"></a> ... <h3><a href="PERMALINK">TITLE</a></h3>
      var re = /<a href="(https:\/\/www\.rietilife\.com\/video\/[^"]+)"[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*>/g;
      var titleRe = /<h3[^>]*>\s*<a href="(https:\/\/www\.rietilife\.com\/video\/[^"]+)"[^>]*>([^<]+)<\/a>/g;
      var titles = {};
      var m;
      while ((m = titleRe.exec(data)) !== null) {
        titles[m[1]] = m[2].trim();
      }
      while ((m = re.exec(data)) !== null) {
        var link = m[1];
        var thumb = m[2];
        if (seen[link]) continue;
        seen[link] = true;
        videos.push({
          link: link,
          thumb: thumb.replace(/-300x200\./, '-655x437.'),
          title: titles[link] || link.split('/').slice(-2,-1)[0].replace(/-/g,' '),
          date: ''
        });
      }
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
  var vlist = params.get('vlist') || '';

  if (vlist) { scrapeVideos(res); return; }

  fetchUrl(img ? decodeURIComponent(img) : 'https://www.rietilife.com/wp-json' + path, res);
});

var PORT = process.env.PORT || 3000;
server.listen(PORT, function() { console.log('Proxy on port ' + PORT); keepAlive(); });
