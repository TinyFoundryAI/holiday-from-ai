(function () {
  const SWEEP_BAR_CLASS = 'ai-holiday-sweep-bar';
  const SWAPPED_IMG_ATTR = 'data-ai-holiday-swapped';
  const TRANSFORMED_POST_ATTR = 'data-ai-holiday-transformed';
  const HAIKU_TARGET_ATTR = 'data-ai-holiday-haiku-target';   // on body-content element
  const HAIKU_PASS_ATTR = 'data-ai-holiday-haiku-pass';       // on post: '1' or '2'
  const ORIG_LENGTH_ATTR = 'data-ai-holiday-orig-length';     // on post: initial body length
  const ORIG_WRAPPER_ATTR = 'data-ai-holiday-orig';           // hidden wrapper holding original live children
  const INJECTED_ATTR = 'data-ai-holiday-injected';           // on the haiku element we add
  const HAIKU_CLASS = 'ai-holiday-haiku';
  const STYLE_ID = 'ai-holiday-styles';
  const SPEAKER_BTN_ID = 'ai-holiday-speaker';
  const AUDIO_ID = 'ai-holiday-audio';
  const DEMO_BODY_CLASS = 'ai-holiday-demo';
  const DEMO_HIDE_ATTR = 'data-ai-holiday-demo-hide';
  // In demo mode (URL contains #demo), feed posts NOT authored by one of these
  // AI-influencer handles get hidden. Keeps the screenshot clean of your actual
  // network and staged around public-figure AI content only.
  const DEMO_WHITELIST = new Set([
    'andrewyng', 'alliekmiller', 'emollick', 'kozyrkov', 'bernardmarr',
    'yann-lecun', 'demishassabis', 'sundarpichai', 'satyanadella',
    'samaltman', 'dario-amodei', 'reidhoffman',
    'fei-fei-li-4541247', 'andrej-karpathy-9a650716',
  ]);
  const AUDIO_BASE_VOLUME = 0.25;
  const AUDIO_PEAK_VOLUME = 0.90;
  const AUDIO_GAIN = 2.4;
  const POSTS_FOR_PEAK = 4;
  const VOLUME_RAMP_MS = 500;
  const VISIBILITY_THRESHOLD = 0.3;
  const IMAGE_COUNT = 12;
  const MIN_IMAGE_DIM = 200;
  const MIN_POST_HEIGHT = 180;
  const MAX_POST_HEIGHT = 3200;   // profile sections (About / Experience) can be quite tall
  const MAX_POST_WIDTH = 1100;    // profile main column can be ~1000px
  const SWEEP_DURATION_MS = 1400;
  const NAV_RESCAN_DELAY_MS = 400;
  const HEALTH_CHECK_INTERVAL_MS = 5000;
  const EXPANSION_RATIO = 1.5;
  const EXPANSION_MIN_LEN = 300;

  let patterns = null;
  let haikus = [];
  // demoMode is NOT a user setting — it's a dev-only screenshot helper, activated by
  // adding "#demo" to the URL (e.g., linkedin.com/feed#demo). Nothing in the popup UI.
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
  let haikuReplacedPosts = new Set();   // posts whose body we've replaced (for revert)

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
      .${HAIKU_CLASS} {
        font-style: italic;
        line-height: 1.65;
        white-space: pre-line;
        padding: 4px 0 6px;
        opacity: 0.96;
      }
      #${SPEAKER_BTN_ID} {
        position: fixed; right: 20px; bottom: 20px;
        width: 64px; height: 64px; padding: 0; border: 0;
        background: transparent; cursor: pointer;
        z-index: 2147483646; overflow: visible; --swell: 0;
      }
      #${SPEAKER_BTN_ID} .ai-holiday-glow {
        position: absolute; inset: 0; border-radius: 50%; pointer-events: none; opacity: 0;
      }
      #${SPEAKER_BTN_ID}.is-playing .ai-holiday-glow { animation: ai-holiday-breathe 3.2s ease-in-out infinite; }
      @keyframes ai-holiday-breathe {
        0%, 100% { box-shadow: 0 0 14px 2px rgba(111,179,81,0.30); opacity: 0.6; }
        50%      { box-shadow: 0 0 28px 8px rgba(111,179,81,0.55); opacity: 1; }
      }
      #${SPEAKER_BTN_ID} .ai-holiday-bg {
        position: absolute; inset: 4px; border-radius: 50%;
        background: #3d8aa5; box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        transition: background 160ms ease, transform 160ms ease;
      }
      #${SPEAKER_BTN_ID}:hover .ai-holiday-bg { background: #4aa3bf; transform: scale(1.04); }
      #${SPEAKER_BTN_ID}.is-muted .ai-holiday-bg {
        background: #5a7580;
        animation: ai-holiday-invite 2.8s ease-in-out infinite;
      }
      @keyframes ai-holiday-invite {
        0%, 100% { transform: scale(1.00); box-shadow: 0 4px 14px rgba(0,0,0,0.25); }
        50%      { transform: scale(1.03); box-shadow: 0 4px 18px rgba(61,138,165,0.40); }
      }
      #${SPEAKER_BTN_ID}.is-muted:hover .ai-holiday-bg { animation: none; }
      #${SPEAKER_BTN_ID} .ai-holiday-ring {
        position: absolute; inset: 0; pointer-events: none; transform: rotate(-90deg);
      }
      #${SPEAKER_BTN_ID} .ai-holiday-ring circle {
        fill: none; stroke: #9fd184; stroke-width: 2.5; stroke-linecap: round;
        stroke-dasharray: 176; stroke-dashoffset: calc(176 * (1 - var(--swell, 0)));
        opacity: 0.9; transition: stroke-dashoffset 450ms ease-out;
      }
      #${SPEAKER_BTN_ID}.is-muted .ai-holiday-ring circle { stroke-dashoffset: 176; }
      #${SPEAKER_BTN_ID} .ai-holiday-content {
        position: absolute; inset: 0 0 8px 0; display: flex; align-items: center; justify-content: center;
        font-size: 26px; line-height: 1; pointer-events: none;
      }
      #${SPEAKER_BTN_ID} .ai-holiday-notes {
        position: absolute; top: 7px; right: 9px;
        font-size: 12px; line-height: 1; pointer-events: none;
        filter: drop-shadow(0 1px 1px rgba(0,0,0,0.4));
      }
      #${SPEAKER_BTN_ID}.is-muted .ai-holiday-content {
        text-decoration: line-through; text-decoration-thickness: 2px;
        text-decoration-color: rgba(255,255,255,0.9); opacity: 0.65;
      }
      #${SPEAKER_BTN_ID}.is-muted .ai-holiday-notes { opacity: 0.55; }
      #${SPEAKER_BTN_ID} .ai-holiday-eq {
        position: absolute; bottom: 7px; left: 50%; transform: translateX(-50%);
        display: flex; align-items: flex-end; gap: 2.5px; height: 8px;
        opacity: 0; transition: opacity 400ms ease; pointer-events: none;
      }
      #${SPEAKER_BTN_ID}.is-playing .ai-holiday-eq { opacity: 0.95; }
      #${SPEAKER_BTN_ID} .ai-holiday-eq span { width: 2.5px; background: #f5f7f0; border-radius: 1.5px; height: 3px; }
      #${SPEAKER_BTN_ID}.is-playing .ai-holiday-eq span:nth-child(1) { animation: ai-holiday-eq1 0.95s ease-in-out infinite; }
      #${SPEAKER_BTN_ID}.is-playing .ai-holiday-eq span:nth-child(2) { animation: ai-holiday-eq2 1.15s ease-in-out infinite; }
      #${SPEAKER_BTN_ID}.is-playing .ai-holiday-eq span:nth-child(3) { animation: ai-holiday-eq3 0.80s ease-in-out infinite; }
      @keyframes ai-holiday-eq1 { 0%,100% { height: 2px; } 50% { height: 6px; } }
      @keyframes ai-holiday-eq2 { 0%,100% { height: 3px; } 50% { height: 8px; } }
      @keyframes ai-holiday-eq3 { 0%,100% { height: 2px; } 50% { height: 7px; } }

      /* Demo mode: precisely target author/commenter identity. LinkedIn wraps every
         person-name + avatar in an <a> to /in/… and company refs in /company/… .
         Blurring those links (CSS filter propagates to descendants) catches both the
         name text and the avatar image — while leaving post hero images, nav icons,
         reactions, and UI chrome untouched. */
      /* Demo mode = URL hash contains #demo. Posts that aren't from a whitelisted
         AI influencer get marked and hidden. Everything else renders normally. */
      body.${DEMO_BODY_CLASS} [${DEMO_HIDE_ATTR}] { display: none !important; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

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

  function hashString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  // Detection: does this text contain any AI vocabulary? We reuse the compiled dictionary
  // patterns as a trip-wire — we don't replace the words anymore.
  function textHasAITerms(text) {
    if (!patterns || !text) return false;
    for (const { regex } of patterns) {
      regex.lastIndex = 0;
      if (regex.test(text)) return true;
    }
    return false;
  }

  function escapeHTML(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Walk up from a text node. Author bylines (links, buttons, aria-labeled chrome)
  // shouldn't count as "this post mentions AI" — just because the user's title has
  // "AI" in it doesn't make every post of theirs a haiku candidate.
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

  // Geometric post detection — LinkedIn hashes class names, so we match by shape.
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

  // Find the tightest common ancestor of all AI-mentioning text nodes within a post.
  // That element IS the post's body content — where the haiku goes.
  function findHaikuTarget(post, aiTextNodes) {
    if (!aiTextNodes.length) return null;
    if (aiTextNodes.length === 1) return aiTextNodes[0].parentElement || post;
    let candidate = aiTextNodes[0].parentElement;
    while (candidate && candidate !== post) {
      let allContained = true;
      for (const n of aiTextNodes) {
        if (!candidate.contains(n)) { allContained = false; break; }
      }
      if (allContained) return candidate;
      candidate = candidate.parentElement;
    }
    return post;
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

  function pickHaikus(post) {
    const sig = post.getAttribute('data-urn') || post.getAttribute('data-id') || (post.textContent || '').slice(0, 80);
    const seed = hashString(sig);
    return {
      primary: haikus[seed % haikus.length],
      secondary: haikus[(seed + 1) % haikus.length],
    };
  }

  // Replace the target element's visible content with a haiku, BUT preserve the
  // original live DOM nodes (with their event handlers) inside a hidden wrapper.
  // This lets "Read more" buttons, carousel arrows, reactions, etc. still work
  // correctly after a revert — we just unhide them.
  function replacePostBodyWithHaiku(post, target) {
    if (!haikus.length || !target) return;

    // Detect whether this run is the initial render or an expansion.
    const priorPass = parseInt(post.getAttribute(HAIKU_PASS_ATTR) || '0', 10);
    const currentLen = target.textContent.length;
    let newPass;
    if (priorPass === 0) {
      post.setAttribute(ORIG_LENGTH_ATTR, String(currentLen));
      newPass = 1;
    } else {
      const origLen = parseInt(post.getAttribute(ORIG_LENGTH_ATTR) || String(currentLen), 10);
      const isExpansion = currentLen >= origLen * EXPANSION_RATIO && currentLen > EXPANSION_MIN_LEN;
      newPass = isExpansion ? 2 : priorPass;
    }

    // On first touch: move all existing children (live nodes, handlers intact) into a
    // hidden wrapper. Subsequent touches skip this — we already did it.
    let wrapper = target.querySelector(`:scope > [${ORIG_WRAPPER_ATTR}]`);
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.setAttribute(ORIG_WRAPPER_ATTR, '1');
      wrapper.style.display = 'none';
      while (target.firstChild) wrapper.appendChild(target.firstChild);
      target.appendChild(wrapper);
    }

    // Remove any previous injected haiku and add a fresh one.
    const old = target.querySelector(`:scope > [${INJECTED_ATTR}]`);
    if (old) old.remove();

    const picks = pickHaikus(post);
    const frag = document.createElement('div');
    frag.className = HAIKU_CLASS;
    frag.setAttribute(INJECTED_ATTR, '1');
    frag.textContent = newPass === 2
      ? picks.primary + '\n\n' + picks.secondary
      : picks.primary;
    target.appendChild(frag);

    target.setAttribute(HAIKU_TARGET_ATTR, '1');
    post.setAttribute(HAIKU_PASS_ATTR, String(newPass));
    post.setAttribute(TRANSFORMED_POST_ATTR, '1');
    haikuReplacedPosts.add(post);
  }

  function imageIsLargeEnough(img) {
    const rect = img.getBoundingClientRect();
    const w = rect.width || img.clientWidth || parseInt(img.getAttribute('width'), 10) || img.naturalWidth || 0;
    const h = rect.height || img.clientHeight || parseInt(img.getAttribute('height'), 10) || img.naturalHeight || 0;
    return w >= MIN_IMAGE_DIM && h >= MIN_IMAGE_DIM;
  }

  function swapPostImages(post) {
    if (!post || !settings.enabled || gardenImageUrls.length === 0) return 0;
    const imgs = post.querySelectorAll('img');
    const signature = post.getAttribute('data-urn') || post.getAttribute('data-id') || (post.textContent || '').slice(0, 80);
    const base = hashString(signature);
    let idx = 0, swapped = 0;
    for (const img of imgs) {
      if (img.hasAttribute(SWAPPED_IMG_ATTR)) { idx++; continue; }
      if (!imageIsLargeEnough(img)) continue;
      const pick = gardenImageUrls[(base + idx) % gardenImageUrls.length];
      img.dataset.aiHolidayOrigSrc = img.src || '';
      if (img.hasAttribute('srcset')) img.dataset.aiHolidayOrigSrcset = img.getAttribute('srcset');
      if (img.hasAttribute('sizes')) img.dataset.aiHolidayOrigSizes = img.getAttribute('sizes');
      img.setAttribute(SWAPPED_IMG_ATTR, '1');
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.src = pick;
      idx++; swapped++;
    }
    swapPostVideos(post, base, idx);
    return swapped;
  }

  // Replace any <video> in a post with a still garden image (same bounding size).
  // LinkedIn often embeds auto-playing videos; we silence them by swapping to a poster-only image.
  function swapPostVideos(post, base, idxStart) {
    if (!post || gardenImageUrls.length === 0) return;
    const videos = post.querySelectorAll('video');
    let idx = idxStart || 0;
    for (const video of videos) {
      if (video.hasAttribute(SWAPPED_IMG_ATTR)) { idx++; continue; }
      const rect = video.getBoundingClientRect();
      const w = rect.width || video.clientWidth || video.videoWidth || 0;
      const h = rect.height || video.clientHeight || video.videoHeight || 0;
      if (w < MIN_IMAGE_DIM || h < MIN_IMAGE_DIM) { idx++; continue; }
      // Stop the video, strip its sources, replace poster with a garden image.
      try { video.pause(); } catch (e) {}
      video.removeAttribute('autoplay');
      video.muted = true;
      video.loop = false;
      const pick = gardenImageUrls[(base + idx) % gardenImageUrls.length];
      // Save originals for revert
      video.dataset.aiHolidayOrigPoster = video.getAttribute('poster') || '';
      video.dataset.aiHolidayOrigSrc = video.getAttribute('src') || '';
      video.setAttribute('poster', pick);
      video.removeAttribute('src');
      // Remove any <source> children so the browser can't re-derive the video
      for (const source of video.querySelectorAll('source')) source.remove();
      video.load();   // force poster to display
      video.setAttribute(SWAPPED_IMG_ATTR, '1');
      idx++;
    }
  }

  function rescanTransformedPosts() {
    const posts = document.querySelectorAll(`[${TRANSFORMED_POST_ATTR}]`);
    for (const post of posts) swapPostImages(post);
  }

  // --- Audio + speaker button (unchanged from previous versions) ---

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
    updateSpeakerSwell();
    if (!audioEl || audioEl.paused) return;
    rampAudioVolumeTo(targetVolumeForVisibleCount(visiblePosts.size));
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

  function trackTransformedPost(post) { ensurePostVisibilityObserver().observe(post); }

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
    speakerBtn.style.setProperty('--swell', String(Math.min(visiblePosts.size / POSTS_FOR_PEAK, 1)));
  }

  function ensureSpeakerButton() {
    if (speakerBtn && speakerBtn.isConnected) return speakerBtn;
    speakerBtn = document.createElement('button');
    speakerBtn.id = SPEAKER_BTN_ID; speakerBtn.type = 'button';
    const glow = document.createElement('div'); glow.className = 'ai-holiday-glow';
    const bg = document.createElement('div'); bg.className = 'ai-holiday-bg';
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ring.setAttribute('class', 'ai-holiday-ring'); ring.setAttribute('viewBox', '0 0 64 64');
    ring.setAttribute('width', '64'); ring.setAttribute('height', '64');
    const rc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rc.setAttribute('cx', '32'); rc.setAttribute('cy', '32'); rc.setAttribute('r', '28'); ring.appendChild(rc);
    const content = document.createElement('div');
    content.className = 'ai-holiday-content'; content.textContent = '\u{1F331}';
    const notes = document.createElement('div');
    notes.className = 'ai-holiday-notes'; notes.textContent = '\u{1F3B6}';
    const eq = document.createElement('div'); eq.className = 'ai-holiday-eq';
    for (let i = 0; i < 3; i++) eq.appendChild(document.createElement('span'));
    speakerBtn.append(glow, bg, ring, content, notes, eq);
    speakerBtn.addEventListener('click', () => {
      const next = !settings.soundEnabled;
      chrome.storage.sync.set({ soundEnabled: next });
      settings.soundEnabled = next;
      applySoundState();
    });
    (document.body || document.documentElement).appendChild(speakerBtn);
    updateSpeakerUI(); updateSpeakerSwell();
    return speakerBtn;
  }

  function isDemoModeRequested() {
    // URL hash trigger: "#demo" or "#demo-…" activates screenshot blur.
    const h = (location.hash || '').toLowerCase();
    return h === '#demo' || h.startsWith('#demo-') || h.includes('demo');
  }

  function applyDemoMode() {
    if (!document.body) return;
    // Demo mode runs regardless of extension on/off — screenshot helper.
    const on = isDemoModeRequested();
    document.body.classList.toggle(DEMO_BODY_CLASS, on);
    applyDemoWhitelist(on);
  }

  // Walk posts on the page. If any has an author link not in the whitelist, hide it.
  // Whitelist-authored posts stay visible; posts we can't classify stay visible.
  function applyDemoWhitelist(on) {
    if (!on) {
      for (const el of document.querySelectorAll(`[${DEMO_HIDE_ATTR}]`)) el.removeAttribute(DEMO_HIDE_ATTR);
      return;
    }
    // verdict map: post element → 'keep' | 'hide'
    const verdicts = new Map();
    const authorLinks = document.querySelectorAll('a[href*="/in/"]');
    for (const link of authorLinks) {
      const post = findContainingPost(link);
      if (!post) continue;
      const href = link.getAttribute('href') || '';
      const m = href.match(/\/in\/([^/?#]+)/);
      if (!m) continue;
      const handle = m[1].toLowerCase();
      if (DEMO_WHITELIST.has(handle)) {
        verdicts.set(post, 'keep');
      } else if (!verdicts.has(post)) {
        verdicts.set(post, 'hide');
      }
    }
    for (const [post, verdict] of verdicts) {
      if (verdict === 'hide') post.setAttribute(DEMO_HIDE_ATTR, '1');
      else post.removeAttribute(DEMO_HIDE_ATTR);
    }
  }

  function applySoundState() {
    ensureSpeakerButton();
    updateSpeakerUI();
    if (speakerBtn) speakerBtn.style.display = settings.enabled ? '' : 'none';
    const shouldPlay = settings.enabled && settings.soundEnabled;
    if (shouldPlay) {
      const a = ensureAudio();
      ensureAudioGraph();
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      a.volume = targetVolumeForVisibleCount(visiblePosts.size);
      const p = a.play();
      if (p && typeof p.catch === 'function') {
        p.catch(err => {
          // Chrome blocks autoplay on fresh page loads. Revert UI + stored setting
          // to muted so the button accurately reflects that audio is silent, and the
          // user's next click starts audio fresh.
          console.warn('[Holiday from AI] audio play blocked (autoplay policy):', err.name);
          settings.soundEnabled = false;
          chrome.storage.sync.set({ soundEnabled: false }).catch(() => {});
          updateSpeakerUI();
          if (audioEl) audioEl.pause();
        });
      }
    } else if (audioEl) {
      audioEl.pause();
      if (volumeAnimRAF) { cancelAnimationFrame(volumeAnimRAF); volumeAnimRAF = null; }
    }
  }

  // --- Core: detection + haiku replacement ---

  function processSubtree(root) {
    if (!settings.enabled || !patterns || !haikus.length) return;
    const nodes = collectTextNodes(root);
    const postToAINodes = new Map();
    for (const node of nodes) {
      if (!textHasAITerms(node.nodeValue)) continue;
      const post = findContainingPost(node);
      if (!post) continue;
      if (!postToAINodes.has(post)) postToAINodes.set(post, []);
      postToAINodes.get(post).push(node);
    }
    for (const [post, aiNodes] of postToAINodes) {
      const target = findHaikuTarget(post, aiNodes);
      if (!target) continue;
      const wasTransformed = post.hasAttribute(TRANSFORMED_POST_ATTR);
      replacePostBodyWithHaiku(post, target);
      swapPostImages(post);
      if (!wasTransformed) trackTransformedPost(post);
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
        setTimeout(() => { if (settings.enabled && patterns) scheduleProcess([document.body]); }, NAV_RESCAN_DELAY_MS);
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

  function startHealthCheck() {
    if (healthCheckTimer) return;
    healthCheckTimer = setInterval(() => {
      // Re-apply demo whitelist even if the extension is off, so the hide list
      // stays current as the feed scrolls in new posts.
      if (isDemoModeRequested()) applyDemoWhitelist(true);
      if (!settings.enabled || !patterns) return;
      if (!pendingRoots) scheduleProcess([document.body]);
      rescanTransformedPosts();
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  function revertAllReplacements() {
    // Remove injected haikus + unhide the original wrapped children. Nodes are
    // moved back by appendChild, which preserves all event handlers.
    const targets = document.querySelectorAll(`[${HAIKU_TARGET_ATTR}]`);
    for (const target of targets) {
      const injected = target.querySelector(`:scope > [${INJECTED_ATTR}]`);
      if (injected) injected.remove();
      const wrapper = target.querySelector(`:scope > [${ORIG_WRAPPER_ATTR}]`);
      if (wrapper) {
        while (wrapper.firstChild) target.appendChild(wrapper.firstChild);
        wrapper.remove();
      }
      target.removeAttribute(HAIKU_TARGET_ATTR);
    }
    for (const p of haikuReplacedPosts) {
      p.removeAttribute(HAIKU_PASS_ATTR);
      p.removeAttribute(ORIG_LENGTH_ATTR);
    }
    haikuReplacedPosts.clear();
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
    const videos = document.querySelectorAll(`video[${SWAPPED_IMG_ATTR}]`);
    for (const video of videos) {
      if (video.dataset.aiHolidayOrigPoster !== undefined) {
        if (video.dataset.aiHolidayOrigPoster) video.setAttribute('poster', video.dataset.aiHolidayOrigPoster);
        else video.removeAttribute('poster');
      }
      if (video.dataset.aiHolidayOrigSrc) video.setAttribute('src', video.dataset.aiHolidayOrigSrc);
      video.removeAttribute(SWAPPED_IMG_ATTR);
      delete video.dataset.aiHolidayOrigPoster;
      delete video.dataset.aiHolidayOrigSrc;
    }
    for (const p of document.querySelectorAll(`[${TRANSFORMED_POST_ATTR}]`)) p.removeAttribute(TRANSFORMED_POST_ATTR);
    visiblePosts.clear();
    if (postVisibilityObserver) { postVisibilityObserver.disconnect(); postVisibilityObserver = null; }
  }

  // Sweep animation — iterate posts in visual order and haiku-replace them as the bar passes.
  function sweepTransform() {
    if (!patterns || !haikus.length) return;
    if (document.querySelector(`.${SWEEP_BAR_CLASS}`)) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      observer && observer.disconnect();
      try { processSubtree(document.body); } finally { startObserver(); }
      return;
    }

    injectStyles();

    // Collect all AI-mentioning posts once, pair each with its target + Y position.
    const nodes = collectTextNodes(document.body);
    const postMap = new Map();
    for (const node of nodes) {
      if (!textHasAITerms(node.nodeValue)) continue;
      const post = findContainingPost(node);
      if (!post) continue;
      if (!postMap.has(post)) postMap.set(post, []);
      postMap.get(post).push(node);
    }
    const entries = [];
    for (const [post, aiNodes] of postMap) {
      const target = findHaikuTarget(post, aiNodes);
      if (!target) continue;
      entries.push({ post, target, y: post.getBoundingClientRect().top });
    }
    entries.sort((a, b) => a.y - b.y);

    const bar = document.createElement('div');
    bar.className = SWEEP_BAR_CLASS;
    document.body.appendChild(bar);
    observer && observer.disconnect();

    const vh = window.innerHeight, t0 = performance.now();
    let cursor = 0;
    function step(now) {
      const t = Math.min((now - t0) / SWEEP_DURATION_MS, 1);
      const barY = t * vh;
      bar.style.transform = `translateY(${barY}px)`;
      while (cursor < entries.length && entries[cursor].y <= barY) {
        const { post, target } = entries[cursor];
        const wasTransformed = post.hasAttribute(TRANSFORMED_POST_ATTR);
        replacePostBodyWithHaiku(post, target);
        swapPostImages(post);
        if (!wasTransformed) trackTransformedPost(post);
        cursor++;
      }
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        while (cursor < entries.length) {
          const { post, target } = entries[cursor];
          const wasTransformed = post.hasAttribute(TRANSFORMED_POST_ATTR);
          replacePostBodyWithHaiku(post, target);
          swapPostImages(post);
          if (!wasTransformed) trackTransformedPost(post);
          cursor++;
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
      enabled: true, showIndicator: true, soundEnabled: false,
    });
    // Demo mode is hash-driven; react to navigation that changes hash without reload.
    window.addEventListener('hashchange', applyDemoMode);
    // Independent poll — runs regardless of extension on/off so the demo whitelist
    // stays current as feed posts lazy-load during scroll.
    setInterval(() => { if (isDemoModeRequested()) applyDemoWhitelist(true); }, 3000);
    settings = stored;
    injectStyles();
    loadImageUrls();
    const [dictPatterns] = await Promise.all([loadDictionary(), loadHaikus()]);
    patterns = dictPatterns;
    ensureSpeakerButton();
    applySoundState();
    applyDemoMode();
    console.log(`[Holiday from AI] ready — ${haikus.length} haikus, ${gardenImageUrls.length} images, enabled=${settings.enabled}`);
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
      applyDemoMode();   // re-evaluate in case `enabled` changed

      if (wasEnabled && !settings.enabled) {
        if (observer) { observer.disconnect(); observer = null; }
        if (healthCheckTimer) { clearInterval(healthCheckTimer); healthCheckTimer = null; }
        revertAllReplacements();
        revertAllImageSwaps();
        applySoundState();
        return;
      }
      if (!wasEnabled && settings.enabled) {
        sweepTransform();
        startHealthCheck();
        applySoundState();
        return;
      }
      if (settings.enabled) {
        if (!observer) startObserver();
        startHealthCheck();
        applySoundState();
      }
    });
  }

  init().catch(err => console.error('[Holiday from AI] init failed:', err));
})();
