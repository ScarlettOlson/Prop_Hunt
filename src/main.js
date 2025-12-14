import * as T from '../CS559-Three/build/three.module.js';
import { loadTextureSafely, createShineShader } from './load_texture.js';
import { Input } from './input_manager.js';
import { Interactable, Note, HingedDoor, SlidingDrawer, Paper, Lock, GiantEye } from './interactive.js';
import { createDirectionalLight, createPointLight } from './light.js';
import * as objects from './objects.js';


// Print Async Error messages to the console
window.addEventListener("error", e => {
  console.error("Global error:", e.error || e.message);
});

window.addEventListener("unhandledrejection", e => {
  console.error("Unhandled promise rejection:", e.reason);
});


/**
 * Core game configuration
 */
const CONFIG = {
  player: {
    height: 1.7,
    speedWalk: 2.0,
    speedRun: 3.8,
    turnSpeed: T.MathUtils.degToRad(110), // yaw/sec via keyboard
    jumpForce: 5.0, // upward velocity when jumping
    groundCheckDistance: 0.1, // distance to check for ground
    radius: 0.3, // collision radius for character
  },
  eye: {
    intervalMin: 30, // seconds
    intervalMax: 60,
    visibleDuration: 5, // seconds per peering
    sightDistance: 18,
    fov: T.MathUtils.degToRad(35),
  },
  interact: {
    distance: 5.0, // Increased interaction distance
  },
  world: {
    gravity: -15.0, // gravity acceleration
    floorY: 0,
  }
};

/**
 * Global DOM elements
 */
const dom = {
  noteCount: document.getElementById('noteCount'),
  codeDisplay: document.getElementById('codeDisplay'),
  objective: document.getElementById('objective'),
  fullModeCheckbox: document.getElementById('fullModeCheckbox'),
  overlay: document.getElementById('overlay'),
  message: document.getElementById('message'),
  restartBtn: document.getElementById('restartBtn'),
  up: document.getElementById('up'),
  down: document.getElementById('down'),
  left: document.getElementById('left'),
  right: document.getElementById('right'),
  interact: document.getElementById('interact'),
  run: document.getElementById('run'),
  jump: document.getElementById('jump'),
  notePopup: document.getElementById('notePopup'),
  noteText: document.getElementById('noteText'),
  closeNoteBtn: document.getElementById('closeNoteBtn'),
  body: document.getElementById('body'),
};



/**
 * Main Game
 */
class Game {
  constructor() {
    this.clock = new T.Clock();
    this.raycaster = new T.Raycaster();
    this.input = new Input(dom);
    this.collected = new Map(); // index -> value
    this.prototypeMode = true;

    // Setup Renderer with shadows enabled
    this.renderer = new T.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true; // Enable shadows
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    // Setup Scene and Camera
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x87CEEB);
    this.camera = new T.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
    this.camera.position.set(0, CONFIG.player.height, 0);
    
    // Create Ambient Lighting
    const ambient = new T.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambient);
    
    // Create sunlight
    const dirLight = createDirectionalLight(10, 15, 5, 0xffffff, 1.2)
    this.scene.add(dirLight);
    
    // Create ceiling lights as point lights
    const ceilingLight1 = createPointLight(0, 2.5, 0, 0xffffff, 1.0, 25);
    const ceilingLight2 = createPointLight(-6, 2.5, -6, 0xffffff, 0.8, 22);
    const ceilingLight3 = createPointLight(6, 2.5, -6, 0xffffff, 0.8, 22);
    this.scene.add(ceilingLight1);
    this.scene.add(ceilingLight2);
    this.scene.add(ceilingLight3);

    // Controls state
    this.yaw = 0;
    this.pitch = 0;
    this.runHeld = false;

    // Physics state
    this.velocity = new T.Vector3(0, 0, 0);
    this.isGrounded = false;
    this.groundObjects = []; // objects that can be stood on

    // World
    this.obstacles = []; // for line-of-sight blocking
    this.interactables = [];
    this.updateables = [];
    this.passwordPieces = new Map(); // passwordIndex -> passwordPiece (for correct ordering)

    // UI
    dom.fullModeCheckbox.addEventListener('change', () => {
      const wasPrototypeMode = this.prototypeMode;
      this.prototypeMode = !dom.fullModeCheckbox.checked;
      
      // Update note shaders without resetting world
      if (wasPrototypeMode !== this.prototypeMode) {
        const useShine = !this.prototypeMode; // Shine in full mode (not prototype)
        this.interactables.forEach(item => {
          if (item instanceof Note) {
            item.setShineShader(useShine);
          }
        });
      }
      
      // Only reset world if needed (for now, keep it simple and reset)
      this.resetWorld();
    });
    dom.restartBtn.addEventListener('click', () => {
      this.hideOverlay();
      this.resetWorld();
    });

    // Note popup close button
    dom.closeNoteBtn.addEventListener('click', () => {
      this.hideNotePopup();
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.resetWorld().catch(err => {
      console.error(err);
    });

    
    this.loop();
  }

  async resetWorld() {
    // Clear scene children except camera and lights
    for (let i = this.scene.children.length - 1; i >= 0; i--) {
      const obj = this.scene.children[i];
      if (obj.isLight || obj === this.camera) continue;
      this.scene.remove(obj);
    }
    this.interactables = [];
    this.updateables = [];
    this.obstacles = [];
    this.groundObjects = [];
    this.collected.clear();
    this.passwordPieces = new Map();
    this.yaw = 0;
    this.pitch = 0;
    this.velocity.set(0, 0, 0);
    this.isGrounded = false;
    this.camera.position.set(0, CONFIG.player.height + 1, 0);
    this.hideOverlay();
    this.hideNotePopup();
    dom.noteCount.textContent = '0';
    dom.codeDisplay.textContent = '_ _ _ _ _ _';
    dom.objective.textContent = 'Find 3 notes with password pieces to unlock the basement.';

    // Materials for house
    const floorMat      = await loadTextureSafely('textures/floor.jpg',      0x6b5b4f);
    const wallMat       = await loadTextureSafely('textures/wall.jpg',       0x8b7d6b);
    const ceilingMat    = await loadTextureSafely('textures/ceiling.jpg',    0x5a5a5a);
    const doorMat       = await loadTextureSafely('textures/door.jpg',       0x4a3a2a);
    const bookshelfMat  = await loadTextureSafely('textures/bookshelf.jpg',  0xFF00FF);
    const frameMat      = await loadTextureSafely('textures/frame.jpg',      0xFF00FF);
    const noteMat       = await loadTextureSafely('textures/note.jpg',       0xddddcc);
    const furnitureMat  = await loadTextureSafely('textures/furniture.jpg',  0x5a4a3a);
    const windowMat = new T.MeshStandardMaterial({ 
      color: 0x99bbee, 
      transparent: true, 
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.1
    });

    // House dimensions
    const houseWidth = 20;
    const houseDepth = 20;
    const houseHeight = 3;
    const wallThickness = 0.2;

    // Create house group
    const house = new T.Group();
    this.scene.add(house);

    // Build the basic pieces of a house
    const house_pieces = objects.createHouse(
      houseWidth, houseHeight, houseDepth, wallThickness,
      floorMat, wallMat, frameMat, doorMat, frameMat, windowMat
    );
    house.add(house_pieces.house);
    house_pieces.groundObjs.forEach(obj => { this.groundObjects.push(obj)});
    house_pieces.obstacles.forEach(obj => { this.obstacles.push(obj)});
    house_pieces.interactables.forEach(obj => {
      this.interactables.push(obj);
      this.updateables.push(obj);
    });
    
   

    
    // Add furniture to make it feel like a house
    // Bookshelf
    const bookshelf = objects.createBookShelf(2, 2, 2, 1, 2, 1, bookshelfMat);
    bookshelf.position.set(-houseWidth/2 + 1.5, 0, -houseDepth/2 + 1.5);
    const shelfBack = new T.Mesh(new T.BoxGeometry(0.1, 1.5, 0.8), furnitureMat);
    shelfBack.position.set(0, 0.75, 0);
    shelfBack.castShadow = true;
    shelfBack.receiveShadow = true;
    bookshelf.add(shelfBack);
    for (let i = 0; i < 4; i++) {
      const shelf = new T.Mesh(new T.BoxGeometry(0.8, 0.05, 0.8), furnitureMat);
      shelf.position.set(0, i * 0.4 + 0.2, 0);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      bookshelf.add(shelf);
    }
    house.add(bookshelf);
    bookshelf.traverse(child => { if (child.isMesh) this.obstacles.push(child); });

    // Table
    const table = new T.Group();
    table.position.set(houseWidth/2 - 2, 0, -houseDepth/2 + 2);
    const tableTop = new T.Mesh(new T.BoxGeometry(1.2, 0.05, 0.8), furnitureMat);
    tableTop.position.set(0, 0.4, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    table.add(tableTop);
    for (let i = 0; i < 4; i++) {
      const leg = new T.Mesh(new T.BoxGeometry(0.05, 0.4, 0.05), furnitureMat);
      leg.position.set((i % 2) * 1.1 - 0.55, 0.2, (i < 2 ? -0.35 : 0.35));
      leg.castShadow = true;
      leg.receiveShadow = true;
      table.add(leg);
    }
    house.add(table);
    table.traverse(child => { if (child.isMesh) this.obstacles.push(child); });

    // Couch/sofa
    const couch = new T.Group();
    couch.position.set(-2, 0, 2);
    const couchBase = new T.Mesh(new T.BoxGeometry(2.0, 0.4, 0.8), furnitureMat);
    couchBase.position.set(0, 0.2, 0);
    couchBase.castShadow = true;
    couchBase.receiveShadow = true;
    couch.add(couchBase);
    const couchBack = new T.Mesh(new T.BoxGeometry(2.0, 0.6, 0.1), furnitureMat);
    couchBack.position.set(0, 0.5, -0.35);
    couchBack.castShadow = true;
    couchBack.receiveShadow = true;
    couch.add(couchBack);
    house.add(couch);
    couch.traverse(child => { if (child.isMesh) this.obstacles.push(child); });

    // Small cabinet/dresser
    const cabinet = new T.Group();
    cabinet.position.set(3, 0, 3);
    const cabinetBody = new T.Mesh(new T.BoxGeometry(0.8, 0.6, 0.5), furnitureMat);
    cabinetBody.position.set(0, 0.3, 0);
    cabinetBody.castShadow = true;
    cabinetBody.receiveShadow = true;
    cabinet.add(cabinetBody);
    house.add(cabinet);
    cabinet.traverse(child => { if (child.isMesh) this.obstacles.push(child); });

    // Ground plane outside house only - positioned below interior floor to prevent clipping
    // Create separate ground segments around the house
    const groundMat = protoMat(0x4a4a4a);
    const groundThickness = 0.1;
    const groundY = CONFIG.world.floorY - groundThickness/2;
    
    // Front ground
    const frontGround = new T.Mesh(
      new T.PlaneGeometry(houseWidth + 4, 10),
      groundMat
    );
    frontGround.rotation.x = -Math.PI/2;
    frontGround.position.set(0, groundY, -houseDepth/2 - 5);
    frontGround.receiveShadow = true;
    this.scene.add(frontGround);
    this.groundObjects.push(frontGround);
    
    // Back ground
    const backGround = new T.Mesh(
      new T.PlaneGeometry(houseWidth + 4, 10),
      groundMat
    );
    backGround.rotation.x = -Math.PI/2;
    backGround.position.set(0, groundY, houseDepth/2 + 5);
    backGround.receiveShadow = true;
    this.scene.add(backGround);
    this.groundObjects.push(backGround);
    
    // Left ground
    const leftGround = new T.Mesh(
      new T.PlaneGeometry(10, houseDepth),
      groundMat
    );
    leftGround.rotation.x = -Math.PI/2;
    leftGround.position.set(-houseWidth/2 - 5, groundY, 0);
    leftGround.receiveShadow = true;
    this.scene.add(leftGround);
    this.groundObjects.push(leftGround);
    
    // Right ground
    const rightGround = new T.Mesh(
      new T.PlaneGeometry(10, houseDepth),
      groundMat
    );
    rightGround.rotation.x = -Math.PI/2;
    rightGround.position.set(houseWidth/2 + 5, groundY, 0);
    rightGround.receiveShadow = true;
    this.scene.add(rightGround);
    this.groundObjects.push(rightGround);
    
    // Add skybox with gradient effect
    const skyGeometry = new T.SphereGeometry(200, 32, 32);
    // Create gradient skybox shader
    const skyMaterial = new T.ShaderMaterial({
      uniforms: {
        topColor: { value: new T.Color(0x87CEEB) }, // Sky blue
        bottomColor: { value: new T.Color(0xE0E0E0) }, // Light gray
        offset: { value: 0.5 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          float f = pow(max(0.0, h + offset), exponent);
          gl_FragColor = vec4(mix(bottomColor, topColor, f), 1.0);
        }
      `,
      side: T.BackSide,
      depthWrite: false
    });
    const skybox = new T.Mesh(skyGeometry, skyMaterial);
    skybox.renderOrder = -1000; // Render first
    this.scene.add(skybox);

    // Place 3 notes in good hiding spots inside the house
    // passwordIndex determines the position in the final password (0 = first, 1 = second, 2 = third)
    const notes = [
      {
        passwordPiece: '12',
        passwordIndex: 0, // First position in password
        content: 'I found this note hidden behind the old bookshelf.\n\nPassword piece: 12',
        position: new T.Vector3(-4, CONFIG.player.height * 0.6, -3) // Left side of house
      },
      {
        passwordPiece: '34',
        passwordIndex: 1, // Second position in password
        content: 'This was tucked under a loose floorboard.\n\nPassword piece: 34',
        position: new T.Vector3(3, CONFIG.player.height * 0.5, 2) // Right side of house
      },
      {
        passwordPiece: '56',
        passwordIndex: 2, // Third position in password
        content: 'Hidden in a crack in the wall.\n\nPassword piece: 56',
        position: new T.Vector3(-2, CONFIG.player.height * 0.7, -4) // Front area
      }
    ];

    for (const noteData of notes) {
      const note = new Note({
        passwordPiece: noteData.passwordPiece,
        passwordIndex: noteData.passwordIndex,
        content: noteData.content,
        material: noteMat,
        position: noteData.position,
        useShineShader: !this.prototypeMode // Use shine shader in full mode
      });
      this.scene.add(note);
      this.interactables.push(note);
      this.updateables.push(note); // Add to updateables for animation
    }
  }

  checkGrounded() {
    // Raycast downward from feet position to check if on ground
    const raycaster = new T.Raycaster();
    const feetPos = new T.Vector3(
      this.camera.position.x,
      this.camera.position.y - CONFIG.player.height + 0.05, // Feet position + small offset
      this.camera.position.z
    );
    raycaster.set(feetPos, new T.Vector3(0, -1, 0));
    raycaster.far = CONFIG.player.groundCheckDistance + 0.15;
    
    const hits = raycaster.intersectObjects(this.groundObjects, true);
    if (hits.length > 0) {
      const hit = hits[0];
      const distanceToGround = hit.distance - 0.05; // Subtract the offset
      return distanceToGround <= CONFIG.player.groundCheckDistance;
    }
    return false;
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.1); // Cap delta time for stability

    // Update interactables
    for (const u of this.updateables) u.update(dt);

    // Player movement
    const speed = this.input.running ? CONFIG.player.speedRun : CONFIG.player.speedWalk;

    // Turn from mouse drag
    this.yaw += this.input.deltaYaw;
    this.pitch += this.input.deltaPitch;
    this.input.deltaYaw = 0;
    this.input.deltaPitch = 0;

    // Clamp pitch to prevent flipping
    this.pitch = T.MathUtils.clamp(this.pitch, -Math.PI/2, Math.PI/2);

    // Turn from keyboard (Q and arrow keys only - E is reserved for interaction)
    const turningLeft = this.input.keys.has('arrowleft') || this.input.keys.has('q');
    const turningRight = this.input.keys.has('arrowright');
    if (turningLeft) this.yaw += CONFIG.player.turnSpeed * dt;
    if (turningRight) this.yaw -= CONFIG.player.turnSpeed * dt;

    // Update camera rotation (yaw and pitch) - do this BEFORE interaction check
    const quat = new T.Quaternion();
    quat.setFromEuler(new T.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    this.camera.quaternion.copy(quat);

    // Check if grounded
    this.isGrounded = this.checkGrounded();

    // Handle jumping
    if (this.input.consumeJump() && this.isGrounded) {
      this.velocity.y = CONFIG.player.jumpForce;
      this.isGrounded = false;
    }

    // Apply gravity
    if (!this.isGrounded) {
      this.velocity.y += CONFIG.world.gravity * dt;
    } else {
      // Reset vertical velocity when grounded
      if (this.velocity.y < 0) {
        this.velocity.y = 0;
      }
    }

    // Calculate forward/right vectors AFTER camera rotation is updated
    const forward = new T.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);
    const right = new T.Vector3(1,0,0).applyQuaternion(this.camera.quaternion);
    forward.y = 0; // Remove vertical component
    right.y = 0;
    forward.normalize();
    right.normalize();

    // Interaction check (E key or interact button)
    // Use distance-based check instead of raycast for more reliable interaction
    let interactionHandled = false;
    if (this.interactables.length > 0) {
      const interact = this.input.consumeInteract();
      if (interact) {
        // Check distance to all interactables
        const playerPos = this.camera.position;
        let closestNote = null;
        let closestDistance = Infinity;
        
        for (const interactable of this.interactables) {
          if (interactable instanceof Note && !interactable.collected) {
            const distance = playerPos.distanceTo(interactable.position);
            if (distance < CONFIG.interact.distance && distance < closestDistance) {
              closestDistance = distance;
              closestNote = interactable;
            }
          }
        }
        
        if (closestNote) {
          interactionHandled = true;
          // Show note popup
          this.showNotePopup(closestNote);
            // Collect password piece if not already collected
            if (!closestNote.collected) {
              closestNote.collected = true;
              // Store password piece at its fixed index position
              this.passwordPieces.set(closestNote.passwordIndex, closestNote.passwordPiece);
              // Hide the note visually (make it transparent)
              closestNote.traverse(child => {
                if (child.isMesh && child.material) {
                  child.material.transparent = true;
                  child.material.opacity = 0.3;
                }
              });
              // Update UI - display password in correct order (indices 0, 1, 2)
              dom.noteCount.textContent = this.passwordPieces.size;
              // Build password string in correct order
              const passwordArray = [];
              for (let i = 0; i < 3; i++) {
                if (this.passwordPieces.has(i)) {
                  passwordArray.push(this.passwordPieces.get(i));
                } else {
                  passwordArray.push('__');
                }
              }
              // Join pieces and then split into individual characters for display
              const password = passwordArray.join('');
              dom.codeDisplay.textContent = password.split('').join(' ');
              if (this.passwordPieces.size === 3) {
                dom.objective.textContent = 'Return to the basement door to unlock it.';
              } else {
                dom.objective.textContent = `Find ${3 - this.passwordPieces.size} more note(s) to unlock the basement.`;
              }
            }
        } else {
          // Try raycast for other interactables
          this.raycaster.set(this.camera.position, forward);
          this.raycaster.far = CONFIG.interact.distance;
          const candidates = this.raycaster.intersectObjects(this.interactables, true);
          if (candidates.length > 0 && candidates[0].distance < CONFIG.interact.distance) {
            const hit = candidates[0].object;
            // Find parent interactable
            let node = hit;
            while (node && !node.isInteractable) node = node.parent;
            if (node && node.isInteractable) {
              interactionHandled = true;
              if (node.onInteract) {
                node.onInteract();
              }
            }
          }
        }
      }
    }


    const horizontalVel = new T.Vector3();
    if (this.input.keys.has('w') || this.input.keys.has('arrowup')) horizontalVel.add(forward);
    if (this.input.keys.has('s') || this.input.keys.has('arrowdown')) horizontalVel.add(forward.clone().multiplyScalar(-1));
    if (this.input.keys.has('a')) horizontalVel.add(right.clone().multiplyScalar(-1));
    if (this.input.keys.has('d')) horizontalVel.add(right);

    // Apply horizontal velocity
    if (horizontalVel.lengthSq() > 0) {
      horizontalVel.normalize().multiplyScalar(speed);
      this.velocity.x = horizontalVel.x;
      this.velocity.z = horizontalVel.z;
    } else {
      // Apply friction when not moving
      this.velocity.x *= 0.8;
      this.velocity.z *= 0.8;
    }

    // Calculate new position
    const movement = this.velocity.clone().multiplyScalar(dt);
    let newPos = this.camera.position.clone().add(movement);

    // Horizontal collision detection
    const horizontalMovement = new T.Vector3(movement.x, 0, movement.z);
    if (horizontalMovement.lengthSq() > 0 && this.obstacles.length > 0) {
      const raycaster = new T.Raycaster();
      raycaster.set(this.camera.position, horizontalMovement.clone().normalize());
      raycaster.far = horizontalMovement.length() + CONFIG.player.radius;
      const hits = raycaster.intersectObjects(this.obstacles, true);
      if (hits.length > 0 && hits[0].distance < horizontalMovement.length() + CONFIG.player.radius) {
        // Collision detected, don't move horizontally
        newPos.x = this.camera.position.x;
        newPos.z = this.camera.position.z;
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    }

    // Vertical collision and ground detection
    if (movement.y < 0) {
      // Moving down - check for ground
      const feetY = this.camera.position.y - CONFIG.player.height;
      const raycaster = new T.Raycaster();
      raycaster.set(new T.Vector3(newPos.x, feetY + 0.1, newPos.z), new T.Vector3(0, -1, 0));
      raycaster.far = Math.abs(movement.y) + 0.2;
      const hits = raycaster.intersectObjects(this.groundObjects, true);
      if (hits.length > 0) {
        const groundY = hits[0].point.y + CONFIG.player.height;
        if (newPos.y <= groundY) {
          newPos.y = groundY;
          this.velocity.y = 0;
          this.isGrounded = true;
        }
      } else {
        // No ground found, keep falling
        this.isGrounded = false;
      }
    } else {
      // Moving up - check for ceiling collision
      if (this.obstacles.length > 0) {
        const headY = this.camera.position.y;
        const raycaster = new T.Raycaster();
        raycaster.set(new T.Vector3(newPos.x, headY, newPos.z), new T.Vector3(0, 1, 0));
        raycaster.far = movement.y + 0.2;
        const hits = raycaster.intersectObjects(this.obstacles, true);
        if (hits.length > 0 && hits[0].distance < movement.y + 0.2) {
          newPos.y = this.camera.position.y;
          this.velocity.y = 0;
        }
      }
    }

    // Apply position
    this.camera.position.copy(newPos);

    this.renderer.render(this.scene, this.camera);
  }

  showOverlay(text) {
    dom.message.textContent = text;
    dom.overlay.classList.add('show');
  }
  hideOverlay() {
    dom.overlay.classList.remove('show');
  }

  showNotePopup(note) {
    dom.noteText.textContent = note.content;
    dom.notePopup.classList.add('show');
  }

  hideNotePopup() {
    dom.notePopup.classList.remove('show');
  }
}

// Boot
new Game();
