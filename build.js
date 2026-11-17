/*
  Site build for homeswithochuko.com
  ----------------------------------
  Netlify runs this automatically on every publish (see netlify.toml).
  It copies the site into /dist, turns each blog post in content/blog/*.md
  into a page at /blog/<slug>.html, builds the /blog/ index page, adds the
  latest posts to the homepage, and updates sitemap.xml.

  You never need to run or edit this to write posts: use homeswithochuko.com/admin
*/
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");

const ROOT = __dirname;
const OUT = path.join(ROOT, "dist");
const POSTS_DIR = path.join(ROOT, "content", "blog");
const SITE = "https://homeswithochuko.com";
const CMS_CONFIG = `# Blog editor settings (Decap CMS). Open the editor at https://homeswithochuko.com/admin
backend:
  name: github
  repo: RealtorOchuko/homeswithochuko
  branch: main

site_url: https://homeswithochuko.com
display_url: https://homeswithochuko.com
logo_url: https://homeswithochuko.com/images/ochuko-hero.jpg

media_folder: images/uploads
public_folder: /images/uploads

collections:
  - name: blog
    label: Blog posts
    label_singular: Blog post
    description: Posts appear at homeswithochuko.com/blog about 1 minute after you click Publish.
    folder: content/blog
    create: true
    slug: "{{slug}}"
    preview_path: "blog/{{slug}}.html"
    sortable_fields: [date, title]
    summary: "{{title}} ({{date}})"
    fields:
      - {label: Title, name: title, widget: string}
      - {label: Publish date, name: date, widget: datetime, format: "YYYY-MM-DD", date_format: "MMM D, YYYY", time_format: false, hint: "Future dates stay hidden until that day's next publish."}
      - {label: Summary, name: description, widget: text, hint: "1–2 sentences. Shows on the blog page, in Google results and on social shares."}
      - {label: Category, name: category, widget: select, default: Selling, options: [Market Update, Selling, Buying, Investing, Relocation, Neighborhoods, Homeowner Tips]}
      - {label: Area, name: area, widget: select, required: false, options: [Bay Area, San Francisco, Peninsula, Oakland, Fremont, Newark, San Jose]}
      - {label: Cover image, name: image, widget: image, required: false, hint: "Landscape photo, at least 1600px wide."}
      - {label: Button at the end, name: cta, widget: select, default: Home valuation, options: [Home valuation, Book a call, Search homes]}
      - {label: Draft (hide from site), name: draft, widget: boolean, default: false}
      - {label: Post, name: body, widget: markdown}
`;
const SKIP = new Set(["dist", "node_modules", "content", ".git", ".github", "build.js", "package.json", "package-lock.json", "netlify.toml", "README.md", ".gitignore"]);

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const toDate = d => { if (!d) return new Date(); const x = d instanceof Date ? d : new Date(String(d).length === 10 ? d + "T12:00:00Z" : d); return isNaN(x) ? new Date() : x; };
const iso = d => d.toISOString().slice(0, 10);
const nice = d => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const slugify = s => String(s).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const readMins = txt => Math.max(1, Math.round(txt.split(/\s+/).length / 220));

// ---------- 1. fresh copy of the static site ----------
// Works whether the files were uploaded with their folders (admin/, images/, content/blog/)
// or all together in one flat list.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const isStray = f => /^download( \(\d+\))?$/i.test(f) || /^index \(\d+\)\.html$/i.test(f) || f === "config.yml" || /\.md$/i.test(f);
for (const f of fs.readdirSync(ROOT)) {
  if (SKIP.has(f) || f.startsWith(".") || isStray(f)) continue;
  const src = path.join(ROOT, f);
  // photos uploaded loose at the top level go in /images, where the pages expect them
  const dest = /^ochuko-(hero|about)\.jpe?g$/i.test(f) ? path.join(OUT, "images", f) : path.join(OUT, f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}
// The real homepage is the index file with the hero section (guards against a mix-up between duplicate index files)
const homeCandidates = fs.readdirSync(ROOT).filter(f => /^index( \(\d+\))?\.html$/i.test(f)).map(f => path.join(ROOT, f));
const homeSrc = homeCandidates.find(f => fs.readFileSync(f, "utf8").includes('class="hero"'));
if (!homeSrc) throw new Error("Could not find the homepage (index.html with the hero section)");
fs.copyFileSync(homeSrc, path.join(OUT, "index.html"));
// Blog editor: always generated here so it works even if the admin folder was not uploaded
fs.mkdirSync(path.join(OUT, "admin"), { recursive: true });
fs.writeFileSync(path.join(OUT, "admin", "index.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Blog editor | Ochuko Ekuke</title></head>
<body><script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script><script>CMS.registerPreviewStyle("/styles.css");</script></body></html>`);
fs.writeFileSync(path.join(OUT, "admin", "config.yml"), CMS_CONFIG);

// ---------- 2. read posts ----------
const postFiles = (fs.existsSync(POSTS_DIR) ? fs.readdirSync(POSTS_DIR).filter(f => f.endsWith(".md")).map(f => path.join(POSTS_DIR, f)) : [])
  .concat(fs.readdirSync(ROOT).filter(f => f.endsWith(".md") && f.toLowerCase() !== "readme.md").map(f => path.join(ROOT, f)))
  .filter((f, i, a) => a.findIndex(x => path.basename(x) === path.basename(f)) === i);
const posts = postFiles
  .map(fp => {
    const f = path.basename(fp);
    const { data, content } = matter(fs.readFileSync(fp, "utf8"));
    const date = toDate(data.date);
    return {
      slug: slugify(f.replace(/\.md$/, "")),
      title: data.title || "Untitled",
      description: data.description || "",
      category: data.category || "Insights",
      area: data.area || "",
      image: data.image || "",
      cta: data.cta || "Home valuation",
      draft: !!data.draft,
      date, html: marked.parse(content || ""), mins: readMins(content || "")
    };
  })
  .filter(p => !p.draft && p.date <= new Date(Date.now() + 864e5)) // hide drafts and future-dated posts
  .sort((a, b) => b.date - a.date);

// ---------- 3. shared page chrome (absolute paths so it works in /blog/) ----------
const pixel = (() => { const m = fs.readFileSync(path.join(OUT, "index.html"), "utf8").match(/<!-- Meta Pixel Code -->[\s\S]*?<!-- End Meta Pixel Code -->/); return m ? m[0] : ""; })();
const head = ({ title, description, url, image, type = "website", jsonld = "" }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#F7F3EC">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<link rel="canonical" href="${url}">
<link rel="alternate" type="application/rss+xml" title="Ochuko Ekuke Blog" href="/blog/feed.xml">
<meta property="og:type" content="${type}">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
${jsonld}
${pixel}
</head>`;

const header = `<body>
<div class="util"><div class="wrap"><span class="area">Serving San Francisco, the Peninsula, Oakland, Fremont &amp; San Jose</span><span class="links"><a href="#" data-sms>Text me</a><a href="#" data-tel>Call (510) 552-9481</a></span></div></div>
<header><div class="wrap">
  <a href="/" class="brand" aria-label="Ochuko Ekuke home"><span class="mono">OE</span><span><div class="brand-name">Ochuko Ekuke</div><div class="brand-sub">Mosaik Real Estate</div></span></a>
  <nav aria-label="Main"><button class="burger" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <ul>
      <li><a href="/#search">Search Homes</a></li>
      <li><a href="/sell.html">Sell</a></li>
      <li><a href="/home-value.html">Home Value</a></li>
      <li><a href="/#communities">Communities</a></li>
      <li><a href="/blog/" aria-current="page">Blog</a></li>
      <li><a href="/#about">About</a></li>
      <li><a href="/#start" class="btn btn-dark">Let's Talk</a></li>
    </ul></nav>
</div></header>
<main id="top">`;

const footer = fs.readFileSync(path.join(OUT, "home-value.html"), "utf8")
  .match(/<footer>[\s\S]*<\/footer>/)[0]
  .replace(/href="(?!https?:|#|\/|mailto:|tel:|sms:)([^"]+)"/g, 'href="/$1"');
const tail = `</main>
${footer}
<div class="mbar"><a href="#" data-sms>Text</a><a href="#" data-tel>Call</a><a href="/home-value.html" class="hl">Home Value</a></div>
<script src="/site.js"></script>
</body>
</html>`;

const CTAS = {
  "Home valuation": { eyebrow: "Free home valuation", h: "What's your home <em>worth</em>?", p: "Get a personal valuation built from recent sales near you, in your inbox within 24 hours.", btn: "Get my home value", href: "/home-value.html" },
  "Book a call":    { eyebrow: "Let's talk", h: "Have a question about <em>your</em> move?", p: "Book a free 30-minute call. No pressure, just a clear picture of where you stand.", btn: "Book a 30-minute call", href: "#", cal: true },
  "Search homes":   { eyebrow: "Search homes", h: "See what's on the <em>market</em>.", p: "Browse live MLS listings across the Bay Area, updated throughout the day.", btn: "Search homes", href: "/#search" }
};
const card = p => `<a class="post-card" href="/blog/${p.slug}.html">
  <div class="pc-img"${p.image ? ` style="background-image:url('${esc(p.image)}')"` : ""}><span>${esc(p.category)}</span></div>
  <div class="pc-body"><div class="pc-meta">${nice(p.date)}${p.area ? " · " + esc(p.area) : ""}</div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><span class="more">Read more →</span></div>
</a>`;

// ---------- 4. post pages ----------
fs.mkdirSync(path.join(OUT, "blog"), { recursive: true });
for (const p of posts) {
  const url = `${SITE}/blog/${p.slug}.html`;
  const img = p.image ? (p.image.startsWith("http") ? p.image : SITE + p.image) : `${SITE}/images/ochuko-hero.jpg`;
  const cta = CTAS[p.cta] || CTAS["Home valuation"];
  const related = posts.filter(x => x !== p).slice(0, 3);
  const jsonld = `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.description, datePublished: iso(p.date), image: img, url, author: { "@type": "Person", name: "Ochuko Ekuke", url: SITE + "/" }, publisher: { "@id": SITE + "/#agent" } })}</script>`;
  const html = `${head({ title: `${p.title} | Ochuko Ekuke`, description: p.description, url, image: img, type: "article", jsonld })}
${header}
<div class="wrap crumbs"><a href="/">Home</a> &nbsp;/&nbsp; <a href="/blog/">Blog</a> &nbsp;/&nbsp; ${esc(p.category)}</div>
<article class="post">
  <div class="post-head wrap">
    <span class="eyebrow">${esc(p.category)}${p.area ? " · " + esc(p.area) : ""}</span>
    <h1>${esc(p.title)}</h1>
    ${p.description ? `<p class="lede">${esc(p.description)}</p>` : ""}
    <div class="post-by"><img src="/images/ochuko-hero.jpg" alt=""><div><strong>Ochuko Ekuke</strong>, REALTOR®<br><span>${nice(p.date)} · ${p.mins} min read</span></div></div>
  </div>
  ${p.image ? `<figure class="post-cover wrap"><img src="${esc(p.image)}" alt="${esc(p.title)}"></figure>` : ""}
  <div class="post-body wrap">${p.html}</div>
</article>
<section class="hv-band">
  <div class="wrap">
    <div><span class="eyebrow">${cta.eyebrow}</span><h2>${cta.h}</h2><p class="lede">${cta.p}</p></div>
    <div><a class="btn btn-dark" href="${cta.href}"${cta.cal ? " data-cal" : ""}>${cta.btn}</a></div>
  </div>
</section>
${related.length ? `<section><div class="wrap"><div class="head"><div><span class="eyebrow">Keep reading</span><h2>More from the <em>blog</em>.</h2></div></div><div class="post-grid">${related.map(card).join("")}</div></div></section>` : ""}
${tail}`;
  fs.writeFileSync(path.join(OUT, "blog", `${p.slug}.html`), html);
}

// ---------- 5. blog index ----------
const cats = [...new Set(posts.map(p => p.category))];
fs.writeFileSync(path.join(OUT, "blog", "index.html"), `${head({ title: "Bay Area Real Estate Blog | Ochuko Ekuke", description: "Market updates, selling and buying advice, and investor notes for San Francisco, the Peninsula, Oakland, Fremont, Newark and San Jose from Ochuko Ekuke, REALTOR®.", url: SITE + "/blog/", image: SITE + "/images/ochuko-hero.jpg" })}
${header}
<section class="hero c-hero" style="padding-bottom:40px">
  <div class="wrap">
    <span class="eyebrow">The blog</span>
    <h1>Bay Area real estate, <em>explained</em>.</h1>
    <p class="lede">Market updates, selling and buying advice, and notes for investors, written for the neighborhoods I work in every day.</p>
    ${cats.length > 1 ? `<div class="chips" id="blogCats" style="margin-top:28px"><button type="button" class="chip on" data-cat="">All</button>${cats.map(c => `<button type="button" class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : ""}
  </div>
</section>
<section style="padding-top:0"><div class="wrap">
  ${posts.length ? `<div class="post-grid" id="postGrid">${posts.map(p => card(p).replace('<a class="post-card"', `<a class="post-card" data-cat="${esc(p.category)}"`)).join("")}</div>` : `<p class="lede">New posts are on the way. Check back soon.</p>`}
</div></section>
<section class="hv-band"><div class="wrap"><div><span class="eyebrow">Free home valuation</span><h2>What's your home <em>worth</em>?</h2><p class="lede">A personal valuation built from recent sales near you, in your inbox within 24 hours.</p></div><div><a class="btn btn-dark" href="/home-value.html">Get my home value</a></div></div></section>
<script>document.querySelectorAll("#blogCats .chip").forEach(c=>c.addEventListener("click",()=>{document.querySelectorAll("#blogCats .chip").forEach(x=>x.classList.remove("on"));c.classList.add("on");document.querySelectorAll("#postGrid .post-card").forEach(p=>p.style.display=!c.dataset.cat||p.dataset.cat===c.dataset.cat?"":"none")}))</script>
${tail}`);

// ---------- 6. latest posts on the homepage ----------
const idxPath = path.join(OUT, "index.html");
const latest = posts.slice(0, 3);
fs.writeFileSync(idxPath, fs.readFileSync(idxPath, "utf8").replace("<!-- BLOG_LATEST -->", latest.length ? `<section id="blog">
  <div class="wrap">
    <div class="head reveal"><div><span class="eyebrow">From the blog</span><h2>Notes on the <em>market</em>.</h2></div><a href="/blog/" class="btn btn-line">All posts</a></div>
    <div class="post-grid reveal">${latest.map(card).join("")}</div>
  </div>
</section>` : ""));

// ---------- 7. sitemap + RSS ----------
const smPath = path.join(OUT, "sitemap.xml");
const today = iso(new Date());
const extra = [`  <url><loc>${SITE}/blog/</loc><lastmod>${posts[0] ? iso(posts[0].date) : today}</lastmod></url>`]
  .concat(posts.map(p => `  <url><loc>${SITE}/blog/${p.slug}.html</loc><lastmod>${iso(p.date)}</lastmod></url>`)).join("\n");
fs.writeFileSync(smPath, fs.readFileSync(smPath, "utf8").replace("</urlset>", extra + "\n</urlset>"));
fs.writeFileSync(path.join(OUT, "blog", "feed.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Ochuko Ekuke | Bay Area Real Estate Blog</title><link>${SITE}/blog/</link><description>Bay Area real estate market updates and advice.</description>
${posts.map(p => `<item><title>${esc(p.title)}</title><link>${SITE}/blog/${p.slug}.html</link><guid>${SITE}/blog/${p.slug}.html</guid><pubDate>${p.date.toUTCString()}</pubDate><description>${esc(p.description)}</description>${p.image ? `<enclosure url="${esc(p.image.startsWith("http") ? p.image : SITE + p.image)}" type="image/jpeg" length="0"/>` : ""}</item>`).join("\n")}
</channel></rss>`);

console.log(`Built ${posts.length} blog post(s) into /dist`);
