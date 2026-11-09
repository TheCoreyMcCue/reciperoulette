# reciperoulette

A recipe box for our household: save recipes from photos, pasted text, websites and social media, keep a **rotation** of go-to dinners, and hit **Spin** when nobody can decide.

- **Recipe box**: search by title, ingredient or tag, filter by tag or rotation, notes, cook counts.
- **Cook mode**: large text, step by step or as a checklist, ingredient checkboxes, screen stays awake.
- **Roulette**: spins the rotation with a short slot-machine animation. Recipes cooked in the last 7 days sit out a turn, "Not this week" skips one for 7 days, and you can filter by max time or tag.
- **AI import** (Claude): photos/screenshots (several per recipe), pasted text, recipe URLs (schema.org JSON-LD first), Instagram/TikTok/YouTube/Facebook/Pinterest. Every import ends on an editable review screen; nothing is saved without you.
- **Sticky login**: sign in once; sessions slide forward for a year every time the app is used.
- **PWA**: installable, Android share target, `/import?url=` for an iOS Shortcut.
- **Households**: data belongs to a household, not a user, so two people share one box. Multi-household ready.

Stack: Next.js 16 (App Router, Cache Components) · TypeScript (strict) · Tailwind CSS 4 · DynamoDB (AWS SDK v3, single-table) · Anthropic API (`@anthropic-ai/sdk`) · Zod · Vitest · pnpm.

---

## Local setup

Prerequisites: Node.js ≥ 20.12, pnpm ≥ 10, an AWS account, an Anthropic API key.

```bash
pnpm install
cp .env.example .env.local        # then fill it in (see below)
pnpm db:setup                     # creates the DynamoDB table (safe to re-run)
pnpm db:seed                      # optional: demo household + sample recipes
pnpm dev                          # http://localhost:3000
```

### 1. Create the IAM user

1. AWS Console → **IAM → Users → Create user** (e.g. `reciperoulette`), no console access.
2. **Add permissions → Create inline policy → JSON**, and paste the policy below. Replace `REGION`, `ACCOUNT_ID` and, if you changed it, the table name.
3. **Security credentials → Create access key** ("Application running outside AWS"). Put the key and secret in `DYNAMO_ACCESS_KEY_ID` / `DYNAMO_SECRET_ACCESS_KEY`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AppReadWrite",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:ConditionCheckItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/reciperoulette",
        "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/reciperoulette/index/*"
      ]
    },
    {
      "Sid": "Maintenance",
      "Effect": "Allow",
      "Action": ["dynamodb:Scan"],
      "Resource": "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/reciperoulette"
    },
    {
      "Sid": "TableSetup",
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateTable",
        "dynamodb:DescribeTable",
        "dynamodb:UpdateTable",
        "dynamodb:DescribeTimeToLive",
        "dynamodb:UpdateTimeToLive"
      ],
      "Resource": "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/reciperoulette"
    }
  ]
}
```

`TransactWriteItems` is authorised through the per-item actions above (`PutItem`, `ConditionCheckItem`, …), so it doesn't need its own entry. The `TableSetup` statement is only used by `pnpm db:setup`, and `Maintenance` (Scan) only by `pnpm db:backfill-units`. To keep it out of production, you can create a second key for setup and remove that statement from the key Vercel uses.

### 2. Fill in `.env.local`

Every variable is documented in [`.env.example`](.env.example). The essentials:

| Variable | Notes |
|---|---|
| `DYNAMO_REGION` | e.g. `eu-central-1` (Frankfurt), close to the Netherlands |
| `DYNAMO_ACCESS_KEY_ID` / `DYNAMO_SECRET_ACCESS_KEY` | From step 1. **Not** `AWS_*`, because Vercel reserves those names |
| `DYNAMO_TABLE_NAME` | Defaults to `reciperoulette` |
| `ANTHROPIC_API_KEY` | From console.anthropic.com |
| `ANTHROPIC_MODEL` | Defaults to `claude-sonnet-5-5` |
| `AI_DAILY_PARSE_LIMIT` | AI imports per household per day (default 50) |
| `SESSION_SECRET` | `openssl rand -base64 48`. Changing it signs everyone out |
| `APP_URL` | `http://localhost:3000` locally; your Vercel URL in production (used in invite links) |
| `SIGNUP_ALLOWED_EMAILS` | Emails allowed to create a **new** household. Everyone else joins by invite |

### 3. Create your household

Open `/signup` with an email from `SIGNUP_ALLOWED_EMAILS`. Then go to **Settings → Invite someone → Create invite link** and send the link to your partner. Invite links work once and expire after 7 days.

With seed data you can also sign in as `demo@example.com` or `partner@example.com`, password `letscook123`.

### Working without AWS

`pnpm dev:memory` runs the app against an in-memory DynamoDB fake, seeded with the demo data. Data disappears when the server stops. This is handy for UI work. Alternatively, point `DYNAMO_ENDPOINT` at [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) (`docker run -p 8000:8000 amazon/dynamodb-local`) and run `pnpm db:setup` against it.

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm dev:memory` | Dev server with an in-memory, seeded database |
| `pnpm build` / `pnpm start` | Production build / server |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | ESLint · `next typegen` + `tsc` · Vitest |
| `pnpm db:setup` | Create the table, `GSI1` and TTL if missing (idempotent) |
| `pnpm db:seed` | Demo household, two users, six recipes (idempotent) |
| `pnpm db:backfill-units` | Classify existing recipes' ingredients for unit conversion (`--dry-run`, `--no-ai`, `--force`) |

---

## Deploying to Vercel

1. Push the repo to GitHub and **Import** it in Vercel (framework preset: Next.js; build command and output detected automatically; pnpm is picked up from `packageManager`).
2. **Settings → Environment Variables**: add every variable from `.env.local` (Production and Preview). Set `APP_URL` to the deployed URL, e.g. `https://reciperoulette.vercel.app`.
3. **Settings → Functions → Function Region**: pick the region closest to your table, e.g. **Frankfurt (fra1)** for `eu-central-1`. Each request makes a few DynamoDB calls, so this matters for snappiness.
4. Run `pnpm db:setup` once from your machine with production credentials, or reuse the table you created locally.
5. Deploy, open `/signup`, create the household, invite your partner.

Notes:
- All AWS and AI work runs in Node.js functions. `/api/import` allows up to 60 s (`maxDuration`), which is within the Hobby plan limit.
- Photos are resized in the browser to about 1600 px (JPEG, ≤ 450 KB each, max 6), so requests stay under Vercel's 4.5 MB body limit.
- If you add a custom domain, update `APP_URL` so invite links use it.

---

## Installing on a phone

**Android (Chrome):** open the app → menu → **Install app**. reciperoulette then appears in the share sheet. Share a link or text from Instagram, TikTok, YouTube or the browser and it opens straight into the import flow.

**iPhone (Safari):** Share → **Add to Home Screen**. iOS doesn't support web share targets, so add a Shortcut for the share sheet:

### iOS Shortcut: "Save to reciperoulette"

1. Open the **Shortcuts** app → **+** (new shortcut). Name it *Save to reciperoulette*.
2. Tap the **ⓘ** (details) button → turn on **Show in Share Sheet**. Under *Share Sheet Types*, keep **URLs** and **Text** (deselect the rest). Close the details.
3. At the top, the shortcut now says *Receive **URLs and Text** from **Share Sheet***. Tap *If there's no input* → **Ask For** → *Text*. This lets you also run it from the home screen and paste a link.
4. Add action **URL Encode** → input: **Shortcut Input**.
5. Add action **Text** and type `https://YOUR-APP.vercel.app/import?text=`, then insert the **URL Encoded Text** variable right after `=`.
6. Add action **Open URLs** → input: the **Text** from step 5.
7. Done. In Instagram, TikTok, YouTube or Safari: **Share → Save to reciperoulette**. The app opens, reads the shared link (or text), and shows the review screen.

Using `?text=` for everything is deliberate: `/import` finds a link inside shared text on its own, so a single Shortcut covers "link" shares, "caption" shares and "Check out this reel! https://…" shares. `/import?url=…` works too.

The first time, Safari may ask you to sign in. The session lasts for a year after the last use, so this happens once. If you added the app to the Home Screen, iOS keeps the home-screen app's cookies separate from Safari's, so the Shortcut (which opens Safari) needs its own one-time sign-in.

---

## How it works

### Folder structure

```
app/                     routes (App Router)
  (auth)/                login, signup, join/[code] + server actions
  (app)/                 signed-in app: recipes, roulette, add, import, settings
  api/import/route.ts    the one import endpoint (text | images | url)
  manifest.ts            PWA manifest + share target
components/              UI (ui/ primitives, recipes/, roulette/, import/)
lib/
  auth/                  sessions, passwords, accounts, cookies
  db/                    DynamoDB client + repositories (only place that talks to DynamoDB)
  ai/                    parseRecipe(): prompt, output schema, mapping
  importers/             one file per source: text, photo, url, jsonld, social/*, fetch-page, ssrf
  recipes/               recipe schema (Zod), ingredient parser, formatting
  roulette.ts            pure selection logic
scripts/                 db-setup, db-seed
dev/                     in-memory DynamoDB fake (tests + pnpm dev:memory)
tests/fixtures/          sample inputs (Dutch WhatsApp text, messy web copy, JSON-LD page)
```

### Data model (single table)

| PK | SK | Item |
|---|---|---|
| `USER#<userId>` | `PROFILE` | name, email, passwordHash, householdId |
| `EMAIL#<email>` | `IDENTITY` | → userId (enforces unique emails) |
| `HOUSEHOLD#<hid>` | `META` | household name |
| `HOUSEHOLD#<hid>` | `MEMBER#<userId>` | name, email, role (owner/member) |
| `HOUSEHOLD#<hid>` | `RECIPE#<rid>` | the recipe |
| `HOUSEHOLD#<hid>` | `RECIPESRC#<rid>` | raw source text (for re-parsing) |
| `HOUSEHOLD#<hid>` | `USAGE#<iso>#<rand>` | AI token usage per call (TTL 90 days) |
| `INVITE#<codeHash>` | `META` | householdId, expiry (TTL 7 days) |
| `SESSION#<tokenHash>` | `META` | userId, householdId, lastSeenAt, userAgent, TTL; `GSI1: USER#<userId> / SESSION#<createdAt>` |
| `RATE#<bucket>` | `WINDOW#<n>` | rate-limit counters (TTL) |

Why this differs from the suggested shape:
- **Users are keyed by id, with an `EMAIL#` pointer.** Signup writes both in one transaction, which makes emails unique and lets someone change their email later. Google sign-in or magic links become another identity item (`IDENTITY#google#<sub>` → userId) without touching the user record.
- **Raw source text lives in its own item.** Listing recipes stays light, and every item stays far below DynamoDB's 400 KB limit (source text is capped at 100 K characters). No images or base64 are ever stored.
- **One GSI**, used only to list a user's sessions on the Settings page. Everything a household sees is one partition (`HOUSEHOLD#<hid>`), so the recipe list is a single query, and household isolation follows from the key design. The householdId always comes from the session, never from the request.
- **Room for later features:** ingredients carry an optional numeric `quantityValue` alongside the as-written `quantity`, ready for servings scaling and shopping lists.

### Authentication

- Argon2id password hashes (`@node-rs/argon2`).
- Login creates a 256-bit random token. Only its HMAC-SHA256 (keyed with `SESSION_SECRET`) is stored. The raw token lives only in an `httpOnly; Secure; SameSite=Lax` cookie with a 1-year expiry, never in localStorage.
- **Sliding expiration** happens in `proxy.ts`. When the short-lived `rr_fresh` marker cookie is missing (at most every 6 h), the session is checked in DynamoDB. If `lastSeenAt` is more than a day old, it and the TTL are bumped, and the session cookie is re-issued with a fresh 1-year expiry. Anyone who opens the app at least once a year stays signed in.
- The proxy is only an optimistic gate. Every page, Server Action and route handler validates the session itself (`requireSession` / `requireApiSession`) and scopes every query to its household.
- Login attempts are rate limited: 10 per 15 min per email and 50 per 15 min per IP. Signups are limited to 10 per hour per IP. These use DynamoDB counters with TTL.
- Settings lists your devices (parsed from the user agent) with per-device sign-out.

### AI import

All parsing goes through `parseRecipe()` in `lib/ai/parse-recipe.ts`:
- **One stable system prompt**, prompt-cached. It covers: extract without inventing, split ingredients, preserve groups, suggest tags and cuisine, detect "not a recipe", keep the original language unless asked to translate.
- **Structured outputs** with a Zod schema (`client.beta.messages.parse` + `betaZodOutputFormat`), at `effort: "low"` for speed.
- **Validation and fallback:** output is validated again with Zod and mapped onto the app's stricter recipe schema. If validation fails, it retries once with the error included, then falls back to whatever came back.
- **Refusal fallback:** server-side refusal fallbacks are enabled (`fallbacks: "default"`). If a safety classifier declines, the API retries on a fallback model.
- **Cost control:** a per-household daily limit (`AI_DAILY_PARSE_LIMIT`). Token usage is logged per call, both to DynamoDB (shown in **Settings → AI imports this month**) and as a structured `{"event":"ai.parse",…}` line in the Vercel logs.

Import paths:
- **Photos:** resized and compressed in the browser (HEIC decoded natively on Safari, or with a lazily loaded converter elsewhere), sent to Claude, then discarded.
- **Text:** a paste box. It's also the target for shared text.
- **URLs:** an SSRF-safe fetch:
  - http/https only, standard ports
  - DNS answers checked against private, loopback, link-local and metadata ranges at connect time, so redirects and DNS rebinding are covered
  - 10 s timeout, 3 MB cap, browser user agent
  
  Then: schema.org JSON-LD if present (Claude only cleans it up; if the AI is unavailable, the JSON-LD is used as-is), otherwise the page's readable text. `og:image` becomes the recipe image.
- **Social:** one adapter per platform in `lib/importers/social/`; see below.

### Unit conversion

Recipes can be shown as written, in metric or in US units: in **Settings → Units** (saved to your profile), or with the toggle on a recipe and in cook mode. Conversion only happens on screen; the stored recipe is never changed. Converted amounts show "≈" with a dotted underline, and you can tap one to see it as written.

- **Classified once, converted many times.** Each ingredient stores a `category` (`dry`, `liquid`, `fat`, `count`, `unknown`) and, for dry and fat ingredients and thick liquids, a `gramsPerCup` density. These come from the curated table in `lib/units/densities.ts` (English and Dutch names; table values always win), or from Claude's estimate during import for anything not in the table. They're applied when a recipe is saved. Run `pnpm db:backfill-units` once for recipes saved before this feature.
- **Metric:**
  - Cups of dry or fat ingredients become grams (1 cup flour ≈ 120 g). Liquids become ml or litres. Thick liquids such as honey and syrup become grams.
  - Butter is always grams, including sticks (113 g each) and spoons.
  - Spoons up to 4 tbsp stay spoons.
  - oz means weight for solids and fluid ounces for liquids.
  - Counted items ("3 eggs", "3 cloves garlic") never change.
  - If an ingredient is unclassified or has no density, it's shown as written.
- **US:** weights become oz or lb, and volumes become tsp, tbsp, cups or quarts, with friendly fractions. Weights stay weights: grams of flour become ounces, not cups.
- **Rounding:**
  - grams: to the nearest 1 under 50 g, 5 under 250 g, 10 above; kg to one decimal
  - ml: to the nearest 5 under 500 ml, 10 above; litres to one decimal
- **Oven temperatures in steps** convert too: 350°F → 175°C, Celsius or "graden" → °F in US mode, and gas marks get a temperature added.
- **Cup size:** a US cup is 240 ml (`US_CUP_ML` in `lib/units/constants.ts`).
- **Servings scaling:** `convertIngredient(ingredient, system, { scale })` already scales first, then converts, then rounds, ready for when scaling is added.

### Roulette

`lib/roulette.ts` has pure functions with unit tests:
- The candidates are the rotation, after the time and tag filters.
- "Not this week" recipes are always excluded.
- Recipes cooked in the last 7 days are excluded unless that leaves fewer than 2 candidates. In that case they come back in at a small weight.
- Weights rise with time since a recipe was last cooked: ×0.5 under 2 weeks, ×0.8 under 4 weeks, ×1 after that, and ×1.25 for recipes that have never been cooked.
- "Spin again" avoids repeating the same recipe.

---

## Known limitations

### Social media import

These platforms actively limit what servers can read, so social import is best-effort and degrades gracefully:

| Platform | What we use | Reliability |
|---|---|---|
| YouTube | oEmbed + the full video description from the watch page | Good. Many cooking videos put the recipe in the description. **No transcripts**: they can't be fetched reliably without an API key |
| TikTok | Public oEmbed (returns the caption) | Usually works for public videos; short links (`vm.tiktok.com`) are supported |
| Pinterest | Pin page → the source website link, imported like any URL | Good when the pin links to a recipe site |
| Instagram | Open Graph tags on the post page (oEmbed requires a Facebook app token) | **Unreliable**: Instagram often serves a login wall to servers |
| Facebook | Open Graph tags | **Unreliable**, for the same reason |

If a caption contains the recipe, Claude parses it. If it links to a blog, the link is followed. If it only says "recipe in bio", or we can't read the post at all, the app explains why and offers the fallbacks: **screenshot the post and use Photo** (works almost always) or **paste the caption**. Thumbnails from Instagram and TikTok are signed CDN URLs that expire after a while; when one breaks, the card falls back to a placeholder.

### Other

- Some recipe sites block server-side fetches. For example, AH Allerhande returned 403 during testing. The app then suggests a screenshot or pasting the text. We deliberately don't try to get around bot protection.
- Photos you import aren't stored, so photo-imported recipes have no cover image. You can paste an image link in the edit form. Image uploads (Vercel Blob or S3) would be a small addition.
- Sharing **images** directly into the app (Android share target with files) isn't supported yet; links and text are.
- Search runs over the whole household's recipe list loaded into the page. That's fine for hundreds of recipes; for thousands, move search server-side.
- The service worker only provides an offline page and caches static assets. Recipes aren't available offline yet.

---

## Tests

```bash
pnpm test
```

The suites cover:
- the ingredient line parser (English and Dutch units, unicode fractions, ranges, notes)
- the JSON-LD extractor (with an HTML fixture), durations and yields
- readable-text extraction, SSRF guards
- the URL and social import decision logic, caption heuristics, platform parsers
- roulette selection and weighting
- session logic (hashing, sliding expiry, expiry cleanup, concurrent sign-out), passwords, redirects
- the repositories, including household isolation and rate limits
- AI mapping, and `parseRecipe` against a mocked SDK (retry, fallback, not-a-recipe, limits, usage logging)

The DynamoDB-backed tests run against the in-memory fake in `dev/fake-dynamo.ts`.
