(function () {
  const SWEEP_BAR_CLASS = 'ai-holiday-sweep-bar';
  const SWAPPED_IMG_ATTR = 'data-ai-holiday-swapped';
  const TRANSFORMED_POST_ATTR = 'data-ai-holiday-transformed';
  const STYLE_ID = 'ai-holiday-styles';
  const SPEAKER_BTN_ID = 'ai-holiday-speaker';
  const AUDIO_ID = 'ai-holiday-audio';
  const AUDIO_BASE_VOLUME = 0.25;
  const AUDIO_PEAK_VOLUME = 0.90;
  const AUDIO_GAIN = 2.4;         // Web Audio gain applied post-volume — makes the birds actually audible without system volume at max.
  const POSTS_FOR_PEAK = 4;
  const VOLUME_RAMP_MS = 500;
  const VISIBILITY_THRESHOLD = 0.3;
  const IMAGE_COUNT = 8;
  const MIN_IMAGE_DIM = 200;       // smaller than this = probably an avatar / icon
  const MIN_POST_HEIGHT = 180;     // heuristic post size range — post containers
  const MAX_POST_HEIGHT = 2000;    // fall within here on LinkedIn regardless of DOM
  const MAX_POST_WIDTH = 900;      // posts are in a column, not full-width
  const SWEEP_DURATION_MS = 1400;
  const NAV_RESCAN_DELAY_MS = 400;
  const HEALTH_CHECK_INTERVAL_MS = 5000;

  let patterns = null;
  let settings = { enabled: true, showIndicator: true, soundEnabled: false };
  let observer = null;
  let pendingRoots = null;
  let lastUrl = location.href;
  let healthCheckTimer = null;
  let gardenImageUrls = [];
  let audioEl = null;
  let audioCtx = null;
  let audioGain = null;
  let speakerBtn = null;
  let postVisibilityObserver = null;
  let visiblePosts = new Set();
  let volumeAnimRAF = null;
  let transformedNodes = new Set();  // text nodes we've replaced (for undo)

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${SWEEP_BAR_CLASS} {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        width: 100%;
        height: 3px;
        background: linear-gradient(90deg,
          transparent 0%,
          rgba(111, 179, 81, 0.25) 10%,
          #6fb351 50%,
          rgba(111, 179, 81, 0.25) 90%,
          transparent 100%);
        box-shadow:
          0 0 22px 6px rgba(111, 179, 81, 0.55),
          0 12px 40px -4px rgba(111, 179, 81, 0.35);
        z-index: 2147483647;
        pointer-events: none;
        transform: translateY(0);
        transition: opacity 400ms ease-out;
        will-change: transform, opacity;
      }
      #${SPEAKER_BTN_ID} {
        position: fixed;
        right: 20px;
        bottom: 20px;
        width: 64px;
        height: 64px;
        padding: 0;
        border: 0;
        background: transparent;
        cursor: pointer;
        z-index: 2147483646;
        overflow: visible;
        --swell: 0;
      }
      #${SPEAKER_BTN_ID} .ai-holiday-glow {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        pointer-events: none;
        opacity: 0;
      }
      #${SPEAKER_BTN_ID}.is-playing .ai-holiday-glow {
        animation: ai-holiday-breathe 3.2s ease-in-out infinite;
      }
      @keyframes ai-holiday-breathe {
        0%, 100% { box-shadow: 0 0 14px 2px rgba(111,179,81,0.30); opacity: 0.6; }
        50%      { box-shadow: 0 0 28px 8px rgba(111,179,81,0.55); opacity: 1; }
      }
      #${SPEAKER_BTN_ID} .ai-holiday-bg {
        position: absolute;
        inset: 4px;
        border-radius: 50%;
        background: #3d8aa5;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        transition: background 160ms ease, transform 160ms ease;
      }
      #${SPEAKER_BTN_ID}:hover .ai-holiday-bg { background: #4aa3bf; transform: scale(1.04); }
      #${SPEAKER_BTN_ID}.is-muted .ai-holiday-bg { background: #5a7580; }
      #${SPEAKER_BTN_ID} .ai-holiday-ring {
        position: absolute;
        inset: 0;
        pointer-events: none;
        transform: rotate(-90deg);
      }
      #${SPEAKER_BTN_ID} .ai-holiday-ring circle {
        fill: none;
        stroke: #9fd184;
        stroke-width: 2.5;
        stroke-linecap: round;
        stroke-dasharray: 176;
        stroke-dashoffset: calc(176 * (1 - var(--swell, 0)));
        opacity: 0.9;
        transition: stroke-dashoffset 450ms ease-out;
      }
      #${SPEAKER_BTN_ID}.is-muted .ai-holiday-ring circle { stroke-dashoffset: 176; }
      #${SPEAKER_BTN_ID} .ai-holiday-content {
        position: absolute;
        inset: 0 0 8px 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 26px;
        line-height: 1;
        pointer-events: none;
      }
      #${SPEAKER_BTN_ID} .ai-holiday-notes {
        position: absolute;
        top: 7px;
        right: 9px;
        font-size: 12px;
        line-height: 1;
        pointer-events: none;
        filter: drop-shadow(0 1px 1px rgba(0,0,0,0.4));
      }
      #${SPEAKER_BTN_ID}.is-muted .ai-holiday-content {
        text-decoration: line-through;
        text-decoration-thickness: 2px;
        text-decoration-color: rgba(255,255,255,0.9);
        opacity: 0.65;
      }
      #${SPEAKER_BTN_ID}.is-muted .ai-holiday-notes {
        opacity: 0.55;
      }
      #${SPEAKER_BTN_ID} .ai-holiday-eq {
        position: absolute;
        bottom: 7px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: flex-end;
        gap: 2.5px;
        height: 8px;
        opacity: 0;
        transition: opacity 400ms ease;
        pointer-events: none;
      }
      #${SPEAKER_BTN_ID}.is-playing .ai-holiday-eq { opacity: 0.95; }
      #${SPEAKER_BTN_ID} .ai-holiday-eq span {
        width: 2.5px;
        background: #f5f7f0;
        border-radius: 1.5px;
        height: 3px;
      }
      #${SPEAKER_BTN_ID}.is-playing .ai-holiday-eq span:nth-child(1) { animation: ai-holiday-eq1 0.95s ease-in-out infinite; }
      #${SPEAKER_BTN_ID}.is-playing .ai-holiday-eq span:nth-child(2) { animation: ai-holiday-eq2 1.15s ease-in-out infinite; }
      #${SPEAKER_BTN_ID}.is-playing .ai-holiday-eq span:nth-child(3) { animation: ai-holiday-eq3 0.80s ease-in-out infinite; }
      @keyframes ai-holiday-eq1 { 0%,100% { height: 2px; } 50% { height: 6px; } }
      @keyframes ai-holiday-eq2 { 0%,100% { height: 3px; } 50% { height: 8px; } }
      @keyframes ai-holiday-eq3 { 0%,100% { height: 2px; } 50% { height: 7px; } }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  async function loadDictionary() {
    const url = chrome.runtime.getURL('themes/analog-life.json');
    const res = await fetch(url);
    const dict = await res.json();
    return AIHolidayEngine.compile(dict);
  }

  function loadImageUrls() {
    gardenImageUrls = [];
    for (let i = 1; i <= IMAGE_COUNT; i++) {
      gardenImageUrls.push(chrome.runtime.getURL(`images/garden-${i}.jpg`));
    }
  }

  function ensureAudio() {
    if (audioEl) return audioEl;
    audioEl = document.createElement('audio');
    audioEl.id = AUDIO_ID;
    audioEl.src = chrome.runtime.getURL('audio/garden.mp3');
    audioEl.loop = true;
    audioEl.volume = AUDIO_BASE_VOLUME;
    audioEl.preload = 'auto';
    (document.body || document.documentElement).appendChild(audioEl);
    return audioEl;
  }

  // Route the audio element through a gain + compressor so we can go louder than
  // HTML `volume=1.0`. Must be set up after a user gesture (click) or the context
  // starts suspended and we'd hear nothing.
  function ensureAudioGraph() {
    if (audioGain) return;
    if (!audioEl) return;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctor();
      const source = audioCtx.createMediaElementSource(audioEl);
      audioGain = audioCtx.createGain();
      audioGain.gain.value = AUDIO_GAIN;
      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -10;
      compressor.knee.value = 8;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.12;
      source.connect(audioGain);
      audioGain.connect(compressor);
      compressor.connect(audioCtx.destination);
    } catch (e) {
      console.warn('[Holiday from AI] audio graph failed:', e);
    }
  }

  function targetVolumeForVisibleCount(count) {
    const ratio = Math.min(count / POSTS_FOR_PEAK, 1);
    return AUDIO_BASE_VOLUME + (AUDIO_PEAK_VOLUME - AUDIO_BASE_VOLUME) * ratio;
  }

  function rampAudioVolumeTo(target) {
    if (!audioEl) return;
    if (volumeAnimRAF) cancelAnimationFrame(volumeAnimRAF);
    const startVolume = audioEl.volume;
    const startTime = performance.now();
    const step = now => {
      const t = Math.min((now - startTime) / VOLUME_RAMP_MS, 1);
      audioEl.volume = startVolume + (target - startVolume) * t;
      if (t < 1) volumeAnimRAF = requestAnimationFrame(step);
      else volumeAnimRAF = null;
    };
    volumeAnimRAF = requestAnimationFrame(step);
  }

  function updateVolumeSwell() {
    updateSpeakerSwell();
    if (!audioEl || audioEl.paused) return;
    rampAudioVolumeTo(targetVolumeForVisibleCount(visiblePosts.size));
  }

  function ensurePostVisibilityObserver() {
    if (postVisibilityObserver) return postVisibilityObserver;
    postVisibilityObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visiblePosts.add(entry.target);
        else visiblePosts.delete(entry.target);
      }
      updateVolumeSwell();
    }, { threshold: VISIBILITY_THRESHOLD });
    return postVisibilityObserver;
  }

  function trackTransformedPost(post) {
    ensurePostVisibilityObserver().observe(post);
  }

  function updateSpeakerUI() {
    if (!speakerBtn) return;
    const muted = !settings.soundEnabled;
    speakerBtn.classList.toggle('is-muted', muted);
    speakerBtn.classList.toggle('is-playing', !muted);
    speakerBtn.title = muted ? 'Play garden soundtrack' : 'Mute garden soundtrack';
    speakerBtn.setAttribute('aria-label', speakerBtn.title);
  }

  function updateSpeakerSwell() {
    if (!speakerBtn) return;
    const ratio = Math.min(visiblePosts.size / POSTS_FOR_PEAK, 1);
    speakerBtn.style.setProperty('--swell', String(ratio));
  }

  function ensureSpeakerButton() {
    if (speakerBtn && speakerBtn.isConnected) return speakerBtn;
    speakerBtn = document.createElement('button');
    speakerBtn.id = SPEAKER_BTN_ID;
    speakerBtn.type = 'button';

    const glow = document.createElement('div'); glow.className = 'ai-holiday-glow';
    const bg = document.createElement('div'); bg.className = 'ai-holiday-bg';

    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ring.setAttribute('class', 'ai-holiday-ring');
    ring.setAttribute('viewBox', '0 0 64 64');
    ring.setAttribute('width', '64');
    ring.setAttribute('height', '64');
    const ringCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ringCircle.setAttribute('cx', '32');
    ringCircle.setAttribute('cy', '32');
    ringCircle.setAttribute('r', '28');
    ring.appendChild(ringCircle);

    const content = document.createElement('div');
    content.className = 'ai-holiday-content';
    content.textContent = '\u{1F331}';   // 🌱

    const notes = document.createElement('div');
    notes.className = 'ai-holiday-notes';
    notes.textContent = '\u{1F3B6}';     // 🎶 (several notes)

    const eq = document.createElement('div');
    eq.className = 'ai-holiday-eq';
    for (let i = 0; i < 3; i++) eq.appendChild(document.createElement('span'));

    speakerBtn.append(glow, bg, ring, content, notes, eq);

    speakerBtn.addEventListener('click', () => {
      const next = !settings.soundEnabled;
      chrome.storage.sync.set({ soundEnabled: next });
      // User-initiated play must happen in this event handler's call stack
      // to satisfy Chrome's autoplay policy — do it here too:
      settings.soundEnabled = next;
      applySoundState();
    });
    (document.body || document.documentElement).appendChild(speakerBtn);
    updateSpeakerUI();
    updateSpeakerSwell();
    return speakerBtn;
  }

  function applySoundState() {
    ensureSpeakerButton();
    updateSpeakerUI();
    // Speaker button only visible when the whole extension is on.
    if (speakerBtn) speakerBtn.style.display = settings.enabled ? '' : 'none';
    // Audio plays only when both extension-level enabled AND user wants sound on.
    const shouldPlay = settings.enabled && settings.soundEnabled;
    if (shouldPlay) {
      const a = ensureAudio();
      ensureAudioGraph();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      a.volume = targetVolumeForVisibleCount(visiblePosts.size);
      const p = a.play();
      if (p && typeof p.catch === 'function') {
        p.catch(err => {
          console.warn('[Holiday from AI] audio play blocked (autoplay policy?):', err.name);
        });
      }
    } else if (audioEl) {
      audioEl.pause();
      if (volumeAnimRAF) { cancelAnimationFrame(volumeAnimRAF); volumeAnimRAF = null; }
    }
  }

  // Deterministic hash so the same post always gets the same image.
  function hashString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  // Structural post detection. LinkedIn hashes all their classes and strips data-urn
  // from the ancestor chain, so selectors are hopeless. Instead: walk up from the
  // replaced text, and accept the first ancestor whose box dimensions fit a post
  // (tall enough to have content, short enough to not be the feed column,
  // narrower than full width). Resilient to any LinkedIn rename.
  function findContainingPost(node) {
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (!el) return null;
    let cursor = el;
    while (cursor && cursor !== document.body) {
      const rect = cursor.getBoundingClientRect();
      if (rect.height >= MIN_POST_HEIGHT
          && rect.height <= MAX_POST_HEIGHT
          && rect.width > 0
          && rect.width <= MAX_POST_WIDTH) {
        return cursor;
      }
      cursor = cursor.parentElement;
    }
    return null;
  }

  function imageIsLargeEnough(img) {
    // Use layout dimensions — these are non-zero even before the image loads.
    const rect = img.getBoundingClientRect();
    const w = rect.width || img.clientWidth || parseInt(img.getAttribute('width'), 10) || img.naturalWidth || 0;
    const h = rect.height || img.clientHeight || parseInt(img.getAttribute('height'), 10) || img.naturalHeight || 0;
    return w >= MIN_IMAGE_DIM && h >= MIN_IMAGE_DIM;
  }

  function swapPostImages(post) {
    if (!post || !settings.enabled || gardenImageUrls.length === 0) return 0;
    const imgs = post.querySelectorAll('img');
    const signature = post.getAttribute('data-urn')
      || post.getAttribute('data-id')
      || (post.textContent || '').slice(0, 80);
    const base = hashString(signature);
    let idx = 0;
    let swapped = 0;
    for (const img of imgs) {
      if (img.hasAttribute(SWAPPED_IMG_ATTR)) { idx++; continue; }
      if (!imageIsLargeEnough(img)) continue;
      const pick = gardenImageUrls[(base + idx) % gardenImageUrls.length];
      // Stash originals on dataset so we can restore on disable.
      img.dataset.aiHolidayOrigSrc = img.src || '';
      if (img.hasAttribute('srcset')) img.dataset.aiHolidayOrigSrcset = img.getAttribute('srcset');
      if (img.hasAttribute('sizes')) img.dataset.aiHolidayOrigSizes = img.getAttribute('sizes');
      img.setAttribute(SWAPPED_IMG_ATTR, '1');
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.src = pick;
      idx++;
      swapped++;
    }
    return swapped;
  }

  // Re-scan every post we've already transformed, in case new images
  // (lazy-loaded, re-rendered by LinkedIn) appeared inside them.
  function rescanTransformedPosts() {
    const posts = document.querySelectorAll(`[${TRANSFORMED_POST_ATTR}]`);
    for (const post of posts) swapPostImages(post);
  }

  function collectTextNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (AIHolidayEngine.shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    return nodes;
  }

  // Detect whether a text node sits inside byline/chrome rather than post body.
  // LinkedIn uses aria-label on author affordances, and wraps names/titles in links,
  // buttons, headings, and menus. Matches there shouldn't qualify the containing post
  // for image swap — the post body didn't actually mention AI, only the author did.
  function isLikelyBylineOrChrome(textNode) {
    let el = textNode.parentElement;
    for (let i = 0; i < 6 && el; i++) {
      const tag = el.tagName;
      if (tag === 'A' || tag === 'BUTTON') return true;
      if (tag && /^H[1-6]$/.test(tag)) return true;
      if (el.hasAttribute && el.hasAttribute('aria-label')) return true;
      const role = el.getAttribute && el.getAttribute('role');
      if (role && /^(link|button|menu|menuitem|heading|tab|navigation)$/.test(role)) return true;
      el = el.parentElement;
    }
    return false;
  }

  function replaceNode(node, modifiedPosts) {
    if (!node.isConnected) return false;
    const originalValue = node.nodeValue;
    const opts = { indicator: settings.showIndicator };
    const { output, changed } = AIHolidayEngine.replaceText(originalValue, patterns, opts);
    if (!changed) return false;
    // Store pre-transformation text the first time we touch this node, so we can revert.
    // Skip the store if this is a re-run (current text came from a prior pass).
    if (node._aiHolidayOriginal === undefined && node._aiHolidayLastOutput !== originalValue) {
      node._aiHolidayOriginal = originalValue;
      transformedNodes.add(node);
    }
    node.nodeValue = output;
    node._aiHolidayLastOutput = output;
    if (modifiedPosts && !isLikelyBylineOrChrome(node)) {
      const post = findContainingPost(node);
      if (post) modifiedPosts.add(post);
    }
    return true;
  }

  function revertAllReplacements() {
    for (const node of transformedNodes) {
      if (node.isConnected && node._aiHolidayOriginal !== undefined) {
        node.nodeValue = node._aiHolidayOriginal;
      }
      delete node._aiHolidayOriginal;
      delete node._aiHolidayLastOutput;
    }
    transformedNodes.clear();
  }

  function revertAllImageSwaps() {
    const imgs = document.querySelectorAll(`img[${SWAPPED_IMG_ATTR}]`);
    for (const img of imgs) {
      if (img.dataset.aiHolidayOrigSrc !== undefined) img.src = img.dataset.aiHolidayOrigSrc;
      if (img.dataset.aiHolidayOrigSrcset !== undefined) img.setAttribute('srcset', img.dataset.aiHolidayOrigSrcset);
      if (img.dataset.aiHolidayOrigSizes !== undefined) img.setAttribute('sizes', img.dataset.aiHolidayOrigSizes);
      img.removeAttribute(SWAPPED_IMG_ATTR);
      delete img.dataset.aiHolidayOrigSrc;
      delete img.dataset.aiHolidayOrigSrcset;
      delete img.dataset.aiHolidayOrigSizes;
    }
    for (const p of document.querySelectorAll(`[${TRANSFORMED_POST_ATTR}]`)) {
      p.removeAttribute(TRANSFORMED_POST_ATTR);
    }
    visiblePosts.clear();
    if (postVisibilityObserver) {
      postVisibilityObserver.disconnect();
      postVisibilityObserver = null;
    }
  }

  function processSubtree(root) {
    if (!settings.enabled || !patterns) return;
    const nodes = collectTextNodes(root);
    const modifiedPosts = new Set();
    for (const node of nodes) replaceNode(node, modifiedPosts);
    for (const post of modifiedPosts) {
      const isNew = !post.hasAttribute(TRANSFORMED_POST_ATTR);
      post.setAttribute(TRANSFORMED_POST_ATTR, '1');
      swapPostImages(post);   // idempotent — per-img attr prevents double-swap
      if (isNew) trackTransformedPost(post);
    }
  }

  function scheduleProcess(roots) {
    if (pendingRoots) {
      for (const r of roots) pendingRoots.add(r);
      return;
    }
    pendingRoots = new Set(roots);
    const run = () => {
      const toProcess = pendingRoots;
      pendingRoots = null;
      if (!settings.enabled || !patterns) return;
      observer && observer.disconnect();
      try {
        for (const root of toProcess) {
          if (root && root.isConnected !== false) processSubtree(root);
        }
      } catch (err) {
        console.error('[Holiday from AI] process failed:', err);
      } finally {
        observer && observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      }
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 300 });
    else setTimeout(run, 16);
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(mutations => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(() => {
          if (settings.enabled && patterns) scheduleProcess([document.body]);
        }, NAV_RESCAN_DELAY_MS);
      }
      const roots = new Set();
      for (const m of mutations) {
        if (m.type === 'characterData' && m.target.parentNode) roots.add(m.target.parentNode);
        for (const n of m.addedNodes) if (n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.TEXT_NODE) roots.add(n);
      }
      if (roots.size === 0) return;
      scheduleProcess(roots);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // Safety net: periodically re-scan document.body (for text mutations that slipped
  // through during our disconnect window) + rescan already-transformed posts for
  // newly lazy-loaded images.
  function startHealthCheck() {
    if (healthCheckTimer) return;
    healthCheckTimer = setInterval(() => {
      if (!settings.enabled || !patterns) return;
      if (!pendingRoots) scheduleProcess([document.body]);
      rescanTransformedPosts();
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  function sweepTransform() {
    if (!patterns) return;
    if (document.querySelector(`.${SWEEP_BAR_CLASS}`)) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      observer && observer.disconnect();
      try { processSubtree(document.body); } finally { startObserver(); }
      return;
    }

    injectStyles();

    const nodes = [];
    for (const node of collectTextNodes(document.body)) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      range.detach && range.detach();
      if (rect.width === 0 && rect.height === 0) continue;
      nodes.push({ node, y: rect.top });
    }
    nodes.sort((a, b) => a.y - b.y);

    const bar = document.createElement('div');
    bar.className = SWEEP_BAR_CLASS;
    document.body.appendChild(bar);

    observer && observer.disconnect();

    const viewportHeight = window.innerHeight;
    const start = performance.now();
    let cursor = 0;
    const modifiedPosts = new Set();

    function step(now) {
      const t = Math.min((now - start) / SWEEP_DURATION_MS, 1);
      const barY = t * viewportHeight;
      bar.style.transform = `translateY(${barY}px)`;

      while (cursor < nodes.length && nodes[cursor].y <= barY) {
        replaceNode(nodes[cursor].node, modifiedPosts);
        cursor++;
      }

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        while (cursor < nodes.length) {
          replaceNode(nodes[cursor].node, modifiedPosts);
          cursor++;
        }
        for (const post of modifiedPosts) {
          const isNew = !post.hasAttribute(TRANSFORMED_POST_ATTR);
          post.setAttribute(TRANSFORMED_POST_ATTR, '1');
          swapPostImages(post);
          if (isNew) trackTransformedPost(post);
        }
        bar.style.opacity = '0';
        setTimeout(() => bar.remove(), 400);
        startObserver();
      }
    }

    requestAnimationFrame(step);
  }

  async function init() {
    const stored = await chrome.storage.sync.get({
      enabled: true,
      showIndicator: true,
      soundEnabled: false,
    });
    settings = stored;
    injectStyles();
    loadImageUrls();
    patterns = await loadDictionary();
    ensureSpeakerButton();
    applySoundState();
    console.log(`[Holiday from AI] ready — ${gardenImageUrls.length} images, enabled=${settings.enabled}, sound=${settings.soundEnabled}`);
    if (settings.enabled) {
      sweepTransform();
      startHealthCheck();
    }
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      const wasEnabled = settings.enabled;
      if (changes.enabled) settings.enabled = changes.enabled.newValue;
      if (changes.showIndicator) settings.showIndicator = changes.showIndicator.newValue;
      if (changes.soundEnabled) settings.soundEnabled = changes.soundEnabled.newValue;

      // Enabled → Disabled: fully stand down.
      if (wasEnabled && !settings.enabled) {
        if (observer) { observer.disconnect(); observer = null; }
        if (healthCheckTimer) { clearInterval(healthCheckTimer); healthCheckTimer = null; }
        revertAllReplacements();
        revertAllImageSwaps();
        applySoundState();   // pauses audio, hides speaker button
        return;
      }

      // Disabled → Enabled: run the sweep + set up again.
      if (!wasEnabled && settings.enabled) {
        sweepTransform();
        startHealthCheck();
        applySoundState();
        return;
      }

      // Already enabled, other settings changed (indicator, sound toggle):
      if (settings.enabled) {
        if (!observer) startObserver();
        startHealthCheck();
        applySoundState();
      }
    });
  }

  init().catch(err => console.error('[Holiday from AI] init failed:', err));
})();
