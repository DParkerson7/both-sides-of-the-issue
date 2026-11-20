import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(root, "content");
const docsDir = path.join(root, "docs");

const ICONS = {
  shield: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v6c0 4.2 2.8 7.2 7 9 4.2-1.8 7-4.8 7-9V6l-7-3Z"/><path d="M9 12l2 2 4-4"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3Z"/></svg>`,
  book: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M4 5.5A2.5 2.5 0 0 1 6.5 8H20"/></svg>`,
  coins: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="9" cy="8" rx="5" ry="3"/><path d="M4 8v4c0 1.7 2.2 3 5 3s5-1.3 5-3V8"/><path d="M14 11.2c1.8.4 4 .2 5.2-.8C20.3 9.6 21 8.8 21 8s-.7-1.6-1.8-2.2"/><path d="M14 15c1.6.5 3.6.4 5-.5 1.1-.7 2-1.5 2-2.3V8"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5L3 8l9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>`,
  door: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V5a2 2 0 0 1 2-2h10v18"/><path d="M15 21H5"/><path d="M10 12h.01"/></svg>`,
  message: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16.5 3 21l4.8-1.6A9 9 0 1 0 5 16.5Z"/></svg>`,
  scales: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M8 21h8M12 6h7l-2.2 5.2a3 3 0 0 1-5.6 0L12 6ZM12 6H5l2.2 5.2a3 3 0 0 0 5.6 0"/></svg>`,
  house: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4 11 8-7 8 7"/><path d="M6 10.5V20h12v-9.5"/></svg>`,
  badge: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 9.2 5.2 6 5l-.2 3.2L3 11l2.2 2.6L5.4 17 8.6 17.2 12 20l3.4-2.8L19 17l.2-3.4L21 11l-2.8-2.8L18 5l-3.2.2L12 3Z"/><path d="m9 12 2 2 4-4"/></svg>`,
};

const TABS = [
  { id: "what", label: "What it is", heading: "What the issue is" },
  { id: "disagree", label: "Why people disagree", heading: "Why people disagree" },
  { id: "sides", label: "Both sides", heading: "The strongest case for each side" },
  { id: "agree", label: "Where they might agree", heading: "Where they might agree" },
  { id: "questions", label: "Questions", heading: "Questions to think about" },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inline(value) {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function paragraphs(items = []) {
  return items.map((item) => `<p>${inline(item)}</p>`).join("\n");
}

function bulletList(items = [], ordered = false) {
  if (!items.length) return "";
  const tag = ordered ? "ol" : "ul";
  return `<${tag}>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</${tag}>`;
}

function soonFlag(section) {
  return section && section.placeholder ? `<p class="soon-flag">Coming soon</p>` : "";
}

function renderSimpleSection(section) {
  return `${soonFlag(section)}
    ${paragraphs(section.paragraphs)}
    ${bulletList(section.bullets)}`;
}

function renderSides(section) {
  const a = section.a;
  const b = section.b;
  return `${soonFlag(section)}
    ${section.intro ? `<p class="sides-intro">${inline(section.intro)}</p>` : ""}
    <div class="sides">
      <section class="side side-a">
        <h3>${escapeHtml(a.title)}</h3>
        ${soonFlag(a)}
        ${paragraphs(a.paragraphs)}
        ${bulletList(a.bullets)}
      </section>
      <section class="side side-b">
        <h3>${escapeHtml(b.title)}</h3>
        ${soonFlag(b)}
        ${paragraphs(b.paragraphs)}
        ${bulletList(b.bullets)}
      </section>
    </div>`;
}

function renderQuestions(section) {
  return `${soonFlag(section)}
    ${paragraphs(section.intro ? [section.intro] : [])}
    ${bulletList(section.items, true)}`;
}

function renderPanel(tab, issue) {
  const section = issue.sections[tab.id];
  let body = "";
  if (tab.id === "sides") body = renderSides(section);
  else if (tab.id === "questions") body = renderQuestions(section);
  else body = renderSimpleSection(section);
  const active = tab.id === "what" ? " is-active" : "";
  return `<section class="panel${active}" id="${tab.id}" role="tabpanel" aria-labelledby="tab-${tab.id}" data-panel tabindex="0">
    <h2>${tab.heading}</h2>
    ${body}
  </section>`;
}

function renderWords(issue) {
  if (!issue.words || !issue.words.length) return "";
  const rows = issue.words
    .map(
      (word) => `<div>
        <dt>${escapeHtml(word.term)}</dt>
        <dd>${inline(word.meaning)}</dd>
      </div>`,
    )
    .join("");
  return `<section class="extra" aria-labelledby="words-title">
    <h2 id="words-title">Words to know</h2>
    <dl class="words">${rows}</dl>
  </section>`;
}

function renderSources(issue) {
  const items = (issue.sources || [])
    .map((source) => {
      assert(source.url.startsWith("https://"), `${issue.slug} has a source that is not an https URL`);
      return `<li>
        <a href="${escapeHtml(source.url)}">${escapeHtml(source.title)}</a>
        ${source.note ? `<span class="source-note">${inline(source.note)}</span>` : ""}
      </li>`;
    })
    .join("");
  return `<section class="extra" aria-labelledby="sources-title">
    <h2 id="sources-title">Sources and further reading</h2>
    <ul class="source-list">${items}</ul>
    <p class="fine">${inline(issue.sourceNote || "")}</p>
  </section>`;
}

function shell({ title, description, depth, current, body }) {
  const prefix = depth === 0 ? "" : "../".repeat(depth);
  const home = `${prefix}index.html`;
  const about = `${prefix}about.html`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#0b4f4c">
  <link rel="icon" href="${prefix}favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${prefix}assets/styles.css">
  <script>document.documentElement.classList.add("js");</script>
</head>
<body>
  <a class="skip" href="#content">Skip to content</a>
  <header class="site-header">
    <a class="brand" href="${home}">
      <span class="brand-mark" aria-hidden="true"><span></span><span></span></span>
      <span class="brand-text">
        <span class="brand-name">Both Sides</span>
        <span class="brand-of">of the Issue</span>
      </span>
    </a>
    <nav class="site-nav" aria-label="Site">
      <a href="${home}"${current === "issues" ? ' aria-current="page"' : ""}>Issues</a>
      <a href="${about}"${current === "about" ? ' aria-current="page"' : ""}>About</a>
    </nav>
  </header>
  <main id="content" class="wrap">
    ${body}
  </main>
  <footer class="site-footer">
    <div class="wrap">
      <p>Both Sides of the Issue explains divisive U.S. public questions for grades 6–8. It gives each side its strongest fair case. It is not legal, tax, or investment advice, and it is not affiliated with Just Facts.</p>
      <p><a href="${about}">How we try to be fair</a></p>
    </div>
  </footer>
  <script src="${prefix}assets/site.js"></script>
</body>
</html>
`;
}

function collectText(value, bucket) {
  if (typeof value === "string") bucket.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectText(item, bucket));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => collectText(item, bucket));
}

function validateIssue(issue, file) {
  const required = ["slug", "title", "order", "status", "icon", "question", "summary", "justFactsUrl", "sections", "sources"];
  for (const key of required) assert(issue[key] !== undefined, `${file} is missing ${key}`);
  assert(ICONS[issue.icon], `${file} uses an unknown icon: ${issue.icon}`);
  assert(["published", "coming-soon"].includes(issue.status), `${file} has an unknown status`);
  assert(issue.justFactsUrl.startsWith("https://www.justfacts.org/"), `${file} must link a justfacts.org page`);
  for (const tab of TABS) assert(issue.sections[tab.id], `${file} is missing the ${tab.id} section`);
  if (issue.status === "coming-soon") {
    const texts = [];
    collectText(issue.sections, texts);
    const joined = texts.join("\n");
    assert(!/\$\s?\d|\d+(?:\.\d+)?\s*%|\b\d{2,}\b|\btrillion\b|\bbillion\b|\bmillion\b/i.test(joined), `${file} looks like it contains a statistic. Placeholder pages must not invent numbers.`);
    for (const tab of TABS) {
      const section = issue.sections[tab.id];
      const marked = section.placeholder || (tab.id === "sides" && section.a?.placeholder && section.b?.placeholder);
      assert(marked, `${file} section ${tab.id} must be marked as a placeholder`);
    }
  } else {
    assert(issue.words && issue.words.length >= 3, `${file} should define words to know`);
    assert(issue.sources.length >= 3, `${file} needs source links`);
    assert(!issue.sections.what.placeholder, `${file} is published but still marked coming soon`);
  }
}

function renderIssue(issue, count) {
  const statusLabel = issue.status === "published" ? "Ready to read" : "Coming soon";
  const banner =
    issue.status === "coming-soon"
      ? `<p class="banner"><strong>Coming soon. </strong>The structure of this page is ready. The explanation is not written yet, and this page does not include statistics. Words to know will be added with the full page.</p>`
      : "";
  const tabs = TABS.map(
    (tab, index) => `<button type="button" role="tab" id="tab-${tab.id}" data-tab="${tab.id}" aria-controls="${tab.id}" aria-selected="${index === 0 ? "true" : "false"}" tabindex="${index === 0 ? "0" : "-1"}">${tab.label}</button>`,
  ).join("");
  const panels = TABS.map((tab) => renderPanel(tab, issue)).join("\n");
  const words = renderWords(issue);
  const belowClass = words ? "below" : "below below-single";
  const body = `<p class="back"><a href="../index.html">All issues</a></p>
    <header class="issue-head">
      <p class="eyebrow">Issue ${issue.order} of ${count} · Grades 6–8 · ${statusLabel}</p>
      <h1>${escapeHtml(issue.title)}</h1>
      <p class="question">${inline(issue.question)}</p>
    </header>
    ${banner}
    <div class="section-nav" role="tablist" aria-label="Sections of this issue" data-tabs>
      ${tabs}
    </div>
    <div class="sheet">
      ${panels}
    </div>
    <div class="${belowClass}">
      ${words}
      ${renderSources(issue)}
    </div>`;
  return shell({
    title: `${issue.title} · Both Sides of the Issue`,
    description: issue.summary,
    depth: 1,
    current: "issues",
    body,
  });
}

function renderHome(site, issues) {
  const cards = issues
    .map((issue) => {
      const ready = issue.status === "published";
      return `<a class="card" href="issues/${issue.slug}.html">
        <span class="card-top">
          <span class="card-icon">${ICONS[issue.icon]}</span>
          <span class="kicker ${ready ? "ready" : "soon"}">${ready ? "Ready to read" : "Coming soon"}</span>
        </span>
        <h3>${escapeHtml(issue.title)}</h3>
        <p class="card-question">${inline(issue.question)}</p>
        <p class="card-summary">${inline(issue.summary)}</p>
        <span class="card-go">${ready ? "Read the page" : "See the outline"}</span>
      </a>`;
    })
    .join("\n");
  const steps = TABS.map((tab) => `<li>${tab.heading}</li>`).join("");
  const body = `<section class="hero">
      <div>
        <p class="eyebrow">For grades 6–8, and anyone who wants a fair briefing</p>
        <h1>Both sides, in plain language.</h1>
        <p class="lede">${inline(site.lede)}</p>
      </div>
      <aside class="how" aria-labelledby="how-title">
        <h2 id="how-title">Every issue page has five short parts</h2>
        <ol>${steps}</ol>
      </aside>
    </section>
    <section aria-labelledby="issues-title">
      <div class="section-heading">
        <h2 id="issues-title">Twelve starter issues</h2>
        <p>Social Security is ready to read. The other pages are outlines, clearly marked Coming soon. They do not include statistics.</p>
      </div>
      <div class="cards">${cards}</div>
    </section>`;
  return shell({
    title: "Both Sides of the Issue",
    description: site.description,
    depth: 0,
    current: "issues",
    body,
  });
}

function renderAbout(about) {
  const blocks = about.sections
    .map((section) => {
      return `<h2>${escapeHtml(section.heading)}</h2>
        ${paragraphs(section.paragraphs)}
        ${bulletList(section.bullets)}`;
    })
    .join("\n");
  const body = `<header class="page-head">
      <p class="eyebrow">About</p>
      <h1>${escapeHtml(about.title)}</h1>
      <p class="lede">${inline(about.lede)}</p>
    </header>
    <article class="prose">${blocks}</article>`;
  return shell({
    title: "About · Both Sides of the Issue",
    description: about.lede,
    depth: 0,
    current: "about",
    body,
  });
}

const site = JSON.parse(await readFile(path.join(contentDir, "site.json"), "utf8"));
const about = JSON.parse(await readFile(path.join(contentDir, "about.json"), "utf8"));
const issueFiles = (await readdir(path.join(contentDir, "issues"))).filter((name) => name.endsWith(".json")).sort();
const issues = [];
for (const file of issueFiles) {
  const issue = JSON.parse(await readFile(path.join(contentDir, "issues", file), "utf8"));
  assert(file === `${issue.slug}.json`, `${file} must be named ${issue.slug}.json`);
  validateIssue(issue, file);
  issues.push(issue);
}
issues.sort((a, b) => a.order - b.order);
assert(issues.length === 12, `Expected 12 issues, found ${issues.length}`);
assert(new Set(issues.map((issue) => issue.order)).size === 12, "Issue order numbers must be unique");
assert(issues.filter((issue) => issue.status === "published").map((issue) => issue.slug).join() === "social-security", "Only Social Security should be published in this starter");

await rm(docsDir, { recursive: true, force: true });
await mkdir(path.join(docsDir, "issues"), { recursive: true });
await mkdir(path.join(docsDir, "assets", "fonts"), { recursive: true });
await cp(path.join(root, "src", "styles.css"), path.join(docsDir, "assets", "styles.css"));
await cp(path.join(root, "src", "site.js"), path.join(docsDir, "assets", "site.js"));
await cp(path.join(root, "src", "favicon.svg"), path.join(docsDir, "favicon.svg"));
for (const font of await readdir(path.join(root, "src", "fonts"))) {
  await cp(path.join(root, "src", "fonts", font), path.join(docsDir, "assets", "fonts", font));
}
await writeFile(path.join(docsDir, ".nojekyll"), "");
await writeFile(path.join(docsDir, "index.html"), renderHome(site, issues));
await writeFile(path.join(docsDir, "about.html"), renderAbout(about));
for (const issue of issues) {
  await writeFile(path.join(docsDir, "issues", `${issue.slug}.html`), renderIssue(issue, issues.length));
}

console.log(`Built ${issues.length} issues into ${docsDir}`);
