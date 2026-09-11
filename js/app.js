// app.js - Main Application Orchestrator for Luigie Martin's CRT TV Portfolio

class PortfolioApp {
  constructor() {
    this.currentChannel = 1;
    this.totalChannels = 6;
    this.isPowerOn = false; // Starts completely shut-off!
    this.hasIgnited = false; // Tracks first scroll/interaction ignition
    this.volume = 60;
    this.isMuted = false;
    this.activeFilter = 'all';
    this.scrollLocked = false;
    this.scrollCooldownMs = 650; // Prevents erratic channel skip on mousewheel

    this.channels = [
      { id: 1, name: "ABOUT", tag: "PROFILE DOSSIER", desc: "CS Fresh Grad Profile & Stats" },
      { id: 2, name: "PROJECTS", tag: "14 BROADCASTS", desc: "Full GitHub Repos & Live Demos" },
      { id: 3, name: "SKILLS", tag: "TECH ARSENAL", desc: "Languages, Frameworks & AI/ML" },
      { id: 4, name: "JOURNEY", tag: "NEMSU ACADEMIA", desc: "Education & Leadership Timeline" },
      { id: 5, name: "CONTACT", tag: "SIGNAL TRANSMIT", desc: "Direct Comms, Socials & Resume" },
      { id: 6, name: "ARCADE", tag: "EASTER EGG", desc: "SMPTE Bars & Playable CRT Pong" }
    ];

    this.remote = new RemoteController(this);
  }

  init() {
    // Initialize subsystem managers
    tvEffects.init('static-canvas', 'tv-osd');
    this.remote.init();

    // Render Projects into Channel 2
    this.renderProjects(PROJECTS_DATA);
    this.bindProjectFilters();

    // Bind physical TV buttons & dials
    this.bindPhysicalTVControls();

    // Bind Mouse Wheel / Touch Scrolling for channel surfing (active once ignited)
    this.bindScrollAndTouch();

    // Bind Contact Form
    this.bindContactForm();

    // Bind TV Guide Modal
    this.renderGuideSchedule();

    // Listen for the first scroll/interaction to summon remote & ignite TV!
    this.setupIgnitionListeners();
  }

  // Tune to a specific channel (1 - 6)
  tuneChannel(channelNum, playEffects = true) {
    if (!this.isPowerOn) return;
    if (channelNum < 1) channelNum = this.totalChannels;
    if (channelNum > this.totalChannels) channelNum = 1;

    if (this.currentChannel === channelNum && playEffects) {
      // Small re-tune static blip
      tvEffects.triggerStaticBurst(160);
      retroAudio.playStatic(0.12);
      return;
    }

    const prevChannel = this.currentChannel;
    this.currentChannel = channelNum;

    // Handle Arcade Game start/stop
    if (prevChannel === 6 && channelNum !== 6) {
      crtArcade.stop();
    }

    if (playEffects) {
      retroAudio.playStatic(0.26);
      tvEffects.triggerStaticBurst(300, () => {
        this.switchChannelDOM(channelNum);
      });
    } else {
      this.switchChannelDOM(channelNum);
    }

    // Update OSD
    const chInfo = this.channels.find(c => c.id === channelNum);
    if (chInfo) {
      tvEffects.showOSD(`CH 0${channelNum}`, `${chInfo.name} - ${chInfo.tag}`);
    }

    // Rotate physical TV channel knob
    this.rotateChannelKnob(channelNum);

    // Update active highlight on Remote
    this.updateRemoteActiveIndicator(channelNum);

    // Start arcade game if tuned to channel 6
    if (channelNum === 6) {
      setTimeout(() => {
        crtArcade.start();
      }, 350);
    }
  }

  switchChannelDOM(channelNum) {
    const channelPanels = document.querySelectorAll('.channel-panel');
    channelPanels.forEach(panel => {
      panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(`channel-${channelNum}`);
    if (targetPanel) {
      targetPanel.classList.add('active');
      targetPanel.scrollTop = 0; // Reset scroll to top
    }
  }

  channelUp() {
    this.tuneChannel(this.currentChannel + 1);
  }

  channelDown() {
    this.tuneChannel(this.currentChannel - 1);
  }

  // Volume controls
  volumeUp() {
    if (!this.isPowerOn) return;
    this.volume = Math.min(100, this.volume + 10);
    this.isMuted = false;
    retroAudio.setMuted(false);
    retroAudio.setVolume(this.volume / 100);
    tvEffects.showVolumeOSD(this.volume, false);
  }

  volumeDown() {
    if (!this.isPowerOn) return;
    this.volume = Math.max(0, this.volume - 10);
    retroAudio.setVolume(this.volume / 100);
    tvEffects.showVolumeOSD(this.volume, this.volume === 0);
  }

  toggleMute() {
    if (!this.isPowerOn) return;
    this.isMuted = retroAudio.toggleMute();
    tvEffects.showVolumeOSD(this.volume, this.isMuted);
  }

  // Setup listeners for the initial scroll/click to power on TV and summon remote
  setupIgnitionListeners() {
    const triggerIgnition = (e) => {
      if (this.hasIgnited) return;
      if (e && e.cancelable) e.preventDefault();
      this.igniteExperience();
    };

    // Scroll (mouse wheel / trackpad) anywhere on window
    const onWheelIgnite = (e) => {
      if (this.hasIgnited) return;
      if (Math.abs(e.deltaY) > 5 || Math.abs(e.deltaX) > 5) {
        if (e.cancelable) e.preventDefault();
        triggerIgnition(e);
      }
    };
    window.addEventListener('wheel', onWheelIgnite, { passive: false });

    // Touch drag / swipe on mobile
    let touchStartY = 0;
    const onTouchStartIgnite = (e) => {
      touchStartY = e.touches[0].clientY;
    };
    const onTouchMoveIgnite = (e) => {
      if (this.hasIgnited) return;
      const touchEndY = e.touches[0].clientY;
      if (Math.abs(touchStartY - touchEndY) > 15) {
        if (e.cancelable) e.preventDefault();
        triggerIgnition(e);
      }
    };
    window.addEventListener('touchstart', onTouchStartIgnite, { passive: true });
    window.addEventListener('touchmove', onTouchMoveIgnite, { passive: false });

    // Click on standby screen elements
    const standbyScreen = document.getElementById('tv-standby-screen');
    const standbyBtn = document.getElementById('standby-click-btn');
    const standbyPrompt = document.querySelector('.standby-scroll-prompt');

    if (standbyBtn) standbyBtn.addEventListener('click', triggerIgnition);
    if (standbyPrompt) standbyPrompt.addEventListener('click', triggerIgnition);
    if (standbyScreen) standbyScreen.addEventListener('click', triggerIgnition);

    // Keyboard trigger (ArrowDown, Space, Enter, PageDown)
    const onKeyIgnite = (e) => {
      if (this.hasIgnited) return;
      if (['ArrowDown', 'ArrowUp', ' ', 'Enter', 'PageDown', '1'].includes(e.key)) {
        if (e.cancelable) e.preventDefault();
        triggerIgnition(e);
      }
    };
    window.addEventListener('keydown', onKeyIgnite);

    this.cleanupIgnition = () => {
      window.removeEventListener('wheel', onWheelIgnite);
      window.removeEventListener('touchstart', onTouchStartIgnite);
      window.removeEventListener('touchmove', onTouchMoveIgnite);
      window.removeEventListener('keydown', onKeyIgnite);
    };
  }

  // Smooth diagonal entrance for remote & cinematic CRT TV ignition
  igniteExperience() {
    if (this.hasIgnited) return;
    this.hasIgnited = true;
    if (this.cleanupIgnition) this.cleanupIgnition();

    // 1. Initialize procedural Web Audio on this user gesture
    retroAudio.init();

    // 2. Summon remote control diagonally from bottom-right!
    const remoteEl = document.getElementById('remote-control');
    if (remoteEl) {
      remoteEl.classList.add('remote-summoned');
    }

    const mobilePill = document.getElementById('mobile-remote-toggle');
    if (mobilePill) {
      mobilePill.classList.add('pill-visible');
    }

    // 3. Play CRT power-up whine & degauss sound
    retroAudio.playPower(true);

    // 4. Glitch & Fade out Standby screen
    const standbyScreen = document.getElementById('tv-standby-screen');
    if (standbyScreen) {
      standbyScreen.classList.add('standby-ignited');
    }

    // 5. Cathode Ray Tube Beam Warm-up & Expansion
    const tvSet = document.getElementById('tv-set');
    const screenContent = document.getElementById('tv-screen-content');

    if (tvSet) tvSet.classList.remove('tv-turned-off');
    if (screenContent) {
      screenContent.classList.remove('power-off');
      screenContent.classList.add('power-on');
    }

    // 6. White noise static burst + channel 1 reveal
    setTimeout(() => {
      if (screenContent) screenContent.classList.remove('power-on');
      if (standbyScreen) standbyScreen.style.display = 'none';

      this.isPowerOn = true;
      tvEffects.isPowerOn = true;

      // Trigger static burst and reveal Channel 1
      tvEffects.triggerStaticBurst(280, () => {
        this.switchChannelDOM(1);
      });

      // Remote infrared LED blinks with chime sound as it locks into position
      setTimeout(() => {
        if (this.remote) {
          this.remote.blinkIR();
          retroAudio.playBeep(1200);
        }
      }, 350);

      // Green retro OSD notification
      tvEffects.showOSD('CH 01', 'ABOUT - PROFILE DOSSIER');

      // Rotate channel tuner dial & highlight remote button
      this.rotateChannelKnob(1);
      this.updateRemoteActiveIndicator(1);
    }, 420);
  }

  togglePower() {
    if (!this.hasIgnited) {
      this.igniteExperience();
      return;
    }

    // Ensure remote stays summoned
    const remoteEl = document.getElementById('remote-control');
    if (remoteEl) remoteEl.classList.add('remote-summoned');

    this.isPowerOn = tvEffects.togglePower(
      () => {
        // When turned ON
        this.tuneChannel(this.currentChannel, false);
      },
      () => {
        // When turned OFF
        if (this.currentChannel === 6) {
          crtArcade.stop();
        }
      }
    );
  }

  // Mouse Wheel & Touch Swiping for Channel Surfing
  bindScrollAndTouch() {
    const screenViewport = document.getElementById('tv-screen-viewport');
    if (!screenViewport) return;

    // Wheel listener
    screenViewport.addEventListener('wheel', (e) => {
      if (!this.isPowerOn) return;

      const activePanel = document.getElementById(`channel-${this.currentChannel}`);
      if (!activePanel) return;

      // Check if the current panel is scrollable and not at its top/bottom edge
      const isScrollable = activePanel.scrollHeight > activePanel.clientHeight;
      const atTop = activePanel.scrollTop <= 5;
      const atBottom = activePanel.scrollTop + activePanel.clientHeight >= activePanel.scrollHeight - 5;

      // If user scrolls up at top, or down at bottom, change channel!
      if (!isScrollable || (e.deltaY > 0 && atBottom) || (e.deltaY < 0 && atTop)) {
        e.preventDefault();

        if (this.scrollLocked) return;
        this.scrollLocked = true;

        if (e.deltaY > 0) {
          this.channelUp();
        } else {
          this.channelDown();
        }

        setTimeout(() => {
          this.scrollLocked = false;
        }, this.scrollCooldownMs);
      }
    }, { passive: false });

    // Touch Swipe Gestures for Mobile
    let touchStartY = 0;
    let touchStartX = 0;

    screenViewport.addEventListener('touchstart', (e) => {
      touchStartY = e.changedTouches[0].screenY;
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    screenViewport.addEventListener('touchend', (e) => {
      if (!this.isPowerOn) return;
      const touchEndY = e.changedTouches[0].screenY;
      const touchEndX = e.changedTouches[0].screenX;
      const diffY = touchStartY - touchEndY;
      const diffX = touchStartX - touchEndX;

      // Vertical swipe check
      if (Math.abs(diffY) > 65 && Math.abs(diffY) > Math.abs(diffX)) {
        const activePanel = document.getElementById(`channel-${this.currentChannel}`);
        const atTop = activePanel ? activePanel.scrollTop <= 10 : true;
        const atBottom = activePanel ? activePanel.scrollTop + activePanel.clientHeight >= activePanel.scrollHeight - 10 : true;

        if ((diffY > 0 && atBottom) || (diffY < 0 && atTop)) {
          if (diffY > 0) {
            this.channelUp();
          } else {
            this.channelDown();
          }
        }
      }
    }, { passive: true });
  }

  // Physical knobs and buttons on the right side of the TV chassis
  bindPhysicalTVControls() {
    const physicalPower = document.getElementById('tv-knob-power');
    const physicalChUp = document.getElementById('tv-knob-ch-up');
    const physicalChDown = document.getElementById('tv-knob-ch-down');
    const physicalVolUp = document.getElementById('tv-knob-vol-up');
    const physicalVolDown = document.getElementById('tv-knob-vol-down');

    if (physicalPower) {
      physicalPower.addEventListener('click', () => {
        this.togglePower();
      });
    }
    if (physicalChUp) {
      physicalChUp.addEventListener('click', () => {
        retroAudio.playClick();
        this.channelUp();
      });
    }
    if (physicalChDown) {
      physicalChDown.addEventListener('click', () => {
        retroAudio.playClick();
        this.channelDown();
      });
    }
    if (physicalVolUp) {
      physicalVolUp.addEventListener('click', () => {
        this.volumeUp();
      });
    }
    if (physicalVolDown) {
      physicalVolDown.addEventListener('click', () => {
        this.volumeDown();
      });
    }
  }

  rotateChannelKnob(channelNum) {
    const knob = document.getElementById('tv-rotary-dial');
    if (knob) {
      // Rotate 60 degrees per channel
      const degrees = (channelNum - 1) * 60;
      knob.style.transform = `rotate(${degrees}deg)`;
    }
  }

  updateRemoteActiveIndicator(channelNum) {
    const numButtons = document.querySelectorAll('.remote-num-btn');
    numButtons.forEach(btn => {
      if (parseInt(btn.dataset.channel, 10) === channelNum) {
        btn.classList.add('active-tuned');
      } else {
        btn.classList.remove('active-tuned');
      }
    });
  }

  // Render Projects Cards inside Channel 2
  renderProjects(projects) {
    const container = document.getElementById('projects-grid');
    if (!container) return;

    container.innerHTML = '';

    const filtered = this.activeFilter === 'all' 
      ? projects 
      : projects.filter(p => p.category === this.activeFilter);

    filtered.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = `project-card ${p.featured ? 'featured' : ''}`;
      card.dataset.index = idx;

      const techBadges = p.tech.map(t => `<span class="tech-pill">${t}</span>`).join('');
      const highlights = p.highlights ? p.highlights.map(h => `<li><span class="bullet">▶</span> ${h}</li>`).join('') : '';

      card.innerHTML = `
        <div class="card-header">
          <div class="card-badge">${p.badge}</div>
          <div class="card-lang">${p.language}</div>
        </div>
        <div class="card-title-row">
          <span class="card-icon">${p.icon}</span>
          <h3 class="card-title">${p.title}</h3>
        </div>
        <p class="card-desc">${p.description}</p>
        <ul class="card-highlights">${highlights}</ul>
        <div class="card-tech">${techBadges}</div>
        <div class="card-actions">
          <a href="${p.githubUrl}" target="_blank" rel="noopener noreferrer" class="pixel-btn btn-gh">
            <span>🐙 GITHUB REPO</span>
          </a>
          ${p.demoUrl ? `
            <a href="${p.demoUrl}" target="_blank" rel="noopener noreferrer" class="pixel-btn btn-live">
              <span>🚀 LIVE DEMO</span>
            </a>
          ` : ''}
        </div>
      `;

      container.appendChild(card);
    });
  }

  bindProjectFilters() {
    const filterButtons = document.querySelectorAll('.filter-pill');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.dataset.filter;
        retroAudio.playClick();
        this.renderProjects(PROJECTS_DATA);
      });
    });
  }

  // Scroll current channel content via D-Pad
  scrollActiveChannel(deltaY) {
    const activePanel = document.getElementById(`channel-${this.currentChannel}`);
    if (activePanel) {
      activePanel.scrollBy({ top: deltaY, behavior: 'smooth' });
    }
  }

  navigateCards(direction) {
    if (this.currentChannel !== 2) return;
    const cards = document.querySelectorAll('.project-card');
    if (!cards.length) return;

    let focusedIdx = -1;
    cards.forEach((c, i) => {
      if (c.classList.contains('focused')) focusedIdx = i;
    });

    let nextIdx = focusedIdx + direction;
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx >= cards.length) nextIdx = cards.length - 1;

    cards.forEach(c => c.classList.remove('focused'));
    cards[nextIdx].classList.add('focused');
    cards[nextIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  activateCardAction() {
    if (this.currentChannel !== 2) return;
    const focused = document.querySelector('.project-card.focused');
    if (focused) {
      const primaryBtn = focused.querySelector('.btn-live') || focused.querySelector('.btn-gh');
      if (primaryBtn) primaryBtn.click();
    }
  }

  // TV Guide Modal (Pop-over Broadcast Schedule)
  renderGuideSchedule() {
    const guideList = document.getElementById('guide-channel-list');
    if (!guideList) return;

    guideList.innerHTML = this.channels.map(ch => `
      <div class="guide-row ${ch.id === this.currentChannel ? 'current' : ''}" data-channel="${ch.id}">
        <span class="guide-ch-num">CH 0${ch.id}</span>
        <div class="guide-ch-meta">
          <span class="guide-ch-name">${ch.name}</span>
          <span class="guide-ch-desc">${ch.desc}</span>
        </div>
        <span class="guide-ch-tune">TUNE ▶</span>
      </div>
    `).join('');

    guideList.querySelectorAll('.guide-row').forEach(row => {
      row.addEventListener('click', () => {
        const ch = parseInt(row.dataset.channel, 10);
        this.tuneChannel(ch);
        this.toggleGuideModal(false);
      });
    });

    const closeGuideBtn = document.getElementById('close-guide-btn');
    if (closeGuideBtn) {
      closeGuideBtn.addEventListener('click', () => {
        this.toggleGuideModal(false);
      });
    }
  }

  toggleGuideModal(forceState) {
    const modal = document.getElementById('tv-guide-modal');
    if (!modal) return;

    const isOpen = modal.classList.contains('open');
    const targetState = forceState !== undefined ? forceState : !isOpen;

    if (targetState) {
      this.renderGuideSchedule();
      modal.classList.add('open');
    } else {
      modal.classList.remove('open');
    }
  }

  // Contact Form Interactivity
  bindContactForm() {
    const form = document.getElementById('terminal-contact-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      retroAudio.playBeep(980);

      const nameInput = document.getElementById('contact-name');
      const emailInput = document.getElementById('contact-email');
      const msgInput = document.getElementById('contact-msg');
      const statusOutput = document.getElementById('transmission-status');

      if (!statusOutput) return;

      statusOutput.innerHTML = `
        <span class="transmitting-text">🛰️ TRANSMITTING DATA TO LUIGIE MARTIN...</span>
      `;

      setTimeout(() => {
        retroAudio.playBeep(1320);
        statusOutput.innerHTML = `
          <div class="transmit-success">
            <p>✅ SIGNAL RECEIVED: Thanks ${nameInput.value || 'friend'}! Packet queued for transmission.</p>
            <p class="direct-link">You can also ping me directly at: <a href="mailto:dxlmartin00@gmail.com">dxlmartin00@gmail.com</a></p>
          </div>
        `;
        form.reset();
      }, 1200);
    });
  }
}

// Instantiate and launch when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new PortfolioApp();
  window.app.init();
});
