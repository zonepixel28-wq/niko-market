const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: "https://zonepixel28-wq.github.io"
}));

app.use(express.json({ limit: "20kb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "Niko Market Orders" });
});

app.post("/api/order", async (req, res) => {
  try {
    const { customer, phone, address, items, subtotal, delivery, total } =
      req.body || {};

    if (
      typeof customer !== "string" || !customer.trim() ||
      typeof phone !== "string" || !phone.trim() ||
      typeof address !== "string" || !address.trim() ||
      !Array.isArray(items) || items.length === 0 ||
      ![subtotal, delivery, total].every(
        n => typeof n === "number" && Number.isFinite(n) && n >= 0
      )
    ) {
      return res.status(400).json({ ok: false, message: "Ստուգիր պատվերի տվյալները։" });
    }

    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      return res.status(500).json({ ok: false, message: "Telegram-ը կարգավորված չէ։" });
    }

    const itemLines = items.map(item => {
      if (
        typeof item.name !== "string" ||
        !Number.isInteger(item.quantity) || item.quantity < 1 ||
        !Number.isFinite(item.price) || item.price < 0
      ) {
        throw new Error("Invalid item");
      }
      return `${item.name} × ${item.quantity} — ${item.price.toLocaleString("hy-AM")} ֏`;
    });

    const message = [
      "🛍️ NIKO MARKET — ՆՈՐ ՊԱՏՎԵՐ",
      `Հաճախորդ՝ ${customer.trim().slice(0, 100)}`,
      `Հեռախոս՝ ${phone.trim().slice(0, 40)}`,
      `Հասցե՝ ${address.trim().slice(0, 200)}`,
      "",
      "Ապրանքներ՝",
      ...itemLines,
      "",
      `Ապրանքների գումար՝ ${subtotal.toLocaleString("hy-AM")} ֏`,
      `Առաքում՝ ${delivery.toLocaleString("hy-AM")} ֏`,
      `Ընդհանուր՝ ${total.toLocaleString("hy-AM")} ֏`
    ].join("\n");

    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: message
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      console.error("Telegram delivery failed:", result.description);
      return res.status(502).json({
        ok: false,
        message: "Telegram-ը չընդունեց պատվերը։"
      });
    }

    res.json({ ok: true, message: "Պատվերն ուղարկվեց Telegram։" });
  } catch (error) {
    console.error("Order error:", error.message);
    res.status(400).json({ ok: false, message: "Պատվերի տվյալները սխալ են։" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Niko Market server listening on port ${PORT}`);
});