// --- 1. SLIDE DATA (Your exact data) ---
const slides = [
    { id: 0, bg: "bg-sunset", html: `<h1>Бизнесийн ёс зүй</h1><div class="subtitle">Хийж гүйцэтгэсэн : Б.Мөнхболд, Т.Есүй, Г.Нармандах</div>` },
    { id: 1, bg: "bg-sunset", html: `<h2>1-р үе: Танилцуулга</h2><div class="content">Минжээ бол мэргэжлийн ахлах нягтлан бодогч...</div>` },
    { id: 2, bg: "bg-sunset", requireChoice: true, html: `<h2>Захирлын шахалт</h2><div class="content"><div class="dialogue-box">Захирал: “Энэ барилгын засварын 20 сая төгрөгийг...”</div></div><div class="choices-container"><button class="choice-btn" onclick="makeChoice(3)">Зөвшөөрөх</button><button class="choice-btn" onclick="makeChoice(4)">Татгалзах</button></div>` },
    { id: 3, bg: "bg-sunset", nextId: 13, html: `<h2>Үр дагавар: Зөвшөөрсөн</h2><div class="content"><b style="color:#FFB0B0;">Хог дээр үсрэв!</b></div>` },
    { id: 4, bg: "bg-sunset", nextId: 13, html: `<h2>Үр дагавар: Татгалзсан</h2><div class="content"><b style="color:#90EE90;">Үнэнээр явж үхэр тэгргээр туулай гүйцэн, амжилт олов!</b></div>` },
    // I shortened the array slightly for this example, but slide 13 is your ending!
    { id: 13, bg: "bg-sunset", html: `<h1>Анхаарал хандуулсанд баярлалаа</h1><div class="subtitle">Слайд төгслөө. Одоо гарах товчийг дарна уу.</div>` }
];

// --- 2. GAME ENGINE SETUP ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let isDialogActive = false; // This tells the game to pause when talking

// Player Data
const player = { x: 100, y: 300, width: 32, height: 32, color: 'red', speed: 4 };

// NPC / Desk Data (This is what you bump into to start the story)
const bossDesk = { x: 600, y: 280, width: 64, height: 64, color: 'blue' };

// Keyboard tracking
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// --- 3. DIALOG SYSTEM (Modified from your code) ---
let currentSlideId = 0;
let historyStack = [0];
const wrapper = document.getElementById('presentation-wrapper');
const container = document.getElementById('presentation-container');
const contentDiv = document.getElementById('slide-content');

function renderSlide() {
    const slide = slides.find(s => s.id === currentSlideId);
    container.className = slide.bg;
    contentDiv.innerHTML = `<div class="slide active">${slide.html}</div>`;

    document.getElementById('btn-prev').disabled = historyStack.length <= 1;
    
    // If it's the last slide, show the EXIT button so we can go back to the game!
    if (currentSlideId === 13) {
        document.getElementById('btn-next').style.display = 'none';
        document.getElementById('btn-exit').style.display = 'block';
    } else {
        document.getElementById('btn-next').style.display = 'block';
        document.getElementById('btn-exit').style.display = 'none';
        document.getElementById('btn-next').disabled = slide.requireChoice;
    }
}

window.nextSlide = function() {
    const slide = slides.find(s => s.id === currentSlideId);
    if (slide.requireChoice || currentSlideId === 13) return;
    let nextId = slide.nextId !== undefined ? slide.nextId : currentSlideId + 1;
    currentSlideId = nextId;
    historyStack.push(currentSlideId);
    renderSlide();
}

window.makeChoice = function(targetId) {
    currentSlideId = targetId;
    historyStack.push(currentSlideId);
    renderSlide();
}

window.prevSlide = function() {
    if (historyStack.length > 1) {
        historyStack.pop();
        currentSlideId = historyStack[historyStack.length - 1];
        renderSlide();
    }
}

// How we trigger the story from the game!
function triggerStory() {
    isDialogActive = true; 
    wrapper.style.display = 'flex'; // Un-hide the UI
    currentSlideId = 0; // Start at slide 0
    historyStack = [0];
    renderSlide();
}

// How we close the story and go back to walking!
window.closeDialog = function() {
    wrapper.style.display = 'none'; // Hide the UI
    isDialogActive = false; // Unpause the game
    // Bounce the player back slightly so they don't immediately re-trigger the desk
    player.x -= 20; 
}

// --- 4. GAME LOOP ---
function update() {
    // If we are reading the slides, don't let the player move!
    if (isDialogActive) return;

    // Movement
    if (keys['w']) player.y -= player.speed;
    if (keys['s']) player.y += player.speed;
    if (keys['a']) player.x -= player.speed;
    if (keys['d']) player.x += player.speed;

    // Very simple collision detection with the Boss Desk
    if (player.x < bossDesk.x + bossDesk.width &&
        player.x + player.width > bossDesk.x &&
        player.y < bossDesk.y + bossDesk.height &&
        player.y + player.height > bossDesk.y) {
            triggerStory();
    }
}

function draw() {
    // Clear screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Desk
    ctx.fillStyle = bossDesk.color;
    ctx.fillRect(bossDesk.x, bossDesk.y, bossDesk.width, bossDesk.height);

    // Draw Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Start the game!
loop();
