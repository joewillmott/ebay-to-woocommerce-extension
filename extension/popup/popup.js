let activeTabId;
let scrapedPayload;

const statusEl = document.getElementById('status');
const formEl = document.getElementById('importForm');
const titleInput = document.getElementById('title');
const descInput = document.getElementById('description');
const priceInput = document.getElementById('price');
const currencyInput = document.getElementById('currency');
const quantityInput = document.getElementById('quantity');
const inStockInput = document.getElementById('inStock');
const imagesInput = document.getElementById('images');
const importButton = document.getElementById('importButton');
const settingsButton = document.getElementById('openSettings');

settingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
formEl.addEventListener('submit', handleImport);

init();

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTabId = tab.id;
    const response = await chrome.runtime.sendMessage({ type: 'scrape-product', tabId: activeTabId });

    if (!response?.success) {
      throw new Error(response?.error || 'Unable to read product data.');
    }

    scrapedPayload = response.data;
    hydrateForm(scrapedPayload);
    setStatus('Review and update the data before importing.', 'success');
    formEl.classList.remove('hidden');
  } catch (error) {
    console.error(error);
    setStatus(error.message, 'error');
    formEl.classList.add('hidden');
  }
}

function hydrateForm(data) {
  titleInput.value = data.title || '';
  descInput.value = data.descriptionHtml || '';
  priceInput.value = data.price?.price ?? '';
  currencyInput.value = data.price?.currency ?? '';
  quantityInput.value = data.stock?.quantity ?? '';
  inStockInput.checked = data.stock?.inStock ?? true;
  imagesInput.value = (data.images || []).join('\n');
}

async function handleImport(event) {
  event.preventDefault();
  if (!scrapedPayload) {
    setStatus('Scrape failed. Please reload the page and try again.', 'error');
    return;
  }

  try {
    toggleLoading(true);
    const payload = buildPayloadForImport();
    const response = await chrome.runtime.sendMessage({ type: 'import-product', payload });

    if (!response?.success) {
      throw new Error(response?.error || 'Import failed.');
    }

    setStatus('Product sent to WooCommerce successfully.', 'success');
  } catch (error) {
    console.error(error);
    setStatus(error.message, 'error');
  } finally {
    toggleLoading(false);
  }
}

function buildPayloadForImport() {
  const priceValue = priceInput.value ? parseFloat(priceInput.value) : null;
  const quantityValue = quantityInput.value ? parseInt(quantityInput.value, 10) : null;
  const images = imagesInput.value
    .split(/\s+/)
    .map((url) => url.trim())
    .filter(Boolean);

  return {
    item_id: scrapedPayload.itemId,
    source_url: scrapedPayload.sourceUrl,
    title: titleInput.value.trim(),
    description: descInput.value.trim(),
    price: priceValue,
    currency: currencyInput.value.trim(),
    stock_quantity: Number.isInteger(quantityValue) ? quantityValue : null,
    in_stock: inStockInput.checked,
    images: images,
    imported_at: new Date().toISOString()
  };
}

function setStatus(message, state = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status status--${state}`;
}

function toggleLoading(isLoading) {
  importButton.disabled = isLoading;
  importButton.textContent = isLoading ? 'Importing…' : 'Import to WooCommerce';
}
