(async function () {
  const enabledEl = document.getElementById('enabled');
  const indicatorEl = document.getElementById('showIndicator');
  const soundEl = document.getElementById('soundEnabled');

  const state = await chrome.storage.sync.get({
    enabled: true,
    showIndicator: true,
    soundEnabled: false,
  });
  enabledEl.checked = state.enabled;
  indicatorEl.checked = state.showIndicator;
  soundEl.checked = state.soundEnabled;

  enabledEl.addEventListener('change', () => chrome.storage.sync.set({ enabled: enabledEl.checked }));
  indicatorEl.addEventListener('change', () => chrome.storage.sync.set({ showIndicator: indicatorEl.checked }));
  soundEl.addEventListener('change', () => chrome.storage.sync.set({ soundEnabled: soundEl.checked }));
})();
