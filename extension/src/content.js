(function () {
  // --- Constants ---
  const OVERLAY_CONTAINER_ID = 'ai-holiday-v2-overlays';
  const HAIKU_OVERLAY_CLASS = 'ai-holiday-v2-haiku';
  const IMG_OVERLAY_CLASS = 'ai-holiday-v2-img';
  const SWEEP_BAR_CLASS = 'ai-holiday-v2-sweep-bar';
  const STYLE_ID = 'ai-holiday-v2-styles';
  const SPEAKER_BTN_ID = 'ai-holiday-v2-speaker';
  const AUDIO_ID = 'ai-holiday-v2-audio';
  const PROCESSED_ATTR = 'data-ai-holiday-v2';
  const SWEEP_DURATION_MS = 1400;

  const MIN_POST_HEIGHT = 100;
  const MAX_POST_HEIGHT = 3200;
  const MAX_POST_WIDTH = 1100;
  const MIN_IMAGE_DIM = 200;
  const IMAGE_COUNT = 11;

  const AUDIO_BASE_VOLUME = 0.25;
  const AUDIO_PEAK_VOLUME = 0.90;
  const AUDIO_GAIN = 2.4;
  const POSTS_FOR_PEAK = 4;
  const VOLUME_RAMP_MS = 500;
  const VISIBILITY_THRESHOLD = 0.3;

  // --- State ---
  let patterns = null;
  let haikus = [];
  let gardenImageUrls = [];
  let settings = { enabled: true };
  let soundMuted = true;

  // post element → { haikuOverlay, imageOverlays: [{img, overlay}] }
  const overlayMap = new Map();
  let overlayContainer = null;
  let rafToken = null;
  let scrollListenerAdded = false;
  let observer = null;
  let scanDebounceTimer = null;
  let lastUrl = location.href;
  let visiblePosts = new Set();
  let postVisibilityObserver = null;

  // Audio
  let audioEl = null, audioCtx = null, audioGain = null;
  let speakerBtn = null, volumeAnimRAF = null;

  // --- Styles ---
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${SWEEP_BAR_CLASS} {
        position: fixed; top: 0; left: 0; right: 0; width: 100%; height: 3px;
        background: linear-gradient(90deg, transparent 0%, rgba(111,179,81,0.25) 10%, #6fb351 50%, rgba(111,179,81,0.25) 90%, transparent 100%);
        box-shadow: 0 0 22px 6px rgba(111,179,81,0.55), 0 12px 40px -4px rgba(111,179,81,0.35);
        z-index: 2147483647; pointer-events: none;
        transform: translateY(0);
        transition: opacity 400ms ease-out;
        will-change: transform, opacity;
      }
      .${SWEEP_BAR_CLASS} .ai-holiday-v2-sweep-sprout {
        position: absolute;
        top: -11px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 22px;
        line-height: 1;
        filter: drop-shadow(0 2px 6px rgba(111,179,81,0.6));
        pointer-events: none;
      }
      @keyframes ai-holiday-v2-bloom {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .${HAIKU_OVERLAY_CLASS} {
        position: absolute;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 100;
        background: #faf7f0;
        color: #1a1a1a;
        font-family: Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Times New Roman", serif;
        box-sizing: border-box;
        animation: ai-holiday-v2-bloom 350ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      .${HAIKU_OVERLAY_CLASS} > .ai-holiday-v2-text-area {
        flex: 1 1 auto;
        padding: 24px 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-style: italic;
        font-size: 17px;
        line-height: 1.7;
        letter-spacing: 0.01em;
        white-space: pre-line;
      }
      .${HAIKU_OVERLAY_CLASS} > .ai-holiday-v2-image-area {
        flex: 1 1 60%;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        min-height: 180px;
      }
      .${HAIKU_OVERLAY_CLASS} > .ai-holiday-v2-image-banner {
        flex: 0 0 30%;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        min-height: 80px;
        max-height: 200px;
      }
      @media (prefers-color-scheme: dark) {
        .${HAIKU_OVERLAY_CLASS} {
          background: #1f1c14;
          color: #e8e4d8;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .${HAIKU_OVERLAY_CLASS} { animation: none; }
      }
      #${SPEAKER_BTN_ID} {
        position: fixed; right: 20px; bottom: 20px;
        width: 64px; height: 64px; padding: 0; border: 0;
        background: transparent; cursor: pointer;
        z-index: 2147483646; overflow: visible;
      }
      #${SPEAKER_BTN_ID} .v2-bg {
        position: absolute; inset: 4px; border-radius: 50%;
        background: #3d8aa5; box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        transition: background 160ms ease, transform 160ms ease;
      }
      #${SPEAKER_BTN_ID}:hover .v2-bg { background: #4aa3bf; transform: scale(1.04); }
      #${SPEAKER_BTN_ID}.is-muted .v2-bg {
        background: #5a7580;
        animation: v2-invite 2.8s ease-in-out infinite;
      }
      #${SPEAKER_BTN_ID}.is-muted:hover .v2-bg { animation: none; }
      @keyframes v2-invite {
        0%, 100% { transform: scale(1.00); box-shadow: 0 4px 14px rgba(0,0,0,0.25); }
        50%      { transform: scale(1.03); box-shadow: 0 4px 18px rgba(61,138,165,0.40); }
      }
      #${SPEAKER_BTN_ID} .v2-content {
        position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
        font-size: 26px; line-height: 1; pointer-events: none;
      }
      #${SPEAKER_BTN_ID}.is-muted .v2-content {
        text-decoration: line-through; text-decoration-thickness: 2px;
        text-decoration-color: rgba(255,255,255,0.9); opacity: 0.65;
      }
      #${SPEAKER_BTN_ID} .v2-notes {
        position: absolute; top: 7px; right: 9px;
        font-size: 12px; line-height: 1; pointer-events: none;
        filter: drop-shadow(0 1px 1px rgba(0,0,0,0.4));
      }
      #${SPEAKER_BTN_ID}.is-muted .v2-notes { opacity: 0.55; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // --- Loading ---
  async function loadDictionary() {
    const url = chrome.runtime.getURL('themes/analog-life.json');
    const res = await fetch(url);
    const dict = await res.json();
    return AIHolidayEngine.compile(dict);
  }

  async function loadHaikus() {
    const url = chrome.runtime.getURL('haikus.json');
    const res = await fetch(url);
    haikus = await res.json();
  }

  function loadImageUrls() {
    gardenImageUrls = [];
    for (let i = 1; i <= IMAGE_COUNT; i++) {
      gardenImageUrls.push(chrome.runtime.getURL(`images/garden-${i}.jpg`));
    }
  }

  // --- Helpers ---
  function hashString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function textHasAITerms(text) {
    if (!patterns || !text) return false;
    for (const { regex } of patterns) {
      regex.lastIndex = 0;
      if (regex.test(text)) return true;
    }
    return false;
  }

  function pickHaiku(post) {
    // LinkedIn doesn't expose a stable post ID on this DOM, so we hash the full
    // text content (more variety than a short prefix → fewer haiku collisions
    // across posts that share a leading author/timestamp string).
    const sig = (post.textContent || '');
    const seed = hashString(sig);
    return haikus[seed % haikus.length];
  }

  // --- Post detection ---
  // LinkedIn uses different post-wrapper patterns per surface:
  //   - main feed:    <div role="listitem">
  //   - company /
  //     org / profile <div role="article" data-urn="urn:li:activity:...">
  //     "Posts" tabs:
  // Some surfaces tag with data-urn but no role, so we accept that as a third
  // signal. Chrome landmarks (<aside>/<nav>/role="menu" etc) reject immediately.
  function findContainingPost(node) {
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (!el) return null;
    let cursor = el;
    while (cursor && cursor !== document.body) {
      const tag = cursor.tagName;
      if (tag === 'ASIDE' || tag === 'NAV' || tag === 'HEADER' || tag === 'FOOTER') return null;
      const role = cursor.getAttribute && cursor.getAttribute('role');
      if (role && /^(complementary|navigation|banner|contentinfo|search|dialog|menu|menubar|menuitem|tooltip)$/.test(role)) return null;

      let isPost = role === 'listitem' || role === 'article';
      if (!isPost && cursor.getAttribute) {
        const urn = cursor.getAttribute('data-urn');
        if (urn && /^urn:li:(activity|share|ugcPost|groupPost|article)\b/.test(urn)) isPost = true;
      }
      if (isPost) {
        const rect = cursor.getBoundingClientRect();
        if (rect.height >= MIN_POST_HEIGHT
            && rect.height <= MAX_POST_HEIGHT
            && rect.width >= 200
            && rect.width <= MAX_POST_WIDTH) {
          return cursor;
        }
        return null;
      }
      cursor = cursor.parentElement;
    }
    return null;
  }

  function isLikelyChrome(textNode) {
    let el = textNode.parentElement;
    for (let i = 0; i < 6 && el; i++) {
      const tag = el.tagName;
      if (tag && /^H[1-6]$/.test(tag)) return true;
      if (tag === 'BUTTON') return true;
      if (tag === 'A') {
        const href = el.getAttribute('href') || '';
        if (/^\/(in|company|school|hashtag|jobs|events|groups)\//.test(href)) return true;
      }
      const role = el.getAttribute && el.getAttribute('role');
      if (role && /^(button|menu|menuitem|heading|tab)$/.test(role)) return true;
      el = el.parentElement;
    }
    return false;
  }

  // Find the post-body container: walk up from the AI text node, keep the last
  // substantial ancestor before we hit the listitem. The header (avatar + author)
  // and action bar (like/comment/share) live as siblings of this body container
  // inside the listitem, so leaving them outside the overlay preserves them.
  function findPostBody(textNode, postListitem) {
    let cur = textNode.parentElement;
    let lastSubstantial = null;
    while (cur && cur !== document.body && cur !== postListitem) {
      const rect = cur.getBoundingClientRect();
      if (rect.height > 20 && rect.width > 100) lastSubstantial = cur;
      cur = cur.parentElement;
    }
    return lastSubstantial;
  }

  // --- Scan ---
  // Returns Map<post element, { bodyEl, textNode }> so we know which inner region
  // of each post to cover.
  function collectAIPosts() {
    if (!patterns || !haikus.length) return new Map();
    const result = new Map();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (AIHolidayEngine.shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) {
      if (isLikelyChrome(n)) continue;
      if (!textHasAITerms(n.nodeValue)) continue;
      const post = findContainingPost(n);
      if (!post) continue;
      if (post.hasAttribute(PROCESSED_ATTR)) continue;
      if (result.has(post)) continue;
      const bodyEl = findPostBody(n, post) || post;
      result.set(post, { bodyEl, textNode: n });
    }
    return result;
  }

  // --- Overlays ---
  // Header detection — hybrid:
  //
  // Primary signal: walk up from the AI text node we already detected, find the
  // widest substantial ancestor before the listitem. That's the body container.
  // Its TOP is where the body starts → everything above is header. Works
  // regardless of how many extra rows LinkedIn renders in the header (newsletter,
  // blog, hashtag follow, visibility picto, etc.).
  //
  // Fallback: element-based scan, used when the body container starts at the
  // listitem's top (the header is rendered as a sibling INSIDE the body container).
  function computeHeaderOffset(post, aiTextNode) {
    const postRect = post.getBoundingClientRect();
    if (postRect.height <= 0) return 0;
    const MIN_HEADER = 30;

    // --- Primary: AI-text-node walk-up ---
    // Pick the WIDEST substantial ancestor whose top is >= MIN_HEADER below the
    // post top. This skips the outermost post wrappers (whose top equals the
    // post top) and lands on the paragraph/body-text wrapper, which sits below
    // the header.
    let bodyOffset = 0;
    if (aiTextNode && aiTextNode.isConnected) {
      const targetWidth = postRect.width * 0.85;
      let cur = aiTextNode.parentElement;
      let widest = null;
      while (cur && cur !== post && cur !== document.body) {
        const cr = cur.getBoundingClientRect();
        const cTop = cr.top - postRect.top;
        if (cr.width >= targetWidth && cr.height > 30 && cTop >= MIN_HEADER) {
          widest = cur;
        }
        cur = cur.parentElement;
      }
      if (widest) {
        const offset = widest.getBoundingClientRect().top - postRect.top;
        if (offset >= MIN_HEADER && offset < 300) bodyOffset = offset;
      }
    }

    // --- Secondary: element scan with split cutoffs ---
    // Profile/company/school links can appear in the BODY as mentions
    // (e.g. "@Max Schoening at Notion"), so they only count as header if they
    // start in the strict author-header band — measured at top<65 across two
    // diagnostic samples. Time / visibility picto / control buttons / newsletter
    // widgets reliably belong to header and use the looser cutoff.
    const strictCutoff = 65;
    const looseCutoff = Math.min(postRect.height * 0.25, 200);

    let maxBottom = 0;
    const profileLinks = post.querySelectorAll(
      'a[href*="/in/"], a[href*="/company/"], a[href*="/school/"]'
    );
    for (const el of profileLinks) {
      const r = el.getBoundingClientRect();
      const relTop = r.top - postRect.top;
      const relBottom = r.bottom - postRect.top;
      if (relTop >= 0 && relTop < strictCutoff && relBottom > maxBottom) maxBottom = relBottom;
    }
    const chromeEls = post.querySelectorAll(
      'a[href*="/newsletters/"], ' +
      'time, ' +
      '[aria-label*="control" i], [aria-label*="more options" i], [aria-label*="plus d\'options" i], ' +
      '[aria-label*="visibili" i], [aria-label*="audience" i]'
    );
    for (const el of chromeEls) {
      const r = el.getBoundingClientRect();
      const relTop = r.top - postRect.top;
      const relBottom = r.bottom - postRect.top;
      if (relTop >= 0 && relTop < looseCutoff && relBottom > maxBottom) maxBottom = relBottom;
    }
    const elementOffset = maxBottom > 0 ? maxBottom + 6 : 0;

    // Take the larger of the two signals — body-container is usually correct;
    // element scan covers cases where the body container starts at post top.
    return Math.max(bodyOffset, elementOffset);
  }

  let resizeObserver = null;
  function ensureResizeObserver() {
    if (resizeObserver) return resizeObserver;
    resizeObserver = new ResizeObserver(entries => {
      for (const e of entries) {
        const entry = overlayMap.get(e.target);
        if (entry) positionOverlay(entry);
      }
    });
    return resizeObserver;
  }

  function ensurePostVisibilityObserver() {
    if (postVisibilityObserver) return postVisibilityObserver;
    postVisibilityObserver = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) visiblePosts.add(e.target);
        else visiblePosts.delete(e.target);
      }
      updateVolumeSwell();
    }, { threshold: VISIBILITY_THRESHOLD });
    return postVisibilityObserver;
  }

  function createPostOverlay(post, bodyEl, aiTextNode) {
    if (overlayMap.has(post)) return overlayMap.get(post);

    // Make the post a positioning context so our absolutely-positioned overlay
    // children are sized/scrolled by the browser without per-frame JS. Also set
    // z-index:0 to create a STACKING context — without it, the overlay's
    // z-index:100 escapes and stacks above LinkedIn's sticky nav bar.
    const cs = getComputedStyle(post);
    if (cs.position === 'static') post.style.position = 'relative';
    if (cs.zIndex === 'auto') post.style.zIndex = '0';

    // Unified card layout: image at top (if post had a large image), haiku
    // text below. No separate image overlay — avoids z-index conflicts.
    const haikuOverlay = document.createElement('div');
    haikuOverlay.className = HAIKU_OVERLAY_CLASS;

    // Always include an image at the bottom — a hero-sized one if the original
    // post had a large image, otherwise a smaller banner so text-only posts
    // don't feel empty next to image-heavy ones.
    let pickedImage = null;
    let hadLargeImage = false;
    if (gardenImageUrls.length > 0) {
      const base = hashString(post.textContent || '');
      const imgs = post.querySelectorAll('img');
      let idx = 0;
      for (const img of imgs) {
        const rect = img.getBoundingClientRect();
        const w = rect.width || img.naturalWidth || 0;
        const h = rect.height || img.naturalHeight || 0;
        if (w >= MIN_IMAGE_DIM && h >= MIN_IMAGE_DIM) {
          hadLargeImage = true;
          break;
        }
        idx++;
      }
      pickedImage = gardenImageUrls[(base + idx) % gardenImageUrls.length];
    }
    // Haiku text first (top), then garden image (bottom). DOM order = visual
    // order when using flex-direction: column.
    const textArea = document.createElement('div');
    textArea.className = 'ai-holiday-v2-text-area';
    textArea.textContent = pickHaiku(post);
    haikuOverlay.appendChild(textArea);
    if (pickedImage) {
      const imageArea = document.createElement('div');
      imageArea.className = hadLargeImage ? 'ai-holiday-v2-image-area' : 'ai-holiday-v2-image-banner';
      imageArea.style.backgroundImage = `url("${pickedImage}")`;
      haikuOverlay.appendChild(imageArea);
    }

    post.appendChild(haikuOverlay);

    const entry = { post, bodyEl, aiTextNode, haikuOverlay, imageOverlays: [] };
    overlayMap.set(post, entry);
    post.setAttribute(PROCESSED_ATTR, '1');
    positionOverlay(entry);
    ensurePostVisibilityObserver().observe(post);
    ensureResizeObserver().observe(post);
    return entry;
  }

  // Overlay is a child of the post (which is position:relative), so coordinates
  // are POST-RELATIVE. Browser handles scroll/visibility automatically. We only
  // re-run this on creation and on ResizeObserver fires (post height changes).
  function positionOverlay(entry) {
    if (!entry || !entry.post.isConnected) return;
    const post = entry.post;
    const headerOffset = computeHeaderOffset(post, entry.aiTextNode);
    const h = entry.haikuOverlay;
    h.style.top = headerOffset + 'px';
    h.style.left = '0';
    h.style.right = '0';
    h.style.bottom = '0';
  }

  function removePostOverlay(post) {
    const entry = overlayMap.get(post);
    if (!entry) return;
    entry.haikuOverlay.remove();
    for (const { overlay } of entry.imageOverlays) overlay.remove();
    overlayMap.delete(post);
    if (postVisibilityObserver) postVisibilityObserver.unobserve(post);
    if (resizeObserver) resizeObserver.unobserve(post);
    visiblePosts.delete(post);
    if (post.isConnected) {
      post.removeAttribute(PROCESSED_ATTR);
      // Reset any inline styles we set on attach.
      if (post.style.position === 'relative') post.style.position = '';
      if (post.style.zIndex === '0') post.style.zIndex = '';
    }
  }

  function removeAllOverlays() {
    for (const entry of [...overlayMap.values()]) {
      removePostOverlay(entry.post);
    }
    overlayMap.clear();
    // Safety net: any orphan overlay div (created in a previous render cycle
    // and no longer referenced in overlayMap) is swept here. Also reset our
    // inline position:relative on processed posts.
    document.querySelectorAll(`.${HAIKU_OVERLAY_CLASS}`).forEach(el => el.remove());
    document.querySelectorAll(`.${SWEEP_BAR_CLASS}`).forEach(el => el.remove());
    document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach(el => {
      el.removeAttribute(PROCESSED_ATTR);
      if (el.style) {
        if (el.style.position === 'relative') el.style.position = '';
        if (el.style.zIndex === '0') el.style.zIndex = '';
      }
    });
    visiblePosts.clear();
    if (postVisibilityObserver) { postVisibilityObserver.disconnect(); postVisibilityObserver = null; }
    if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  }

  // --- Sweep animation ---
  // Activation visual: a thin green bar slides down the viewport over
  // SWEEP_DURATION_MS. As it passes each AI post's top edge, that post's
  // overlay is created. Posts below the viewport are processed once the bar
  // reaches the bottom. Honors prefers-reduced-motion.
  function sweepTransform() {
    if (!settings.enabled || !patterns || !haikus.length) return;
    if (document.querySelector(`.${SWEEP_BAR_CLASS}`)) return;

    const newPosts = collectAIPosts();

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      for (const [post, { bodyEl, textNode }] of newPosts) createPostOverlay(post, bodyEl, textNode);
      return;
    }

    // Always show the sweep bar — visual confirmation of activation, even on
    // pages with no AI posts to transform.
    const entries = [];
    for (const [post, { bodyEl, textNode }] of newPosts) {
      entries.push({ post, bodyEl, textNode, y: post.getBoundingClientRect().top });
    }
    entries.sort((a, b) => a.y - b.y);

    const bar = document.createElement('div');
    bar.className = SWEEP_BAR_CLASS;
    const sprout = document.createElement('div');
    sprout.className = 'ai-holiday-v2-sweep-sprout';
    sprout.textContent = '\u{1F331}';
    bar.appendChild(sprout);
    document.body.appendChild(bar);

    const vh = window.innerHeight;
    const t0 = performance.now();
    let cursor = 0;
    function step(now) {
      const t = Math.min((now - t0) / SWEEP_DURATION_MS, 1);
      const barY = t * vh;
      bar.style.transform = `translateY(${barY}px)`;
      while (cursor < entries.length && entries[cursor].y <= barY) {
        const e = entries[cursor];
        createPostOverlay(e.post, e.bodyEl, e.textNode);
        cursor++;
      }
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        while (cursor < entries.length) {
          const e = entries[cursor];
          createPostOverlay(e.post, e.bodyEl, e.textNode);
          cursor++;
        }
        bar.style.opacity = '0';
        setTimeout(() => bar.remove(), 400);
      }
    }
    requestAnimationFrame(step);
  }

  // --- Scan loop ---
  function scan() {
    if (!settings.enabled || !patterns || !haikus.length) return;
    // Re-validate existing overlays: if React reconciliation removed them
    // (without removing the post), re-attach. If the post itself is detached,
    // clean up.
    for (const [post, entry] of [...overlayMap]) {
      if (!post.isConnected) { removePostOverlay(post); continue; }
      if (!entry.haikuOverlay.isConnected) {
        overlayMap.delete(post);
        post.removeAttribute(PROCESSED_ATTR);
        createPostOverlay(post, entry.bodyEl, entry.aiTextNode);
      }
    }
    const newPosts = collectAIPosts();
    for (const [post, { bodyEl, textNode }] of newPosts) createPostOverlay(post, bodyEl, textNode);
  }

  function scheduleScan() {
    if (scanDebounceTimer) clearTimeout(scanDebounceTimer);
    scanDebounceTimer = setTimeout(() => {
      scanDebounceTimer = null;
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(scan, { timeout: 500 });
      } else {
        scan();
      }
    }, 250);
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        removeAllOverlays();
        setTimeout(scan, 500);
        return;
      }
      scheduleScan();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) { observer.disconnect(); observer = null; }
  }

  // --- Audio ---
  function ensureAudio() {
    if (audioEl) return audioEl;
    audioEl = document.createElement('audio');
    audioEl.id = AUDIO_ID;
    audioEl.src = chrome.runtime.getURL('audio/garden.mp3');
    audioEl.loop = true; audioEl.volume = AUDIO_BASE_VOLUME; audioEl.preload = 'auto';
    (document.body || document.documentElement).appendChild(audioEl);
    return audioEl;
  }

  function ensureAudioGraph() {
    if (audioGain || !audioEl) return;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctor();
      const source = audioCtx.createMediaElementSource(audioEl);
      audioGain = audioCtx.createGain();
      audioGain.gain.value = AUDIO_GAIN;
      const comp = audioCtx.createDynamicsCompressor();
      comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 3;
      comp.attack.value = 0.005; comp.release.value = 0.12;
      source.connect(audioGain); audioGain.connect(comp); comp.connect(audioCtx.destination);
    } catch (e) { console.warn('[Holiday from AI v2] audio graph failed:', e); }
  }

  function targetVolumeForVisibleCount(count) {
    const ratio = Math.min(count / POSTS_FOR_PEAK, 1);
    return AUDIO_BASE_VOLUME + (AUDIO_PEAK_VOLUME - AUDIO_BASE_VOLUME) * ratio;
  }

  function rampAudioVolumeTo(target) {
    if (!audioEl) return;
    if (volumeAnimRAF) cancelAnimationFrame(volumeAnimRAF);
    const start = audioEl.volume, t0 = performance.now();
    const step = now => {
      const t = Math.min((now - t0) / VOLUME_RAMP_MS, 1);
      audioEl.volume = start + (target - start) * t;
      if (t < 1) volumeAnimRAF = requestAnimationFrame(step);
      else volumeAnimRAF = null;
    };
    volumeAnimRAF = requestAnimationFrame(step);
  }

  function updateVolumeSwell() {
    if (!audioEl || audioEl.paused) return;
    rampAudioVolumeTo(targetVolumeForVisibleCount(visiblePosts.size));
  }

  function ensureSpeakerButton() {
    if (speakerBtn && speakerBtn.isConnected) return speakerBtn;
    speakerBtn = document.createElement('button');
    speakerBtn.id = SPEAKER_BTN_ID; speakerBtn.type = 'button';
    const bg = document.createElement('div'); bg.className = 'v2-bg';
    const content = document.createElement('div');
    content.className = 'v2-content'; content.textContent = '\u{1F331}';
    const notes = document.createElement('div');
    notes.className = 'v2-notes'; notes.textContent = '\u{1F3B6}';
    speakerBtn.append(bg, content, notes);
    speakerBtn.addEventListener('click', (e) => {
      if (e.shiftKey) {
        e.preventDefault();
        dumpDiagnostic();
        return;
      }
      soundMuted = !soundMuted;
      applySoundState();
    });
    speakerBtn.style.display = settings.enabled ? '' : 'none';
    (document.body || document.documentElement).appendChild(speakerBtn);
    updateSpeakerUI();
    return speakerBtn;
  }

  function updateSpeakerUI() {
    if (!speakerBtn) return;
    speakerBtn.classList.toggle('is-muted', soundMuted);
    speakerBtn.title = soundMuted ? 'Unmute garden soundtrack' : 'Mute garden soundtrack';
    speakerBtn.setAttribute('aria-label', speakerBtn.title);
  }

  // Sound starts muted by default; the click on the speaker button IS the user
  // gesture that satisfies Chrome's autoplay policy, so play() doesn't need a
  // listener-based retry fallback.
  function applySoundState() {
    ensureSpeakerButton();
    updateSpeakerUI();
    if (speakerBtn) speakerBtn.style.display = settings.enabled ? '' : 'none';
    const shouldPlay = settings.enabled && !soundMuted;
    if (shouldPlay) {
      const a = ensureAudio();
      ensureAudioGraph();
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      a.volume = targetVolumeForVisibleCount(visiblePosts.size);
      const p = a.play();
      if (p && typeof p.catch === 'function') {
        // If play fails unexpectedly, silently revert to muted so the UI
        // matches reality (no console warn → no chrome://extensions noise).
        p.catch(() => { soundMuted = true; updateSpeakerUI(); });
      }
    } else if (audioEl) {
      audioEl.pause();
      if (volumeAnimRAF) { cancelAnimationFrame(volumeAnimRAF); volumeAnimRAF = null; }
    }
  }

  // --- Diagnostic ---
  // Shift+Click the speaker button to dump a URN inventory of the visible page
  // as a downloadable .txt file. Bypasses the noisy LinkedIn console.
  function dumpDiagnostic() {
    const sections = [];

    // 1. Visible URN-tagged elements.
    sections.push('=== Visible URN-tagged elements (width>200, height>100, on-screen) ===');
    const seen = new Set();
    const allUrn = document.querySelectorAll('[data-urn], [data-id]');
    for (const el of allUrn) {
      const urn = el.getAttribute('data-urn') || el.getAttribute('data-id');
      const r = el.getBoundingClientRect();
      if (r.width > 200 && r.height > 100 && r.top < innerHeight && r.bottom > 0 && !seen.has(urn)) {
        seen.add(urn);
        sections.push(`${urn}  (${Math.round(r.width)}×${Math.round(r.height)})  tag=${el.tagName.toLowerCase()}`);
      }
    }
    sections.push(`Total visible URNs: ${seen.size}`);
    sections.push('');

    // 2. All distinct URN prefixes seen anywhere on page (for whitelist tuning).
    sections.push('=== All distinct URN prefixes anywhere on page ===');
    const prefixes = new Map();
    for (const el of allUrn) {
      const urn = el.getAttribute('data-urn') || el.getAttribute('data-id') || '';
      const m = urn.match(/^urn:li:[a-zA-Z_]+/);
      if (m) prefixes.set(m[0], (prefixes.get(m[0]) || 0) + 1);
    }
    for (const [p, c] of [...prefixes.entries()].sort((a, b) => b[1] - a[1])) {
      sections.push(`${c}\t${p}`);
    }
    sections.push('');

    // 3. Sample text nodes that contain AI vocab + their ancestor chain.
    sections.push('=== Sample AI-mentioning text nodes (first 5) and their ancestor chain ===');
    let samples = 0;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (AIHolidayEngine.shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode()) && samples < 5) {
      if (!textHasAITerms(n.nodeValue)) continue;
      samples++;
      sections.push(`--- Sample ${samples} ---`);
      sections.push(`Text: "${n.nodeValue.trim().slice(0, 120)}"`);
      let cur = n.parentElement;
      let depth = 0;
      while (cur && cur !== document.body && depth < 15) {
        const urn = cur.getAttribute && (cur.getAttribute('data-urn') || cur.getAttribute('data-id'));
        const r = cur.getBoundingClientRect();
        const tag = cur.tagName.toLowerCase();
        const role = cur.getAttribute && cur.getAttribute('role');
        sections.push(`  [${depth}] <${tag}${role ? ` role="${role}"` : ''}${urn ? ` urn="${urn}"` : ''}>  (${Math.round(r.width)}×${Math.round(r.height)})`);
        cur = cur.parentElement;
        depth++;
      }
    }
    sections.push('');

    // 4. Per-overlay breakdown: for each VISIBLE active overlay, dump the AI
    // text node's ancestor chain (with widths) + every header-scan candidate.
    // This lets us see exactly why computeHeaderOffset is returning what it is.
    sections.push('=== Visible overlay header-detection breakdown ===');
    for (const [post, entry] of overlayMap) {
      const r = post.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      sections.push(`-- Post (${Math.round(r.width)}×${Math.round(r.height)}) at viewport-top=${Math.round(r.top)} --`);
      const overlayTopPx = parseFloat(entry.haikuOverlay.style.top) || 0;
      sections.push(`  overlay starts at: ${Math.round(overlayTopPx)}px from post top`);
      if (entry.aiTextNode && entry.aiTextNode.isConnected) {
        sections.push(`  AI text: "${entry.aiTextNode.nodeValue.trim().slice(0, 100)}"`);
        sections.push(`  AI text ancestors (top is relative to post top):`);
        let cur = entry.aiTextNode.parentElement;
        let depth = 0;
        const target = r.width * 0.85;
        while (cur && cur !== post && depth < 12) {
          const cr = cur.getBoundingClientRect();
          const wRatio = cr.width / r.width;
          const fitsWidth = cr.width >= target;
          const fitsHeight = cr.height > 30;
          sections.push(`    [${depth}] <${cur.tagName.toLowerCase()}>  ${Math.round(cr.width)}×${Math.round(cr.height)}  top=${Math.round(cr.top - r.top)}  w_ratio=${wRatio.toFixed(2)}  ${fitsWidth && fitsHeight ? '<-- substantial' : ''}`);
          cur = cur.parentElement;
          depth++;
        }
      } else {
        sections.push(`  AI text node: <disconnected or missing>`);
      }
      sections.push(`  Header-scan candidates (relative top, relative bottom, ✓ if in top 25%):`);
      const cutoff = Math.min(r.height * 0.25, 200);
      const els = post.querySelectorAll(
        'a[href*="/in/"], a[href*="/company/"], a[href*="/school/"], ' +
        'a[href*="/newsletters/"], ' +
        'time, ' +
        '[aria-label*="control" i], [aria-label*="more options" i], [aria-label*="plus d\'options" i], ' +
        '[aria-label*="visibili" i], [aria-label*="audience" i]'
      );
      for (const el of els) {
        const er = el.getBoundingClientRect();
        const relTop = er.top - r.top;
        const relBottom = er.bottom - r.top;
        const inRange = relTop >= 0 && relTop < cutoff;
        const href = el.getAttribute('href') || '';
        const aria = el.getAttribute('aria-label') || '';
        const text = (el.textContent || '').trim().slice(0, 40);
        sections.push(`    ${inRange ? '✓' : '✗'} <${el.tagName.toLowerCase()}> top=${Math.round(relTop)} bot=${Math.round(relBottom)} text="${text}" href="${href.slice(0, 40)}" aria="${aria.slice(0, 40)}"`);
      }
      sections.push('');
    }
    sections.push('');

    // 5. Current v2 state.
    sections.push('=== v2 state ===');
    sections.push(`patterns loaded: ${patterns ? patterns.length : 'NULL'}`);
    sections.push(`haikus loaded: ${haikus.length}`);
    sections.push(`overlays active: ${overlayMap.size}`);
    sections.push(`settings.enabled: ${settings.enabled}`);
    sections.push(`location: ${location.href}`);

    const blob = new Blob([sections.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `linkedin-urn-report-${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`[Holiday from AI v2] diagnostic downloaded: ${a.download}`);
  }

  // --- Init ---
  async function init() {
    const stored = await chrome.storage.sync.get({ enabled: true });
    settings = stored;
    injectStyles();
    ensureSpeakerButton();
    loadImageUrls();

    const [dictPatterns] = await Promise.all([loadDictionary(), loadHaikus()]);
    patterns = dictPatterns;
    applySoundState();

    console.log(`[Holiday from AI v2] ready — ${haikus.length} haikus, ${gardenImageUrls.length} images, enabled=${settings.enabled}`);

    if (settings.enabled) {
      startObserver();
      sweepTransform();
    }

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      const wasEnabled = settings.enabled;
      if (changes.enabled) settings.enabled = changes.enabled.newValue;

      if (wasEnabled && !settings.enabled) {
        stopObserver();
        removeAllOverlays();
        applySoundState();
        return;
      }
      if (!wasEnabled && settings.enabled) {
        startObserver();
        sweepTransform();
        applySoundState();
      }
    });
  }

  init().catch(e => console.error('[Holiday from AI v2] init failed:', e));
})();
