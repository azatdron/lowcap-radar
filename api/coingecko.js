export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const key = req.headers["x-client-cg-key"] || process.env.COINGECKO_API_KEY;
    if (!key) return res.status(401).json({ error: "CoinGecko API key missing" });

    const ids = String(req.query.ids || "").slice(0, 3000);
    if (!ids) return res.status(400).json({ error: "ids required" });

    const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=" +
      encodeURIComponent(ids) +
      "&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h";

    const r = await fetch(url, { headers: { "x-cg-demo-api-key": key } });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.status(200).send(text);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}