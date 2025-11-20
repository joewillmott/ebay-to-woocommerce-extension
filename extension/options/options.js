const form = document.getElementById('settingsForm');
const apiUrlInput = document.getElementById('apiUrl');
const apiKeyInput = document.getElementById('apiKey');
const savedMessage = document.getElementById('savedMessage');
const saveButton = document.getElementById('saveButton');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    toggleSaving(true);
    const settings = {
      apiUrl: apiUrlInput.value.trim(),
      apiKey: apiKeyInput.value.trim()
    };

    const response = await chrome.runtime.sendMessage({
      type: 'save-settings',
      settings
    });

    if (!response?.success) {
      throw new Error(response?.error || 'Unable to save settings.');
    }

    showSaved();
  } catch (error) {
    alert(error.message);
  } finally {
    toggleSaving(false);
  }
});

init();

async function init() {
  const response = await chrome.runtime.sendMessage({ type: 'fetch-settings' });
  if (response?.success && response.settings) {
    apiUrlInput.value = response.settings.apiUrl || '';
    apiKeyInput.value = response.settings.apiKey || '';
  }
}

function showSaved() {
  savedMessage.classList.remove('hidden');
  setTimeout(() => savedMessage.classList.add('hidden'), 2500);
}

function toggleSaving(isSaving) {
  saveButton.disabled = isSaving;
  saveButton.textContent = isSaving ? 'Saving…' : 'Save settings';
}
