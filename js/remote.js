// remote.js - Interactive Handheld Remote Control Manager

class RemoteController {
  constructor(app) {
    this.app = app;
    this.ledElement = null;
    this.remoteContainer = null;
    this.mobileDrawerOpen = false;
  }

  init() {
    this.ledElement = document.getElementById('remote-ir-led');
    this.remoteContainer = document.getElementById('remote-control');

    this.bindButtons();
    this.bindKeyboardShortcuts();
    this.bindMobileDrawer();
  }

  // Flash the infrared LED at the tip of the remote
  blinkIR() {
    if (!this.ledElement) return;
    this.ledElement.classList.add('emitting');
    setTimeout(() => {
      this.ledElement.classList.remove('emitting');
    }, 180);
  }

  bindButtons() {
    // POWER Button
    const powerBtn = document.getElementById('btn-power');
    if (powerBtn) {
      powerBtn.addEventListener('click', () => {
        this.blinkIR();
        this.app.togglePower();
      });
    }

    // Direct Channel Buttons (1 - 6)
    const numButtons = document.querySelectorAll('.remote-num-btn');
    numButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const channelNum = parseInt(btn.dataset.channel, 10);
        if (!isNaN(channelNum)) {
          this.blinkIR();
          retroAudio.playClick();
          this.app.tuneChannel(channelNum);
        }
      });
    });

    // CH + / CH -
    const chUpBtn = document.getElementById('btn-ch-up');
    const chDownBtn = document.getElementById('btn-ch-down');
    if (chUpBtn) {
      chUpBtn.addEventListener('click', () => {
        this.blinkIR();
        retroAudio.playClick();
        this.app.channelUp();
      });
    }
    if (chDownBtn) {
      chDownBtn.addEventListener('click', () => {
        this.blinkIR();
        retroAudio.playClick();
        this.app.channelDown();
      });
    }

    // VOL + / VOL - / MUTE
    const volUpBtn = document.getElementById('btn-vol-up');
    const volDownBtn = document.getElementById('btn-vol-down');
    const muteBtn = document.getElementById('btn-mute');

    if (volUpBtn) {
      volUpBtn.addEventListener('click', () => {
        this.blinkIR();
        this.app.volumeUp();
      });
    }
    if (volDownBtn) {
      volDownBtn.addEventListener('click', () => {
        this.blinkIR();
        this.app.volumeDown();
      });
    }
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        this.blinkIR();
        this.app.toggleMute();
      });
    }

    // GUIDE / MENU Button
    const guideBtn = document.getElementById('btn-guide');
    if (guideBtn) {
      guideBtn.addEventListener('click', () => {
        this.blinkIR();
        retroAudio.playClick();
        this.app.toggleGuideModal();
      });
    }

    // Color Buttons (Themes)
    const colorButtons = document.querySelectorAll('.remote-color-btn');
    colorButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.blinkIR();
        retroAudio.playClick();
        const theme = btn.dataset.theme;
        if (theme) {
          tvEffects.applyTheme(theme);
        }
      });
    });

    // D-PAD Buttons (Up, Down, Left, Right, OK)
    const dpadUp = document.getElementById('dpad-up');
    const dpadDown = document.getElementById('dpad-down');
    const dpadLeft = document.getElementById('dpad-left');
    const dpadRight = document.getElementById('dpad-right');
    const dpadOk = document.getElementById('dpad-ok');

    if (dpadUp) {
      dpadUp.addEventListener('click', () => {
        this.blinkIR();
        retroAudio.playClick();
        if (this.app.currentChannel === 6) {
          crtArcade.movePlayer('up');
        } else {
          this.app.scrollActiveChannel(-120);
        }
      });
    }
    if (dpadDown) {
      dpadDown.addEventListener('click', () => {
        this.blinkIR();
        retroAudio.playClick();
        if (this.app.currentChannel === 6) {
          crtArcade.movePlayer('down');
        } else {
          this.app.scrollActiveChannel(120);
        }
      });
    }
    if (dpadLeft) {
      dpadLeft.addEventListener('click', () => {
        this.blinkIR();
        retroAudio.playClick();
        this.app.navigateCards(-1);
      });
    }
    if (dpadRight) {
      dpadRight.addEventListener('click', () => {
        this.blinkIR();
        retroAudio.playClick();
        this.app.navigateCards(1);
      });
    }
    if (dpadOk) {
      dpadOk.addEventListener('click', () => {
        this.blinkIR();
        retroAudio.playClick();
        this.app.activateCardAction();
      });
    }
  }

  // Keyboard Shortcuts for desktop convenience
  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept when user is typing in contact form inputs
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        return;
      }

      const key = e.key;

      if (['1', '2', '3', '4', '5', '6'].includes(key)) {
        this.blinkIR();
        retroAudio.playClick();
        this.app.tuneChannel(parseInt(key, 10));
      } else if (key === 'ArrowUp' && this.app.currentChannel !== 6) {
        this.blinkIR();
        this.app.channelDown(); // or scroll
      } else if (key === 'ArrowDown' && this.app.currentChannel !== 6) {
        this.blinkIR();
        this.app.channelUp();
      } else if (key === 'p' || key === 'P') {
        this.blinkIR();
        this.app.togglePower();
      } else if (key === 'm' || key === 'M') {
        this.blinkIR();
        this.app.toggleMute();
      } else if (key === 'g' || key === 'G') {
        this.blinkIR();
        this.app.toggleGuideModal();
      } else if (key === 't' || key === 'T') {
        this.blinkIR();
        tvEffects.cycleTheme();
      }
    });
  }

  // Mobile Remote Drawer
  bindMobileDrawer() {
    const mobileToggle = document.getElementById('mobile-remote-toggle');
    const closeDrawerBtn = document.getElementById('remote-close-btn');

    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        this.toggleMobileDrawer();
      });
    }

    if (closeDrawerBtn) {
      closeDrawerBtn.addEventListener('click', () => {
        this.toggleMobileDrawer(false);
      });
    }
  }

  toggleMobileDrawer(forceState) {
    if (!this.remoteContainer) return;

    this.mobileDrawerOpen = forceState !== undefined ? forceState : !this.mobileDrawerOpen;
    if (this.mobileDrawerOpen) {
      this.remoteContainer.classList.add('drawer-open');
    } else {
      this.remoteContainer.classList.remove('drawer-open');
    }
    retroAudio.playClick();
  }
}
