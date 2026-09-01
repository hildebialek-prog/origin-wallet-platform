import fs from "node:fs/promises";
import path from "node:path";

const siteUrl = "https://originwallet.asia";
const distDir = path.resolve("dist");
const sourceHtmlPath = path.join(distDir, "index.html");

const routes = [
  {
    path: "/",
    title: "Origin Wallet | Global Payments Platform",
    description:
      "Origin Wallet is a global payments platform for multi-currency wallets, international transfers, business payments, and compliant financial operations.",
    headline: "Origin Wallet global payments platform",
    summary:
      "Origin Wallet helps businesses and individuals manage global payments, multi-currency workflows, international transfers, and financial operations.",
  },
  {
    path: "/personal",
    title: "Origin Wallet Personal | International Transfers, Wallet & Receive Money",
    description:
      "Explore Origin Wallet personal features for international transfers, multi-currency wallet management, and receiving money across borders.",
    headline: "Origin Wallet Personal",
    summary:
      "Personal international transfer, wallet, and receiving flows designed for clearer cross-border money movement.",
  },
  {
    path: "/personal/send",
    title: "Origin Wallet Send Money | Personal International Transfer Flow",
    description:
      "Create international transfers with Origin Wallet through a clearer send money flow, rate visibility, and payout guidance.",
    headline: "Send money internationally with Origin Wallet",
    summary:
      "Origin Wallet Personal Send supports international transfer setup, payment review, and clearer cross-border sending workflows.",
  },
  {
    path: "/personal/wallet",
    title: "Origin Wallet Multi-Currency Wallet | Balances, Hold & Manage Funds",
    description:
      "Manage balances with the Origin Wallet multi-currency wallet and review wallet activity through a clearer international money interface.",
    headline: "Origin Wallet multi-currency wallet",
    summary:
      "Hold, manage, and review multi-currency balances in one Origin Wallet interface.",
  },
  {
    path: "/personal/receive",
    title: "Origin Wallet Receive Money | Inbound International Payments",
    description:
      "Receive money with Origin Wallet through a clearer inbound payment experience for cross-border personal payment flows.",
    headline: "Receive money with Origin Wallet",
    summary:
      "Origin Wallet Personal Receive supports inbound international money movement and payment visibility.",
  },
  {
    path: "/business",
    title: "Origin Wallet Business | Global Business Payments & Wallet Workflows",
    description:
      "Origin Wallet Business supports supplier payments, collections, payout operations, and API-led financial workflows.",
    headline: "Origin Wallet Business",
    summary:
      "Business payments, supplier workflows, collections, and wallet operations through Origin Wallet.",
  },
  {
    path: "/business/suppliers",
    title: "Global Supplier Payments Platform | Origin Wallet Business Suppliers",
    description:
      "Manage supplier payments globally with Origin Wallet Business through clearer payable workflows and wallet operations.",
    headline: "Global supplier payments with Origin Wallet",
    summary:
      "Supplier payment workflows for teams managing cross-border payables and operational visibility.",
  },
  {
    path: "/business/receive",
    title: "Receive International Payments for Business | Origin Wallet Business",
    description:
      "Receive international payments for business with Origin Wallet through structured inbound payment workflows and clearer visibility.",
    headline: "Receive international payments for business",
    summary:
      "Origin Wallet Business Receive supports collections, inbound money movement, and visibility across wallet workflows.",
  },
  {
    path: "/business/batch-payments",
    title: "Batch Payouts Platform | Origin Wallet Business Batch Payments",
    description:
      "Coordinate batch payments and multi-recipient payout workflows with Origin Wallet Business for modern cross-border operations.",
    headline: "Batch payments and payouts",
    summary:
      "Origin Wallet Business Batch Payments supports structured multi-recipient payout workflows.",
  },
  {
    path: "/business/api",
    title: "Origin Wallet API | Payment API Integrations & Finance Workflow Platform",
    description:
      "Explore the Origin Wallet API for payment infrastructure, embedded finance workflows, and operational connectivity.",
    headline: "Origin Wallet API and integrations",
    summary:
      "API and integration workflows for businesses building payment operations.",
  },
  {
    path: "/pricing",
    title: "Origin Wallet Pricing | Global Payment Fees, Rates & Transfer Visibility",
    description:
      "Review Origin Wallet pricing visibility, illustrative exchange rates, transfer fees, and global payment workflow economics.",
    headline: "Origin Wallet pricing",
    summary:
      "Pricing visibility, exchange rates, and fee review for global payment workflows.",
  },
  {
    path: "/security",
    title: "Origin Wallet Security | Platform Controls, Protection & Trust",
    description:
      "Read about Origin Wallet security, platform controls, access management, encryption posture, and provider-aware operational safeguards.",
    headline: "Origin Wallet security",
    summary:
      "Security, protection, and trust information for Origin Wallet platform workflows.",
  },
  {
    path: "/help",
    title: "Origin Wallet Help Center | FAQs, Support Articles & Answers",
    description:
      "Browse the Origin Wallet help center for FAQs, support articles, and answers about transfers, wallets, balances, onboarding, and platform usage.",
    headline: "Origin Wallet Help Center",
    summary:
      "FAQs and support information about transfers, wallets, onboarding, balances, and platform usage.",
  },
  {
    path: "/about",
    title: "About Origin Wallet | Cross-Border Payments Platform & Company Information",
    description:
      "Learn about Origin Wallet, our cross-border payments platform, mission, product direction, and company operating information.",
    headline: "About Origin Wallet",
    summary:
      "Company, mission, product direction, and operating information for Origin Wallet.",
  },
  {
    path: "/contact",
    title: "Contact Origin Wallet | Sales, Partnerships & Support",
    description:
      "Contact Origin Wallet for product enquiries, partnerships, support, security follow-up, and cross-border payment workflow discussions.",
    headline: "Contact Origin Wallet",
    summary:
      "Contact the Origin Wallet team about product access, support, partnerships, and platform questions.",
  },
  {
    path: "/terms",
    title: "Terms & Conditions | Origin Wallet",
    description:
      "Read the terms governing access to and use of the Origin Wallet website and available payment and multi-currency services.",
    headline: "Terms & Conditions",
    summary: "Terms governing access to and use of the Origin Wallet website and available services.",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | Origin Wallet",
    description:
      "Learn how Origin Wallet collects, uses, shares, retains, and protects information when you use its website and services.",
    headline: "Privacy Policy",
    summary: "How Origin Wallet handles information when you use its website and services.",
  },
  {
    path: "/disclaimer",
    title: "Disclaimer | Origin Wallet",
    description:
      "Review important information about Origin Wallet website content, service availability, transaction examples, and third-party information.",
    headline: "Disclaimer",
    summary: "Important context for Origin Wallet website content, availability, and transaction information.",
  },
];

const buildSchema = (route) => {
  const url = new URL(route.path, siteUrl).toString();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "HONG KONG MACHINING GROUP CO., LIMITED",
        alternateName: ["Origin Wallet", "Origin Wallet Global Payments"],
        url: `${siteUrl}/`,
        logo: `${siteUrl}/logo/logo.jpg`,
        image: `${siteUrl}/content/banner.jpg`,
        description:
          "HONG KONG MACHINING GROUP CO., LIMITED operates the Origin Wallet platform for multi-currency and international payment workflows.",
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "Origin Wallet",
        alternateName: "Origin Wallet Global Payments",
        url: `${siteUrl}/`,
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: route.title,
        description: route.description,
        isPartOf: {
          "@id": `${siteUrl}/#website`,
        },
        about: {
          "@id": `${siteUrl}/#organization`,
        },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${siteUrl}/content/banner.jpg`,
        },
      },
    ],
  };
};

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const renderFallbackMarkup = (route) => `
    <main style="position:relative; min-height:100vh; font-family:'Plus Jakarta Sans', Arial, sans-serif; color:#ffffff; background:#071611; overflow:hidden;">
      <div style="position:absolute; inset:0; background-image:linear-gradient(90deg, rgba(7,22,17,.94), rgba(7,22,17,.78), rgba(7,22,17,.36)), url('/content/banner.jpg'); background-size:cover; background-position:center; opacity:.96;"></div>
      <section style="position:relative; max-width:1120px; margin:0 auto; padding:44px 24px 72px;">
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:92px;">
          <img src="/logo/logo.jpg" alt="Origin Wallet" style="width:52px; height:52px; border-radius:16px; object-fit:cover; box-shadow:0 18px 45px rgba(0,0,0,.24);" />
          <div style="font-weight:800; font-size:22px; line-height:1.05;">Origin<br />Wallet</div>
        </div>
        <p style="display:inline-block; margin:0 0 18px; padding:8px 14px; border-radius:999px; background:rgba(20,164,84,.16); color:#86efac; font-weight:700; font-size:13px; letter-spacing:.08em; text-transform:uppercase;">Global payments platform</p>
        <h1 style="margin:0 0 18px; max-width:760px; font-size:56px; line-height:1.03; letter-spacing:0; font-weight:800;">${escapeHtml(route.headline)}</h1>
        <p style="margin:0 0 34px; max-width:720px; font-size:19px; line-height:1.75; color:rgba(255,255,255,.82);">${escapeHtml(route.summary)}</p>
        <p style="margin:0; color:rgba(255,255,255,.68); font-size:14px;">Loading secure app...</p>
      </section>
    </main>`;

const replaceSingle = (html, pattern, replacement) => {
  if (!pattern.test(html)) {
    return html;
  }
  return html.replace(pattern, replacement);
};

const renderRouteHtml = (template, route) => {
  const url = new URL(route.path, siteUrl).toString();
  const schema = JSON.stringify(buildSchema(route));

  let html = template;
  html = replaceSingle(html, /<title>.*?<\/title>/s, `<title>${escapeHtml(route.title)}</title>`);
  html = replaceSingle(
    html,
    /<meta\s+name="description"\s+content=".*?"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(route.description)}" />`,
  );
  html = replaceSingle(
    html,
    /<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i,
    `<link rel="canonical" href="${url}" />`,
  );
  html = replaceSingle(
    html,
    /<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
  );
  html = replaceSingle(
    html,
    /<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
  );
  html = replaceSingle(
    html,
    /<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:url" content="${url}" />`,
  );
  html = replaceSingle(
    html,
    /<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
  );
  html = replaceSingle(
    html,
    /<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
  );
  html = replaceSingle(
    html,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/i,
    `<script type="application/ld+json">${schema}</script>`,
  );
  html = replaceSingle(html, /<div id="root"><\/div>/i, `<div id="root">${renderFallbackMarkup(route)}</div>`);
  return html;
};

const ensureRouteFile = async (route, html) => {
  if (route.path === "/") {
    await fs.writeFile(path.join(distDir, "index.html"), html, "utf8");
    return;
  }

  const routeDir = path.join(distDir, route.path.slice(1));
  await fs.mkdir(routeDir, { recursive: true });
  await fs.writeFile(path.join(routeDir, "index.html"), html, "utf8");
};

const main = async () => {
  const template = await fs.readFile(sourceHtmlPath, "utf8");

  for (const route of routes) {
    const html = renderRouteHtml(template, route);
    await ensureRouteFile(route, html);
  }
};

main().catch((error) => {
  console.error("Prerender failed:", error);
  process.exitCode = 1;
});
