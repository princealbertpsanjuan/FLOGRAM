import { Router } from "express";

/*
 * =========================================================
 * PAYMENT RESULT PAGES
 * =========================================================
 *
 * PayMongo sends the customer's browser here after the
 * online payment. The actual order update is done by the
 * PayMongo webhook; this page only tells the customer to
 * return to the FLOGRAM app.
 * =========================================================
 */

const router = Router();

const page = ({ title, message, color, icon }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · FLOGRAM</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#F4F7F5;color:#2F3A33;padding:16px}
  .card{max-width:380px;width:100%;background:#fff;border:1px solid #E3EAE5;border-radius:24px;
    padding:32px 24px;text-align:center;box-shadow:0 10px 30px rgba(47,58,51,.08)}
  .icon{width:64px;height:64px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;
    justify-content:center;font-size:32px;color:#fff;background:${color}}
  h1{margin:0 0 8px;font-size:22px}
  p{margin:0;color:#6F7A73;line-height:1.5;font-size:15px}
  .brand{margin-top:24px;font-weight:800;letter-spacing:2px;color:#5E9874;font-size:13px}
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="brand">FLOGRAM</div>
  </div>
</body>
</html>`;

router.get("/success", (req, res) => {
  res.type("html").send(
    page({
      title: "Payment received",
      message: "Thank you! You can close this page and go back to the FLOGRAM app. Your order status updates automatically.",
      color: "#5E9874",
      icon: "&#10003;",
    })
  );
});

router.get("/cancelled", (req, res) => {
  res.type("html").send(
    page({
      title: "Payment cancelled",
      message: "No payment was made. Close this page and go back to the FLOGRAM app to try again.",
      color: "#B45309",
      icon: "&#10005;",
    })
  );
});

export default router;
