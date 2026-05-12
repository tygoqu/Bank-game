// 1. Setup the Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 2. Create a basic Player Object (a placeholder until we add your character art)
const player = {
    x: 400,
    y: 300,
    width: 32,
    height: 32,
    color: 'red'
};

// 3. The Core Draw Function
function draw() {
    // Clear the screen every frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the player (a red square for now)
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

// 4. The Game Loop (Runs at 60 Frames Per Second)
function gameLoop() {
    draw();
    requestAnimationFrame(gameLoop); 
}

// Start the engine!
gameLoop();
