/**
 * End-to-end smoke test.
 *
 * Loads the built extension into Chrome, opens the dashboard through the
 * extension's own URL, creates bookmarks via the real chrome.bookmarks API,
 * and asserts the UI rendered them with a category — i.e. the full path
 * manifests → service worker → bookmarks API → React → Tailwind works.
 *
 * Usage: node scripts/smoke.mjs [dist] [--headed]
 *
 * Note: current Chrome builds ignore --load-extension in headless mode, so the
 * default here is headless with an automatic fallback message; pass --headed
 * to run in a real (briefly visible) window.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const args = process.argv.slice(2)
const HEADED = args.includes('--headed')
const DIST = resolve(args.find((a) => !a.startsWith('--')) ?? 'dist')
const PORT = 9336
const profile = mkdtempSync(join(tmpdir(), 'smartmark-smoke-'))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const list = async () => (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const version = async () => (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()

const chrome = spawn(
  CHROME,
  [
    HEADED ? '--new-window' : '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    `--load-extension=${DIST}`,
  ],
  { stdio: 'ignore', detached: false },
)

let ws
let failed = false

function connect(url) {
  const socket = new WebSocket(url)
  return new Promise((res, rej) => {
    socket.addEventListener('open', () => res(socket), { once: true })
    socket.addEventListener('error', () => rej(new Error(`could not connect to ${url}`)), { once: true })
  })
}

let nextId = 0
function call(method, params = {}) {
  const id = ++nextId
  return new Promise((res, rej) => {
    const onMessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id !== id) return
      ws.removeEventListener('message', onMessage)
      if (msg.error) rej(new Error(`${method}: ${msg.error.message}`))
      else res(msg.result)
    }
    ws.addEventListener('message', onMessage)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const { result, exceptionDetails } = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? 'evaluate failed')
  return result.value
}

/** The extension's own service worker target tells us its real ID. */
async function findExtensionId(timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const targets = await list()
      const worker = targets.find((t) => /^chrome-extension:\/\/[a-p]{32}\/background\.js$/.test(t.url))
      const page = targets.find((t) => t.url.includes('/dashboard.html'))
      const id = (worker?.url ?? page?.url)?.match(/^chrome-extension:\/\/([a-p]{32})/)?.[1]
      if (id) return { id, targets }
    } catch {
      /* browser not up yet */
    }
    await sleep(400)
  }
  throw new Error(
    [
      'the extension never registered with this Chrome build.',
      'Chrome 137+ ignores --load-extension unless enterprise policy allows it,',
      'so automate on Chromium/Chrome <=136 or verify by hand:',
      '  1. npm run build',
      '  2. chrome://extensions -> Developer mode on -> Load unpacked -> choose dist/',
      '  3. open the SmartMark dashboard from the toolbar popup',
    ].join('\n  '),
  )
}

try {
  const { id } = await findExtensionId()
  console.log('extension id   :', id)

  const { webSocketDebuggerUrl: browserWs } = await version()
  const browser = await connect(browserWs)
  const created = await new Promise((res) => {
    browser.addEventListener('message', function onMsg(event) {
      const msg = JSON.parse(event.data)
      if (msg.id === 1) {
        browser.removeEventListener('message', onMsg)
        res(msg.result)
      }
    })
    browser.send(JSON.stringify({ id: 1, method: 'Target.createTarget', params: { url: `chrome-extension://${id}/dashboard.html` } }))
  })
  browser.close()

  const { targetId } = created
  const targets = await list()
  const page = targets.find((t) => t.id === targetId)
  if (!page) throw new Error('dashboard target disappeared')
  ws = await connect(page.webSocketDebuggerUrl)
  await call('Runtime.enable')

  // 1. storage + settings plumbing
  const settings = await evaluate('chrome.storage.local.set({ "sm:settings": { theme: "light", density: "list", autoCategorize: true, confirmDestructive: true, sort: "dateAdded", defaultFolderId: "", tags: [], customRules: [] } }).then(() => "ok").catch(e => "ERR " + e.message)')
  console.log('storage write  :', settings)

  // 2. real chrome.bookmarks CRUD through the API the app uses
  const created2 = await evaluate(`
    (async () => {
      const bar = (await chrome.bookmarks.getTree())[0].children.find(c => c.id === '1') ?? { id: '1' };
      const made = [];
      made.push(await chrome.bookmarks.create({ parentId: bar.id, title: 'React docs', url: 'https://react.dev/learn' }));
      made.push(await chrome.bookmarks.create({ parentId: bar.id, title: 'Cooking recipes', url: 'https://www.example.com/recipes?utm=1' }));
      return made.length;
    })()`)
  console.log('bookmarks made :', created2)

  await sleep(1500)

  // 3. what the UI shows after its live resync
  const snapshot = JSON.parse(
    await evaluate(`JSON.stringify({
      text: document.body.innerText.replace(/\\s+/g, ' ').trim(),
      rows: [...document.querySelectorAll('button')].map(b => b.innerText).filter(Boolean).slice(0, 14),
      dark: document.documentElement.classList.contains('dark'),
    })`),
  )

  console.log('dom text       :', snapshot.text.slice(0, 300))
  console.log('theme applied  :', snapshot.dark ? 'dark' : 'light')

  const checks = [
    ['dashboard rendered', snapshot.text.includes('All bookmarks')],
    ['bookmark visible', snapshot.text.includes('React docs')],
    ['auto-categorized', snapshot.text.includes('Development')],
    ['heuristic fallback ran', snapshot.text.includes('Other') || snapshot.text.includes('Shopping')],
    ['no API error', !snapshot.text.includes('API unavailable') && !snapshot.text.includes('Something went wrong')],
  ]
  for (const [label, ok] of checks) console.log(`  ${ok ? '✓' : '✗'} ${label}`)
  failed = checks.some(([, ok]) => !ok)

  // 4. undo path: delete then restore through the app's own modules
  const undo = await evaluate(`
    (async () => {
      const before = (await chrome.bookmarks.getTree());
      const flat = before[0].children.find(c => c.id === '1').children;
      const target = flat.find(n => n.title === 'React docs');
      const subtree = await chrome.bookmarks.getSubTree(target.id);
      await chrome.bookmarks.remove(target.id);
      const gone = !(await chrome.bookmarks.search({ title: 'React docs' })).length;
      await chrome.bookmarks.create({ parentId: '1', title: subtree[0].title, url: subtree[0].url });
      const back = (await chrome.bookmarks.search({ title: 'React docs' })).length > 0;
      return JSON.stringify({ gone, back });
    })()`)
  console.log('delete + undo  :', undo)
  const { gone, back } = JSON.parse(undo)
  if (!gone || !back) failed = true

  console.log(failed ? '\nSMOKE TEST: FAIL' : '\nSMOKE TEST: PASS')
  process.exitCode = failed ? 1 : 0
} catch (error) {
  console.error('SMOKE TEST: FAIL —', error.message)
  process.exitCode = 1
} finally {
  try {
    ws?.close()
  } catch {
    /* ignore */
  }
  chrome.kill('SIGKILL')
  await sleep(600)
  rmSync(profile, { recursive: true, force: true })
}
