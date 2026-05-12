// ==========================================
// 1. ASSET LOADER & PRELOADER
// ==========================================
const assets = {
    bankInterior: new Image(),
    playerSprite: new Image()
};

let loadedAssets = 0;
const totalAssets = 2;

function assetLoaded() {
    loadedAssets++;
    if (loadedAssets === totalAssets) {
        const startBtn = document.querySelector('.start-btn');
        startBtn.textContent = "Тоглоом Эхлэх (Start Game)";
        startBtn.disabled = false;
    }
}

assets.bankInterior.onload = assetLoaded;
assets.playerSprite.onload = assetLoaded;

assets.bankInterior.src = 'assets/maps/bank_interior.png'; 
assets.playerSprite.src = 'assets/player_walk.png'; 

// ==========================================
// 2. CORE ENGINE & STATE
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let W, H;

// Set this to true to see your invisible walls! Set to false to hide them.
const DEBUG_HITBOXES = true; 

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
  ctx.imageSmoothingEnabled = false; 
}
resize();
window.addEventListener('resize', resize);

const GS = {
  balance: 500000,
  points: 0,
  currentLevel: 0,
  phase: 'title', 
  dialogQueue: [],
  dialogStep: 0,
};

// ==========================================
// 3. PLAYER SETTINGS
// ==========================================
const player = {
  x: 800, y: 500, 
  
  // 1. RENDER SIZE: This is how big the character appears on screen!
  // Try lowering these numbers to shrink the player. 
  w: 24,  // Changed from 48
  h: 48,  // Changed from 96
  
  vx: 0, vy: 0, speed: 5,
  facing: 1, walking: false,
  
  // 2. SOURCE SIZE: This is the actual math used to slice your PNG.
  // We need to calculate this based on your exact file.
  spriteWidth: 64,   // See instructions below!
  spriteHeight: 128, // See instructions below!
  currentFrame: 0,  
  frameTimer: 0     
};

// ==========================================
// 4. LEVEL, NPCS, AND HITBOXES (WALLS)
// ==========================================
const LEVELS = [
  {
    id: 1, name: 'Банкны дотор',
    bgImage: assets.bankInterior,
    width: 1920, 
    height: 1080, // Added map height for 2D scrolling!
    
    // INVISIBLE WALLS [x, y, width, height]
    // You will need to tweak these numbers to perfectly match your PNG layout!
    hitboxes: [
        { x: 0, y: 0, w: 1920, h: 120 },     // Top Wall
        { x: 0, y: 0, w: 50, h: 1080 },      // Left outer wall
        { x: 1870, y: 0, w: 50, h: 1080 },   // Right outer wall
        { x: 0, y: 980, w: 1920, h: 100 },   // Bottom outer wall
        { x: 50, y: 500, w: 400, h: 350 },   // THE VAULT WALLS
        { x: 600, y: 120, w: 1200, h: 150 }, // The long Teller Counter
    ],
    
    npcs: [
      { 
        x: 1000, y: 350, emoji: '👩‍💼', name: 'Теллер Болормаа', 
        dialog: [
          { speaker: 'Болормаа', emoji: '👩‍💼', text: 'Төрийн банкинд тавтай морилно уу.' },
          { speaker: 'Болормаа', emoji: '👩‍💼', text: 'Цахим банк ашиглах талаар суралцах уу?' }
        ],
        minigame: 'gyalsbank'
      },
      { 
        x: 600, y: 700, emoji: '👨‍💼', name: 'Менежер', 
        dialog: [
          { speaker: 'Менежер', emoji: '👨‍💼', text: 'Та төсвөө хэрхэн зөв хуваарилахыг мэдэх үү?' }
        ],
        minigame: 'budget'
      }
    ]
  }
];

// ==========================================
// 5. INPUT HANDLING (ADDED UP & DOWN)
// ==========================================
const keys = { left: false, right: false, up: false, down: false };

document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') keys.left = true;
  if (k === 'arrowright' || k === 'd') keys.right = true;
  if (k === 'arrowup' || k === 'w') keys.up = true;
  if (k === 'arrowdown' || k === 's') keys.down = true;
  if (k === ' ' || k === 'enter') handleInteract();
});
document.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') keys.left = false;
  if (k === 'arrowright' || k === 'd') keys.right = false;
  if (k === 'arrowup' || k === 'w') keys.up = false;
  if (k === 'arrowdown' || k === 's') keys.down = false;
});

// Mobile Controls
const touchControlSetup = (id, key) => {
    const el = document.getElementById(id);
    if(el) {
        el.addEventListener('touchstart', e => { e.preventDefault(); keys[key] = true; });
        el.addEventListener('touchend', e => { e.preventDefault(); keys[key] = false; });
    }
}
touchControlSetup('btn-left', 'left');
touchControlSetup('btn-right', 'right');
touchControlSetup('btn-up', 'up');
touchControlSetup('btn-down', 'down');
document.getElementById('btn-interact').addEventListener('click', handleInteract);
document.getElementById('dialog-top').addEventListener('click', advanceDialog);

// ==========================================
// 6. UI, HUD & MINIGAMES (KEPT YOUR LOGIC)
// ==========================================
function updateHUD() {
  document.getElementById('hud-bal').textContent = `₮ ` + GS.balance.toLocaleString();
  document.getElementById('hud-pts').textContent = GS.points;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2100);
}

let currentNPC = null;
function showDialog(messages, npc) {
  if (!messages || messages.length === 0) return;
  GS.phase = 'dialog';
  GS.dialogStep = 0;
  GS.dialogQueue = messages;
  currentNPC = npc;
  
  keys.left = false; keys.right = false; keys.up = false; keys.down = false;
  player.walking = false;
  showDialogStep();
}

function showDialogStep() {
  const msg = GS.dialogQueue[GS.dialogStep];
  if (!msg) { closeDialog(); return; }
  document.getElementById('dialog-portrait').textContent = msg.emoji || '🗣️';
  document.getElementById('dialog-speaker').textContent = msg.speaker || '';
  document.getElementById('dialog-text').textContent = msg.text;
  document.getElementById('dialog-box').classList.add('open');
}

function advanceDialog() {
  if (GS.phase !== 'dialog') return;
  GS.dialogStep++;
  if (GS.dialogStep >= GS.dialogQueue.length) {
    closeDialog();
    if (currentNPC && currentNPC.minigame) openMiniGame(currentNPC.minigame);
  } else {
    showDialogStep();
  }
}

function closeDialog() {
  document.getElementById('dialog-box').classList.remove('open');
  GS.phase = 'playing';
  currentNPC = null;
}

function openMiniGame(id) {
  const body = document.getElementById('minigame-body');
  body.innerHTML = '';
  GS.phase = 'minigame';
  if (id === 'gyalsbank') {
      document.getElementById('minigame-title').textContent = "Гялс Банк";
      body.innerHTML = `<div style="background:#0a1528; padding:20px; border-radius:10px; text-align:center;"><h3 style="color:#6495ED; margin-bottom: 10px;">Шилжүүлэг хийх</h3><p style="margin-bottom: 20px;">Та 50,000₮ шилжүүлэх үү?</p><button class="choice-btn" onclick="transferMoney()" style="width:100%; justify-content:center;">Шилжүүлэх</button></div>`;
  } else if (id === 'budget') {
      document.getElementById('minigame-title').textContent = "Төсөв зохиох";
      body.innerHTML = `<div style="background:#0a1528; padding:20px; border-radius:10px;"><p>Зөв төсөвлөлт бол амжилтын үндэс!</p><br><button class="choice-btn" onclick="finishMiniGame(50)" style="width:100%; justify-content:center;">Төсвөө батлах (+50 оноо)</button></div>`;
  }
  document.getElementById('minigame-overlay').classList.add('open');
}

window.transferMoney = function() { GS.balance -= 50000; updateHUD(); finishMiniGame(20); }
window.finishMiniGame = function(points) { GS.points += points; updateHUD(); showToast(`+${points} ⭐ Оноо авлаа!`); closeMiniGame(); }
window.closeMiniGame = function() { document.getElementById('minigame-overlay').classList.remove('open'); GS.phase = 'playing'; }

function handleInteract() {
  if (GS.phase === 'dialog') { advanceDialog(); return; }
  if (GS.phase !== 'playing') return;
  const lv = LEVELS[GS.currentLevel];
  for (const npc of lv.npcs) {
    // 2D distance calculation
    const dx = player.x + (player.w/2) - npc.x;
    const dy = player.y + (player.h/2) - npc.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 100) { showDialog(npc.dialog, npc); return; }
  }
}

// ==========================================
// 7. RENDERING ENGINE & CAMERA
// ==========================================
function drawBackground(lv) {
  if (lv.bgImage && lv.bgImage.complete) {
    ctx.drawImage(lv.bgImage, -cam.x, -cam.y); // Draw based on camera X AND Y
    lv.width = lv.bgImage.width; 
    lv.height = lv.bgImage.height;
  } else {
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, W, H);
  }
}

// Draws the red debug boxes over walls
function drawHitboxes(lv) {
    if (!DEBUG_HITBOXES) return;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; // Red, 40% transparent
    for (let box of lv.hitboxes) {
        ctx.fillRect(box.x - cam.x, box.y - cam.y, box.w, box.h);
    }
}

function drawPlayer() {
  const lv = LEVELS[GS.currentLevel];
  if (!lv) return;
  const drawX = player.x - cam.x;
  const drawY = player.y - cam.y;

  if (assets.playerSprite && assets.playerSprite.complete) {
      if (player.walking) {
          player.frameTimer++;
          if (player.frameTimer >= 8) { 
              player.currentFrame++;
              if (player.currentFrame > 3) player.currentFrame = 0; 
              player.frameTimer = 0;
          }
      } else {
          player.currentFrame = 0; 
      }

      ctx.save();
      if (player.facing === -1) {
          ctx.translate(drawX + player.w, drawY);
          ctx.scale(-1, 1);
          ctx.drawImage(assets.playerSprite, player.currentFrame * player.spriteWidth, 0, player.spriteWidth, player.spriteHeight, 0, 0, player.w, player.h);
      } else {
          ctx.drawImage(assets.playerSprite, player.currentFrame * player.spriteWidth, 0, player.spriteWidth, player.spriteHeight, drawX, drawY, player.w, player.h);
      }
      ctx.restore();
  } else {
      ctx.fillStyle = '#6495ED';
      ctx.fillRect(drawX, drawY, player.w, player.h);
  }
}

function drawNPC(npc, lv) {
  const drawX = npc.x - cam.x;
  const drawY = npc.y - cam.y;
  
  if (drawX < -100 || drawX > W + 100 || drawY < -100 || drawY > H + 100) return; 
  
  ctx.font = '40px serif';
  ctx.textAlign = 'center';
  ctx.fillText(npc.emoji, drawX, drawY);

  const dx = player.x + (player.w/2) - npc.x;
  const dy = player.y + (player.h/2) - npc.y;
  if (Math.sqrt(dx*dx + dy*dy) < 100) {
    ctx.fillStyle = 'rgba(255,215,0,0.9)';
    ctx.font = 'bold 14px system-ui';
    ctx.fillText('🗨️ [Space / Tap]', drawX, drawY - 50);
  }
}

// ==========================================
// 8. TOP-DOWN PHYSICS & COLLISION
// ==========================================
// This function checks if a future X,Y position touches any invisible walls
function checkCollision(newX, newY, hitboxes) {
    // We create a "bounding box" for the player's feet
    const pw = player.w - 10; 
    const ph = 20; // Only check collision at the bottom of the player (their feet)
    const px = newX + 5;
    const py = newY + player.h - ph;

    for (let box of hitboxes) {
        if (px < box.x + box.w &&
            px + pw > box.x &&
            py < box.y + box.h &&
            py + ph > box.y) {
            return true; // BAM! Hit a wall.
        }
    }
    return false; // Free to walk
}

function updatePlayer() {
  if (GS.phase !== 'playing') return;
  const lv = LEVELS[GS.currentLevel];

  player.vx = 0; player.vy = 0;
  if (keys.left) { player.vx = -player.speed; player.facing = -1; }
  if (keys.right) { player.vx = player.speed; player.facing = 1; }
  if (keys.up) { player.vy = -player.speed; }
  if (keys.down) { player.vy = player.speed; }
  
  player.walking = (player.vx !== 0 || player.vy !== 0);

  // Apply Movement & Collision separately for X and Y so you slide along walls
  let nextX = player.x + player.vx;
  let nextY = player.y + player.vy;

  if (!checkCollision(nextX, player.y, lv.hitboxes)) player.x = nextX;
  if (!checkCollision(player.x, nextY, lv.hitboxes)) player.y = nextY;

  // Update Camera to follow player in BOTH directions
  cam.x = player.x - (W / 2) + (player.w / 2);
  cam.y = player.y - (H / 2) + (player.h / 2);

  // Clamp camera so it doesn't look outside the map image
  if (lv.width) {
      if (cam.x < 0) cam.x = 0;
      if (cam.y < 0) cam.y = 0;
      if (cam.x > lv.width - W) cam.x = lv.width - W;
      if (cam.y > lv.height - H) cam.y = lv.height - H;
  }
}

// ==========================================
// 9. MAIN LOOP
// ==========================================
function gameLoop() {
  ctx.clearRect(0, 0, W, H);

  if (GS.phase === 'playing' || GS.phase === 'dialog') {
    const lv = LEVELS[GS.currentLevel];
    drawBackground(lv);
    drawHitboxes(lv); // Shows the red walls if DEBUG_HITBOXES is true!
    lv.npcs.forEach(n => drawNPC(n, lv));
    updatePlayer();
    drawPlayer();
  }

  requestAnimationFrame(gameLoop);
}

window.beginGame = function() {
  if (document.querySelector('.start-btn').disabled) return; 
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('touch-controls').style.display = 'flex';
  document.getElementById('hud').style.display = 'flex';
  updateHUD();
  GS.phase = 'playing';
  gameLoop();
};
