export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    backend: "online",
    service: "Lowcap Radar AI",
    version: "v5.4-in-app-keys",
    envCoinGeckoKey: Boolean(process.env.COINGECKO_API_KEY),
    envCmcKey: Boolean(process.env.CMC_API_KEY),
    acceptsClientKeys: true
  });
}