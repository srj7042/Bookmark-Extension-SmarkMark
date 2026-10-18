import type { Suggestion } from './types.ts'
import type { CustomRule } from './types.ts'

/**
 * Local, zero-API categorization. Ordered rule sets; first strong signal wins.
 * Everything here is a *suggestion* — the UI always lets the user override,
 * and an override is stored as `meta.category` which outranks every rule.
 */

export const CATEGORIES = [
  'Development',
  'Design',
  'Learning',
  'News & Reading',
  'Productivity',
  'AI & Data',
  'Shopping',
  'Finance',
  'Social',
  'Entertainment',
  'Health & Fitness',
  'Travel',
  'Reference',
  'Other',
] as const

export type CategoryName = (typeof CATEGORIES)[number]

/** Accent used by category cards/avatars. Index-stable, so rules can be reordered freely. */
const ACCENTS = ['blue', 'sky', 'sage', 'sky', 'sage', 'blue', 'sky', 'sage', 'sky', 'blue', 'sage', 'sky', 'sage', 'blue'] as const
export type Accent = (typeof ACCENTS)[number]

export function accentFor(category: string): Accent {
  const i = (CATEGORIES as readonly string[]).indexOf(category)
  return ACCENTS[i < 0 ? ACCENTS.length - 1 : i]
}

const DOMAIN_RULES: Array<[RegExp, CategoryName]> = [
  [/(^|\.)(github|gitlab|bitbucket|stackoverflow|stackexchange|npmjs|mozilla|csstricks|smashingmagazine)\./, 'Development'],
  [/(^|\.)(vercel|netlify|railway|render|herokuapp|cloudflare|digitalocean|linode)\./, 'Development'],
  [/(^|\.)(docker|kubernetes|hashicorp|rust-lang|python|nodejs|golang|jetbrains|postman|localhost)\./, 'Development'],
  [/(^|\.)(figma|dribbble|behance|canva|fonts|unsplash|pexels|framer)\./, 'Design'],
  [/(^|\.)(coursera|udemy|khanacademy|edx|freecodecamp|leetcode|hackerrank|brilliant|duolingo|codecademy|udacity)\./, 'Learning'],
  [/(^|\.)(news\.ycombinator|medium|substack|nytimes|bbc|theguardian|reuters|economist|techcrunch|theverge|wired|arstechnica|apnews|npr)\./, 'News & Reading'],
  [/(^|\.)(notion|airtable|trello|asana|monday|slack|calendly|miro|clickup|todoist|evernote|obsidian)\./, 'Productivity'],
  [/(^|\.)(docs|drive|sheets|slides|mail)\.google\./, 'Productivity'],
  [/(^|\.)(huggingface|kaggle|openai|anthropic|paperswithcode|weightsandbiases|langchain)\./, 'AI & Data'],
  [/(^|\.)(colab\.research)\.google\./, 'AI & Data'],
  [/(^|\.)(amazon|ebay|etsy|aliexpress|alibaba|flipkart|myntra|shopify|walmart|target|ikea)\./, 'Shopping'],
  [/(^|\.)(paypal|stripe|coinbase|binance|kraken|zerodha|groww|moneycontrol|nseindia|bloomberg|fidelity|schwab|chase|wise)\./, 'Finance'],
  [/(^|\.)(twitter|x|facebook|instagram|linkedin|reddit|tiktok|discord|threads|mastodon|pinterest|quora|tumblr)\./, 'Social'],
  [/(^|\.)(youtube|netflix|spotify|twitch|hulu|imdb|soundcloud|vimeo|primevideo|hotstar|disneyplus)\./, 'Entertainment'],
  [/(^|\.)(who|nih|webmd|healthline|mayoclinic|practo|myfitnesspal|strava|fitbit|headspace|calm)\./, 'Health & Fitness'],
  [/(^|\.)(booking|airbnb|tripadvisor|makemytrip|skyscanner|expedia|agoda|trivago|rome2rio|uber|lyft)\./, 'Travel'],
  [/(^|\.)(wikipedia|britannica|merriam-webster|dictionary|thesaurus|archive|gutenberg|jstor|worldcat)\./, 'Reference'],
]

/**
 * Applied to the concatenated `url + title + folderPath`, lowercased.
 * Suffix groups are deliberate: `\blearn\b` misses "learning"/"learners",
 * so stems that commonly inflect carry an explicit suffix alternation.
 * Bare `\bpost\b` is intentionally absent — it would classify "postgres" as Social.
 */
const KEYWORD_RULES: Array<[RegExp, CategoryName]> = [
  [/\b(react|vue|angular|svelte|typescript|javascript|python|golang|rust|java|kotlin|swift|api|sdk|npm|docker|kubernetes|git|css|html|sql|devops|linux|regex|webpack|vite|code|codebase|coders?|coding|debug|develop(er|ers|ment)?)\b/, 'Development'],
  [/\b(design(er|ers|ing)?|ui|ux|figma|wireframes?|typography|palette|logos?|brand(ing)?|icons?|fonts?|mockups?)\b/, 'Design'],
  [/\b(tutorials?|courses?|learn(ing|er|ers)?|guides?|docs|documentation|how to|roadmaps?|cheat ?sheets?|boot ?camps?|lessons?|curriculum)\b/, 'Learning'],
  [/\b(news|articles?|blogs?|blogging|read later|magazines?|press|editorials?|newsletters?)\b/, 'News & Reading'],
  [/\b(todos?|tasks?|notes?|calendar|meetings?|invoices?|spreadsheets?|kanban|workflows?|templates?|dashboards?)\b/, 'Productivity'],
  [/\b(machine learning|deep learning|neural|llms?|datasets?|embeddings?|prompts?|vectors?|models?|ai)\b/, 'AI & Data'],
  [/\b(buy|shop(ping)?|deals?|discounts?|prices?|pricing|coupons?|cart|stores?|checkout|sales?)\b/, 'Shopping'],
  [/\b(banks?|stocks?|invest(ing|ment|ments|or|ors)?|portfolio|tax(es|ation)?|crypto|wallets?|budget(ing)?|financ(e|es|ial)|payroll)\b/, 'Finance'],
  [/\b(chats?|social|feeds?|communit(y|ies)|forums?|profiles?|follow(ing|ers)?)\b/, 'Social'],
  [/\b(movies?|music|games?|gaming|stream(ing|s)?|videos?|podcasts?|series|playlists?|albums?|anime)\b/, 'Entertainment'],
  [/\b(health|healthy|fitness|workouts?|recipes?|diets?|dieting|nutrition|mental|sleep|doctors?|wellness)\b/, 'Health & Fitness'],
  [/\b(travel(ing|s)?|flights?|hotels?|trips?|itinerary|visa|tours?|tourism|vacations?)\b/, 'Travel'],
  [/\b(wiki|wikis|wikipedia|references?|dictionary|manuals?|specs?|rfc|handbooks?|glossary)\b/, 'Reference'],
]

const TLD_RULES: Array<[RegExp, CategoryName]> = [
  [/\.edu$/, 'Learning'],
  [/\.gov$/, 'Reference'],
  [/\.dev$/, 'Development'],
]

/** Categories that mean "SmartMark had nothing useful to say". */
export const FALLBACK_CATEGORY: CategoryName = 'Other'
export const CONFIDENT = 0.5

export type CategorizeInput = {
  url: string
  title: string
  /** Hostname without `www.` */
  domain: string
  /** e.g. "Work / React" */
  folderPath?: string
}

/** Match a user rule. `domain` rules are substring tests, `keyword` rules substring-test url+title+folder. */
function customSuggestion(input: CategorizeInput, rules: CustomRule[]): Suggestion | null {
  if (rules.length === 0) return null
  const host = input.domain.toLowerCase()
  const haystack = `${input.url} ${input.title} ${input.folderPath ?? ''}`.toLowerCase()
  for (const rule of rules) {
    const pattern = rule.pattern.trim().toLowerCase()
    if (!pattern) continue
    const hit = rule.matchOn === 'domain' ? host.includes(pattern) : haystack.includes(pattern)
    if (hit) return { category: rule.category, confidence: 0.95, reason: `Your rule "${rule.pattern}"` }
  }
  return null
}

export function categorize(input: CategorizeInput, rules: CustomRule[] = []): Suggestion {
  const fromRule = customSuggestion(input, rules)
  if (fromRule) return fromRule

  const { url, title, domain, folderPath = '' } = input
  const host = domain.toLowerCase()

  for (const [re, category] of DOMAIN_RULES) {
    if (re.test(host)) return { category, confidence: 0.9, reason: `Known site: ${host}` }
  }

  if (folderPath) {
    const folder = folderPath.toLowerCase()
    for (const [re, category] of KEYWORD_RULES) {
      if (re.test(folder)) return { category, confidence: 0.72, reason: `Inside a "${category}" folder` }
    }
  }

  const haystack = `${url} ${title}`.toLowerCase()
  for (const [re, category] of KEYWORD_RULES) {
    const m = re.exec(haystack)
    if (m) return { category, confidence: 0.6, reason: `Title/URL mentions "${m[0]}"` }
  }

  for (const [re, category] of TLD_RULES) {
    if (re.test(host)) return { category, confidence: 0.55, reason: `Domain ends in ${re.source.replace(/[$\\^]/g, '')}` }
  }

  return { category: FALLBACK_CATEGORY, confidence: 0.15, reason: 'No strong signal' }
}
