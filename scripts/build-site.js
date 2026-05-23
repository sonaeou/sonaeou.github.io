const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
let sharp;
const root = path.resolve(__dirname, "..");
const version = formatVersion(new Date());
const rootPages = ["index.html", "about.html", "contact.html", "advertise.html", "privacy-policy.html"];
const deployDir = path.join(root, ".deploy-photomorning");
const releaseDir = path.join(root, "released");
const publishedReleasesPath = path.join(root, "published-releases.json");
const articleDir = path.join(root, "articles");
const assetImageDir = path.join(root, "assets", "images");
const siteUrl = "https://photomorning.com/";
const siteName = "PhotoMorning";
const siteDescription = "Independent photography news, camera reviews, creator stories, and field-tested gear advice.";
const googleSiteVerification = "4Hqqsy7ItyGyNyJIT3POidbxpAlq0PVnpeLptvxI2ZA";
const fallbackImage = "assets/images/photo-1516035069371-29a1b244cc32-11830d4223.avif";
const adoramaAffiliateUrl = "https://adorama.prf.hn/click/camref:1011l5JsLr";
const adoramaJumpPath = "go/adorama.html";

function formatVersion(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[#?'"()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(String(value || ""));
}

function cleanText(value) {
  return value;
}

function excerpt(value, maxLength = 200) {
  const text = value
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function absoluteUrl(relativePath = "") {
  return new URL(relativePath.replace(/\\/g, "/").replace(/^\/+/, ""), siteUrl).href;
}

function stripTags(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMarkdown(value) {
  return String(value || "")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/[_`#>~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function seoDescription(value, fallback = siteDescription) {
  return excerpt(stripMarkdown(stripTags(value)) || fallback, 155);
}

function isoDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function jsonScript(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function renderAdoramaAd() {
  return `<section class="ad-card adorama-ad" aria-label="Sponsored Adorama offer">
          <span>Sponsored</span>
          <h2>Upgrade Your Camera Kit at Adorama</h2>
          <p>Shop cameras, lenses, lighting, audio gear, and creator tools from one of the most trusted names in photo retail.</p>
          <a href="/${adoramaJumpPath}" target="_blank" rel="sponsored nofollow noopener">Shop Adorama</a>
        </section>`;
}

function removeAdoramaAds(html) {
  return html.replace(/\n\s*<section class="ad-card adorama-ad"[\s\S]*?<\/section>\s*/g, "\n");
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function getSharp() {
  if (sharp) return sharp;
  try {
    sharp = require("sharp");
    return sharp;
  } catch {
    throw new Error("The sharp package is required to convert images to AVIF. Run npm install before building.");
  }
}

async function updateAssetVersions() {
  const articlePages = (await pathExists(articleDir))
    ? (await fs.readdir(articleDir)).filter((file) => file.endsWith(".html")).map((file) => path.join(articleDir, file))
    : [];
  const htmlPages = [
    ...rootPages.map((file) => path.join(root, file)),
    ...articlePages,
  ];

  for (const fullPath of htmlPages) {
    let html = await fs.readFile(fullPath, "utf8");
    html = html.replace(/href="((?:\.\.\/)?styles\.css)(?:\?v=\d+)?"/g, `href="$1?v=${version}"`);
    html = html.replace(/src="((?:\.\.\/)?script\.js)(?:\?v=\d+)?"/g, `src="$1?v=${version}"`);
    await fs.writeFile(fullPath, html, "utf8");
  }

  const generatorPath = path.join(root, "scripts", "generate-articles.js");
  let generator = await fs.readFile(generatorPath, "utf8");
  generator = generator.replace(/href="\.\.\/styles\.css(?:\?v=\d+)?"/g, `href="../styles.css?v=${version}"`);
  generator = generator.replace(/src="\.\.\/script\.js(?:\?v=\d+)?"/g, `src="../script.js?v=${version}"`);
  await fs.writeFile(generatorPath, generator, "utf8");
}

async function normalizeHomeLinks() {
  const htmlFiles = [
    ...rootPages.map((file) => path.join(root, file)),
    ...(await fs.readdir(articleDir)).filter((file) => file.endsWith(".html")).map((file) => path.join(articleDir, file)),
  ];

  for (const file of htmlFiles) {
    let html = await fs.readFile(file, "utf8");
    html = html.replace(/href="(?:\.\.\/)?index\.html"/g, 'href="/"');
    await fs.writeFile(file, html, "utf8");
  }

  return htmlFiles.length;
}

async function generateBaseArticles() {
  await execFileAsync("node", [path.join(root, "scripts", "generate-articles.js")], { cwd: root });
}

async function collectReleasedFiles() {
  if (!(await pathExists(releaseDir))) {
    await fs.mkdir(releaseDir, { recursive: true });
    return [];
  }

  const entries = await fs.readdir(releaseDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && [".md", ".html"].includes(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(releaseDir, entry.name));
}

async function readPublishedReleases() {
  if (!(await pathExists(publishedReleasesPath))) return [];
  return JSON.parse(await fs.readFile(publishedReleasesPath, "utf8"));
}

async function writePublishedReleases(articles) {
  await fs.writeFile(publishedReleasesPath, JSON.stringify(articles, null, 2), "utf8");
}

function markdownToArticle(source, fallbackTitle) {
  const normalized = cleanText(source.replace(/\r\n/g, "\n"));
  const lines = normalized.split("\n");
  const titleLine = lines.find((line) => line.startsWith("# "));
  const title = titleLine ? titleLine.replace(/^#\s+/, "").trim() : fallbackTitle;
  const deck = lines.find((line) => line.trim() && !line.startsWith("#") && !line.startsWith("!["))?.trim() || "A new PhotoMorning field report from the release desk.";
  const images = [...normalized.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)].map((match) => ({ alt: match[1], src: match[2] }));
  const body = [];
  let listItems = [];

  const flushList = () => {
    if (!listItems.length) return;
    body.push(`<ul>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith("# ")) continue;
    if (line.startsWith("## ")) {
      flushList();
      body.push(`<h2>${escapeHtml(line.replace(/^##\s+/, ""))}</h2>`);
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      body.push(`<h3>${escapeHtml(line.replace(/^###\s+/, ""))}</h3>`);
      continue;
    }
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      flushList();
      body.push(`<figure><img src="${escapeHtml(imageMatch[2])}" alt="${escapeHtml(imageMatch[1])}" /><figcaption>${escapeHtml(imageMatch[1] || title)}.</figcaption></figure>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      listItems.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      listItems.push(line.replace(/^\d+\.\s+/, ""));
      continue;
    }
    flushList();
    body.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  flushList();

  return {
    title,
    slug: slugify(title || fallbackTitle),
    deck,
    image: images[0]?.src || "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1400&q=80",
    imageAlt: images[0]?.alt || "Photography gear on a desk",
    html: body.join("\n          "),
  };
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderReleasedArticle(article) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(article.title)} - PhotoMorning</title>
    <link rel="stylesheet" href="../styles.css?v=${version}" />
  </head>
  <body>
    <header class="site-header">
      <div class="top-strip">
        <nav class="utility-nav" aria-label="Section navigation">
          <a href="/">Home</a>
          <a href="../about.html">About</a>
          <a href="../contact.html">Contact</a>
          <a href="../advertise.html">Advertise</a>
          <a href="../privacy-policy.html">Privacy Policy</a>
        </nav>
      </div>
      <div class="brand-row">
        <button class="icon-button menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span><span></span></button>
        <a class="brand" href="/" aria-label="PhotoMorning home"><span>Photo</span><strong>Morning</strong><small>photomorning.com</small></a>
        <div class="header-actions">
          <button class="search-toggle" type="button" aria-expanded="false">Search</button>
          <button class="mode-toggle" type="button" aria-pressed="false">Light</button>
        </div>
      </div>
      <nav class="mobile-nav" id="mobile-nav" aria-label="Mobile section navigation">
        <a href="/">Home</a>
        <a href="../about.html">About</a>
        <a href="../contact.html">Contact</a>
        <a href="../advertise.html">Advertise</a>
        <a href="../privacy-policy.html">Privacy Policy</a>
      </nav>
      <div class="search-panel" id="search-panel" aria-hidden="true">
        <form class="search-form">
          <label for="site-search">Search PhotoMorning</label>
          <div><input id="site-search" type="search" placeholder="Type here what you are looking for" /><button type="submit">Search</button></div>
        </form>
      </div>
    </header>

    <main class="article-shell">
      <article class="article-page">
        <header class="article-header">
          <a class="article-category" href="/">Released</a>
          <h1>${escapeHtml(article.title)}</h1>
          <p>${escapeHtml(article.deck)}</p>
          <div class="article-byline"><span>By PhotoMorning Staff</span><span>${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></div>
        </header>
        <figure class="article-hero-image">
          <img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.imageAlt)}" />
          <figcaption>${escapeHtml(article.imageAlt)}.</figcaption>
        </figure>
        <div class="article-content">
          ${article.html}
        </div>
      </article>
      <aside class="article-sidebar">
        <section class="member-box">
          <h2>Become a Member</h2>
          <p>Access the site without ads and support independent photography journalism.</p>
          <a href="../advertise.html">Subscribe Now</a>
        </section>
        ${renderAdoramaAd()}
      </aside>
    </main>

    <footer class="site-footer">
      <a class="brand footer-brand" href="/"><span>Photo</span><strong>Morning</strong><small>photomorning.com</small></a>
      <nav aria-label="Footer navigation">
        <a href="/">Home</a>
        <a href="../about.html">About</a>
        <a href="../contact.html">Contact</a>
        <a href="../advertise.html">Advertise</a>
        <a href="../privacy-policy.html">Privacy Policy</a>
      </nav>
      <p>PhotoMorning is an independent photography publication. Contact: <a href="mailto:hello@photomorning.com">hello@photomorning.com</a></p>
    </footer>
    <script src="../script.js?v=${version}"></script>
  </body>
</html>
`;
}

async function syncReleasedArticles() {
  const files = await collectReleasedFiles();
  const newReleasedArticles = [];
  await fs.mkdir(articleDir, { recursive: true });

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const fallbackTitle = path.basename(file, ext).replace(/^#+\s*/, "");
    if (ext === ".html") {
      const slug = slugify(fallbackTitle);
      const target = path.join(articleDir, `${slug}.html`);
      await fs.copyFile(file, target);
      newReleasedArticles.push({ slug, title: fallbackTitle, deck: "A newly released PhotoMorning article.", category: "Released" });
      continue;
    }
    const article = markdownToArticle(await fs.readFile(file, "utf8"), fallbackTitle);
    await fs.writeFile(path.join(articleDir, `${article.slug}.html`), renderReleasedArticle(article), "utf8");
    newReleasedArticles.push({ slug: article.slug, title: article.title, deck: article.deck, category: "Released", image: article.image, imageAlt: article.imageAlt });
  }

  const existingPublished = await readPublishedReleases();
  const today = new Date().toISOString().slice(0, 10);
  const normalizedNewArticles = newReleasedArticles.map((article) => ({
    ...article,
    author: "PhotoMorning Staff",
    date: today,
  }));
  const publishedArticles = newReleasedArticles.length
    ? [...normalizedNewArticles, ...existingPublished.filter((article) => !normalizedNewArticles.some((released) => released.slug === article.slug))]
    : existingPublished;

  if (newReleasedArticles.length) {
    await writePublishedReleases(publishedArticles);
  }

  if (publishedArticles.length) {
    const articlesJsonPath = path.join(root, "articles.json");
    const current = JSON.parse(await fs.readFile(articlesJsonPath, "utf8"));
    const merged = [...publishedArticles, ...current.filter((article) => !publishedArticles.some((released) => released.slug === article.slug))];
    await fs.writeFile(articlesJsonPath, JSON.stringify(merged, null, 2), "utf8");
  }

  await updateReleasedSection(publishedArticles);
  await updateHomepageLead(publishedArticles[0]);
  return { newArticles: newReleasedArticles, publishedArticles, releaseFiles: files };
}

async function updateHomepageLead(article) {
  if (!article) return;

  const indexPath = path.join(root, "index.html");
  let html = await fs.readFile(indexPath, "utf8");
  const replacement = `<article class="lead-card lead-card-large">
          <img
            src="${escapeHtml(article.image)}"
            alt="${escapeHtml(article.imageAlt || article.title)}"
          />
          <div class="lead-card-text">
            <p class="kicker">Released</p>
            <h1><a href="articles/${article.slug}.html">${escapeHtml(article.title)}</a></h1>
            <p>${escapeHtml(article.deck)}</p>
          </div>
        </article>`;

  html = html.replace(/<article class="lead-card lead-card-large">[\s\S]*?<\/article>/, replacement);
  await fs.writeFile(indexPath, html, "utf8");
}

async function updateArticleRelatedLists() {
  const articlesJsonPath = path.join(root, "articles.json");
  const allArticles = JSON.parse(await fs.readFile(articlesJsonPath, "utf8"));

  for (const article of allArticles) {
    const filePath = path.join(articleDir, `${article.slug}.html`);
    if (!(await pathExists(filePath))) continue;

    let html = await fs.readFile(filePath, "utf8");
    const relatedPool = allArticles.filter((item) => item.slug !== article.slug);
    const relatedLinks = Array.from({ length: Math.min(12, relatedPool.length) }, (_, offset) => {
      const item = relatedPool[offset % relatedPool.length];
      return `<a href="${item.slug}.html">${escapeHtml(item.title)}</a>`;
    }).join("");
    const relatedSection = `<section class="guide-list">
          <div class="section-heading compact">
            <h2>Related</h2>
          </div>
          ${relatedLinks}
        </section>`;

    if (html.includes('<section class="guide-list">')) {
      html = html.replace(/<section class="guide-list">[\s\S]*?<\/section>/, relatedSection);
    } else {
      html = html.replace("</aside>", `${relatedSection}\n      </aside>`);
    }

    await fs.writeFile(filePath, html, "utf8");
  }
}

async function writeAdoramaJumpPage() {
  const goDir = path.join(root, "go");
  await fs.mkdir(goDir, { recursive: true });
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Continue to Adorama - PhotoMorning</title>
    <meta name="robots" content="noindex,nofollow" />
    <meta name="referrer" content="no-referrer-when-downgrade" />
    <meta http-equiv="refresh" content="0; url=${adoramaAffiliateUrl}" />
    <link rel="stylesheet" href="../styles.css?v=${version}" />
    <script>
      window.location.replace(${JSON.stringify(adoramaAffiliateUrl)});
    </script>
  </head>
  <body>
    <main class="redirect-page">
      <section class="redirect-card">
        <span>Sponsored</span>
        <h1>Continuing to Adorama</h1>
        <p>You are being sent to Adorama, a PhotoMorning affiliate partner for cameras, lenses, lighting, and creator gear.</p>
        <a href="${adoramaAffiliateUrl}" rel="sponsored nofollow">Continue to Adorama</a>
      </section>
    </main>
  </body>
</html>
`;
  await fs.writeFile(path.join(goDir, "adorama.html"), html, "utf8");
}

async function insertAdoramaAds() {
  const indexPath = path.join(root, "index.html");
  let indexHtml = removeAdoramaAds(await fs.readFile(indexPath, "utf8"));
  indexHtml = indexHtml.replace(/(<aside class="sidebar"[^>]*>[\s\S]*?<\/section>)/, `$1\n\n          ${renderAdoramaAd()}\n\n          `);
  indexHtml = indexHtml.replace(/\n\s*<section class="guide-list"/g, '\n          <section class="guide-list"');
  await fs.writeFile(indexPath, indexHtml, "utf8");

  const articleFiles = (await fs.readdir(articleDir))
    .filter((file) => file.endsWith(".html"))
    .map((file) => path.join(articleDir, file));

  for (const filePath of articleFiles) {
    let html = removeAdoramaAds(await fs.readFile(filePath, "utf8"));
    html = html.replace(/(<aside class="article-sidebar"[^>]*>[\s\S]*?<\/section>)/, `$1\n        ${renderAdoramaAd()}\n        `);
    html = html.replace(/\n\s*<section class="guide-list"/g, '\n        <section class="guide-list"');
    await fs.writeFile(filePath, html, "utf8");
  }

  return articleFiles.length + 1;
}

async function updateReleasedSection(releasedArticles) {
  const indexPath = path.join(root, "index.html");
  let html = await fs.readFile(indexPath, "utf8");
  const section = releasedArticles.length
    ? `
      <section class="released-section" aria-labelledby="released-title">
        <div class="section-heading">
          <h2 id="released-title">New Releases</h2>
        </div>
        <div class="released-list">
          ${releasedArticles.map((article) => `<a href="articles/${article.slug}.html"><img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.imageAlt || article.title)}" /><strong>${escapeHtml(article.title)}</strong><span>${escapeHtml(excerpt(article.deck, 200))}</span></a>`).join("\n          ")}
        </div>
      </section>`
    : "";

  if (html.includes("<!-- RELEASED_ARTICLES_START -->")) {
    html = html.replace(/<!-- RELEASED_ARTICLES_START -->[\s\S]*?<!-- RELEASED_ARTICLES_END -->/, `<!-- RELEASED_ARTICLES_START -->${section}<!-- RELEASED_ARTICLES_END -->`);
  } else {
    html = html.replace("</main>", `<!-- RELEASED_ARTICLES_START -->${section}<!-- RELEASED_ARTICLES_END -->\n    </main>`);
  }
  await fs.writeFile(indexPath, html, "utf8");
}

function homepageImageSrc(src) {
  if (!src) return fallbackImage;
  if (src.startsWith("../")) return src.replace(/^\.\.\//, "");
  return src;
}

function displayDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return value || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function renderLatestStory(article, index) {
  const href = `articles/${article.slug}.html`;
  const image = homepageImageSrc(article.image);
  const alt = article.imageAlt || article.title;
  const timeAgo = index === 0 ? '<span class="time-ago">Just published</span>' : "";
  return `<article class="story-row">
            <a class="story-image" href="${href}">
              <img
                src="${escapeAttribute(image)}"
                alt="${escapeAttribute(alt)}"
              />
            </a>
            <div class="story-copy">
              <div class="story-meta"><span>${escapeHtml(displayDate(article.date))}</span><span>${escapeHtml(article.author || "PhotoMorning Staff")}</span></div>
              <h3><a href="${href}">${escapeHtml(article.title)}</a></h3>
              <p>${escapeHtml(excerpt(article.deck, 180))}</p>
              ${timeAgo}
            </div>
          </article>`;
}

function shuffled(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

async function updateLatestFeed(articles) {
  const latestArticles = articles.slice(0, 4);
  if (!latestArticles.length) return 0;

  const indexPath = path.join(root, "index.html");
  let html = await fs.readFile(indexPath, "utf8");
  const latestBlock = `<!-- LATEST_RELEASES_START -->
          ${latestArticles.map((article, index) => renderLatestStory(article, index)).join("\n\n          ")}
          <!-- LATEST_RELEASES_END -->`;

  if (html.includes("<!-- LATEST_RELEASES_START -->")) {
    html = html.replace(/<!-- LATEST_RELEASES_START -->[\s\S]*?<!-- LATEST_RELEASES_END -->/, latestBlock);
  } else {
    html = html.replace(/(<section class="latest-feed"[\s\S]*?<div class="section-heading">[\s\S]*?<\/div>\s*)/, `$1\n          ${latestBlock}\n\n`);
  }

  await fs.writeFile(indexPath, html, "utf8");
  return latestArticles.length;
}

async function updateFeaturedGuides() {
  const articles = JSON.parse(await fs.readFile(path.join(root, "articles.json"), "utf8"));
  const selectedArticles = shuffled(articles).slice(0, 5);
  const indexPath = path.join(root, "index.html");
  let html = await fs.readFile(indexPath, "utf8");
  const links = selectedArticles
    .map((article) => `            <a href="articles/${article.slug}.html">${escapeHtml(article.title)}</a>`)
    .join("\n");
  const section = `<section class="guide-list">
            <div class="section-heading compact">
              <h2>Featured Guides</h2>
              <a href="/">More Guides ></a>
            </div>
${links}
          </section>`;

  html = html.replace(/<section class="guide-list">\s*<div class="section-heading compact">\s*<h2>Featured Guides<\/h2>[\s\S]*?<\/section>/, section);
  await fs.writeFile(indexPath, html, "utf8");
  return selectedArticles.length;
}

function rootImagePathFromArticleSrc(src) {
  if (src.startsWith("../assets/images/")) return src.replace("../", "");
  if (src.startsWith("assets/images/")) return src;
  return "";
}

async function refreshPublishedReleaseImages() {
  const publishedArticles = await readPublishedReleases();
  if (!publishedArticles.length) return { updated: 0, articles: publishedArticles };

  let updated = 0;
  const refreshedArticles = [];
  for (const article of publishedArticles) {
    const filePath = path.join(articleDir, `${article.slug}.html`);
    if (!(await pathExists(filePath))) {
      refreshedArticles.push(article);
      continue;
    }

    let html = await fs.readFile(filePath, "utf8");
    const localImages = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]*assets\/images\/[^"]+\.avif)"/g)].map((match) => match[1]);
    const preferredImage = localImages.map(rootImagePathFromArticleSrc).find(Boolean) || (/^https?:\/\//i.test(article.image || "") ? fallbackImage : "");
    if (!preferredImage || article.image === preferredImage) {
      refreshedArticles.push(article);
      continue;
    }

    const articleImageSrc = preferredImage.startsWith("assets/") ? `../${preferredImage}` : preferredImage;
    html = html.replace(/(<figure class="article-hero-image">[\s\S]*?<img\s+src=")[^"]+("[\s\S]*?<\/figure>)/, `$1${articleImageSrc}$2`);
    await fs.writeFile(filePath, html, "utf8");
    refreshedArticles.push({ ...article, image: preferredImage });
    updated += 1;
  }

  if (updated) {
    await writePublishedReleases(refreshedArticles);

    const articlesJsonPath = path.join(root, "articles.json");
    const current = JSON.parse(await fs.readFile(articlesJsonPath, "utf8"));
    const merged = [
      ...refreshedArticles,
      ...current.filter((article) => !refreshedArticles.some((released) => released.slug === article.slug)),
    ];
    await fs.writeFile(articlesJsonPath, JSON.stringify(merged, null, 2), "utf8");
    await updateReleasedSection(refreshedArticles);
    await updateHomepageLead(refreshedArticles[0]);
  }

  return { updated, articles: refreshedArticles };
}

function pageMetaFromHtml(html, file, articles) {
  const relativeFile = path.relative(root, file).replace(/\\/g, "/");
  const isArticle = relativeFile.startsWith("articles/");
  const slug = isArticle ? path.basename(relativeFile, ".html") : "";
  const article = isArticle ? articles.find((item) => item.slug === slug) : null;
  const rawTitle =
    article?.title ||
    stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "") ||
    stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || siteName);
  const title = rawTitle.replace(/\s+-\s+PhotoMorning\s*$/i, "").trim();
  const description = article?.deck
    ? seoDescription(article.deck)
    : rootPageDescription(relativeFile, html);
  const urlPath = relativeFile === "index.html" ? "" : relativeFile;
  const canonical = absoluteUrl(urlPath);
  const images = collectSeoImages(html, file, article);
  const published = isArticle ? isoDate(article?.date) : isoDate();
  const modified = isoDate();

  return {
    isArticle,
    slug,
    title: title || siteName,
    description,
    canonical,
    images,
    published,
    modified,
    author: article?.author || "PhotoMorning Staff",
    category: article?.category || "Photography",
    relativeFile,
  };
}

function rootPageDescription(relativeFile, html) {
  const descriptions = {
    "index.html": "PhotoMorning covers photography news, camera reviews, visual culture, creator stories, and practical field-tested gear insight.",
    "about.html": "Learn about PhotoMorning, an independent photography publication focused on cameras, image culture, creators, and honest field reporting.",
    "contact.html": "Contact PhotoMorning for editorial questions, reader feedback, corrections, partnership ideas, and photography-related inquiries.",
    "advertise.html": "Advertise with PhotoMorning to reach photographers, camera buyers, visual creators, and imaging professionals.",
    "privacy-policy.html": "Read the PhotoMorning privacy policy, including how site information, analytics, communications, and reader data are handled.",
  };
  return seoDescription(descriptions[relativeFile] || stripTags(html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] || ""));
}

function collectSeoImages(html, file, article) {
  const seen = new Set();
  const images = [];
  const add = (src) => {
    if (!src) return;
    const url = imageSrcToAbsolute(src, file);
    if (!url || seen.has(url)) return;
    seen.add(url);
    images.push(url);
  };

  add(article?.image);
  for (const match of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
    add(match[1]);
  }
  if (!images.length) {
    add(fallbackImage);
  }
  return images.slice(0, 6);
}

function imageSrcToAbsolute(src, file) {
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("assets/")) return absoluteUrl(src);
  if (src.startsWith("/assets/")) return absoluteUrl(src.slice(1));
  const fromRoot = path.relative(root, path.resolve(path.dirname(file), src)).replace(/\\/g, "/");
  if (fromRoot.startsWith("..")) return "";
  return absoluteUrl(fromRoot);
}

function renderSeoBlock(meta) {
  const graph = [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}#/schema/WebSite`,
      url: siteUrl,
      name: siteName,
      description: siteDescription,
      inLanguage: "en-US",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}?s={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
      publisher: {
        "@type": "Organization",
        "@id": `${siteUrl}#/schema/Organization`,
        name: siteName,
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl(fallbackImage),
          contentUrl: absoluteUrl(fallbackImage),
          width: 512,
          height: 512,
        },
      },
    },
    {
      "@type": "WebPage",
      "@id": meta.canonical,
      url: meta.canonical,
      name: meta.title,
      description: meta.description,
      inLanguage: "en-US",
      isPartOf: { "@id": `${siteUrl}#/schema/WebSite` },
      breadcrumb: {
        "@type": "BreadcrumbList",
        "@id": `${meta.canonical}#/schema/BreadcrumbList`,
        itemListElement: [
          { "@type": "ListItem", position: 1, item: siteUrl, name: siteName },
          ...(meta.isArticle
            ? [
                { "@type": "ListItem", position: 2, item: absoluteUrl("articles/"), name: "Articles" },
                { "@type": "ListItem", position: 3, name: meta.title },
              ]
            : [{ "@type": "ListItem", position: 2, name: meta.title }]),
        ],
      },
      potentialAction: { "@type": "ReadAction", target: meta.canonical },
      datePublished: meta.published,
      dateModified: meta.modified,
      author: {
        "@type": "Person",
        name: meta.author,
      },
    },
  ];

  const imageTags = meta.images
    .map((image, index) => {
      const size = index === 0 ? `\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="800" />` : "";
      return `    <meta property="og:image" content="${escapeAttribute(image)}" />${size}`;
    })
    .join("\n");
  const articleMeta = meta.isArticle
    ? `\n    <meta property="article:published_time" content="${escapeAttribute(meta.published)}" />\n    <meta property="article:modified_time" content="${escapeAttribute(meta.modified)}" />`
    : "";
  const articleJson = meta.isArticle
    ? `\n    <script type="application/ld+json">${jsonScript({
        "@context": "https://schema.org",
        "@type": "Article",
        mainEntityOfPage: { "@type": "WebPage", "@id": meta.canonical },
        headline: meta.title,
        image: {
          "@type": "ImageObject",
          url: meta.images[0],
          width: 1200,
          height: 800,
        },
        datePublished: meta.published,
        dateModified: meta.modified,
        author: { "@type": "Person", name: meta.author, url: siteUrl },
        publisher: {
          "@type": "Organization",
          name: siteName,
          logo: {
            "@type": "ImageObject",
            url: absoluteUrl(fallbackImage),
            width: 60,
            height: 60,
          },
        },
        description: meta.description,
        articleSection: meta.category,
      })}</script>`
    : "";

  return `    <!-- PhotoMorning SEO metadata -->
    <meta name="robots" content="max-snippet:-1,max-image-preview:standard,max-video-preview:-1" />
    <link rel="canonical" href="${escapeAttribute(meta.canonical)}" />
    <meta name="description" content="${escapeAttribute(meta.description)}" />
    <meta property="og:type" content="${meta.isArticle ? "article" : "website"}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:site_name" content="${siteName}" />
    <meta property="og:title" content="${escapeAttribute(meta.title)}" />
    <meta property="og:description" content="${escapeAttribute(meta.description)}" />
    <meta property="og:url" content="${escapeAttribute(meta.canonical)}" />
${imageTags}${articleMeta}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttribute(meta.title)}" />
    <meta name="twitter:description" content="${escapeAttribute(meta.description)}" />
    <meta name="twitter:image" content="${escapeAttribute(meta.images[0])}" />
    <meta name="google-site-verification" content="${googleSiteVerification}" />
    <script type="application/ld+json">${jsonScript({ "@context": "https://schema.org", "@graph": graph })}</script>${articleJson}
    <!-- / PhotoMorning SEO metadata -->`;
}

async function applySeoMetadata() {
  const articlesJsonPath = path.join(root, "articles.json");
  const articles = JSON.parse(await fs.readFile(articlesJsonPath, "utf8"));
  const htmlFiles = [
    ...rootPages.map((file) => path.join(root, file)),
    ...(await fs.readdir(articleDir)).filter((file) => file.endsWith(".html")).map((file) => path.join(articleDir, file)),
  ];

  for (const file of htmlFiles) {
    let html = await fs.readFile(file, "utf8");
    html = html.replace(/\n?\s*<!-- PhotoMorning SEO metadata -->[\s\S]*?<!-- \/ PhotoMorning SEO metadata -->/g, "");
    const meta = pageMetaFromHtml(html, file, articles);
    const block = renderSeoBlock(meta);
    html = html.replace(/(<title>[\s\S]*?<\/title>\s*)/i, `$1\n${block}\n`);
    await fs.writeFile(file, html, "utf8");
  }

  return htmlFiles.length;
}

async function writeSearchIndexFiles() {
  const articlesJsonPath = path.join(root, "articles.json");
  const articles = JSON.parse(await fs.readFile(articlesJsonPath, "utf8"));
  const articlesBySlug = new Map(articles.map((article) => [article.slug, article]));
  const articleFiles = (await fs.readdir(articleDir))
    .filter((file) => file.endsWith(".html"))
    .map((file) => {
      const slug = path.basename(file, ".html");
      const article = articlesBySlug.get(slug);
      return {
        slug,
        date: article?.date,
        category: article?.category,
      };
    });
  const urls = [
    { loc: siteUrl, lastmod: new Date().toISOString().slice(0, 10), priority: "1.0" },
    ...rootPages
      .filter((file) => file !== "index.html")
      .map((file) => ({ loc: absoluteUrl(file), lastmod: new Date().toISOString().slice(0, 10), priority: "0.7" })),
    ...articleFiles.map((article) => ({
      loc: absoluteUrl(`articles/${article.slug}.html`),
      lastmod: isoDate(article.date).slice(0, 10),
      priority: article.category === "Released" ? "0.9" : "0.8",
    })),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (item) => `  <url>
    <loc>${escapeHtml(item.loc)}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;
  const robots = `User-agent: *
Allow: /

Sitemap: ${absoluteUrl("sitemap.xml")}
`;

  await fs.writeFile(path.join(root, "sitemap.xml"), sitemap, "utf8");
  await fs.writeFile(path.join(root, "robots.txt"), robots, "utf8");
  return urls.length;
}

async function copyRecursive(source, destination) {
  const stat = await fs.stat(source);
  if (stat.isDirectory()) {
    await fs.mkdir(destination, { recursive: true });
    const entries = await fs.readdir(source);
    await Promise.all(entries.map((entry) => copyRecursive(path.join(source, entry), path.join(destination, entry))));
  } else {
    await fs.copyFile(source, destination);
  }
}

async function rebuildDeployDir() {
  await fs.rm(deployDir, { recursive: true, force: true });
  await fs.mkdir(deployDir, { recursive: true });
  const files = ["index.html", "about.html", "contact.html", "advertise.html", "privacy-policy.html", "styles.css", "script.js", "articles.json", "sitemap.xml", "robots.txt", "CNAME", "_headers", "_redirects"];
  await Promise.all(files.map((file) => fs.copyFile(path.join(root, file), path.join(deployDir, file))));
  await copyRecursive(path.join(root, "articles"), path.join(deployDir, "articles"));
  if (await pathExists(path.join(root, "go"))) {
    await copyRecursive(path.join(root, "go"), path.join(deployDir, "go"));
  }
  if (await pathExists(path.join(root, "assets"))) {
    await copyRecursive(path.join(root, "assets"), path.join(deployDir, "assets"));
  }
}

async function createZip() {
  const zipPath = path.join(root, "photomorning-site.zip");
  await fs.rm(zipPath, { force: true });
  await execFileAsync("powershell", [
    "-NoProfile",
    "-Command",
    "$items=@('index.html','about.html','contact.html','advertise.html','privacy-policy.html','styles.css','script.js','articles','go','articles.json','assets','sitemap.xml','robots.txt','CNAME','_headers','_redirects'); Compress-Archive -Path $items -DestinationPath photomorning-site.zip -Force",
  ], { cwd: root });
}

function imageFilename(url) {
  const parsed = new URL(url);
  const base = path
    .basename(parsed.pathname, path.extname(parsed.pathname))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "image";
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 10);
  return `${base}-${hash}.avif`;
}

async function toAvif(bytes) {
  return getSharp()(bytes, { limitInputPixels: false })
    .rotate()
    .resize({ width: 2200, height: 2200, fit: "inside", withoutEnlargement: true })
    .avif({ quality: 76, effort: 5 })
    .toBuffer();
}

async function downloadImage(url) {
  await fs.mkdir(assetImageDir, { recursive: true });
  const finalName = imageFilename(url);
  const finalPath = path.join(assetImageDir, finalName);
  if (await pathExists(finalPath)) return finalName;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "PhotoMorningBot/1.0",
      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "Referer": new URL(url).origin,
    },
  });

  if (!response.ok) {
    throw new Error(`Image download failed ${response.status}: ${url}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Image download returned ${contentType || "unknown content type"}: ${url}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(finalPath, await toAvif(bytes));

  return finalName;
}

async function convertLocalImageAssets() {
  if (!(await pathExists(assetImageDir))) return { converted: 0 };

  const entries = await fs.readdir(assetImageDir, { withFileTypes: true });
  const sourceFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(path.extname(name).toLowerCase()));
  const renamed = new Map();

  for (const name of sourceFiles) {
    const sourcePath = path.join(assetImageDir, name);
    const targetName = `${path.basename(name, path.extname(name))}.avif`;
    const targetPath = path.join(assetImageDir, targetName);
    if (!(await pathExists(targetPath))) {
      const bytes = await fs.readFile(sourcePath);
      await fs.writeFile(targetPath, await toAvif(bytes));
    }
    await fs.rm(sourcePath, { force: true });
    renamed.set(name, targetName);
  }

  if (renamed.size) {
    const htmlFiles = [
      ...rootPages.map((file) => path.join(root, file)),
      ...(await fs.readdir(articleDir)).filter((file) => file.endsWith(".html")).map((file) => path.join(articleDir, file)),
    ];

    for (const file of htmlFiles) {
      let html = await fs.readFile(file, "utf8");
      for (const [oldName, newName] of renamed) {
        html = html.split(`assets/images/${oldName}`).join(`assets/images/${newName}`);
        html = html.split(`../assets/images/${oldName}`).join(`../assets/images/${newName}`);
      }
      await fs.writeFile(file, html, "utf8");
    }
  }

  return { converted: renamed.size };
}

async function clearReleasedDirectory() {
  const resolvedReleaseDir = path.resolve(releaseDir);
  const resolvedRoot = path.resolve(root);
  if (!resolvedReleaseDir.startsWith(`${resolvedRoot}${path.sep}`) || path.basename(resolvedReleaseDir) !== "released") {
    throw new Error(`Refusing to clear unexpected release directory: ${resolvedReleaseDir}`);
  }
  if (!(await pathExists(resolvedReleaseDir))) return 0;

  const entries = await fs.readdir(resolvedReleaseDir);
  await Promise.all(entries.map((entry) => fs.rm(path.join(resolvedReleaseDir, entry), { recursive: true, force: true })));
  return entries.length;
}

async function localizeExternalImages() {
  const htmlFiles = [
    ...rootPages.map((file) => path.join(root, file)),
    ...(await fs.readdir(articleDir)).filter((file) => file.endsWith(".html")).map((file) => path.join(articleDir, file)),
  ];
  const downloaded = new Map();
  const failed = [];

  for (const file of htmlFiles) {
    let html = await fs.readFile(file, "utf8");
    const urls = [...html.matchAll(/<img\b[^>]*\bsrc="(https?:\/\/[^"]+)"/g)].map((match) => match[1]);
    if (!urls.length) continue;

    for (const url of [...new Set(urls)]) {
      if (!downloaded.has(url)) {
        try {
          downloaded.set(url, await downloadImage(url));
        } catch (error) {
          failed.push({ url, message: error.message });
          downloaded.set(url, null);
        }
      }

      if (!downloaded.get(url)) continue;

      const relativePrefix = path.dirname(file) === root ? "assets/images" : "../assets/images";
      const localSrc = `${relativePrefix}/${downloaded.get(url)}`;
      html = html.split(url).join(localSrc);
    }

    await fs.writeFile(file, html, "utf8");
  }

  for (const item of failed) {
    console.warn(`Warning: ${item.message}`);
  }

  return {
    localized: [...downloaded.values()].filter(Boolean).length,
    failed: failed.length,
  };
}

async function main() {
  await updateAssetVersions();
  await writeAdoramaJumpPage();
  await generateBaseArticles();
  const releasedResult = await syncReleasedArticles();
  await updateArticleRelatedLists();
  const adPages = await insertAdoramaAds();
  const imageResult = await localizeExternalImages();
  const localImageResult = await convertLocalImageAssets();
  const refreshedReleaseImages = await refreshPublishedReleaseImages();
  const latestFeedItems = await updateLatestFeed(refreshedReleaseImages.articles);
  const featuredGuideItems = await updateFeaturedGuides();
  const normalizedHomeLinks = await normalizeHomeLinks();
  const seoPages = await applySeoMetadata();
  const sitemapUrls = await writeSearchIndexFiles();
  await rebuildDeployDir();
  await createZip();
  const clearedReleasedItems = await clearReleasedDirectory();
  console.log(`Built PhotoMorning with asset version ${version}. Released articles synced: ${releasedResult.newArticles.length}. Published released articles: ${refreshedReleaseImages.articles.length}. Adorama ad pages updated: ${adPages}. Release thumbnails refreshed: ${refreshedReleaseImages.updated}. Latest feed items: ${latestFeedItems}. Featured guide items: ${featuredGuideItems}. Home links normalized: ${normalizedHomeLinks}. SEO pages updated: ${seoPages}. Sitemap URLs: ${sitemapUrls}. Released items cleared: ${clearedReleasedItems}. External images localized: ${imageResult.localized}. Local images converted to AVIF: ${localImageResult.converted}. Failed: ${imageResult.failed}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
