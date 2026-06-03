// Holiday from AI v2 — detection engine.
// Exposes `AIHolidayEngine` on globalThis for the content script.

(function () {
  const SKIP_TAGS = new Set(['CODE', 'PRE', 'INPUT', 'TEXTAREA', 'SCRIPT', 'STYLE']);

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function isShortAcronym(key) {
    if (/\s/.test(key)) return false;
    const letters = key.replace(/[^A-Za-z]/g, '');
    if (letters.length < 2 || letters.length > 5) return false;
    return letters === letters.toUpperCase();
  }

  function compile(dictionary) {
    // Accept either an array or a key-value object — v2 doesn't use values.
    const keys = Array.isArray(dictionary) ? dictionary : Object.keys(dictionary);
    const filtered = keys.filter(k => typeof k === 'string' && k.trim().length > 0);
    const sorted = filtered.sort((a, b) => b.length - a.length);
    return sorted.map(key => {
      const flags = isShortAcronym(key) ? 'g' : 'gi';
      return { key, regex: new RegExp(`\\b${escapeRegex(key)}\\b`, flags) };
    });
  }

  function shouldSkipNode(node) {
    let parent = node.parentElement;
    while (parent) {
      if (SKIP_TAGS.has(parent.tagName)) return true;
      if (parent.isContentEditable) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  globalThis.AIHolidayEngine = { compile, shouldSkipNode };
})();
