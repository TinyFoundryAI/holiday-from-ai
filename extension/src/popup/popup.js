(async function () {
  const enabledEl = document.getElementById('enabled');
  const titleEl = document.querySelector('.switch-title');

  function render(enabled) {
    if (titleEl) titleEl.textContent = enabled ? 'Enabled' : 'Disabled';
  }

  const state = await chrome.storage.sync.get({ enabled: true });
  enabledEl.checked = state.enabled;
  render(state.enabled);
  enabledEl.addEventListener('change', () => {
    chrome.storage.sync.set({ enabled: enabledEl.checked });
    render(enabledEl.checked);
  });
})();
