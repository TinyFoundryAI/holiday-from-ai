chrome.runtime.onInstalled.addListener(async () => {
  const defaults = { enabled: true, showIndicator: true };
  const stored = await chrome.storage.sync.get(defaults);
  await chrome.storage.sync.set({ ...defaults, ...stored });
});
