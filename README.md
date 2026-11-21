# Both Sides of the Issue

A small static website that explains divisive U.S. public issues in plain language for grades 6–8. Each issue gives the strongest fair case for each side, so disagreement is easier to understand and harder to fake.

Social Security and Global Warming are finished pages. The other ten starter issues are outlines marked **Coming soon**. Those outlines do not include statistics.

The wording on this site is original. [Just Facts](https://www.justfacts.org/) is a research lead and a “read further” link, not a source of copied sentences, charts, or page structure. This project is not affiliated with Just Facts, and it is not legal, tax, or investment advice.

## Layout

| Path | What it is |
| --- | --- |
| `content/site.json` | Home-page introduction |
| `content/about.json` | About page |
| `content/issues/*.json` | One file per issue. This is the file to edit. |
| `scripts/build.mjs` | Turns those files into HTML. No npm packages. |
| `src/` | Styles, the section toggle, fonts, and the icon |
| `docs/` | The built site. GitHub Pages serves this. |
| `.github/workflows/pages.yml` | Builds the site, and deploys it when `main` is pushed |

## Add an issue

1. Copy `content/issues/energy.json` to `content/issues/your-slug.json`. The file name and the `slug` field must match.
2. Set a unique `order` number. The home page sorts by that number.
3. Keep `status` as `"coming-soon"` until the page is actually written. The build rejects a coming-soon page that contains a statistic (a percent, a dollar figure, or words like million, billion, or trillion in the five sections).
4. Fill in the five sections. Use everyday words. Name each side by its idea, not by a political party.
5. When the page is ready, set `"status": "published"`, add at least three entries under `words`, and list primary or government sources before the Just Facts link.
6. Run the build.

Do not invent a number to fill a gap. If a figure is not in a source you checked, leave the sentence out. Label projections as projections. If a third view matters, say so in the section text. Two columns are a tool, not a claim that only two views exist.

### Issue file

```json
{
  "slug": "energy",
  "title": "Energy",
  "order": 2,
  "status": "coming-soon",
  "icon": "bolt",
  "question": "The one-sentence question the page answers.",
  "summary": "One or two sentences for the home-page card.",
  "justFactsUrl": "https://www.justfacts.org/energy",
  "sourceNote": "A short note under the source list.",
  "sections": {
    "what": { "placeholder": true, "paragraphs": ["..."], "bullets": [] },
    "disagree": { "placeholder": true, "paragraphs": ["..."] },
    "sides": {
      "placeholder": true,
      "intro": "One sentence above the two columns.",
      "a": { "title": "Name the idea", "paragraphs": ["..."] },
      "b": { "title": "Name the other idea", "paragraphs": ["..."] }
    },
    "agree": { "placeholder": true, "paragraphs": ["..."] },
    "questions": { "placeholder": true, "items": ["A question with no answer printed under it."] }
  },
  "words": [{ "term": "Payroll tax", "meaning": "A short definition." }],
  "sources": [
    { "title": "Official source", "url": "https://example.gov/", "note": "What this source supports." },
    { "title": "Just Facts: Energy", "url": "https://www.justfacts.org/energy", "note": "Further reading." }
  ]
}
```

Paragraphs can include `**bold**` and links written as `[label](https://example.gov/)`. A section can also include `"charts": ["chart-id"]` and an `"after"` list of paragraphs that should sit under the charts. Define each chart once, on the issue, in a top-level `"charts"` array. Point `dataFile` at a CSV in `content/data/`. The builder draws an inline SVG, a caption (what the chart shows, what it does not show, which argument usually cites it, and the source), and a table of the numbers. `type` is `"line"` or `"bar"`. Line charts include zero on the axis unless you set `"includeZero": false`. Do not trim an axis to make a change look bigger.

Icons already in the builder: `shield`, `bolt`, `globe`, `book`, `coins`, `layers`, `plus`, `door`, `message`, `scales`, `house`, `badge`. Add a new icon in `scripts/build.mjs` if you need one.

On a published page, remove `"placeholder": true`. On an outline, leave it, so the page shows a Coming soon label.

## Preview on your computer

You need Node.js 20 or newer. No install step.

```bash
node scripts/build.mjs
python3 -m http.server 4173 --directory docs
```

Then open `http://localhost:4173`. `npm run build` and `npm run preview` do the same thing if you prefer npm scripts. They do not download packages.

## Publish on GitHub Pages

The repo includes `.github/workflows/pages.yml`.

1. Push the site to the `main` branch.
2. In the repository on GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

A push to `main` runs the workflow, rebuilds `docs/` from the content files, and deploys that folder. Pull requests run the build only, so a broken content file fails before it is merged.

The built HTML is also committed in `docs/`. Run `node scripts/build.mjs` before you commit content changes so the folder matches the JSON. Links are relative, so the same files work on your computer, on a project site such as `https://<user>.github.io/both-sides-of-the-issue/`, and on a custom domain.

If you would rather not use Actions, Settings → Pages can serve the `docs/` folder on the `main` branch instead. You then have to rebuild and commit `docs/` yourself whenever the JSON changes.

## How the pages behave

Each issue page has a five-part control:

1. What the issue is
2. Why people disagree
3. The strongest case for each side (the two cases sit side by side)
4. Where they might agree
5. Questions to think about

The control is a keyboard-friendly tab list. Tab to it, then use the arrow keys. Home and End jump to the ends. Words to know and Sources sit under the control. Without JavaScript, all five parts show at once. Printing does the same.

## Social Security sources

The Social Security page was checked on November 20, 2026 against the 2026 Social Security Trustees Report and the other government pages linked at the bottom of that page. A few figures that showed up in an early set of study notes were left out or rewritten where the Trustees Report itself was more precise — for example, the size of a tax increase or a benefit cut that would close the 75-year gap. If you update the page, re-read the current Trustees Report rather than copying a number from memory.
