export default async function handler(req, res) {
  const path = req.query.path || '/wp/v2/posts?per_page=12&_embed&orderby=date&order=desc';
  const url  = 'https://www.rietilife.com/wp-json' + path;

  try {
    const r    = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    const data = await r.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(r.status).send(data);
  } catch(e) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: e.message });
  }
}
