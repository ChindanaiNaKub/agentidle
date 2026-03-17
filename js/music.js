import { CONFIG } from './config.js';

export class MusicPlayer {
  constructor(onStateChange) {
    this.player = null;
    this.ready = false;
    this._onStateChange = onStateChange;
    this._volume = 30;
  }

  init() {
    if (window.YT && window.YT.Player) {
      this._createPlayer();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      this._createPlayer();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  _createPlayer() {
    try {
      this.player = new YT.Player('yt-player', {
        height: '1',
        width: '1',
        videoId: CONFIG.YOUTUBE_VIDEO_ID,
        playerVars: {
          autoplay: 0,
          controls: 0,
          loop: 1,
          playlist: CONFIG.YOUTUBE_VIDEO_ID,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            this.ready = true;
            this.setVolume(this._volume);
          },
          onStateChange: (e) => {
            if (this._onStateChange) this._onStateChange(e.data);
          },
          onError: () => {
            this.ready = false;
          },
        },
      });
    } catch (_) {
      this.ready = false;
    }
  }

  toggle() {
    if (!this.ready || !this.player) return false;
    try {
      if (this.isPlaying()) {
        this.player.pauseVideo();
      } else {
        this.player.playVideo();
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  isPlaying() {
    try {
      return this.ready && this.player && this.player.getPlayerState() === 1;
    } catch (_) {
      return false;
    }
  }

  setVolume(v) {
    this._volume = v;
    if (this.ready && this.player) {
      try { this.player.setVolume(v); } catch (_) {}
    }
  }
}
