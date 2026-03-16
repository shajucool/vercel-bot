export default async function handler(req, res) {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    return res.status(500).json({ error: "BOT_TOKEN not set" });
  }

  const webhookUrl =
    process.env.WEBHOOK_URL ||
    req.query.url ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/bot` : null);

  if (!webhookUrl) {
    return res.status(400).json({
      error: "Could not determine webhook URL",
      hint: "Pass ?url=https://your-app.vercel.app/api/bot or set WEBHOOK_URL env var",
    });
  }

  const params = new URLSearchParams({ url: webhookUrl });
  if (process.env.WEBHOOK_SECRET) {
    params.append("secret_token", process.env.WEBHOOK_SECRET);
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?${params.toString()}`
    );
    const data = await response.json();
    return res.status(200).json({ webhook_url: webhookUrl, telegram_response: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
