const SETTINGS_KEY = 'apiSettings';
const SCRAPE_FILE = 'scripts/content-script.js';

const EBAY_URL_REGEX = /https?:\/\/www\.ebay\.[^\/]+\/itm\//i;

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.disable();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url) return;
  handleTabState(tabId, tab.url);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url) return;
  handleTabState(tabId, tab.url);
});

async function handleTabState(tabId, url) {
  if (EBAY_URL_REGEX.test(url)) {
    await chrome.action.enable(tabId);
  } else {
    await chrome.action.disable(tabId);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return false;
  }

  switch (message.type) {
    case 'scrape-product':
      runScraper(message.tabId)
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;
    case 'fetch-settings':
      getSettings().then((settings) => sendResponse({ success: true, settings }));
      return true;
    case 'save-settings':
      saveSettings(message.settings)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;
    case 'import-product':
      importProduct(message.payload)
        .then((response) => sendResponse({ success: true, response }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;
    default:
      return false;
  }
});

async function runScraper(tabId) {
  if (!tabId) {
    throw new Error('No active tab to scrape');
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    files: [SCRAPE_FILE]
  });

  if (!result || !result.itemId) {
    throw new Error('Unable to read eBay listing data. Is this a product page?');
  }

  return result;
}

async function getSettings() {
  const { [SETTINGS_KEY]: stored } = await chrome.storage.sync.get(SETTINGS_KEY);
  return stored || { apiUrl: '', apiKey: '' };
}

async function saveSettings(settings) {
  if (!settings || !settings.apiUrl || !settings.apiKey) {
    throw new Error('API URL and Key are required');
  }

  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

async function importProduct(payload) {
  const settings = await getSettings();

  if (!settings.apiUrl || !settings.apiKey) {
    throw new Error('Please configure the WooCommerce API in the extension settings.');
  }

  try {
    const response = await fetch(settings.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': settings.apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMessage = `WooCommerce API responded with ${response.status}`;
      try {
        const json = JSON.parse(text);
        errorMessage += `: ${json.message || json.error || text}`;
      } catch {
        errorMessage += `: ${text.substring(0, 200)}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      throw new Error(
        'Failed to connect to your WordPress site. Please check:\n' +
        '1. The API endpoint URL is correct (e.g., https://enfieldhome.co.uk/wp-json/v1/dropship/import)\n' +
        '2. Your WordPress site is accessible\n' +
        '3. The extension has permission to access your site (you may need to reload the extension after updating settings)'
      );
    }
    throw error;
  }
}
