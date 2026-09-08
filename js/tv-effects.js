// tv-effects.js - Canvas Pixel Static, CRT Shaders, OSD & Screen Power State Manager

class TVEffectsManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.animId = null;
    this.isStaticActive = false;
    this.osdElement = null;
    this.osdTimeout = null;
    this.isPowerOn = true;
    this.currentTheme = 'cyberpunk'; // 'cyberpunk', 'amber', 'matrix', 'classic-bw'
  }

  init(canvasId = 'static-canvas', osdId = 'tv-osd') {
    this.canvas = document.getElementById(canvasId);
    this.osdElement = document.getElementById(osdId);

    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
    }

    // Set initial theme
    this.applyTheme(this.currentTheme);
  }

  resizeCanvas() {
    if (!this.canvas) return;
    // Lower internal resolution for authentic chunky retro pixels + max performance
    this.canvas.width = Math.max(240, Math.floor(this.canvas.clientWidth / 2));
    this.canvas.height = Math.max(160, Math.floor(this.canvas.clientHeight / 2));
  }

  // Generate ultra-fast pixel static noise using typed arrays
  renderStaticFrame() {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const imgData = this.ctx.createImageData(width, height);
    const buffer32 = new Uint32Array(imgData.data.buffer);
    const len = buffer32.length;

    // Fast 32-bit pixel filling
    for (let i = 0; i < len; i++) {
      // Randomized grayscale noise with occasional scanline glitch
      const shade = (Math.random() * 255) | 0;
      // ABGR format: 0xAABBGGRR
      buffer32[i] = (255 << 24) | (shade << 16) | (shade << 8) | shade;
    }

    this.ctx.putImageData(imgData, 0, 0);

    if (this.isStaticActive) {
      this.animId = requestAnimationFrame(() => this.renderStaticFrame());
    }
  }

  // Trigger burst of static during channel transition
  triggerStaticBurst(duration = 320, callback = null) {
    if (!this.canvas) {
      if (callback) callback();
      return;
    }

    this.isStaticActive = true;
    this.canvas.style.opacity = '1';
    this.canvas.style.display = 'block';

    if (this.animId) cancelAnimationFrame(this.animId);
    this.renderStaticFrame();

    // Callback at midpoint (when static is 100% masking the screen)
    if (callback) {
      setTimeout(() => {
        callback();
      }, duration * 0.45);
    }

    // Fade out static cleanly
    setTimeout(() => {
      this.canvas.style.opacity = '0';
      setTimeout(() => {
        this.isStaticActive = false;
        if (this.animId) cancelAnimationFrame(this.animId);
        this.canvas.style.display = 'none';
      }, 150);
    }, duration);
  }

  // Continuous static (e.g. for Channel 00 test pattern or when untuned)
  startContinuousStatic() {
    if (!this.canvas) return;
    this.isStaticActive = true;
    this.canvas.style.opacity = '0.92';
    this.canvas.style.display = 'block';
    if (this.animId) cancelAnimationFrame(this.animId);
    this.renderStaticFrame();
  }

  stopContinuousStatic() {
    this.isStaticActive = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.canvas) {
      this.canvas.style.opacity = '0';
      this.canvas.style.display = 'none';
    }
  }

  // Display green retro OSD in corner
  showOSD(primaryText, secondaryText = '') {
    if (!this.osdElement) return;

    clearTimeout(this.osdTimeout);

    const channelBadge = this.osdElement.querySelector('.osd-ch');
    const titleBadge = this.osdElement.querySelector('.osd-title');
    const extraBadge = this.osdElement.querySelector('.osd-extra');

    if (channelBadge) channelBadge.textContent = primaryText;
    if (titleBadge) titleBadge.textContent = secondaryText;
    if (extraBadge) extraBadge.textContent = this.isPowerOn ? 'STEREO [AUTO-LOCK]' : '';

    this.osdElement.classList.add('active');

    this.osdTimeout = setTimeout(() => {
      this.osdElement.classList.remove('active');
    }, 2400);
  }

  // Volume Bar OSD
  showVolumeOSD(volumePercent, isMuted) {
    if (!this.osdElement) return;

    clearTimeout(this.osdTimeout);

    const channelBadge = this.osdElement.querySelector('.osd-ch');
    const titleBadge = this.osdElement.querySelector('.osd-title');
    const extraBadge = this.osdElement.querySelector('.osd-extra');

    if (channelBadge) channelBadge.textContent = isMuted ? 'MUTE' : 'VOLUME';
    
    // Build bar like [||||||||..........]
    const totalBars = 16;
    const filledBars = isMuted ? 0 : Math.round((volumePercent / 100) * totalBars);
    const barStr = '|'.repeat(filledBars) + '.'.repeat(totalBars - filledBars);

    if (titleBadge) titleBadge.textContent = `[${barStr}] ${isMuted ? 'MUTED' : `${volumePercent}%`}`;
    if (extraBadge) extraBadge.textContent = 'SPEAKER A';

    this.osdElement.classList.add('active');

    this.osdTimeout = setTimeout(() => {
      this.osdElement.classList.remove('active');
    }, 1800);
  }

  // Turn CRT TV On / Off with classic electron beam collapse
  togglePower(onCallback, offCallback) {
    const screenFrame = document.getElementById('tv-screen-content');
    const tvSet = document.getElementById('tv-set');

    this.isPowerOn = !this.isPowerOn;

    if (this.isPowerOn) {
      // Turn ON: Screen warms up and expands from center beam
      if (screenFrame) {
        screenFrame.classList.remove('power-off');
        screenFrame.classList.add('power-on');
      }
      if (tvSet) tvSet.classList.remove('tv-turned-off');

      retroAudio.playPower(true);

      setTimeout(() => {
        if (screenFrame) screenFrame.classList.remove('power-on');
        this.triggerStaticBurst(260);
        this.showOSD('CH 01', 'SYSTEM ONLINE');
        if (onCallback) onCallback();
      }, 400);

    } else {
      // Turn OFF: Cathode ray tube collapses to thin line, then dot, then off
      retroAudio.playPower(false);

      if (screenFrame) {
        screenFrame.classList.remove('power-on');
        screenFrame.classList.add('power-off');
      }
      if (tvSet) tvSet.classList.add('tv-turned-off');

      if (this.osdElement) this.osdElement.classList.remove('active');

      setTimeout(() => {
        if (offCallback) offCallback();
      }, 450);
    }

    return this.isPowerOn;
  }

  // Cycle CRT phosphor themes
  applyTheme(themeName) {
    const validThemes = ['cyberpunk', 'amber', 'matrix', 'classic-bw'];
    if (!validThemes.includes(themeName)) themeName = 'cyberpunk';

    this.currentTheme = themeName;
    const tvSet = document.getElementById('tv-set');
    if (!tvSet) return;

    validThemes.forEach(t => tvSet.classList.remove(`theme-${t}`));
    tvSet.classList.add(`theme-${themeName}`);

    const themeLabels = {
      'cyberpunk': 'RGB MULTI-PHOSPHOR',
      'amber': 'AMBER MONOCHROME',
      'matrix': 'MATRIX GREEN P1',
      'classic-bw': 'B&W VACUUM TUBE'
    };

    this.showOSD('COLOR MODE', themeLabels[themeName] || themeName.toUpperCase());
  }

  cycleTheme() {
    const themes = ['cyberpunk', 'amber', 'matrix', 'classic-bw'];
    const nextIdx = (themes.indexOf(this.currentTheme) + 1) % themes.length;
    this.applyTheme(themes[nextIdx]);
    return themes[nextIdx];
  }
}

// Global TV effects instance
const tvEffects = new TVEffectsManager();
