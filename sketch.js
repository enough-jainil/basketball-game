// --- Global Variables ---
let player;
let basketballs = [];
let obstacles = []; // NEW: Array for obstacles
let scorePopups = []; // NEW: Array for score "+1" effects
let powerups = []; // NEW: Array for power-ups
let hazards = []; // NEW: Array for airborne hazards
let clouds = []; // <<-- ADD THIS LINE

let score = 0;
let gameSpeed; // Will be reset
let gravity;
let groundHeight;
let spawnRate; // Will be reset
let obstacleSpawnChance = 0.4; // NEW: 30% chance an obstacle spawns instead of nothing/ball
let powerupSpawnChance = 0.05; // NEW: 5% chance a power-up spawns (adjust as needed)
let hazardSpawnChance = 0.15; // NEW: 15% chance a hazard spawns (adjust as needed)

// NEW: Power-up State Variables
let isInvincible = false;
let invincibilityTimer = 0;
const INVINCIBILITY_DURATION = 300; // 5 seconds at 60fps

// NEW: Game State Management
let gameState = 'start'; // 'start', 'playing', 'gameOver'

// NEW: Difficulty Caps
const MAX_GAME_SPEED = 10;
const MIN_SPAWN_RATE = 40; // Minimum frames between spawns

// Add to global variables
let courtFeatures = [];
let featureTypes = ['scoreboard', 'crowd', 'bench'];

// Add these global variables at the top
let scaleFactor = 1;
let baseWidth = 600;
let baseHeight = 400;

// NEW: Additional Difficulty Variables
let difficultyLevel = 1;
let nextLevelScore = 2; // INCREASED: Start requiring 15 points for level 2
const MAX_DIFFICULTY_LEVEL = 10; // Cap the difficulty level benefits/scaling

// Add to the top of your file after existing global variables
let isMobileDevice = false;

// Create random court features for visual interest
function createCourtFeature() {
    let type = random(featureTypes);
    let featureX = width + random(50, 150) * scaleFactor;
    let yPos;
    
    switch(type) {
        case 'scoreboard':
            yPos = random(height * 0.1, height * 0.3);
            break;
        case 'crowd':
            yPos = height * 0.2;
            break;
        case 'bench':
            yPos = height - groundHeight - 20 * scaleFactor;
            break;
    }
    
    courtFeatures.push({
        type: type,
        x: featureX,
        y: yPos,
        speed: gameSpeed * 0.7, // Move slower than game elements for parallax
        
        update: function() {
            this.x -= this.speed;
            return this.x < -100 * scaleFactor;
        },
        
        show: function() {
            push();
            if (this.type === 'scoreboard') {
                fill(0, 0, 0);
                rect(this.x, this.y, 80 * scaleFactor, 40 * scaleFactor);
                fill(255, 0, 0);
                rect(this.x + 5 * scaleFactor, this.y + 5 * scaleFactor, 
                     70 * scaleFactor, 30 * scaleFactor);
                fill(255);
                textSize(15 * scaleFactor);
                text("SCORE", this.x + 40 * scaleFactor, this.y + 20 * scaleFactor);
            } else if (this.type === 'crowd') {
                // Simple crowd representation
                for (let i = 0; i < 10; i++) {
                    fill(random(100, 255), random(100, 255), random(100, 255));
                    ellipse(this.x + i * 15 * scaleFactor, 
                            this.y + sin(i * 0.5) * 10 * scaleFactor, 
                            12 * scaleFactor, 12 * scaleFactor);
                }
            } else if (this.type === 'bench') {
                fill(150, 75, 0);
                rect(this.x, this.y, 60 * scaleFactor, 15 * scaleFactor);
                fill(120, 60, 0);
                rect(this.x + 5 * scaleFactor, this.y + 15 * scaleFactor, 
                     10 * scaleFactor, 15 * scaleFactor);
                rect(this.x + 45 * scaleFactor, this.y + 15 * scaleFactor, 
                     10 * scaleFactor, 15 * scaleFactor);
            }
            pop();
        }
    });
}

// --- Player Object ---
// (Keep the Player object definition from the previous version)
function setupPlayer() {
    player = {
        x: 100 * scaleFactor,
        y: height - groundHeight - 60 * scaleFactor,
        width: 40 * scaleFactor,
        height: 60 * scaleFactor,
        velocityY: 0,
        lift: -13 * scaleFactor,
        onGround: true,
        canDoubleJump: false, // NEW: Track if double jump is available

        show: function() {
            push(); // Isolate drawing style for player
            // Invincibility Flash Effect
            if (isInvincible && frameCount % 10 < 5) {
                 fill(255, 0, 0, 100); // Semi-transparent Red
                 stroke(255, 255, 255, 100); // Semi-transparent White outline
            } else {
                 fill(255, 0, 0); // Bright Red
                 stroke(255); // White outline/detail color
            }
            strokeWeight(2); // Make outline visible

            // Draw main body
            rect(this.x, this.y, this.width, this.height, 5);

            // Simple "Jersey" stripe
            noStroke();
            fill(255); // White stripe
            rect(this.x, this.y + this.height * 0.4, this.width, this.height * 0.2);

             // Simple face - draw over stripe
            fill(0); // Black for eyes/mouth
            ellipse(this.x + this.width * 0.3, this.y + this.height * 0.3, 5, 7); // Slightly taller eyes
            ellipse(this.x + this.width * 0.7, this.y + this.height * 0.3, 5, 7);
            // Mouth (simple line)
            stroke(0);
            strokeWeight(1.5);
            line(this.x + this.width * 0.4, this.y + this.height * 0.7, this.x + this.width * 0.6, this.y + this.height * 0.7);
            // noFill(); // Not needed if just drawing a line
            // arc(this.x + this.width / 2, this.y + this.height * 0.6, 15, 10, 0, PI); // Removed arc mouth

            pop(); // Restore drawing style
        },

        update: function() {
            this.velocityY += gravity;
            this.y += this.velocityY;

            if (this.y >= height - groundHeight - this.height) {
                this.y = height - groundHeight - this.height;
                this.velocityY = 0;
                this.onGround = true;
                this.canDoubleJump = false; // Reset double jump on landing
            } else {
                this.onGround = false;
            }
        },

        jump: function() {
            if (this.onGround) { // First jump
                this.velocityY = this.lift;
                this.onGround = false;
                this.canDoubleJump = true; // Enable double jump after the first jump
                // NEW: Play jump sound (optional, requires p5.sound)
                // if (jumpSound && jumpSound.isLoaded()) { jumpSound.play(); }
            } else if (this.canDoubleJump) { // Second jump (double jump)
                this.velocityY = this.lift; // Apply lift again
                this.canDoubleJump = false; // Disable double jump until landing again
                 // Optional: Play a different sound for double jump?
                 // if (doubleJumpSound && doubleJumpSound.isLoaded()) { doubleJumpSound.play(); }
            }
        },
        // NEW: Collision check specifically for rectangles
        collidesWithRect: function(otherRect) {
             // Basic Axis-Aligned Bounding Box (AABB) collision
             return (
                this.x < otherRect.x + otherRect.width &&
                this.x + this.width > otherRect.x &&
                this.y < otherRect.y + otherRect.height &&
                this.y + this.height > otherRect.y
             );
        },
    };
}


// --- Basketball Object ---
// (Keep the Basketball object definition, but add score popup creation)
function createBasketball() {
    let basketballSize = 30 * scaleFactor;
    let minY = height * 0.5;
    let maxY = height - groundHeight - basketballSize - 20 * scaleFactor;
    let randomY = random(minY, maxY);

    basketballs.push({
        x: width + basketballSize,
        y: randomY,
        size: basketballSize,
        radius: basketballSize / 2,
        speed: gameSpeed, // Use current gameSpeed

        show: function() {
            push(); // Isolate styles
            // Draw basketball
             fill(255, 120, 0); // Brighter Orange
            noStroke();
            ellipse(this.x, this.y, this.size, this.size);

             // Simple basketball lines
            stroke(0); // Black lines
            strokeWeight(1.5); // Slightly thicker lines
            noFill();
            line(this.x - this.radius, this.y, this.x + this.radius, this.y); // Horizontal
            line(this.x, this.y - this.radius, this.x, this.y + this.radius); // Vertical
            // Curved lines
            arc(this.x, this.y, this.size * 0.8, this.size * 0.8, -QUARTER_PI * 1.2, QUARTER_PI * 1.2);
            arc(this.x, this.y, this.size * 0.8, this.size * 0.8, PI - QUARTER_PI * 1.2, PI + QUARTER_PI * 1.2);
            pop(); // Restore styles
        },

        update: function() {
            this.x -= this.speed; // Move left based on current speed
        },

        collidesWith: function(playerRect) {
            let closestX = constrain(this.x, playerRect.x, playerRect.x + playerRect.width);
            let closestY = constrain(this.y, playerRect.y, playerRect.y + playerRect.height);
            let distanceX = this.x - closestX;
            let distanceY = this.y - closestY;
            let distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
            let collision = distanceSquared < (this.radius * this.radius);

            // *** NEW: Create score popup on collision ***
            if (collision) {
                createScorePopup(this.x, this.y);
                 // NEW: Play collect sound (optional)
                 // if (collectSound && collectSound.isLoaded()) { collectSound.play(); }
            }
            return collision;
        }
    });
}

// --- NEW: Obstacle Object ---
function createObstacle() {
    // Scale all dimensions
    let obstacleWidth = 30 * scaleFactor;
    let obstacleHeight = random(40, 60) * scaleFactor;

    // NEW: Define possible obstacle types
    let possibleTypes = ['cone', 'bottle', 'rack', 'hand'];
    let obstacleType = random(possibleTypes); // Randomly pick a type
    let isStompable = false; // NEW: Default to not stompable

    let visualData = {}; // Store visual details specific to the type

    // Set dimensions and visual properties based on type
    switch (obstacleType) {
        case 'bottle':
            visualData.color = color(180, 220, 255, 200); // Light blue, semi-transparent
            visualData.capColor = color(200, 200, 200); // Grey cap
            visualData.labelColor = color(255); // White label
            break;
        case 'rack':
            visualData.color = color(100, 100, 100); // Grey metal
            visualData.ballColor = color(255, 120, 0); // Orange balls
            isStompable = true; // NEW: Racks can be stomped
            break;
        case 'hand':
            visualData.color = color(224, 172, 105); // Skin tone (adjust as desired)
            visualData.sleeveColor = color(random(50, 150), random(50, 150), random(50, 150)); // Random sleeve color
            break;
        case 'cone': // Default to cone if needed, or keep specific properties
        default:
             visualData.color = color(255, 100, 0); // Orange
             visualData.stripeColor = color(255); // White
             // Store visual dimensions for the cone
             visualData.baseWidth = obstacleWidth * 1.5;
             visualData.topWidth = obstacleWidth * 0.5;
             isStompable = true; // NEW: Cones can be stomped
             break;
    }


    obstacles.push({
        x: width + obstacleWidth, // Position based on calculated width
        y: height - groundHeight - obstacleHeight, // Position on the ground
        width: obstacleWidth, // Used for collision detection
        height: obstacleHeight, // Used for collision detection
        type: obstacleType, // Store the chosen type
        stompable: isStompable, // <<< NEW: Add stompable property
        visuals: visualData, // Store the visual properties
        speed: gameSpeed,

        show: function() {
            push(); // Isolate styles
            strokeWeight(1.5);
            stroke(50); // Default dark outline

            // --- Draw based on type ---
            if (this.type === 'cone') {
                fill(this.visuals.color); // Orange color for cone
                stroke(50);
                // Draw a trapezoid/quad for a simple cone shape
                let x1 = this.x - this.visuals.baseWidth / 2 + this.width / 2; // Center the visual shape roughly
                let y1 = this.y + this.height;
                let x2 = this.x + this.visuals.baseWidth / 2 + this.width / 2;
                let y2 = this.y + this.height;
                let x3 = this.x + this.visuals.topWidth / 2 + this.width / 2;
                let y3 = this.y;
                let x4 = this.x - this.visuals.topWidth / 2 + this.width / 2;
                let y4 = this.y;
                quad(x1, y1, x2, y2, x3, y3, x4, y4);

                // White stripes
                noStroke();
                fill(this.visuals.stripeColor);
                let stripeHeight = this.height * 0.15;
                rect(x4 + (x3-x4)*0.1, this.y + this.height * 0.25, (x3-x4)*0.8, stripeHeight);
                rect(x4 + (x3-x4)*0.1, this.y + this.height * 0.6, (x3-x4)*0.8, stripeHeight);

            } else if (this.type === 'bottle') {
                // Main bottle body
                fill(this.visuals.color);
                noStroke();
                rect(this.x, this.y + this.height * 0.1, this.width, this.height * 0.9, 3); // Main part with rounded bottom corners
                // Bottle Cap
                fill(this.visuals.capColor);
                rect(this.x + this.width * 0.2, this.y, this.width * 0.6, this.height * 0.15);
                // Simple label
                fill(this.visuals.labelColor);
                rect(this.x + this.width * 0.1, this.y + this.height * 0.4, this.width * 0.8, this.height * 0.2);

            } else if (this.type === 'rack') {
                // Main rack frame
                fill(this.visuals.color);
                stroke(30);
                rect(this.x, this.y, this.width, this.height, 2);
                // Bars
                line(this.x, this.y + this.height/3, this.x + this.width, this.y + this.height/3);
                line(this.x, this.y + 2*this.height/3, this.x + this.width, this.y + 2*this.height/3);
                // Simple basketballs inside
                fill(this.visuals.ballColor);
                noStroke();
                let ballSize = this.width * 0.25;
                ellipse(this.x + this.width * 0.25, this.y + this.height * 0.2, ballSize, ballSize);
                ellipse(this.x + this.width * 0.75, this.y + this.height * 0.2, ballSize, ballSize);
                ellipse(this.x + this.width * 0.25, this.y + this.height * 0.5, ballSize, ballSize);
                ellipse(this.x + this.width * 0.75, this.y + this.height * 0.5, ballSize, ballSize);
                ellipse(this.x + this.width * 0.5, this.y + this.height * 0.8, ballSize, ballSize);


            } else if (this.type === 'hand') {
                 // Sleeve/Arm part
                 fill(this.visuals.sleeveColor);
                 noStroke();
                 // Draw arm slightly angled - using quad
                 let armWidth = this.width * 0.8;
                 let armTopY = this.y + this.height * 0.3;
                 quad(
                     this.x, this.y + this.height, // Bottom left
                     this.x + armWidth, this.y + this.height, // Bottom right
                     this.x + armWidth * 1.2, armTopY, // Top right (slightly offset)
                     this.x + armWidth * 0.2, armTopY // Top left (slightly offset)
                 );

                 // Hand part
                 fill(this.visuals.color);
                 stroke(50);
                 strokeWeight(1);
                 ellipse(this.x + armWidth * 0.7, armTopY, this.width * 0.9, this.height * 0.5); // Simple oval for hand

            }

            // // Draw original collision box for debugging (optional)
            // noFill();
            // stroke(255, 0, 0);
            // strokeWeight(1);
            // rect(this.x, this.y, this.width, this.height);

            pop(); // Restore styles
        },

        update: function() {
            this.x -= this.speed;
        }
        // Collision with player still uses player.collidesWithRect(this) with this.x,y,width,height
    });
}

// --- NEW: Hazard Object (Bird) ---
function createHazard() {
    let hazardSize = 20 * scaleFactor; // Size of the hazard
    let minHazardY = 50; // Minimum spawn height from top
    let maxHazardY = height * 0.5 - hazardSize; // Max spawn height (above basketballs)
    let randomY = random(minHazardY, maxHazardY);

    hazards.push({
        x: width + hazardSize,
        y: randomY,
        size: hazardSize,
        // Define hitbox dimensions (can be different from visual size)
        hitboxWidth: hazardSize * 1.5, // Wider V shape
        hitboxHeight: hazardSize * 0.8,
        speed: gameSpeed * 1.1, // Maybe make them slightly faster?

        show: function() {
            push();
            translate(this.x, this.y);
            fill(40, 40, 40); // Darker grey/black
            stroke(0);
            strokeWeight(1);
            // Slightly more bird-like shape
            beginShape();
            vertex(0, -this.size * 0.1); // Head point slightly up
            vertex(-this.size / 1.8, this.size / 2.2); // Wing back point
            vertex(0, this.size / 4); // Tail center point
            vertex(this.size / 1.8, this.size / 2.2); // Wing front point
            endShape(CLOSE);

            // Simple eye (optional)
            fill(255, 0, 0); // Red eye
            noStroke();
            ellipse(-this.size * 0.1, 0, 3, 3);
            pop();

            // Optional: Draw hitbox for debugging
            // noFill();
            // stroke(255, 0, 0);
            // rect(this.x - this.hitboxWidth / 2, this.y, this.hitboxWidth, this.hitboxHeight);
        },

        update: function() {
            this.x -= this.speed;
        },

        // Use AABB collision check for the defined hitbox
        collidesWith: function(playerRect) {
            // Calculate hazard's bounding box (centered horizontally, starts at y)
            let hazardLeft = this.x - this.hitboxWidth / 2;
            let hazardRight = this.x + this.hitboxWidth / 2;
            let hazardTop = this.y;
            let hazardBottom = this.y + this.hitboxHeight;

            // Player's bounding box
            let playerLeft = playerRect.x;
            let playerRight = playerRect.x + playerRect.width;
            let playerTop = playerRect.y;
            let playerBottom = playerRect.y + playerRect.height;

            // Check for overlap
            return (
                playerLeft < hazardRight &&
                playerRight > hazardLeft &&
                playerTop < hazardBottom &&
                playerBottom > hazardTop
            );
        }
    });
}

// --- NEW: Helper function to calculate score needed to reach a level ---
function calculateScoreForLevel(level) {
    if (level <= 1) return 0; // Level 1 requires 0 score
    let lMinusOne = level - 1;
    // Formula: 10*(L-1) + 5 * (L-1)*L / 2
    // Score threshold to REACH level L
    return 10 * lMinusOne + 5 * (lMinusOne * level) / 2;
}

// --- NEW: Power-up Object ---
function createPowerup(x, y, type) {
    let powerupSize = 25 * scaleFactor;
    powerups.push({
        x: x,
        y: y,
        size: powerupSize,
        type: type, // e.g., 'invincibility'
        speed: gameSpeed * 0.8, // Maybe make them move slightly slower?

        show: function() {
            push(); // Isolate drawing styles
            translate(this.x, this.y);
            if (this.type === 'invincibility') {
                fill(255, 230, 0); // Bright Yellow
                stroke(255, 150, 0); // Orange outline
                strokeWeight(1.5);
                // Simple star shape (same as before)
                let angle = TWO_PI / 5;
                let halfAngle = angle / 2.0;
                beginShape();
                for (let a = -PI/2; a < TWO_PI - PI/2; a += angle) {
                    let sx = cos(a) * this.size / 2;
                    let sy = sin(a) * this.size / 2;
                    vertex(sx, sy);
                    sx = cos(a + halfAngle) * this.size / 4; // Inner point
                    sy = sin(a + halfAngle) * this.size / 4;
                    vertex(sx, sy);
                }
                endShape(CLOSE);
            }
            // Add visual representations for other power-up types here later
            pop();
        },

        update: function() {
            this.x -= this.speed;
        },

        // Basic circle collision check (could be improved)
        collidesWith: function(playerRect) {
            let d = dist(this.x, this.y, playerRect.x + playerRect.width / 2, playerRect.y + playerRect.height / 2);
            return d < (this.size / 2 + playerRect.width / 2); // Approximate
        },

        activateEffect: function() {
            if (this.type === 'invincibility') {
                isInvincible = true;
                invincibilityTimer += INVINCIBILITY_DURATION;
                // Optional: Play power-up sound
            }
            // Add effect activation for other types here later
        }
    });
}

// --- NEW: Score Popup Function ---
function createScorePopup(x, y) {
    scorePopups.push({
        x: x,
        y: y,
        text: "+1",
        alpha: 255, // Start fully opaque
        life: 60 // Lifespan in frames (1 second at 60fps)
    });
}

// --- NEW: Level Up Effect Function ---
function createLevelUpEffect() {
    // Create a "LEVEL UP!" popup
    scorePopups.push({
        x: width / 2,
        y: height / 2,
        text: "LEVEL " + difficultyLevel + "!",
        alpha: 255, // Start fully opaque
        life: 90, // Longer life for level up notification
        size: 30 * scaleFactor // Larger text
    });
    
    // Update the score popup display code to handle the size property
    // In the scorePopups update loop:
    /* 
    Push this change to the score popup drawing code in the draw function:
    */
}

// --- NEW: Cloud Object ---
function createCloud() {
    let cloudY = random(height * 0.1, height * 0.4); // Spawn in upper part of sky
    let cloudBaseSize = random(40, 80) * scaleFactor;
    let cloudSpeed = gameSpeed * random(0.15, 0.3); // Slower than game speed
    let numPuffs = floor(random(3, 6)); // 3 to 5 puffs per cloud
    let puffData = [];

    // Generate relative positions and sizes for the cloud puffs
    for (let i = 0; i < numPuffs; i++) {
        puffData.push({
            // Offset relative to the cloud's main x, y
            offsetX: random(-cloudBaseSize * 0.6, cloudBaseSize * 0.6),
            offsetY: random(-cloudBaseSize * 0.2, cloudBaseSize * 0.2),
            // Size of this specific puff
            sizeX: random(cloudBaseSize * 0.5, cloudBaseSize * 0.9),
            sizeY: random(cloudBaseSize * 0.4, cloudBaseSize * 0.7)
        });
    }

    clouds.push({
        x: width + cloudBaseSize, // Start off-screen right
        y: cloudY,
        baseSize: cloudBaseSize, // For off-screen check
        speed: cloudSpeed,
        puffs: puffData,

        show: function() {
            push();
            fill(255, 255, 255, 200); // White, semi-transparent
            noStroke();
            // Draw each puff relative to the cloud's center
            for (let puff of this.puffs) {
                ellipse(this.x + puff.offsetX, this.y + puff.offsetY, puff.sizeX, puff.sizeY);
            }
            pop();
        },

        update: function() {
            this.x -= this.speed;
            // Return true if cloud is off-screen left
            return this.x < -this.baseSize * 1.5; // A bit of margin
        }
    });
}

// --- p5.js Core Functions ---

// Optional: Preload assets like sounds or images
// let jumpSound, collectSound, gameOverSound;
// function preload() {
//     soundFormats('mp3', 'ogg'); // Specify sound formats
//     jumpSound = loadSound('assets/jump.mp3'); // Replace with your sound file path
//     collectSound = loadSound('assets/collect.mp3');
//     gameOverSound = loadSound('assets/gameover.mp3');
// }

function setup() {
    // Calculate scale factor based on window width, but with a maximum
    // to ensure UI elements don't get cut off
    let maxScaleFactor = min(windowWidth / baseWidth, windowHeight / baseHeight, 1.5); 
    scaleFactor = min(windowWidth / baseWidth, windowHeight / baseHeight, maxScaleFactor);
    
    // Create responsive canvas
    let canvas = createCanvas(baseWidth * scaleFactor, baseHeight * scaleFactor);
    canvas.parent('canvas-container');

    // Check if device is mobile
    isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Adjust padding if on desktop to ensure visibility
    if (!isMobileDevice) {
        let canvasContainer = document.getElementById('canvas-container');
        canvasContainer.style.margin = '20px auto';
    }

    // Text settings
    textAlign(CENTER, CENTER);
    textFont('monospace');
    
    // Scale all measurements
    groundHeight = 50 * scaleFactor;
    gravity = 0.5 * scaleFactor;

    // Call resetGame() to initialize variables
    resetGame();

    // Update control instructions based on device
    if (isMobileDevice) {
        document.getElementById('mobile-controls').style.display = 'inline';
        document.getElementById('desktop-controls').style.display = 'none';
    } else {
        document.getElementById('mobile-controls').style.display = 'none';
        document.getElementById('desktop-controls').style.display = 'inline';
    }
}

// Add window resize handler
function windowResized() {
    // Recalculate scale factor
    let maxScaleFactor = min(windowWidth / baseWidth, windowHeight / baseHeight, 1.5);
    scaleFactor = min(windowWidth / baseWidth, windowHeight / baseHeight, maxScaleFactor);
    
    // Resize canvas
    resizeCanvas(baseWidth * scaleFactor, baseHeight * scaleFactor);
    
    // Adjust ground height and other scaled values
    groundHeight = 50 * scaleFactor;
    gravity = 0.5 * scaleFactor;
    
    // Update player position and size
    if (player) {
        player.width = 40 * scaleFactor;
        player.height = 60 * scaleFactor;
        player.lift = -13 * scaleFactor;
        // Keep player on ground
        player.y = height - groundHeight - player.height;
    }
}

// --- NEW: Reset Game Function ---s
function resetGame() {
    score = 0;
    basketballs = [];
    obstacles = [];
    scorePopups = [];
    powerups = [];
    hazards = []; // Clear hazards array
    courtFeatures = []; // Clear court features
    clouds = []; // <<-- Clear clouds array

    gameSpeed = 4 * scaleFactor; // Apply scale factor on reset
    spawnRate = 90; // Reset base spawn rate

    // Reset power-up states
    isInvincible = false;
    invincibilityTimer = 0;
    // Reset other power-up states here later

    // Reset difficulty
    difficultyLevel = 1;
    nextLevelScore = calculateScoreForLevel(difficultyLevel + 1); // Calculate score needed for Level 2

    // Re-create the player object to reset its position and velocity
    setupPlayer();

    // Add a couple of initial clouds
    for (let i = 0; i < 3; i++) {
        createCloud();
        // Offset initial positions so they don't all start together
        if (clouds.length > 0) {
           clouds[clouds.length-1].x = random(width * 0.1, width * 1.5); 
           clouds[clouds.length-1].y = random(height * 0.1, height * 0.4);
        }
    }


    gameState = 'start'; // <<-- ADD THIS to go to the start screen first
    loop(); // Ensure the draw loop is running if it was stopped
}

// --- NEW: Game Over Function ---
function triggerGameOver() {
    gameState = 'gameOver';
     // NEW: Play game over sound (optional)
     // if (gameOverSound && gameOverSound.isLoaded()) { gameOverSound.play(); }
    noLoop(); // Stop the draw loop to freeze the game
}


function draw() {
    background(100, 180, 255); // Slightly different Sky blue

    // --- Update & Draw Clouds (Draw them first!) --- << NEW SECTION
    // Add a small chance to spawn a new cloud during gameplay
    if (gameState === 'playing' && random(1) < 0.015 && clouds.length < 7) { // Low chance, limit number
         createCloud();
    }

    for (let i = clouds.length - 1; i >= 0; i--) {
        let c = clouds[i];
        // Update speed based on gameSpeed, but keep it slow
        c.speed = gameSpeed * random(0.15, 0.3); 
        c.show(); // Draw the cloud
        if (c.update()) { // Update returns true if off-screen
            clouds.splice(i, 1); // Remove it
        }
    }
    // --- End Clouds ---


    // Draw ground - change to look like pavement/court
    fill(100, 105, 110); // Grey pavement color
    noStroke();
    rect(0, height - groundHeight, width, groundHeight);
     // Optional: Add court line
     stroke(255); // White line
     strokeWeight(3);
     line(0, height - groundHeight, width, height - groundHeight);
     noStroke();

    // Scale text sizes
    textSize(20 * scaleFactor);
    // For game over screen
    textSize(48 * scaleFactor);
    textSize(24 * scaleFactor);
    textSize(18 * scaleFactor);

    // --- Game State Logic ---
    if (gameState === 'playing') {
        // --- Update Power-up Effects ---
        if (isInvincible) {
            invincibilityTimer--;
            if (invincibilityTimer <= 0) {
                isInvincible = false;
            }
        }
        // Add timers for other power-ups here

        // --- Player Logic ---
        player.show();
        player.update();

        // --- Spawning Logic ---
        if (frameCount % floor(spawnRate) === 0) {
            let r = random(1);
            let spawnType = 'none';
            let cumulativeChance = 0;

            // Determine spawn type based on cumulative chances
            cumulativeChance += powerupSpawnChance;
            if (r < cumulativeChance) {
                spawnType = 'powerup';
            } else {
                cumulativeChance += hazardSpawnChance; // Add hazard chance
                if (r < cumulativeChance) {
                    spawnType = 'hazard';
                } else {
                    cumulativeChance += obstacleSpawnChance;
                    if (r < cumulativeChance) {
                        spawnType = 'obstacle';
                    } else if (r > cumulativeChance + 0.1) { // Gap ensures some frames have no spawn
                        spawnType = 'basketball';
                    }
                }
            }

            // Add a small chance to spawn a court feature too
            if (random(1) < 0.08 && courtFeatures.length < 3) { // e.g., 8% chance, limit to 3 features max
                let lastFeatureX = courtFeatures.length > 0 ? courtFeatures[courtFeatures.length-1].x : -Infinity;
                // Only spawn if the last one is sufficiently far away
                if (width - lastFeatureX > width * 0.4) { 
                    createCourtFeature();
                }
            }

            // Check spacing before spawning (include hazards)
            let lastBallX = basketballs.length > 0 ? basketballs[basketballs.length - 1].x : -Infinity;
            let lastObsX = obstacles.length > 0 ? obstacles[obstacles.length - 1].x : -Infinity;
            let lastPowerupX = powerups.length > 0 ? powerups[powerups.length - 1].x : -Infinity;
            let lastHazardX = hazards.length > 0 ? hazards[hazards.length - 1].x : -Infinity; // Check last hazard X
            let lastItemX = max(lastBallX, lastObsX, lastPowerupX, lastHazardX); // Include hazards
            
            // NEW: Adjust safe spawn distance based on level (subtle)
            let safeSpawnDist = width * (0.2 - (difficultyLevel -1) * 0.005); // Decrease slightly per level
            safeSpawnDist = max(safeSpawnDist, width * 0.1); // Ensure minimum distance

            if (width - lastItemX > safeSpawnDist) {
                 let spawnY = random(height * 0.4, height - groundHeight - 60); // Default Y
                 
                 // NEW: Max items scale with difficulty
                 let maxPowerups = 1; // Keep powerups rare
                 let maxHazards = min(2 + floor(difficultyLevel / 2), 5); // Increase max hazards with level, cap at 5
                 let maxObstacles = min(3 + difficultyLevel, 8);      // Increase max obstacles with level, cap at 8

                 if (spawnType === 'powerup' && powerups.length < maxPowerups) {
                    createPowerup(width + 30, spawnY, 'invincibility');
                 } else if (spawnType === 'hazard' && hazards.length < maxHazards) {
                    createHazard(); // Uses its own Y calculation
                 } else if (spawnType === 'obstacle' && obstacles.length < maxObstacles) {
                    createObstacle(); // Uses its own Y calculation
                 } else if (spawnType === 'basketball') {
                    createBasketball(); // Uses its own Y calculation
                 }
            }

            // --- Difficulty Increase (Time-based) ---
            if (spawnRate > MIN_SPAWN_RATE) {
                spawnRate -= 0.2; // Decrease time between spawns
                spawnRate = max(spawnRate, MIN_SPAWN_RATE); // Ensure it doesn't go below min
            }
            if (gameSpeed < MAX_GAME_SPEED) {
                gameSpeed += 0.02; // Increase speed
                gameSpeed = min(gameSpeed, MAX_GAME_SPEED); // Ensure it doesn't exceed max
            }
            
            // --- Difficulty Increase (Score/Level-based) ---
            if (score >= nextLevelScore && difficultyLevel < MAX_DIFFICULTY_LEVEL) {
                difficultyLevel++;
                // Calculate the score needed to reach the *new* next level
                nextLevelScore = calculateScoreForLevel(difficultyLevel + 1);
                createLevelUpEffect();
            }
        }

        // --- Update & Draw Court Features ---
        for (let i = courtFeatures.length - 1; i >= 0; i--) {
            let cf = courtFeatures[i];
            cf.speed = gameSpeed * 0.7; // Update speed in case gameSpeed changed
            cf.show(); // Draw the feature
            if (cf.update()) { // Update returns true if off-screen
                courtFeatures.splice(i, 1); // Remove it
            }
        }

        // --- Update & Draw Hazards ---
        for (let i = hazards.length - 1; i >= 0; i--) {
            let h = hazards[i];
            // NEW: Hazard speed increases slightly with level
            let hazardSpeedMultiplier = 1.1 + (difficultyLevel - 1) * 0.05; // Base 1.1x, +0.05x per level
            h.speed = gameSpeed * min(hazardSpeedMultiplier, 1.6); // Update speed dynamically, cap multiplier
            h.show(); // Draw the updated hazard look
            h.update();

            // Check collision with player ONLY if NOT invincible
            if (!isInvincible && h.collidesWith(player)) { // Use hazard's collision check
                triggerGameOver(); // End the game
                break; // Exit loop after game over
            }

            // Remove if off-screen
            if (h.x < -h.size) { // Use size for off-screen check
                hazards.splice(i, 1);
            }
        }

        // --- Update & Draw Powerups ---
        for (let i = powerups.length - 1; i >= 0; i--) {
            let p = powerups[i];
            p.speed = gameSpeed * 0.8; // Update speed if gameSpeed changes
            p.show(); // Draw the updated powerup look
            p.update();

            if (p.collidesWith(player)) {
                p.activateEffect();
                powerups.splice(i, 1); // Remove collected powerup
            } else if (p.x < -p.size) {
                powerups.splice(i, 1); // Remove if off-screen
            }
        }

        // --- Update & Draw Basketballs ---
        for (let i = basketballs.length - 1; i >= 0; i--) {
            let b = basketballs[i];
            b.speed = gameSpeed; // Update speed dynamically
            b.show(); // Draw the updated basketball look
            b.update();

            if (b.collidesWith(player)) {
                score++;
                basketballs.splice(i, 1);
            } else if (b.x < -b.size) {
                basketballs.splice(i, 1);
            }
        }

        // --- Update & Draw Obstacles ---
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let o = obstacles[i];
            o.speed = gameSpeed; // Update speed dynamically
            o.show(); // Draw the updated obstacle look
            o.update();

            // --- NEW: Modified Collision Logic ---
            if (player.collidesWithRect(o)) { // Check collision first
                // Check if it's a STOMP action
                let isFalling = player.velocityY > 0;
                // Check if player's feet are roughly aligned with the obstacle's top
                // and the player wasn't already overlapping too much vertically in the previous frame (basic check)
                let feetNearTop = (player.y + player.height) > o.y && (player.y + player.height) < (o.y + o.height * 0.5); 

                if (o.stompable && isFalling && feetNearTop && !isInvincible) {
                    // --- Stomp Successful! ---
                    obstacles.splice(i, 1); // Remove the stomped obstacle
                    score += 2; // Award points for stomping
                    createScorePopup(o.x + o.width / 2, o.y, "+2"); // Score popup
                    
                    // Give player a small bounce
                    player.velocityY = player.lift * 0.6; // Adjust bounce height as needed
                    player.onGround = false; // Player is airborne after bounce
                    player.canDoubleJump = true; // Allow double jump after stomp bounce

                    // Optional: Play stomp sound effect here
                    // if (stompSound && stompSound.isLoaded()) { stompSound.play(); }
                    
                    continue; // Skip the game over check for this iteration

                } else if (!isInvincible) {
                     // --- Normal Collision (Not a stomp or player invincible) ---
                     triggerGameOver(); // End the game
                     // Break immediately after game over
                     break; 
                }
            }
            // --- End Modified Collision Logic ---


            // Remove if off-screen
            if (o.x < -o.width) {
                obstacles.splice(i, 1);
            }
        }

         // --- Update & Draw Score Popups ---
         for (let i = scorePopups.length - 1; i >= 0; i--) {
            let p = scorePopups[i];
            p.y -= 1 * scaleFactor; // Scale movement slightly
            p.alpha -= 4; // Fade out
            p.life--;

            if (p.life <= 0) {
                scorePopups.splice(i, 1);
            } else {
                push(); // Save current drawing style
                fill(255, 255, 255, p.alpha); // White text, fading out
                // Use scaled size if available, otherwise default
                textSize( (p.size || 16 * scaleFactor) ); 
                textAlign(CENTER, CENTER);
                noStroke();
                text(p.text, p.x, p.y);
                pop(); // Restore drawing style
            }
        }


        // --- Draw Score and Level (Playing State) ---
        fill(255);
        stroke(0);
        strokeWeight(2 * scaleFactor); // Scale stroke weight
        textAlign(LEFT, TOP); // Reset alignment for score
        textSize(20 * scaleFactor); // Scale text size
        text("Score: " + score, 10 * scaleFactor, 10 * scaleFactor);
        // NEW: Show current level
        text("Level: " + difficultyLevel, 10 * scaleFactor, (10 + 25) * scaleFactor);
        // NEW: Show speed indicator
        text("Speed: " + gameSpeed.toFixed(1), 10 * scaleFactor, (10 + 50) * scaleFactor);
        noStroke();


    } else if (gameState === 'gameOver') {
        // --- Draw Game Over Screen ---
        fill(0, 0, 0, 150); // Semi-transparent black overlay
        rect(0, 0, width, height);

        fill(255); // White text
        stroke(0);
        strokeWeight(3 * scaleFactor); // Scale stroke
        textAlign(CENTER, CENTER);

        textSize(48 * scaleFactor); // Scale text
        text("GAME OVER", width / 2, height / 2 - 40 * scaleFactor); // Scale position

        textSize(24 * scaleFactor); // Scale text
        text("Final Score: " + score, width / 2, height / 2 + 10 * scaleFactor); // Scale position

        textSize(18 * scaleFactor); // Scale text
        if (isMobileDevice) {
            text("Tap to Restart", width / 2, height / 2 + 50 * scaleFactor); // Scale position
        } else {
            text("Press 'R' or SPACE to Restart", width / 2, height / 2 + 50 * scaleFactor); // Scale position
        }
        noStroke();

        // We use noLoop() in gameOver, so draw only runs once.
        // The game is effectively paused.
    }
     else if (gameState === 'start') {
         // --- Draw Start Screen ---
         fill(0, 0, 0, 150); // Dark overlay
         rect(0, 0, width, height);

         fill(255); // White text
         stroke(0);
         strokeWeight(3 * scaleFactor); // Scale stroke
         textAlign(CENTER, CENTER);

         textSize(36 * scaleFactor); // Scale text size
         text("Basketball Collector", width / 2, height / 2 - 40 * scaleFactor); // Scale position

         textSize(20 * scaleFactor); // Scale text size
         if (isMobileDevice) {
             text("Tap to Start!", width / 2, height / 2 + 20 * scaleFactor); // Scale position
         } else {
             text("Press SPACE, UP, W, or Click to Start!", width / 2, height / 2 + 20 * scaleFactor); // Scale position
         }

         noStroke();
         // Maybe draw the player stationary?
         if (player) { // Check if player exists
             player.show(); // Show the player character on the start screen
             // Keep player visually on the ground for the start screen
             player.y = height - groundHeight - player.height;
             player.velocityY = 0;
             player.onGround = true;
         }
    }
}

// --- Handle Input ---
function keyPressed() {
    if (gameState === 'playing') {
        if (key === ' ' || keyCode === UP_ARROW || keyCode === 87) { // Space, Up Arrow, or W
            player.jump();
            return false; // Prevent default
        }
    } else if (gameState === 'gameOver') {
        if (key === 'r' || key === 'R' || key === ' ' || keyCode === UP_ARROW) {
            resetGame(); // Restart the game (goes to start screen)
            return false; // Prevent default
        }
    } else if (gameState === 'start') {
        if (key === ' ' || keyCode === UP_ARROW || keyCode === 87) { // Space, Up Arrow, or W to start
            gameState = 'playing'; // <<-- Change state to playing
            return false; // Prevent default
        }
    }
    return true;
}

// Improve touchStarted function
function touchStarted() {
    if (gameState === 'playing') {
        player.jump();
    } else if (gameState === 'gameOver') { // Changed condition slightly
        resetGame(); // Reset to start screen
    } else if (gameState === 'start') { // <<-- ADD THIS BLOCK
        gameState = 'playing';         // Start the game on tap
    }
    return false; // Prevent default browser behavior
}

// Add mousePressed for desktop clicks
function mousePressed() {
    if (!isMobileDevice) { // Only handle mouse on non-mobile devices
        if (gameState === 'playing') {
            player.jump();
        } else if (gameState === 'gameOver') { // Changed condition slightly
            resetGame(); // Reset to start screen
        } else if (gameState === 'start') { // <<-- ADD THIS BLOCK
            gameState = 'playing';         // Start the game on click
        }
        return false;
    }
    return true;
}