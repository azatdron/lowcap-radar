export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const key = req.headers["x-client-cmc-key"] || process.env.CMC_API_KEY;
    if (!key) return res.status(401).json({ error: "CoinMarketCap API key missing" });

    const limit = Math.min(Number(req.query.limit || 200), 500);
    const url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=" +
      limit + "&convert=USD";

    const r = await fetch(url, { headers: { "X-CMC_PRO_API_KEY": key } });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.status(200).send(text);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}