/**
 * Ryounime — Player Manager
 * Plyr + HLS.js + Fallback
 */

const Player = (() => {
  let _plyr = null;
  let _hls = null;
  let _srcManager = null;
  let _animeId = null;
  let _ep = null;
  let _saveTimer = null;

  function _destroyHls() {
    if (_hls) { _hls.destroy(); _hls = null; }
  }

  function _loadHls(src, videoEl) {
    _destroyHls();
    if (Hls.isSupported()) {
      _hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
      _hls.loadSource(src);
      _hls.attachMedia(videoEl);
      _hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn('[HLS] Fatal error, trying next source');
          _tryNextSource();
        }
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = src;
    } else {
      console.error('[Player] HLS not supported');
    }
  }

  function _loadMp4(src, videoEl) {
    _destroyHls();
    videoEl.src = src;
  }

  function _tryNextSource() {
    if (!_srcManager) return;
    const advanced = _srcManager.next();
    if (advanced) {
      loadSource(_srcManager.current);
      updateSourceUI();
    } else {
      console.error('[Player] All sources exhausted');
      showError('Semua sumber gagal dimuat. Coba lagi nanti.');
    }
  }

  function loadSource(source) {
    if (!_plyr || !source) return;
    const videoEl = _plyr.elements.original;
    if (source.type === 'hls') {
      _loadHls(source.url, videoEl);
    } else {
      _loadMp4(source.url, videoEl);
    }
  }

  function updateSourceUI() {
    const chips = document.querySelectorAll('.source-chip');
    chips.forEach((c, i) => c.classList.toggle('active', i === _srcManager?.index));
  }

  function showError(msg) {
    const wrap = document.querySelector('.video-wrap');
    if (!wrap) return;
    let err = wrap.querySelector('.player-error');
    if (!err) {
      err = document.createElement('div');
      err.className = 'player-error';
      err.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;color:#fff;font-size:13px;text-align:center;padding:16px;gap:10px;z-index:10';
      wrap.appendChild(err);
    }
    err.innerHTML = `
      <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r=".5" fill="currentColor"/>
      </svg>
      <span>${msg}</span>
      <button onclick="location.reload()" style="background:var(--accent);color:#fff;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:700;border:none;cursor:pointer;">Reload</button>
    `;
  }

  function _startSaveTimer() {
    clearInterval(_saveTimer);
    _saveTimer = setInterval(() => {
      if (!_plyr || !_animeId || !_ep) return;
      const time = _plyr.currentTime;
      const duration = _plyr.duration;
      if (!duration) return;
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

  function init({ animeId, ep, srcManager }) {
    _animeId = animeId;
    _ep = ep;
    _srcManager = srcManager;

    const videoEl = document.getElementById('ryou-video');
    if (!videoEl) return;

    _plyr = new Plyr(videoEl, {
      controls: ['play-large','play','rewind','fast-forward','progress','current-time','duration','mute','volume','captions','settings','pip','fullscreen'],
      settings: ['captions','quality','speed'],
      keyboard: { focused: true, global: false },
      tooltips: { controls: true, seek: true },
      i18n: {
        play: 'Putar',
        pause: 'Jeda',
        mute: 'Bisukan',
        unmute: 'Suarakan',
        enterFullscreen: 'Layar Penuh',
        exitFullscreen: 'Keluar Layar Penuh',
      },
    });

    // Load first source
    if (srcManager.current) loadSource(srcManager.current);

    // Auto-next
    _plyr.on('ended', () => {
      if (Settings.get('autoNext')) {
        setTimeout(() => goNextEp(), 1500);
      }
    });

    // Save progress
    _plyr.on('play', _startSaveTimer);
    _plyr.on('pause', () => clearInterval(_saveTimer));

    // Restore position
    const saved = ContinueWatching.get(animeId);
    if (saved && saved.ep === ep && saved.time > 10) {
      _plyr.once('canplay', () => {
        _plyr.currentTime = saved.time;
      });
    }

    return _plyr;
  }

  function selectSource(index) {
    if (!_srcManager) return;
    _srcManager.select(index);
    loadSource(_srcManager.current);
    updateSourceUI();
  }

  function destroy() {
    clearInterval(_saveTimer);
    _destroyHls();
    if (_plyr) { _plyr.destroy(); _plyr = null; }
  }

  function goNextEp() {
    const epBtns = document.querySelectorAll('.ep-btn');
    const currentIdx = Array.from(epBtns).findIndex(b => b.classList.contains('active'));
    if (currentIdx >= 0 && currentIdx < epBtns.length - 1) {
      epBtns[currentIdx + 1].click();
    }
  }

  return { init, selectSource, destroy, goNextEp, get plyr() { return _plyr; } };
})();
