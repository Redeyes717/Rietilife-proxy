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

function scrapeVideos(url, res) {
  https.get(url, { headers: {'User-Agent':'Mozilla/5.0'}, timeout: 20000 }, function(r) {
    var data = '';
    r.on('data', function(c) { data += c; });
    r.on('end', function() {
      var videos = [];
      // Pattern: <a href="permalink"><img src="thumb"></a> + <h3><a href="permalink">Title</a></h3> + date
      var re = /<a href="(https:\/\/www\.rietilife\.com\/video\/[^"]+)">\s*<img[^>]+src="([^"]+)"[^>]*>\s*<\/a>\s*(?:<\/dt>\s*<\/dl>)?\s*(?:<dl[^>]*>)?\s*<\/div>\s*(?:<\/div>)?\s*[\s\S]*?<h3[^>]*>\s*<a href="[^"]+">([^<]+)<\/a>\s*<\/h3>\s*\n?\s*([\d\/]+ [\d:]+)/g;
      var match;
      while ((match = re.exec(data)) !== null && videos.length < 50) {
        videos.push({
          link: match[1],
          thumb: match[2].replace('-300x200.', '-655x437.'),
          title: match[3].trim(),
          date: match[4] ? match[4].trim() : ''
        });
      }
      // Fallback: cerca pattern più semplice thumbnail + h3
      if (videos.length === 0) {
        var imgRe = /<a href="(https:\/\/www\.rietilife\.com\/video\/[^"]+)"><img[^>]+src="([^"]+)"[^>]*><\/a>/g;
        var titleRe = /<h3[^>]*><a href="https:\/\/www\.rietilife\.com\/video\/([^"]+)">([^<]+)<\/a><\/h3>/g;
        var imgs = {}, titles = {};
        var m;
        while ((m = imgRe.exec(data)) !== null) imgs[m[1]] = m[2];
        while ((m = titleRe.exec(data)) !== null) titles['https://www.rietilife.com/video/' + m[1]] = m[2];
        Object.keys(titles).forEach(function(link) {
          if (videos.length < 50) {
            videos.push({
              link: link,
              thumb: (imgs[link] || '').replace('-300x200.', '-655x437.'),
              title: titles[link].trim(),
              date: ''
            });
          }
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
  var video = params.get('video') || '';
  var vlist = params.get('vlist') || '';

  // Lista video dalla pagina WebTV
  if (vlist) {
    scrapeVideos('https://www.rietilife.com/rieti-life-tv/', res);
    return;
  }

  // Estrai YouTube ID da una pagina video
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
