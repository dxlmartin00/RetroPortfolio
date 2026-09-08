// arcade.js - Channel 06 Easter Egg: CRT Retro Tennis / Arcade Game

class CRTArcadeGame {
  constructor(canvasId = 'arcade-canvas') {
    this.canvasId = canvasId;
    this.canvas = null;
    this.ctx = null;
    this.running = false;
    this.animId = null;

    // Game state
    this.ball = { x: 150, y: 100, vx: 3, vy: 2, size: 8 };
    this.paddleH = 45;
    this.paddleW = 8;
    this.player = { y: 80, score: 0, speed: 5 };
    this.ai = { y: 80, score: 0, speed: 2.8 };

    this.keys = { up: false, down: false };
    this.initialized = false;
  }

  init() {
    this.canvas = document.getElementById(this.canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.canvas.width = 400;
    this.canvas.height = 240;

    this.bindEvents();
    this.resetBall();
    this.initialized = true;
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.keys.up = true;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this.keys.down = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.keys.up = false;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this.keys.down = false;
      }
    });
  }

  movePlayer(direction) {
    if (direction === 'up') {
      this.player.y = Math.max(0, this.player.y - 18);
    } else if (direction === 'down') {
      this.player.y = Math.min(this.canvas.height - this.paddleH, this.player.y + 18);
    }
  }

  resetBall(servingPlayer = 'player') {
    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.canvas.height / 2;
    const dirX = servingPlayer === 'player' ? 1 : -1;
    this.ball.vx = dirX * (2.8 + Math.random() * 0.8);
    this.ball.vy = (Math.random() * 3 - 1.5);
  }

  start() {
    if (!this.initialized) this.init();
    if (!this.canvas) return;
    this.running = true;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
  }

  update() {
    if (!this.canvas) return;

    // Player Movement
    if (this.keys.up) {
      this.player.y = Math.max(0, this.player.y - this.player.speed);
    }
    if (this.keys.down) {
      this.player.y = Math.min(this.canvas.height - this.paddleH, this.player.y + this.player.speed);
    }

    // AI Tracking
    const aiCenter = this.ai.y + this.paddleH / 2;
    if (aiCenter < this.ball.y - 12) {
      this.ai.y = Math.min(this.canvas.height - this.paddleH, this.ai.y + this.ai.speed);
    } else if (aiCenter > this.ball.y + 12) {
      this.ai.y = Math.max(0, this.ai.y - this.ai.speed);
    }

    // Move Ball
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Bounce top & bottom
    if (this.ball.y <= 0 || this.ball.y + this.ball.size >= this.canvas.height) {
      this.ball.vy = -this.ball.vy;
      retroAudio.playArcadeBounce(false);
    }

    // Player Paddle Collision (Left)
    if (
      this.ball.x <= 20 + this.paddleW &&
      this.ball.x >= 20 &&
      this.ball.y + this.ball.size >= this.player.y &&
      this.ball.y <= this.player.y + this.paddleH
    ) {
      this.ball.vx = Math.abs(this.ball.vx) * 1.05; // slight speed increase
      const hitOffset = (this.ball.y - (this.player.y + this.paddleH / 2)) / (this.paddleH / 2);
      this.ball.vy = hitOffset * 4;
      this.ball.x = 20 + this.paddleW + 1;
      retroAudio.playArcadeBounce(false);
    }

    // AI Paddle Collision (Right)
    const rightPaddleX = this.canvas.width - 20 - this.paddleW;
    if (
      this.ball.x + this.ball.size >= rightPaddleX &&
      this.ball.x <= rightPaddleX + this.paddleW &&
      this.ball.y + this.ball.size >= this.ai.y &&
      this.ball.y <= this.ai.y + this.paddleH
    ) {
      this.ball.vx = -Math.abs(this.ball.vx) * 1.05;
      const hitOffset = (this.ball.y - (this.ai.y + this.paddleH / 2)) / (this.paddleH / 2);
      this.ball.vy = hitOffset * 4;
      this.ball.x = rightPaddleX - this.ball.size - 1;
      retroAudio.playArcadeBounce(false);
    }

    // Scoring
    if (this.ball.x < 0) {
      // AI scores
      this.ai.score++;
      retroAudio.playArcadeBounce(true);
      this.resetBall('ai');
    } else if (this.ball.x > this.canvas.width) {
      // Player scores
      this.player.score++;
      retroAudio.playArcadeBounce(true);
      this.resetBall('player');
    }
  }

  draw() {
    if (!this.ctx || !this.canvas) return;

    // Dark retro CRT green background
    this.ctx.fillStyle = '#061309';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Dashed center court line
    this.ctx.strokeStyle = '#1b5e20';
    this.ctx.setLineDash([6, 6]);
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Scores
    this.ctx.font = '24px "VT323", monospace';
    this.ctx.fillStyle = '#39ff14';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.player.score.toString().padStart(2, '0'), this.canvas.width / 2 - 40, 32);
    this.ctx.fillText(this.ai.score.toString().padStart(2, '0'), this.canvas.width / 2 + 40, 32);

    // Player Paddle (Neon phosphor green)
    this.ctx.fillStyle = '#00ff66';
    this.ctx.shadowColor = '#00ff66';
    this.ctx.shadowBlur = 8;
    this.ctx.fillRect(20, this.player.y, this.paddleW, this.paddleH);

    // AI Paddle (Cyan phosphor)
    this.ctx.fillStyle = '#00ffff';
    this.ctx.shadowColor = '#00ffff';
    this.ctx.shadowBlur = 8;
    this.ctx.fillRect(this.canvas.width - 20 - this.paddleW, this.ai.y, this.paddleW, this.paddleH);

    // Ball (Bright white/green glow)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.shadowColor = '#ffffff';
    this.ctx.shadowBlur = 10;
    this.ctx.fillRect(this.ball.x, this.ball.y, this.ball.size, this.ball.size);

    // Reset shadow blur
    this.ctx.shadowBlur = 0;
  }

  loop() {
    if (!this.running) return;
    this.update();
    this.draw();
    this.animId = requestAnimationFrame(() => this.loop());
  }
}

const crtArcade = new CRTArcadeGame();
