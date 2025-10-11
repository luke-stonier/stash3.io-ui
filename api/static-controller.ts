import express from "express";

const staticRouter = express.Router();

function renderPage({
                        title,
                        subtitle,
                        icon,
                        accent = "#22c55e", // green
                        actionHref = "/",
                        actionText = "Go back",
                    }: {
    title: string;
    subtitle: string;
    icon: "success" | "error";
    accent?: string;
    actionHref?: string;
    actionText?: string;
}) {
    const isSuccess = icon === "success";
    const accentColor = isSuccess ? accent : "#ef4444"; // red for error
    const bgGradient = isSuccess
        ? "linear-gradient(180deg, #0b1220, #0a0f1a)"
        : "linear-gradient(180deg, #140e13, #0f0a0e)";

    const svg =
        isSuccess
            ? `<svg width="72" height="72" viewBox="0 0 24 24" fill="none" aria-hidden="true">
           <circle cx="12" cy="12" r="10" fill="${accentColor}" opacity=".15"/>
           <path d="M8 12.5l2.5 2.5L16 9" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
         </svg>`
            : `<svg width="72" height="72" viewBox="0 0 24 24" fill="none" aria-hidden="true">
           <circle cx="12" cy="12" r="10" fill="${accentColor}" opacity=".15"/>
           <path d="M15 9l-6 6M9 9l6 6" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
         </svg>`;

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0b0e14;
    --card: #0f1522;
    --text: #e6e8ee;
    --muted: #aab0bd;
    --ring: ${accentColor};
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    color: var(--text);
    background: ${bgGradient};
    font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
    display: grid;
    place-items: center;
    padding: 24px;
  }
  .card {
    width: min(640px, 92vw);
    background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 16px;
    padding: 28px 24px;
    box-shadow: 0 12px 40px rgba(0,0,0,.45);
    text-align: center;
  }
  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 88px; width: 88px;
    border-radius: 50%;
    background: radial-gradient(120px 120px at 50% 40%, rgba(255,255,255,.06), transparent);
    margin: 8px auto 16px;
    border: 1px solid rgba(255,255,255,.08);
  }
  h1 {
    font-size: clamp(1.4rem, 1.1rem + 1.2vw, 2rem);
    margin: 0 0 8px;
    letter-spacing: .2px;
  }
  p {
    margin: 0 auto 18px;
    color: var(--muted);
    max-width: 52ch;
    line-height: 1.55;
  }
  .actions {
    display: grid;
    grid-auto-flow: row;
    gap: 12px;
    margin-top: 12px;
  }
  button.button {
    text-decoration: none;
    display: inline-block;
    padding: 12px 16px;
    border-radius: 10px;
    font-weight: 600;
    border: 1px solid rgba(255,255,255,.14);
    color: var(--text);
    background: linear-gradient(180deg, var(--ring), color-mix(in oklab, var(--ring) 70%, #000 30%));
    cursor: pointer;
  }
  button.button:hover {
    background: linear-gradient(180deg, var(--ring), color-mix(in oklab, var(--ring) 75%, #000 30%));
  }
  a.button.secondary {
    background: transparent;
  }
  .fineprint {
    margin-top: 10px;
    font-size: 12px;
    color: #8c93a3;
  }
</style>
</head>
<body>
  <main class="card" role="main" aria-live="polite">
    <div class="icon" aria-hidden="true">${svg}</div>
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <div class="actions">
      <button class="button" onclick="window.close();">${actionText}</button>
    </div>
    <div class="fineprint">You can safely close this window if it doesn’t close automatically.</div>
  </main>
</body>
<script>
setTimeout(() => {
    window.close();
}, 1000 * 60 * 2)
</script>
</html>`;
}

staticRouter.get("/holding/billing/success", (_req, _res) => {
    _res
        .status(200)
        .type("html")
        .send(
            renderPage({
                title: "Payment confirmed",
                subtitle:
                    "Thank you! Your checkout is complete and your plan is now active. A receipt will be emailed shortly.",
                icon: "success",
                actionText: "Continue",
                accent: "#22c55e",
            })
        );
});

// CANCEL / FAILED
staticRouter.get("/holding/billing/cancel", (_req, _res) => {
    _res
        .status(200)
        .type("html")
        .send(
            renderPage({
                title: "Checkout canceled",
                subtitle:
                    "No charges were made. You can resume checkout at any time, or pick a different plan.",
                icon: "error",
                actionText: "Close",
            })
        );
});

export default  staticRouter;