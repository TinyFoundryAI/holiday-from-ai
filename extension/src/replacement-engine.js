// Holiday from AI replacement engine.
// Pluggable by design — static dictionary today, API-backed later.
// Exposes `AIHolidayEngine` on globalThis for the content script.

(function () {
  const SKIP_TAGS = new Set(['CODE', 'PRE', 'INPUT', 'TEXTAREA', 'SCRIPT', 'STYLE']);

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // A "short acronym" is an all-caps, no-space token with 2–5 letters (AI, IA, LLM, GPU, AGI, RAG, MCP, RLHF, GPT-4…).
  // These are compiled case-sensitively so the regex doesn't hit French words like "j'ai", "je n'ai", "agi" (past tense of "agir").
  function isShortAcronym(key) {
    if (/\s/.test(key)) return false;
    const letters = key.replace(/[^A-Za-z]/g, '');
    if (letters.length < 2 || letters.length > 5) return false;
    return letters === letters.toUpperCase();
  }

  function compile(dictionary) {
    const keys = Object.keys(dictionary).sort((a, b) => b.length - a.length);
    return keys.map(key => {
      const flags = isShortAcronym(key) ? 'g' : 'gi';
      return {
        key,
        replacement: dictionary[key],
        regex: new RegExp(`\\b${escapeRegex(key)}\\b`, flags)
      };
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
