

/**
 * Basic input manager
 */
export class Input {
  constructor(dom) {
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
    
    // Bind Mouse Movement to view movement
    dom.body.addEventListener('click', () => {
      dom.body.requestPointerLock();
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
      if (document.pointerLockElement !== document.body) return;

      this.deltaYaw -= e.movementX * 0.0025;
      this.deltaPitch -= e.movementY * 0.0025;
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