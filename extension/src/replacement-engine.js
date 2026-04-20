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

  function preserveCase(original, replacement) {
    if (!/[A-Za-z]/.test(original)) return replacement;

    const isAllCaps = original === original.toUpperCase() && original.length > 1;

    // Short acronyms: use replacement as-is. "AI" → "gardening", never "GARDENING".
    if (isAllCaps && isShortAcronym(original)) return replacement;

    // Longer all-caps source (user is genuinely shouting): preserve the shout.
    if (isAllCaps) return replacement.toUpperCase();

    // Title-case source: capitalize replacement first letter.
    if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
      return replacement[0].toUpperCase() + replacement.slice(1);
    }

    return replacement;
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

  const SPROUT = '\u{1F331}';
  const SPROUT_RE = new RegExp(`\\s?${SPROUT}`, 'gu');

  // Strip any trailing sprout we previously added, so re-running replaceText on the
  // same node (health-check, SPA nav) doesn't accumulate duplicate glyphs.
  function stripSprout(str) {
    return str.replace(SPROUT_RE, '');
  }

  function replaceText(input, patterns, opts) {
    const hadSprout = input.indexOf(SPROUT) !== -1;
    let output = stripSprout(input);
    let replaced = false;
    for (const { regex, replacement } of patterns) {
      output = output.replace(regex, match => {
        replaced = true;
        return preserveCase(match, replacement);
      });
    }
    // Append a single sprout if this node had one OR we just replaced AI terms — and indicator is on.
    const shouldSprout = (replaced || hadSprout) && opts && opts.indicator;
    if (shouldSprout) {
      output = `${output} ${SPROUT}`;
    }
    return { output, changed: output !== input };
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

  globalThis.AIHolidayEngine = { compile, replaceText, shouldSkipNode };
})();
