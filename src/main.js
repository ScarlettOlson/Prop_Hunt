import * as THREE from '../CS559-Three/build/three.module.js';
import { GLTFLoader } from '../CS559-Three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Core game configuration
 */
const CONFIG = {
  player: {
    height: 1.7,
    speedWalk: 2.0,
    speedRun: 3.8,
    turnSpeed: THREE.MathUtils.degToRad(110), // yaw/sec via keyboard
    jumpForce: 5.0, // upward velocity when jumping
    groundCheckDistance: 0.1, // distance to check for ground
    radius: 0.3, // collision radius for character
  },
  eye: {
    intervalMin: 30, // seconds
    intervalMax: 60,
    visibleDuration: 5, // seconds per peering
    sightDistance: 18,
    fov: THREE.MathUtils.degToRad(35),
  },
  interact: {
    distance: 2.0,
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
  paperCount: document.getElementById('paperCount'),
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
};

/**
 * Utility: tries to load a texture, falls back to a procedural if missing
 */
function loadTextureOrFallback(url, fallbackKind = 'checker') {
  const loader = new THREE.TextureLoader();
  return new Promise((resolve) => {
    loader.load(url, tex => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      resolve(tex);
    }, undefined, () => {
      // Fallback procedural texture
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#666'; ctx.fillRect(0,0,size,size);
      if (fallbackKind === 'checker') {
        for (let y=0; y<8; y++) for (let x=0; x<8; x++) {
          if ((x+y)%2===0) { ctx.fillStyle = '#777'; } else { ctx.fillStyle = '#555'; }
          ctx.fillRect(x*8, y*8, 8, 8);
        }
      } else if (fallbackKind === 'noise') {
        const imgData = ctx.createImageData(size, size);
        for (let i=0;i<imgData.data.length;i+=4){
          const v = 120 + Math.floor(Math.random()*60);
          imgData.data[i]=v; imgData.data[i+1]=v; imgData.data[i+2]=v; imgData.data[i+3]=255;
        }
        ctx.putImageData(imgData,0,0);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      resolve(tex);
    });
  });
}

/**
 * Basic input manager
 */
class Input {
  constructor() {
    this.keys = new Set();
    this.running = false;
    this.interactRequested = false;
    this.jumpRequested = false;

    // Keyboard
    window.addEventListener('keydown', e => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === 'Shift') this.running = true;
      if (e.key.toLowerCase() === 'e') this.interactRequested = true;
      if (e.key === ' ' || e.key.toLowerCase() === ' ') {
        e.preventDefault(); // Prevent page scroll
        this.jumpRequested = true;
      }
    });
    window.addEventListener('keyup', e => {
      this.keys.delete(e.key.toLowerCase());
      if (e.key === 'Shift') this.running = false;
    });

    // Mobile buttons - support both touch and mouse events
    const press = (k) => this.keys.add(k);
    const release = (k) => this.keys.delete(k);
    
    // Up button
    const upPress = (e) => { e.preventDefault(); press('w'); };
    const upRelease = () => release('w');
    dom.up.addEventListener('touchstart', upPress, {passive:false});
    dom.up.addEventListener('touchend', upRelease);
    dom.up.addEventListener('mousedown', upPress);
    dom.up.addEventListener('mouseup', upRelease);
    dom.up.addEventListener('mouseleave', upRelease);
    
    // Down button
    const downPress = (e) => { e.preventDefault(); press('s'); };
    const downRelease = () => release('s');
    dom.down.addEventListener('touchstart', downPress, {passive:false});
    dom.down.addEventListener('touchend', downRelease);
    dom.down.addEventListener('mousedown', downPress);
    dom.down.addEventListener('mouseup', downRelease);
    dom.down.addEventListener('mouseleave', downRelease);
    
    // Left button
    const leftPress = (e) => { e.preventDefault(); press('a'); };
    const leftRelease = () => release('a');
    dom.left.addEventListener('touchstart', leftPress, {passive:false});
    dom.left.addEventListener('touchend', leftRelease);
    dom.left.addEventListener('mousedown', leftPress);
    dom.left.addEventListener('mouseup', leftRelease);
    dom.left.addEventListener('mouseleave', leftRelease);
    
    // Right button
    const rightPress = (e) => { e.preventDefault(); press('d'); };
    const rightRelease = () => release('d');
    dom.right.addEventListener('touchstart', rightPress, {passive:false});
    dom.right.addEventListener('touchend', rightRelease);
    dom.right.addEventListener('mousedown', rightPress);
    dom.right.addEventListener('mouseup', rightRelease);
    dom.right.addEventListener('mouseleave', rightRelease);
    
    // Run button
    const runPress = (e) => { e.preventDefault(); this.running = true; };
    const runRelease = () => { this.running = false; };
    dom.run.addEventListener('touchstart', runPress, {passive:false});
    dom.run.addEventListener('touchend', runRelease);
    dom.run.addEventListener('mousedown', runPress);
    dom.run.addEventListener('mouseup', runRelease);
    dom.run.addEventListener('mouseleave', runRelease);
    
    // Interact button
    const interactPress = (e) => { e.preventDefault(); this.interactRequested = true; };
    dom.interact.addEventListener('touchstart', interactPress, {passive:false});
    dom.interact.addEventListener('click', interactPress);
    dom.interact.addEventListener('mousedown', interactPress);
    
    // Jump button
    const jumpPress = (e) => { e.preventDefault(); this.jumpRequested = true; };
    dom.jump.addEventListener('touchstart', jumpPress, {passive:false});
    dom.jump.addEventListener('click', jumpPress);
    dom.jump.addEventListener('mousedown', jumpPress);

    // Mouse look (drag-to-look with pitch and yaw)
    this.mouseDown = false;
    this.deltaYaw = 0;
    this.deltaPitch = 0;
    window.addEventListener('mousedown', () => { this.mouseDown = true; });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    window.addEventListener('mousemove', e => {
      if (!this.mouseDown) return;
      this.deltaYaw += e.movementX * 0.0025;
      this.deltaPitch += e.movementY * 0.0025;
    });
    // Touch look
    let lastX = null;
    let lastY = null;
    window.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    }, {passive:true});
    window.addEventListener('touchmove', e => {
      if (e.touches.length === 1 && lastX !== null && lastY !== null) {
        const x = e.touches[0].clientX;
        const y = e.touches[0].clientY;
        this.deltaYaw += (x - lastX) * 0.003;
        this.deltaPitch += (y - lastY) * 0.003;
        lastX = x;
        lastY = y;
      }
    }, {passive:true});
    window.addEventListener('touchend', () => { lastX = null; lastY = null; });
  }

  consumeInteract() {
    const v = this.interactRequested;
    this.interactRequested = false;
    return v;
  }

  consumeJump() {
    const v = this.jumpRequested;
    this.jumpRequested = false;
    return v;
  }
}

/**
 * Interactable base
 */
class Interactable extends THREE.Group {
  constructor({ label, onInteract, hint = 'Interact (E)' }) {
    super();
    this.isInteractable = true;
    this.label = label || 'Interactable';
    this.onInteract = onInteract || (() => {});
    this.hint = hint;
  }
}

/**
 * Drawer/Cupboard with open/close
 */
class HingedDoor extends Interactable {
  constructor({ width=0.6, height=0.8, depth=0.02, openAngle=90, pivotSide='left', material }) {
    super({
      label: 'Door',
      hint: 'Open/Close (E)',
    });
    this.openAngle = THREE.MathUtils.degToRad(openAngle);
    this.open = false;

    const geom = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geom, material);
    mesh.castShadow = true; mesh.receiveShadow = true;

    // pivot
    const pivot = new THREE.Object3D();
    this.add(pivot);
    pivot.add(mesh);

    const offsetX = (pivotSide === 'left' ? -width/2 : width/2);
    mesh.position.set(-offsetX, 0, 0); // place so pivot at edge
    this.pivot = pivot;
  }
  onInteract() {
    this.open = !this.open;
  }
  update(dt) {
    const target = this.open ? this.openAngle : 0;
    const curr = this.pivot.rotation.y;
    const speed = 4.0;
    this.pivot.rotation.y = THREE.MathUtils.damp(curr, target, speed, dt);
  }
}

/**
 * Simple sliding drawer
 */
class SlidingDrawer extends Interactable {
  constructor({ width=0.5, height=0.2, depth=0.4, extend=0.35, material }) {
    super({ label: 'Drawer', hint: 'Open/Close (E)' });
    this.open = false;
    this.extend = extend;

    const geom = new THREE.BoxGeometry(width, height, depth);
    this.mesh = new THREE.Mesh(geom, material);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.add(this.mesh);
    this.basePos = this.mesh.position.clone();
  }
  onInteract() { this.open = !this.open; }
  update(dt) {
    const target = this.open ? this.extend : 0;
    const curr = this.mesh.position.z;
    this.mesh.position.z = THREE.MathUtils.damp(curr, target, 6.0, dt);
  }
}

/**
 * Collectible paper with index and value
 */
class Paper extends Interactable {
  constructor({ index, value, material }) {
    super({ label: `Paper ${index}`, hint: 'Pick up (E)' });
    this.index = index;
    this.value = value;
    const geom = new THREE.PlaneGeometry(0.15, 0.2);
    const mesh = new THREE.Mesh(geom, material);
    mesh.rotation.x = -Math.PI/2; // lying on surface by default
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.add(mesh);
  }
}

/**
 * Basement lock
 */
class Lock extends Interactable {
  constructor({ material }) {
    super({ label: 'Lock', hint: 'Unlock (E)' });
    const geom = new THREE.TorusGeometry(0.12, 0.03, 16, 24);
    const mesh = new THREE.Mesh(geom, material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.add(mesh);
    this.unlocked = false;
  }
  tryUnlock(foundValues) {
    // Require all four: indices 1..4
    const allFound = [1,2,3,4].every(i => foundValues.has(i));
    if (allFound) {
      this.unlocked = true;
      return true;
    }
    return false;
  }
}

/**
 * The giant eye that peers through windows
 */
class GiantEye extends THREE.Group {
  constructor({ texture, houseWindows, scene, getPlayerPos, getPlayerDir }) {
    super();
    this.houseWindows = houseWindows;
    this.scene = scene;
    this.getPlayerPos = getPlayerPos;
    this.getPlayerDir = getPlayerDir;
    this.visibleNow = false;
    this.timer = 0;
    this.nextPeek = this.randomInterval();
    this.peekDuration = CONFIG.eye.visibleDuration;

    const geom = new THREE.SphereGeometry(0.6, 32, 32);
    const mat = new THREE.MeshPhongMaterial({
      map: texture,
      color: 0xffffff,
      shininess: 30,
    });
    this.mesh = new THREE.Mesh(geom, mat);
    this.add(this.mesh);

    // Start off-scene
    this.position.set(0, 100, 0);
    scene.add(this);
  }

  randomInterval() {
    return CONFIG.eye.intervalMin + Math.random()*(CONFIG.eye.intervalMax - CONFIG.eye.intervalMin);
  }

  chooseWindow() {
    return this.houseWindows[Math.floor(Math.random()*this.houseWindows.length)];
  }

  update(dt, obstacles) {
    this.timer += dt;

    if (!this.visibleNow && this.timer > this.nextPeek) {
      // Start peeking
      this.timer = 0;
      this.visibleNow = true;
      this.windowTarget = this.chooseWindow();

      const lookPos = this.windowTarget.position.clone();
      lookPos.y += 1.1;
      const outward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.windowTarget.quaternion);
      const eyePos = lookPos.clone().add(outward.multiplyScalar(1.4)); // just outside window
      this.position.copy(eyePos);
      this.mesh.lookAt(lookPos);
    }

    if (this.visibleNow) {
      // Gently sway
      this.rotation.y += dt*0.2;

      // Vision check (lose condition)
      const playerPos = this.getPlayerPos();
      const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
      const dist = toPlayer.length();
      if (dist < CONFIG.eye.sightDistance) {
        const dir = toPlayer.normalize();
        const eyeForward = new THREE.Vector3(0,0,1).applyQuaternion(this.mesh.quaternion);
        const angle = Math.acos(THREE.MathUtils.clamp(eyeForward.dot(dir), -1, 1));
        if (angle < CONFIG.eye.fov) {
          // Check line of sight (ray no obstacles)
          const ray = new THREE.Raycaster(this.position, dir, 0, dist);
          const hits = ray.intersectObjects(obstacles, true);
          const blocked = hits.length > 0;
          if (!blocked) {
            // Player is spotted -> game over
            return 'spotted';
          }
        }
      }

      if (this.timer > this.peekDuration) {
        // End peeking
        this.timer = 0;
        this.visibleNow = false;
        this.nextPeek = this.randomInterval();
        this.position.set(0, 100, 0);
      }
    }
    return null;
  }
}

/**
 * Main Game
 */
class Game {
  constructor() {
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.input = new Input();
    this.collected = new Map(); // index -> value
    this.prototypeMode = true;

    // Render setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
    this.camera.position.set(0, CONFIG.player.height, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0x404040, 0.8);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(5, 8, 5);
    dir.castShadow = true;
    this.scene.add(dir);

    // Controls state
    this.yaw = 0;
    this.pitch = 0;
    this.runHeld = false;

    // Physics state
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.isGrounded = false;
    this.groundObjects = []; // objects that can be stood on

    // World
    this.obstacles = []; // for line-of-sight blocking
    this.interactables = [];
    this.updateables = [];

    // UI
    dom.fullModeCheckbox.addEventListener('change', () => {
      this.prototypeMode = !dom.fullModeCheckbox.checked;
      this.resetWorld();
    });
    dom.restartBtn.addEventListener('click', () => {
      this.hideOverlay();
      this.resetWorld();
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.resetWorld();
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
    this.yaw = 0;
    this.pitch = 0;
    this.velocity.set(0, 0, 0);
    this.isGrounded = false;
    this.camera.position.set(0, CONFIG.player.height, 0);
    this.hideOverlay();
    dom.paperCount.textContent = '0';
    dom.codeDisplay.textContent = '_ _ _ _';
    dom.objective.textContent = 'Move around and test the character controller.';

    // Simple material for baseplate
    const protoMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.0 });
    const floorMat = protoMat(0x444444);

    // Create simple baseplate
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), floorMat);
    floor.rotation.x = -Math.PI/2;
    floor.receiveShadow = true;
    floor.position.y = CONFIG.world.floorY;
    this.scene.add(floor);
    this.groundObjects.push(floor);
  }

  checkGrounded() {
    // Raycast downward from feet position to check if on ground
    const raycaster = new THREE.Raycaster();
    const feetPos = new THREE.Vector3(
      this.camera.position.x,
      this.camera.position.y - CONFIG.player.height + 0.05, // Feet position + small offset
      this.camera.position.z
    );
    raycaster.set(feetPos, new THREE.Vector3(0, -1, 0));
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
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI/2, Math.PI/2);

    // Turn from keyboard
    const turningLeft = this.input.keys.has('arrowleft') || this.input.keys.has('q');
    const turningRight = this.input.keys.has('arrowright') || (this.input.keys.has('e') && !this.input.consumeInteract());
    if (turningLeft) this.yaw += CONFIG.player.turnSpeed * dt;
    if (turningRight) this.yaw -= CONFIG.player.turnSpeed * dt;

    // Update camera rotation (yaw and pitch)
    const quat = new THREE.Quaternion();
    quat.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
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

    // Horizontal movement input
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);
    const right = new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion);
    forward.y = 0; // Remove vertical component
    right.y = 0;
    forward.normalize();
    right.normalize();

    const horizontalVel = new THREE.Vector3();
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
    const horizontalMovement = new THREE.Vector3(movement.x, 0, movement.z);
    if (horizontalMovement.lengthSq() > 0 && this.obstacles.length > 0) {
      const raycaster = new THREE.Raycaster();
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
      const raycaster = new THREE.Raycaster();
      raycaster.set(new THREE.Vector3(newPos.x, feetY + 0.1, newPos.z), new THREE.Vector3(0, -1, 0));
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
        const raycaster = new THREE.Raycaster();
        raycaster.set(new THREE.Vector3(newPos.x, headY, newPos.z), new THREE.Vector3(0, 1, 0));
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

    // Interaction ray from camera forward (if there are interactables)
    if (this.interactables.length > 0) {
      const interact = this.input.consumeInteract();
      this.raycaster.set(this.camera.position, forward);
      const candidates = this.raycaster.intersectObjects(this.interactables, true);
      if (candidates.length > 0 && candidates[0].distance < CONFIG.interact.distance) {
        const hit = candidates[0].object;
        // Find parent interactable
        let node = hit;
        while (node && !node.isInteractable) node = node.parent;
        if (node && node.isInteractable && interact) {
          if (node.onInteract) {
            node.onInteract();
          }
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  showOverlay(text) {
    dom.message.textContent = text;
    dom.overlay.classList.add('show');
  }
  hideOverlay() {
    dom.overlay.classList.remove('show');
  }
}

// Boot
new Game();
