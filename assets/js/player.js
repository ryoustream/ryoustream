/**
 * Ryounime — Player v2
 * Plyr + HLS.js, robust error handling, subtitle translate
 */

const Player = (() => {
  let _plyr = null;
  let _hls = null;
  let _srcManager = null;
  let _animeId = null;
  let _ep = null;
  let _saveTimer = null;
  let _subtitleCues = [];
  let _subInterval = null;

  // ===== HLS =====
  function _destroyHls() {
    if (_hls) { try { _hls.destroy(); } catch {} _hls = null; }
  }

  function _loadHls(src, videoEl) {
    _destroyHls();
    if (typeof Hls === 'undefined') { _loadDirect(src, videoEl); return; }

    if (Hls.isSupported()) {
      _hls = new Hls({
        maxBufferLength: 20,
        maxMaxBufferLength: 40,
        enableWorker: true,
        lowLatencyMode: false,
        xhrSetup(xhr, url) {
          xhr.withCredentials = false;
        },
      });
      _hls.loadSource(src);
      _hls.attachMedia(videoEl);
      _hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoEl.play().catch(() => {});
      });
      _hls.on(Hls.Events.ERROR, (_, data) => {
        console.warn('[HLS]', data.type, data.details);
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            _hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            _hls.recoverMediaError();
          } else {
            console.error('[HLS] Fatal — try next source');
            _tryNextSource();
          }
        }
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      _loadDirect(src, videoEl);
    } else {
      showError('Browser tidak support video ini.');
    }
  }

  function _loadDirect(src, videoEl) {
    _destroyHls();
    videoEl.src = src;
    videoEl.play().catch(() => {});
  }

  function _tryNextSource() {
    if (!_srcManager) return;
    if (_srcManager.next()) {
      _applySource(_srcManager.current);
      _updateSourceUI();
    } else {
      showError('Semua sumber gagal. Coba episode lain atau kembali nanti.');
    }
  }

  function _applySource(source) {
    if (!_plyr || !source) return;
    const videoEl = _plyr.elements.original;
    const currentTime = _plyr.currentTime || 0;

    if (source.type === 'hls') {
      _loadHls(source.url, videoEl);
    } else {
      _loadDirect(source.url, videoEl);
    }

    // Restore position jika ganti source
    if (currentTime > 5) {
      videoEl.addEventListener('canplay', () => {
        videoEl.currentTime = currentTime;
      }, { once: true });
    }
  }

  function _updateSourceUI() {
    document.querySelectorAll('.source-chip').forEach((c, i) => {
      c.classList.toggle('active', i === (_srcManager?.index || 0));
    });
  }

  // ===== ERROR UI =====
  function showError(msg) {
    hideError();
    const wrap = document.getElementById('video-wrap');
    if (!wrap) return;
    const err = document.createElement('div');
    err.id = 'player-error';
    err.style.cssText = [
      'position:absolute;inset:0;display:flex;flex-direction:column',
      'align-items:center;justify-content:center;background:#000;',
      'color:#fff;font-size:13px;text-align:center;padding:24px;gap:12px;z-index:20'
    ].join('');
    err.innerHTML = `
      <svg width="40" height="40" fill="none" stroke="#e63946" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="13"/>
        <circle cx="12" cy="16.5" r="0.5" fill="#e63946"/>
      </svg>
      <span style="line-height:1.5">${msg}</span>
      <div style="display:flex;gap:8px">
        <button onclick="Player.retrySource()" style="background:#e63946;color:#fff;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;border:none;cursor:pointer">Coba Lagi</button>
        <button onclick="Player.nextSource()" style="background:rgba(255,255,255,0.1);color:#fff;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid rgba(255,255,255,0.2);cursor:pointer">Sumber Lain</button>
      </div>
    `;
    wrap.appendChild(err);
  }

  function hideError() {
    document.getElementById('player-error')?.remove();
  }

  // ===== LOADING UI =====
  function showLoading() {
    hideLoading();
    const wrap = document.getElementById('video-wrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.id = 'player-loading';
    el.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);z-index:15;pointer-events:none';
    el.innerHTML = '<div class="spinner"></div>';
    wrap.appendChild(el);
  }

  function hideLoading() {
    document.getElementById('player-loading')?.remove();
  }

  // ===== PROGRESS SAVE =====
  function _startSaveTimer() {
    clearInterval(_saveTimer);
    _saveTimer = setInterval(() => {
      if (!_plyr || !_animeId || !_ep) return;
      const time = _plyr.currentTime;
      const duration = _plyr.duration;
      if (!duration || time < 5) return;
      ContinueWatching.save({
        animeId: _animeId,
        animeTitle: document.querySelector('.watch-title')?.textContent || '',
        poster: document.querySelector('.watch-poster-img')?.src || '',
        ep: _ep,
        epTitle: document.querySelector('.watch-ep-label')?.textContent || '',
        time,
        duration,
      });
    }, 5000);
  }

  // ===== SUBTITLE RENDERER =====
  function _startSubtitle(cues) {
    _subtitleCues = cues;
    clearInterval(_subInterval);
    const subEl = document.getElementById('ryou-subtitle');
    if (!subEl) return;

    _subInterval = setInterval(() => {
      if (!_plyr) return;
      const t = _plyr.currentTime;
      const cue = _subtitleCues.find(c => t >= c.start && t <= c.end);
      if (cue) {
        subEl.textContent = cue.text;
        subEl.style.display = 'block';
      } else {
        subEl.style.display = 'none';
      }
    }, 250);
  }

  function _stopSubtitle() {
    clearInterval(_subInterval);
    const subEl = document.getElementById('ryou-subtitle');
    if (subEl) subEl.style.display = 'none';
  }

  // ===== INIT =====
  function init({ animeId, ep, srcManager }) {
    _animeId = animeId;
    _ep = Number(ep);
    _srcManager = srcManager;

    const videoEl = document.getElementById('ryou-video');
    if (!videoEl) return;

    // Destroy previous
    destroy();

    _plyr = new Plyr(videoEl, {
      controls: [
        'play-large', 'play', 'rewind', 'fast-forward',
        'progress', 'current-time', 'duration',
        'mute', 'volume', 'captions', 'settings', 'pip', 'fullscreen'
      ],
      settings: ['speed'],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      keyboard: { focused: true, global: false },
      tooltips: { controls: false },
      invertTime: false,
      i18n: {
        play: 'Putar', pause: 'Jeda', mute: 'Bisukan',
        unmute: 'Suarakan', enterFullscreen: 'Layar Penuh',
        exitFullscreen: 'Keluar Layar Penuh', speed: 'Kecepatan',
        normal: 'Normal',
      },
    });

    // Load source
    if (!srcManager.isEmpty && srcManager.current) {
      showLoading();
      _applySource(srcManager.current);
    } else {
      showError('Tidak ada sumber video tersedia saat ini.');
    }

    // Events
    _plyr.on('canplay', hideLoading);
    _plyr.on('playing', () => { hideLoading(); hideError(); });
    _plyr.on('waiting', showLoading);
    _plyr.on('play', _startSaveTimer);
    _plyr.on('pause', () => clearInterval(_saveTimer));
    _plyr.on('ended', () => {
      clearInterval(_saveTimer);
      if (Settings.get('autoNext')) {
        _showAutoNextCountdown();
      }
    });
    _plyr.on('error', () => {
      hideLoading();
      _tryNextSource();
    });

    // Restore position
    _plyr.once('canplay', () => {
      const saved = ContinueWatching.get(animeId);
      if (saved && saved.ep === _ep && saved.time > 10 && saved.time < (_plyr.duration - 10)) {
        _plyr.currentTime = saved.time;
      }
    });

    return _plyr;
  }

  function _showAutoNextCountdown() {
    const existing = document.getElementById('autonext-overlay');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'autonext-overlay';
    el.style.cssText = 'position:absolute;bottom:80px;right:16px;background:rgba(0,0,0,0.85);color:#fff;padding:12px 16px;border-radius:12px;font-size:13px;font-weight:600;z-index:25;display:flex;align-items:center;gap:10px;backdrop-filter:blur(8px)';
    el.innerHTML = `
      <span>Episode berikutnya dalam <span id="autonext-count">5</span>s</span>
      <button onclick="document.getElementById('autonext-overlay').remove();clearInterval(window._autoNextTimer)" style="background:rgba(255,255,255,0.15);color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer">Batal</button>
    `;
    document.getElementById('video-wrap')?.appendChild(el);

    let count = 5;
    window._autoNextTimer = setInterval(() => {
      count--;
      const countEl = document.getElementById('autonext-count');
      if (countEl) countEl.textContent = count;
      if (count <= 0) {
        clearInterval(window._autoNextTimer);
        el.remove();
        goNextEp();
      }
    }, 1000);
  }

  function selectSource(index) {
    if (!_srcManager) return;
    hideError();
    showLoading();
    _srcManager.select(index);
    _applySource(_srcManager.current);
    _updateSourceUI();
  }

  function retrySource() {
    if (!_srcManager?.current) return;
    hideError();
    showLoading();
    _applySource(_srcManager.current);
  }

  function nextSource() {
    hideError();
    _tryNextSource();
  }

  function setSubtitles(cues) {
    if (cues?.length) _startSubtitle(cues);
    else _stopSubtitle();
  }

  function destroy() {
    clearInterval(_saveTimer);
    clearInterval(_subInterval);
    clearInterval(window._autoNextTimer);
    _stopSubtitle();
    _destroyHls();
    if (_plyr) { try { _plyr.destroy(); } catch {} _plyr = null; }
    hideError();
    hideLoading();
  }

  function goNextEp() {
    const btns = Array.from(document.querySelectorAll('.ep-btn'));
    const idx = btns.findIndex(b => b.classList.contains('active'));
    if (idx >= 0 && idx < btns.length - 1) btns[idx + 1].click();
  }

  return {
    init, destroy, selectSource, retrySource, nextSource,
    setSubtitles, goNextEp,
    get plyr() { return _plyr; }
  };
})();
