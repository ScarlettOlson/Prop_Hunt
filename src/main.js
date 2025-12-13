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
 * Create shine shader material for notes
 */
function createShineShader() {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
      baseColor: { value: new THREE.Color(0xddddcc) },
      shineColor: { value: new THREE.Color(0xffffff) },
      shineIntensity: { value: 1.5 },
      shineSpeed: { value: 2.0 },
      shineWidth: { value: 0.3 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      void main() {
        vUv = uv;
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 baseColor;
      uniform vec3 shineColor;
      uniform float shineIntensity;
      uniform float shineSpeed;
      uniform float shineWidth;
      
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      void main() {
        vec3 color = baseColor;
        
        // Create moving shine effect
        float shine = sin((vUv.x + vUv.y) * 3.14159 + time * shineSpeed) * 0.5 + 0.5;
        shine = pow(shine, 1.0 / shineWidth);
        
        // Add shine highlight
        vec3 finalColor = mix(color, shineColor, shine * shineIntensity * 0.3);
        
        // Add rim lighting effect
        float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
        rim = pow(rim, 2.0);
        finalColor += shineColor * rim * 0.2;
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    transparent: false
  });
}

/**
 * Note with password piece
 */
class Note extends Interactable {
  constructor({ passwordPiece, content, material, position, useShineShader = false }) {
    super({
      label: 'Note',
      hint: 'Read Note (E)',
    });
    this.passwordPiece = passwordPiece; // e.g., "12", "34", "56"
    this.content = content || `Password piece: ${passwordPiece}`;
    this.collected = false;
    this.bobOffset = Math.random() * Math.PI * 2; // Random starting phase for animation
    this.useShineShader = useShineShader;
    this.shineMaterial = null;

    // Create shine shader material if needed
    if (useShineShader) {
      this.shineMaterial = createShineShader();
    }

    // Create a visual representation (paper/note) - make it bigger and vertical so it's easier to see and interact with
    const geom = new THREE.PlaneGeometry(0.3, 0.4);
    const noteMaterial = useShineShader ? this.shineMaterial : material;
    const mesh = new THREE.Mesh(geom, noteMaterial);
    // Keep it vertical (not flat) so it's easier to see and interact with
    mesh.rotation.y = Math.PI; // Face forward
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.add(mesh);
    this.mesh = mesh; // Store reference for animation
    this.baseMaterial = material; // Store base material for switching

    // Add a subtle glow or highlight
    const glowGeom = new THREE.PlaneGeometry(0.35, 0.45);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.rotation.y = Math.PI;
    glow.position.z = -0.01; // Slightly behind the note
    this.add(glow);
    this.glow = glow; // Store reference

    // Add an invisible sphere collider for easier interaction detection
    const sphereGeom = new THREE.SphereGeometry(0.5, 8, 8);
    const sphereMat = new THREE.MeshBasicMaterial({
      visible: false, // Invisible
      transparent: true,
      opacity: 0
    });
    const sphereCollider = new THREE.Mesh(sphereGeom, sphereMat);
    this.add(sphereCollider);
    this.collider = sphereCollider; // Store reference

    if (position) {
      this.position.copy(position);
    }
  }

  update(dt) {
    if (!this.collected) {
      // Update shine shader time uniform if using shader
      if (this.shineMaterial && this.shineMaterial.uniforms) {
        this.shineMaterial.uniforms.time.value += dt;
      }

      // Subtle floating/bobbing animation
      const bobSpeed = 1.5;
      const bobAmount = 0.1;
      this.bobOffset += dt * bobSpeed;
      const bobY = Math.sin(this.bobOffset) * bobAmount;
      this.mesh.position.y = bobY;
      this.glow.position.y = bobY;
      if (this.collider) {
        this.collider.position.y = bobY;
      }
      
      // Gentle rotation (only rotate around Y axis, not the whole note)
      this.mesh.rotation.y = Math.PI + Math.sin(this.bobOffset * 0.5) * 0.2;
    }
  }

  setShineShader(enabled) {
    if (this.collected) return; // Don't change collected notes
    
    if (enabled && !this.shineMaterial) {
      // Create shine shader
      this.shineMaterial = createShineShader();
      this.mesh.material = this.shineMaterial;
    } else if (!enabled && this.shineMaterial) {
      // Switch back to base material
      this.mesh.material = this.baseMaterial;
    }
    this.useShineShader = enabled;
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
    this.renderer.shadowMap.enabled = true; // Enable shadows
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    // Set background to sky color (will be replaced by skybox)
    this.scene.background = new THREE.Color(0x87CEEB);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
    this.camera.position.set(0, CONFIG.player.height, 0);

    // Normal Lighting Setup with shadows - Bright interior
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Ambient light for overall illumination - increased brightness
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambient);
    
    // Main directional light (sunlight) - brighter
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 15, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    dirLight.shadow.bias = -0.0001;
    this.scene.add(dirLight);
    
    // Additional point lights for interior illumination - much brighter
    const pointLight1 = new THREE.PointLight(0xffffff, 1.0, 25);
    pointLight1.position.set(0, 2.5, 0);
    pointLight1.castShadow = true;
    pointLight1.shadow.mapSize.width = 512;
    pointLight1.shadow.mapSize.height = 512;
    this.scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xffffff, 0.8, 22);
    pointLight2.position.set(-6, 2.5, -6);
    this.scene.add(pointLight2);
    
    const pointLight3 = new THREE.PointLight(0xffffff, 0.8, 22);
    pointLight3.position.set(6, 2.5, 6);
    this.scene.add(pointLight3);
    
    // Additional fill light from above
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(0, 5, 0);
    fillLight.castShadow = false;
    this.scene.add(fillLight);

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
    this.passwordPieces = []; // collected password pieces in order

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
    this.passwordPieces = [];
    this.yaw = 0;
    this.pitch = 0;
    this.velocity.set(0, 0, 0);
    this.isGrounded = false;
    this.camera.position.set(0, CONFIG.player.height, 0);
    this.hideOverlay();
    this.hideNotePopup();
    dom.noteCount.textContent = '0';
    dom.codeDisplay.textContent = '_ _ _ _ _ _';
    dom.objective.textContent = 'Find 3 notes with password pieces to unlock the basement.';

    // Materials for house
    const protoMat = (color) => {
      return new THREE.MeshStandardMaterial({ 
        color, 
        roughness: 0.8, 
        metalness: 0.0
      });
    };
    const floorMat = protoMat(0x6b5b4f); // Wooden floor
    const wallMat = protoMat(0x8b7d6b); // Wall color
    const ceilingMat = protoMat(0x5a5a5a); // Ceiling
    const doorMat = protoMat(0x4a3a2a); // Dark wood for door
    const noteMat = protoMat(0xddddcc);

    // House dimensions
    const houseWidth = 12;
    const houseDepth = 10;
    const wallHeight = 2.8;
    const wallThickness = 0.2;

    // Create house group
    const house = new THREE.Group();
    this.scene.add(house);

    // Floor (interior)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(houseWidth, houseDepth),
      floorMat
    );
    floor.rotation.x = -Math.PI/2;
    floor.material.side = THREE.DoubleSide; // Render both sides
    floor.receiveShadow = true;
    floor.position.y = CONFIG.world.floorY;
    house.add(floor);
    this.groundObjects.push(floor);

    // Helper function to create walls
    const createWall = (width, height, depth, x, y, z, rotationY = 0) => {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        wallMat
      );
      wall.position.set(x, y, z);
      wall.rotation.y = rotationY;
      wall.castShadow = true;
      wall.receiveShadow = true;
      house.add(wall);
      this.obstacles.push(wall);
      return wall;
    };

    // Front wall (with opening for entrance - we'll add door later)
    createWall(houseWidth, wallHeight, wallThickness, 0, wallHeight/2, -houseDepth/2);
    
    // Back wall (with basement door opening)
    const backWallLeft = createWall(houseWidth/2 - 1.2, wallHeight, wallThickness, -(houseWidth/2 - 1.2)/2 - 0.6, wallHeight/2, houseDepth/2);
    const backWallRight = createWall(houseWidth/2 - 1.2, wallHeight, wallThickness, (houseWidth/2 - 1.2)/2 + 0.6, wallHeight/2, houseDepth/2);
    
    // Left wall
    createWall(wallThickness, wallHeight, houseDepth, -houseWidth/2, wallHeight/2, 0);
    
    // Right wall
    createWall(wallThickness, wallHeight, houseDepth, houseWidth/2, wallHeight/2, 0);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(houseWidth, houseDepth),
      ceilingMat
    );
    ceiling.rotation.x = Math.PI/2;
    ceiling.material.side = THREE.DoubleSide; // Render both sides
    ceiling.receiveShadow = true;
    ceiling.position.y = wallHeight;
    house.add(ceiling);

    // Basement door (visual only - no functionality yet)
    const basementDoorFrame = new THREE.Group();
    basementDoorFrame.position.set(0, wallHeight/2 - 0.5, houseDepth/2 + wallThickness/2);
    
    // Door frame (top)
    const doorFrameTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.15, 0.1),
      wallMat
    );
    doorFrameTop.position.set(0, 1.0, 0);
    doorFrameTop.castShadow = true;
    doorFrameTop.receiveShadow = true;
    basementDoorFrame.add(doorFrameTop);
    
    // Door frame (left side)
    const doorFrameLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 2.0, 0.1),
      wallMat
    );
    doorFrameLeft.position.set(-1.0, 0, 0);
    doorFrameLeft.castShadow = true;
    doorFrameLeft.receiveShadow = true;
    basementDoorFrame.add(doorFrameLeft);
    
    // Door frame (right side)
    const doorFrameRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 2.0, 0.1),
      wallMat
    );
    doorFrameRight.position.set(1.0, 0, 0);
    doorFrameRight.castShadow = true;
    doorFrameRight.receiveShadow = true;
    basementDoorFrame.add(doorFrameRight);
    
    // Basement door itself
    const basementDoor = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 1.9, 0.05),
      doorMat
    );
    basementDoor.position.set(0, 0, 0.03);
    basementDoor.castShadow = true;
    basementDoor.receiveShadow = true;
    basementDoorFrame.add(basementDoor);
    this.basementDoor = basementDoor; // Store reference for later
    
    // Add door lock visual (small padlock)
    const lockGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16);
    const lockMaterial = protoMat(0x333333); // Dark metal
    const lock = new THREE.Mesh(lockGeom, lockMaterial);
    lock.rotation.z = Math.PI/2;
    lock.position.set(0.7, 0.3, 0.08);
    lock.castShadow = true;
    basementDoorFrame.add(lock);
    
    house.add(basementDoorFrame);
    
    // Add door frame parts as obstacles
    this.obstacles.push(doorFrameTop);
    this.obstacles.push(doorFrameLeft);
    this.obstacles.push(doorFrameRight);
    this.obstacles.push(basementDoor); // Door itself is also an obstacle

    // Ground plane outside house (for walking around)
    const groundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      protoMat(0x3a3a3a)
    );
    groundPlane.rotation.x = -Math.PI/2;
    groundPlane.material.side = THREE.DoubleSide;
    groundPlane.receiveShadow = true;
    groundPlane.position.y = CONFIG.world.floorY;
    this.scene.add(groundPlane);
    this.groundObjects.push(groundPlane);
    
    // Add skybox with gradient effect
    const skyGeometry = new THREE.SphereGeometry(200, 32, 32);
    // Create gradient skybox shader
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x87CEEB) }, // Sky blue
        bottomColor: { value: new THREE.Color(0xE0E0E0) }, // Light gray
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
      side: THREE.BackSide,
      depthWrite: false
    });
    const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    skybox.renderOrder = -1000; // Render first
    this.scene.add(skybox);

    // Place 3 notes in good hiding spots inside the house
    const notes = [
      {
        passwordPiece: '12',
        content: 'I found this note hidden behind the old bookshelf.\n\nPassword piece: 12',
        position: new THREE.Vector3(-4, CONFIG.player.height * 0.6, -3) // Left side of house
      },
      {
        passwordPiece: '34',
        content: 'This was tucked under a loose floorboard.\n\nPassword piece: 34',
        position: new THREE.Vector3(3, CONFIG.player.height * 0.5, 2) // Right side of house
      },
      {
        passwordPiece: '56',
        content: 'Hidden in a crack in the wall.\n\nPassword piece: 56',
        position: new THREE.Vector3(-2, CONFIG.player.height * 0.7, -4) // Front area
      }
    ];

    for (const noteData of notes) {
      const note = new Note({
        passwordPiece: noteData.passwordPiece,
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

    // Turn from keyboard (Q and arrow keys only - E is reserved for interaction)
    const turningLeft = this.input.keys.has('arrowleft') || this.input.keys.has('q');
    const turningRight = this.input.keys.has('arrowright');
    if (turningLeft) this.yaw += CONFIG.player.turnSpeed * dt;
    if (turningRight) this.yaw -= CONFIG.player.turnSpeed * dt;

    // Update camera rotation (yaw and pitch) - do this BEFORE interaction check
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

    // Calculate forward/right vectors AFTER camera rotation is updated
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);
    const right = new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion);
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
            this.passwordPieces.push(closestNote.passwordPiece);
            // Hide the note visually (make it transparent)
            closestNote.traverse(child => {
              if (child.isMesh && child.material) {
                child.material.transparent = true;
                child.material.opacity = 0.3;
              }
            });
            // Update UI
            dom.noteCount.textContent = this.passwordPieces.length;
            const password = this.passwordPieces.join('');
            dom.codeDisplay.textContent = password.padEnd(6, '_').split('').join(' ');
            if (this.passwordPieces.length === 3) {
              dom.objective.textContent = 'Return to the basement door to unlock it.';
            } else {
              dom.objective.textContent = `Find ${3 - this.passwordPieces.length} more note(s) to unlock the basement.`;
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
