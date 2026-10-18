import { create, ensureFolderPath, getActiveTab, loadLibrary, openDashboard, smartMarkRoot } from './lib/bookmarks.ts'
import { getSettings } from './lib/storage.ts'
import { normalizeUrl } from './lib/url.ts'

const SAGE = '#C8DFDB'
const AMBER = '#E0A458'

/**
 * Service worker. It exists for the two things extension pages cannot do:
 * answering chrome.commands and giving feedback through the toolbar badge.
 */
function badge(text: string, color: string): void {
  void chrome.action.setBadgeText({ text })
  void chrome.action.setBadgeBackgroundColor({ color })
  setTimeout(() => void chrome.action.setBadgeText({ text: '' }), 2200)
}

/** Save the active tab, skipping pages that are already bookmarked (normalized compare). */
async function saveCurrentPage(): Promise<void> {
  const tab = await getActiveTab()
  if (!tab) {
    badge('!', AMBER)
    return
  }

  const settings = await getSettings()
  const existing = await loadLibrary({})
  if (existing.bookmarks.some((b) => normalizeUrl(b.url) === normalizeUrl(tab.url))) {
    badge('✓', SAGE)
    return
  }

  const parentId = settings.defaultFolderId || (await ensureFolderPath(['Inbox'], await smartMarkRoot()))
  await create({ parentId, title: tab.title, url: tab.url })
  badge('✓', SAGE)
}

chrome.commands?.onCommand.addListener((command) => {
  if (command === 'save-current-page') void saveCurrentPage()
  else if (command === 'open-dashboard') void openDashboard()
})

chrome.runtime.onInstalled.addListener((details) => {
  // Open the dashboard once, on install, so the user lands somewhere useful.
  if (details.reason === 'install') void openDashboard()
})

chrome.action?.setBadgeBackgroundColor?.({ color: SAGE })
