// ==========================================
// 1. ASSET LOADER
// ==========================================
const assets = {
    bankInterior: new Image(),
    playerSprite: new Image()
};

// Update these paths to match your folder exactly
assets.bankInterior.src = 'assets/maps/bank_interior.png'; 
assets.playerSprite.src = 'assets/player_walk.png'; 

// ==========================================
// 2. CORE ENGINE & STATE
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let W, H;
const DEBUG_HITBOXES = false; // Set to true to see red collision boxes

function resize() {
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W; canvas.height = H;
  ctx.imageSmoothingEnabled = false; 
}
resize();
window.addEventListener('resize', resize);

const GS = {
  balance: 500000, points: 0, currentLevel: 0,
  phase: 'title', dialogQueue: [], dialogStep: 0,
};

const player = {
  x: 950, y: 700, // Lobby Spawn
  w: 40, h: 80,   // Render size
  vx: 0, vy: 0, speed: 5,
  facing: 1, walking: false,
  spriteWidth: 200, // Based on your 800px wide 4-frame image
  spriteHeight: 400, // Based on your 400px tall image
  currentFrame: 0, frameTimer: 0     
};
const cam = { x: 0, y: 0 };

// ==========================================
// 3. PLAYER SETTINGS (CALIBRATED)
// ==========================================
const player = {
  x: 800, y: 500, 
  
  // 1. RENDER SIZE: Increase these to make her bigger!
  // Try 80 and 160 to make her stand out in the bank interior.
  w: 80, 
  h: 160, 
  
  vx: 0, vy: 0, speed: 6, // Slightly faster speed for a bigger character
  facing: 1, walking: false,
  
  // 2. SPRITE MATH: Check your file properties!
  // Right-click player_walk.png -> Properties -> Details.
  // Take 'Width' and divide by 4. Put that number here:
  spriteWidth: 128,  // Change this to (Total Image Width / 4)
  spriteHeight: 256, // Change this to (Total Image Height)
  
  currentFrame: 0,  
  frameTimer: 0     
};


// ==========================================
// 4. PHYSICS & MOVEMENT
// ==========================================
function checkCollision(nx, ny, hitboxes) {
    const pw = player.w * 0.8;
    const ph = 20; // Collision only at feet
    const px = nx + (player.w - pw) / 2;
    const py = ny + player.h - ph;

    for (let b of hitboxes) {
        if (px < b.x + b.w && px + pw > b.x && py < b.y + b.h && py + ph > b.y) return true;
    }
    return false;
}

const keys = { left: false, right: false, up: false, down: false };
document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'a' || k === 'arrowleft') keys.left = true;
  if (k === 'd' || k === 'arrowright') keys.right = true;
  if (k === 'w' || k === 'arrowup') keys.up = true;
  if (k === 's' || k === 'arrowdown') keys.down = true;
});
document.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === 'a' || k === 'arrowleft') keys.left = false;
  if (k === 'd' || k === 'arrowright') keys.right = false;
  if (k === 'w' || k === 'arrowup') keys.up = false;
  if (k === 's' || k === 'arrowdown') keys.down = false;
});

function updatePlayer() {
  if (GS.phase !== 'playing') return;
  const lv = LEVELS[GS.currentLevel];
  player.vx = 0; player.vy = 0;

  if (keys.left) { player.vx = -player.speed; player.facing = -1; }
  if (keys.right) { player.vx = player.speed; player.facing = 1; }
  if (keys.up) player.vy = -player.speed;
  if (keys.down) player.vy = player.speed;

  player.walking = (player.vx !== 0 || player.vy !== 0);

  if (!checkCollision(player.x + player.vx, player.y, lv.hitboxes)) player.x += player.vx;
  if (!checkCollision(player.x, player.y + player.vy, lv.hitboxes)) player.y += player.vy;

  cam.x = player.x - W / 2;
  cam.y = player.y - H / 2;
  
  // Camera Clamping
  cam.x = Math.max(0, Math.min(cam.x, 1920 - W));
  cam.y = Math.max(0, Math.min(cam.y, 1080 - H));
}

// ==========================================
// 5. DRAWING
// ==========================================
function gameLoop() {
  ctx.clearRect(0, 0, W, H);
  const lv = LEVELS[GS.currentLevel];

  if (GS.phase === 'playing' || GS.phase === 'dialog') {
    ctx.drawImage(lv.bgImage, -cam.x, -cam.y);
    
    if (DEBUG_HITBOXES) {
        ctx.fillStyle = 'rgba(255,0,0,0.3)';
        lv.hitboxes.forEach(b => ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h));
    }

    lv.npcs.forEach(n => {
        ctx.font = '40px serif';
        ctx.fillText(n.emoji, n.x - cam.x, n.y - cam.y);
    });

    updatePlayer();
    
    // Animate
    if (player.walking) {
        player.frameTimer++;
        if (player.frameTimer > 10) {
            player.currentFrame = (player.currentFrame + 1) % 4;
            player.frameTimer = 0;
        }
    } else player.currentFrame = 0;

    // Draw Player
    ctx.save();
    const dx = player.x - cam.x;
    const dy = player.y - cam.y;
    if (player.facing === -1) {
        ctx.translate(dx + player.w, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(assets.playerSprite, player.currentFrame * player.spriteWidth, 0, player.spriteWidth, player.spriteHeight, 0, 0, player.w, player.h);
    } else {
        ctx.drawImage(assets.playerSprite, player.currentFrame * player.spriteWidth, 0, player.spriteWidth, player.spriteHeight, dx, dy, player.w, player.h);
    }
    ctx.restore();
  }
  requestAnimationFrame(gameLoop);
}

window.beginGame = function() {
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';
  GS.phase = 'playing';
  gameLoop();
};

window.onload = () => {
    const btn = document.querySelector('.start-btn');
    btn.textContent = "Тоглоом Эхлэх";
    btn.disabled = false;
};
// ==========================================
// 7. RENDERING ENGINE (SCALING FIX)
// ==========================================
function drawBackground(lv) {
  if (lv.bgImage && lv.bgImage.complete) {
    // This draws the bank at its natural size so it doesn't look blurry
    ctx.drawImage(lv.bgImage, -cam.x, -cam.y); 
    lv.width = lv.bgImage.width; 
    lv.height = lv.bgImage.height;
  }
}
