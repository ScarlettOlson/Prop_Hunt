import * as T from '../CS559-Three/build/three.module.js';
import { InteractableCabinet, InteractiveDoor, InteractiveDrawer } from './interactive.js';



export function createHouse(w, h, d, t, floorMat, wallMat, frameMat, doorMat, handleMat, windowMat) {
    const doorW = 1.5;
    const doorH = Math.min(h, 2.5);
    
    // Create Groups
    const house = new T.Group();
    let groundObjs = [];
    let obstacles = [];
    let interactables = [];

    // Create Floor and ceiling
    // const floor = new Floor({ w, d, h: 0.01, mat: floorMat });
    // const ceil = new Floor({ w, d, h, mat: floorMat });
    // house.add(floor);
    // house.add(ceil);
    // groundObjs.push(floor);
    // obstacles.push(floor);

    // Build the exterior walls, windows, and doors of the house
    const exterior = createHouseExterior(w, h, d, t, floorMat, wallMat, frameMat, doorMat, handleMat, windowMat);
    house.add(exterior.group);
    exterior.groundObjs.forEach(obj => groundObjs.push(obj));
    exterior.obstacles.forEach(obj => obstacles.push(obj));
    exterior.interactables.forEach(obj => interactables.push(obj));

    
    // Create Bedroom walls with doors into the rooms
    const bedrooms = createBedroomWalls(h, t, doorW, doorH, wallMat, frameMat, doorMat, handleMat);
    house.add(bedrooms.group);
    bedrooms.obstacles.forEach(obj => obstacles.push(obj));
    bedrooms.interactables.forEach(obj => interactables.push(obj));

    // Create the furniture inside of the bedrooms
    const bedroomFurniture = createBedroomFurniture(doorMat, wallMat);
    bedroomFurniture.objects.forEach(obj => house.add(obj));
    bedroomFurniture.obstacles.forEach(obj => obstacles.push(obj));
    bedroomFurniture.interactables.forEach(obj => interactables.push(obj));

    
    const kitchen = createKitchen({
        x:7, y:0, z:6.5, 
        w:6, h:h, d:7,
        wallT:t, wallMat:wallMat, drawerMat:doorMat, handleMat,
        doorW, doorH
    });
    kitchen.objects.forEach(obj => house.add(obj));
    kitchen.obstacles.forEach(obj => obstacles.push(obj));
    kitchen.interactables.forEach(obj => interactables.push(obj));

    // Create Door to the basement
    // const basementDoor = new Door({
    //     x: 0, y: doorH/2, z: -d/2 - t/2, w: doorW, h: doorH, t,
    //     frameMat, doorMat, handleMat, rotationY: 0
    // });
    // house.add(basementDoor);
    // obstacles.push(basementDoor.door, basementDoor.frameLeft, basementDoor.frameTop, basementDoor.frameRight);

    return {house, groundObjs, obstacles, interactables};
}


export function createHouseExterior(w, h, d, t, floorMat, wallMat, frameMat, doorMat, handleMat, windowMat) {
    const doorW = 1.5;
    const doorH = Math.min(h, 2.5);
    const winW = 1.2;
    const winH = 1.0;
    const winY = 0.5; // Window center height from ground (middle of wall height)
    
    const group = new T.Group();
    let obstacles = [];
    let groundObjs = [];
    let interactables = [];
        
    // Compute edges of the house
    const frontZ = d/2 + t/2;
    const rightX = w/2 + t/2
    const backZ = -frontZ;
    const leftX = -rightX;
    
    // Create Front walls, Windows, and Door
    const frontLeftWindow = new WallWithWindow({
        x:-6, y:h/2, z:frontZ, w:8, h:h, t:t,
        winX:0, winY:winY, winW:winW, winH:winH,
        wallMat:wallMat, frameMat:frameMat, glassMat:windowMat, rotationY:0
    });
    const frontDoorWall = new WallWithPassage({
        x:0, y:h/2, z:frontZ, h:h, w:4, t:t,
        passageX:0, passageW:doorW, passageH:doorH,
        wallMat:wallMat, rotationY:0
    })
    const frontDoor = new Door({
        x: 0, y: doorH/2, z: frontZ,
        w: doorW, h: doorH, t: t,
        frameMat, doorMat, handleMat, rotationY: 0
    });
    const frontCenterWindow = new WallWithWindow({
        x:4, y:h/2, z:frontZ,
        w:4, h:h, t:t,
        winX:-1, winY:winY, winW:winW, winH:winH,
        wallMat:wallMat, frameMat:frameMat, glassMat:windowMat, rotationY: 0
    });
    const frontRightWindow = new WallWithWindow({
        x: 8, y: h/2, z: frontZ,
        w: 4, h: h, t:t, 
        winX:0, winY:winY, winW:winW, winH:winH,
        wallMat:wallMat, frameMat:frameMat, glassMat:windowMat, rotationY: 0
    });
    group.add(frontLeftWindow);
    group.add(frontCenterWindow);
    group.add(frontDoorWall);
    group.add(frontDoor);
    group.add(frontRightWindow);
    obstacles.push(frontLeftWindow);
    obstacles.push(frontDoorWall);
    //TODO UNCOMMENT THIS obstacles.push(frontDoor);
    obstacles.push(frontCenterWindow);
    obstacles.push(frontRightWindow);


    // Create the Right walls and windows
    const rightFrontWindow = new WallWithWindow({
        x: rightX, y: h/2, z: 7, w: 6, h: h, t: t,
        winX: 1, winY: winY, winW:winW, winH:winH,
        wallMat:wallMat, frameMat:frameMat, glassMat: windowMat, rotationY: -Math.PI/2
    });
    const rightCenterWindow = new WallWithWindow({
        x: rightX, y: h/2, z: 1, w: 6, h: h, t: t, 
        winX: 0, winY: winY, winW:winW, winH:winH,
        wallMat:wallMat, frameMat:frameMat, glassMat: windowMat, rotationY: -Math.PI/2
    });
    const rightBackWall = new Wall({
        x: rightX, y: h/2, z: -6,
        w: 8, h: h, t: t, mat: wallMat, rotationY: Math.PI/2
    });
    group.add(rightFrontWindow);
    group.add(rightCenterWindow);
    group.add(rightBackWall);
    obstacles.push(rightFrontWindow);
    obstacles.push(rightCenterWindow);    
    obstacles.push(rightBackWall);
    
    // Create the Back Walls and Windows
    const backRightWall = new Wall({
        x: 6, y: h/2, z: backZ,
        w: 8, h: h, t: t,
        mat: wallMat, rotationY: 0
    });
    const backCenterWindow = new WallWithWindow({
        x: -1, y: h/2, z: backZ,
        w: 6, h: h, t: t,
        winX: -1, winY: winY, winW:2*winW, winH:1.5*winH,
        wallMat, frameMat, glassMat: windowMat, rotationY: Math.PI
    });
    const backLeftWindow = new WallWithWindow({
        x: -7, y: h/2, z: backZ,
        w: 6, h: h, t: t,
        winX: 0, winY: winY, winW, winH,
        wallMat, frameMat, glassMat: windowMat, rotationY: Math.PI
    });
    group.add(backRightWall);
    group.add(backCenterWindow);
    group.add(backLeftWindow);
    obstacles.push(backRightWall);
    obstacles.push(backCenterWindow);
    obstacles.push(backLeftWindow);
    

    // Creaet Left Walls and Bedroom Windows
    const leftBackWindow = new WallWithWindow({
        x: leftX, y: h/2, z: -7.5,
        w: 5, h: h, t: t,
        winX: 0, winY: winY, winW, winH,
        wallMat, frameMat, glassMat: windowMat, rotationY: -Math.PI/2
    });
    const leftCenterWindow = new WallWithWindow({
        x: leftX, y: h/2, z: -1.5,
        w: 7, h: h, t: t,
        winX: 0, winY: winY, winW, winH,
        wallMat, frameMat, glassMat: windowMat, rotationY: -Math.PI/2
    });
    const leftFrontWindow = new WallWithWindow({
        x: leftX, y: h/2, z: 6,
        w: 8, h: h, t: t,
        winX: 0, winY: winY, winW, winH,
        wallMat, frameMat, glassMat: windowMat, rotationY: -Math.PI/2
    });
    group.add(leftBackWindow);
    group.add(leftCenterWindow);
    group.add(leftFrontWindow);
    obstacles.push(leftBackWindow);
    obstacles.push(leftCenterWindow);
    obstacles.push(leftFrontWindow);
    
    
    // Exterior ground/foundation
    const exteriorGround = new Floor({
        w: w,
        d: d,
        h: 0.01,
        mat: floorMat
    });
    group.add(exteriorGround);
    groundObjs.push(exteriorGround);
    obstacles.push(exteriorGround);
    
    // Roof (simple flat roof for now)
    const roof = new Floor({
        w: w,
        d: d,
        h: h,
        mat: wallMat
    });
    group.add(roof);
    obstacles.push(roof);
    
    return { group, obstacles, groundObjs, interactables };
}

export function createBedroomWalls(h, t, doorW, doorH, wallMat, frameMat, doorMat, handleMat) {
    const group = new T.Group();
    let obstacles = [];
    let interactables = [];

    // Create Bedroom walls with doors into the rooms
    const bedroomHallwayWall1 = new WallWithPassage({
        x: -2, y: h/2, z: 6, w: 8, h, t,
        passageX: 0, passageW: doorW, passageH: doorH,
        wallMat, rotationY: -Math.PI/2
    });
    const bedroomDoor1 = new InteractiveDoor({
        x: -2, y: doorH/2, z: 6, w: doorW, h: doorH, t: t,
        frameMat, doorMat, handleMat, rotationY: -Math.PI/2
    });
    group.add(bedroomHallwayWall1);
    group.add(bedroomDoor1);
    obstacles.push(bedroomHallwayWall1);
    obstacles.push(bedroomDoor1);
    interactables.push(bedroomDoor1);

    const bedroomHallwayWall2 = new WallWithPassage({
        x: -2, y: h/2, z: -2, w: 8, h, t,
        passageX: -2, passageW: doorW, passageH: doorH,
        wallMat, rotationY: Math.PI/2
    });
    const bedroomDoor2 = new InteractiveDoor({
        x: -2, y: doorH/2, z: 0, w: doorW, h: doorH, t: t,
        frameMat, doorMat, handleMat, rotationY: -Math.PI/2
    });
    group.add(bedroomHallwayWall2);
    group.add(bedroomDoor2);
    obstacles.push(bedroomHallwayWall2);
    obstacles.push(bedroomDoor2);
    interactables.push(bedroomDoor2);

    const bedroomHallwayWall3 = new WallWithPassage({
        x: -2, y: h/2, z: -8, w: 4, h, t,
        passageX: 0, passageW: doorW, passageH: doorH,
        wallMat, rotationY: Math.PI/2
    });
    const bedroomDoor3 = new InteractiveDoor({
        x: -2, y: doorH/2, z: -8, w: doorW, h: doorH, t: t,
        frameMat, doorMat, handleMat, rotationY: -Math.PI/2
    });
    group.add(bedroomHallwayWall3);
    group.add(bedroomDoor3);
    obstacles.push(bedroomHallwayWall3);
    obstacles.push(bedroomDoor3);
    interactables.push(bedroomDoor3);

    // Create walls separating the bedrooms
    const bedroomSeperateWall1 = new Wall({ x: -6, y: h/2, z: 2, w: 8, h, t: t, mat: wallMat });
    const bedroomSeperateWall2 = new Wall({ x: -6, y: h/2, z: -5, w: 8, h, t: t, mat: wallMat });
    group.add(bedroomSeperateWall1);
    group.add(bedroomSeperateWall2);
    obstacles.push(bedroomSeperateWall1);
    obstacles.push(bedroomSeperateWall2);

    return { group, obstacles, interactables };
}

export function createBedroomFurniture(mattressMat, frameMat) {
  let objects = [];
  let obstacles = [];
  let interactables = [];

  // Create Beds for each of the rooms
  const bed1 = new Bed({
    x: -9.1, y:0, z:8.4, w:1.5, h:2, d:3, mattressH: 0.5, 
    mattressMat:mattressMat, frameMat:frameMat,
    rotationY:Math.PI
  });
  const bed2 = new Bed({
    x: -8.4, y:0, z:1.1, w:1.5, h:2, d:3, mattressH: 0.5, 
    mattressMat:mattressMat, frameMat:frameMat,
    rotationY:Math.PI/2
  });
  const bed3 = new Bed({
    x: -9.1, y:0, z:-8.4, w:1.5, h:2, d:3, mattressH: 0.5, 
    mattressMat:mattressMat, frameMat:frameMat,
    rotationY:0
  });
  objects.push(bed1);
  obstacles.push(bed1);
  objects.push(bed2);
  obstacles.push(bed2);
  objects.push(bed3);
  obstacles.push(bed3);

  // Create nightstand beside beds
  const nightstand1 = new InteractiveDrawer({
    x: -7.75, y:0, z:9.5, w:1, h:3, d:1,
    drawerMat: frameMat, handleMat:mattressMat, rotationY:Math.PI
  });
  const nightstand2 = new InteractiveDrawer({
    x: -9.2, y:0, z:-0.2, w:1, h:3, d:1,
    drawerMat: frameMat, handleMat:mattressMat, rotationY:Math.PI/2
  });
  const nightstand3 = new InteractiveDrawer({
    x: -7.75, y:0, z:-9.3, w:1, h:3, d:1,
    drawerMat: frameMat, handleMat:mattressMat, rotationY:0
  });
  objects.push(nightstand1);
  obstacles.push(nightstand1);
  interactables.push(nightstand1);
  objects.push(nightstand2);
  obstacles.push(nightstand2);
  interactables.push(nightstand2);
  objects.push(nightstand3);
  obstacles.push(nightstand3);
  interactables.push(nightstand3);

  // Create Bookshelfs for each of the rooms
  const bookShelf1 = new Bookshelf({
    x: -8.5, y:0.05, z:2.5, w:0.8, h:2, d:3,
    mat:frameMat, rotationY:-Math.PI/2
  });
  const bookShelf2 = new Bookshelf({
    x: -8.5, y:0.05, z:2.5, w:0.8, h:2, d:3,
    mat:frameMat, rotationY:-Math.PI/2
  });
  const bookShelf3 = new Bookshelf({
    x: -8.5, y:0.05, z:2.5, w:0.8, h:2, d:3,
    mat:frameMat, rotationY:-Math.PI/2
  });
  objects.push(bookShelf1);
  obstacles.push(bookShelf1);
  objects.push(bookShelf2);
  obstacles.push(bookShelf2);
  objects.push(bookShelf3);
  obstacles.push(bookShelf3);

  

  return { objects, obstacles, interactables }
}

export function createKitchen({
  x, y, z, w, h, d,
  wallT, wallMat, drawerMat, handleMat,
  doorW, doorH, rotationY = 0
}) {
  let objects = [];
  let obstacles = [];
  let interactables = [];
  let drawers = [];


  // --- Walls with passages (relative to group origin) ---
  const hallPassage = new WallWithPassage({
    x: x + (-w/2), y: y+h / 2, z: z,
    w: d, h, t: wallT,
    passageX: 0, passageW: doorW, passageH: doorH,
    wallMat, rotationY: Math.PI / 2
  });

  const diningRoomPassage = new WallWithPassage({
    x: x, y: y+(h/2), z: z + (-d/2),
    w: w, h, t: wallT,
    passageX: 0, passageW: doorW, passageH: doorH,
    wallMat, rotationY: 0
  });

  objects.push(hallPassage);
  objects.push(diningRoomPassage);
  obstacles.push(hallPassage, diningRoomPassage);

  // --- Drawers along one wall (relative placement) ---
  const drawerW = w / 5;
  //const drawerH = 1.25 * drawerW;
  for (let i = -2; i < 2; i++) {
    const drawer = new InteractiveDrawer({
      x: x + wallT/2 + (i * drawerW),
      y: y + drawerW/2,
      z: z + (d-drawerW) / 2,
      w: drawerW, h: drawerW, d: drawerW,
      drawerMat, handleMat, rotationY: Math.PI
    });
    objects.push(drawer);
    drawers.push(drawer);
    obstacles.push(drawer);
    interactables.push(drawer);
  }

  // Create cabinets on the other wall
  for(let i=-3; i<0; i++) {
    const cabinet = new InteractableCabinet({
      x: x + (d-drawerW) / 2,
      y: y + drawerW,
      z: z + wallT + ((i+0.5) * drawerW),
      w: drawerW, h: 2*drawerW, d: drawerW,
      cabinetMat: drawerMat, handleMat: handleMat, rotationY: -Math.PI/2
    });
    objects.push(cabinet)
    obstacles.push(cabinet);
    interactables.push(cabinet);
  }

  return { objects, obstacles, interactables, drawers };
}







// Classes for complex objects

export class WallWithWindow extends T.Group {
  constructor({
    x, y, z, w, h, t,
    winX, winY, winW, winH,
    wallMat, frameMat, glassMat,
    rotationY = 0
  }) {
    super();
    this.position.set(x, y, z);
    this.rotation.y = rotationY;

    // Window bounds relative to wall center
    const winBottom = winY - winH/2;
    const winTop    = winY + winH/2;
    const winLeft   = winX - winW/2;
    const winRight  = winX + winW/2;

    // --- Top wall segment ---
    const topHeight = h/2 - winTop;
    if (topHeight > 0) {
      const topWall = new T.Mesh(new T.BoxGeometry(w, topHeight, t), wallMat);
      topWall.position.set(0, winTop + topHeight/2, 0);
      this.add(topWall);
    }

    // --- Bottom wall segment ---
    const bottomHeight = winBottom - (-h/2);
    if (bottomHeight > 0) {
      const bottomWall = new T.Mesh(new T.BoxGeometry(w, bottomHeight, t), wallMat);
      bottomWall.position.set(0, -h/2 + bottomHeight/2, 0);
      this.add(bottomWall);
    }

    // --- Left wall segment ---
    const leftWidth = winLeft - (-w/2);
    if (leftWidth > 0) {
      const leftWall = new T.Mesh(new T.BoxGeometry(leftWidth, winH, t), wallMat);
      leftWall.position.set(-w/2 + leftWidth/2, winY, 0);
      this.add(leftWall);
    }

    // --- Right wall segment ---
    const rightWidth = w/2 - winRight;
    if (rightWidth > 0) {
      const rightWall = new T.Mesh(new T.BoxGeometry(rightWidth, winH, t), wallMat);
      rightWall.position.set(w/2 - rightWidth/2, winY, 0);
      this.add(rightWall);
    }WallWithPassage

    // --- Window itself ---
    this.window = new Window({
      x: winX, y: winY, z: 0,
      w: winW, h: winH, t,
      frameMat, glassMat
    });
    this.add(this.window);
  }
}

export class WallWithPassage extends T.Group {
  constructor({
    x, y, z, w, h, t,
    passageX, passageW, passageH,
    wallMat,
    rotationY = 0
  }) {
    super();
    this.position.set(x, y, z);
    this.rotation.y = rotationY;

    // Passage bounds relative to wall center
    const passLeft  = passageX - passageW/2;
    const passRight = passageX + passageW/2;

    // --- Left wall segment ---
    const leftWidth = passLeft - (-w/2);
    if (leftWidth > 0) {
      const leftWall = new T.Mesh(new T.BoxGeometry(leftWidth, h, t), wallMat);
      leftWall.position.set(-w/2 + leftWidth/2, 0, 0);
      leftWall.castShadow = true;
      leftWall.receiveShadow = true;
      this.add(leftWall);
    }

    // --- Right wall segment ---
    const rightWidth = w/2 - passRight;
    if (rightWidth > 0) {
      const rightWall = new T.Mesh(new T.BoxGeometry(rightWidth, h, t), wallMat);
      rightWall.position.set(w/2 - rightWidth/2, 0, 0);
      rightWall.castShadow = true;
      rightWall.receiveShadow = true;
      this.add(rightWall);
    }

    // --- Top wall segment (above passage) ---
    const topHeight = h - passageH;
    if (topHeight > 0) {
      const topWall = new T.Mesh(new T.BoxGeometry(passageW, topHeight, t), wallMat);
      topWall.position.set(passageX, passageH + topHeight/2 - h/2, 0);
      topWall.castShadow = true;
      topWall.receiveShadow = true;
      this.add(topWall);
    }
  }
}

// Classes for simple objects

export class Wall extends T.Group {
  constructor({ x, y, z, w, h, t, mat, rotationY=0 }) {
    super();
    this.position.set(x, y, z);
    this.rotation.y = rotationY;
    
    this.mesh = new T.Mesh(new T.BoxGeometry(w, h, t), mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.add(this.mesh);
  }
}

export class Floor extends T.Group {
  constructor({ w, d, h, mat }) {
    super();
    this.position.set(0, h, 0);
    
    this.mesh = new T.Mesh(new T.PlaneGeometry(w, d), mat);
    this.mesh.rotation.x = -Math.PI/2;
    this.mesh.material.side = T.DoubleSide;
    this.mesh.receiveShadow = true;
    this.add(this.mesh);
  }
}

export class Door extends T.Group {
  constructor({ x, y, z, w, h, t, frameMat, doorMat, handleMat, rotationY = 0 }) {
    super();
    this.position.set(x, y, z);
    this.rotation.y = rotationY;

    // Frame top
    this.frameTop = new T.Mesh(new T.BoxGeometry(w, t, t), frameMat);
    this.frameTop.position.set(0, (h-t)/2, 0);
    this.frameTop.castShadow = true;
    this.frameTop.receiveShadow = true;
    this.add(this.frameTop);

    // Frame left
    this.frameLeft = new T.Mesh(new T.BoxGeometry(t, h, t), frameMat);
    this.frameLeft.position.set((-w + t)/2, 0, 0);
    this.frameLeft.castShadow = true;
    this.frameLeft.receiveShadow = true;
    this.add(this.frameLeft);

    // Frame right
    this.frameRight = new T.Mesh(new T.BoxGeometry(t, h, t), frameMat);
    this.frameRight.position.set((w - t)/2, 0, 0);
    this.frameRight.castShadow = true;
    this.frameRight.receiveShadow = true;
    this.add(this.frameRight);

    // Door with hinge
    this.hinge = new T.Object3D();
    this.door = new T.Mesh(new T.BoxGeometry(w - 2*t, h-t, t), doorMat);
    this.hinge.position.set(-(w-t)/2, 0, 0);
    this.door.position.set((w-t)/2, -t/2, 0);
    this.door.castShadow = true;
    this.door.receiveShadow = true;
    this.hinge.add(this.door);
    this.add(this.hinge);

    // Handles
    const frontHandle = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.15, 16), handleMat);
    frontHandle.rotation.x = Math.PI / 2;
    frontHandle.position.set(3*w/4, 0, t/2);
    this.hinge.add(frontHandle);

    const backHandle = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.15, 16), handleMat);
    backHandle.rotation.x = -Math.PI / 2;
    backHandle.position.set(3*w/4, 0, -t/2);
    this.hinge.add(backHandle);
  }
}

export class Window extends T.Group {
  constructor({ x, y, z, w, h, t, frameMat, glassMat, rotationY = 0 }) {
    super();
    this.position.set(x, y, z);
    this.rotation.y = rotationY;

    // Frame top
    this.frameTop = new T.Mesh(new T.BoxGeometry(w-t, t, t), frameMat);
    this.frameTop.position.set(0, (h-t)/2, 0);
    this.frameTop.castShadow = true;
    this.frameTop.receiveShadow = true;
    this.add(this.frameTop);

    // Frame bottom
    this.frameBottom = new T.Mesh(new T.BoxGeometry(w-t, t, t), frameMat);
    this.frameBottom.position.set(0, (-h+t)/2, 0);
    this.frameBottom.castShadow = true;
    this.frameBottom.receiveShadow = true;
    this.add(this.frameBottom);

    // Frame left
    this.frameLeft = new T.Mesh(new T.BoxGeometry(t, h, t), frameMat);
    this.frameLeft.position.set((-w+t)/2, 0, 0);
    this.frameLeft.castShadow = true;
    this.frameLeft.receiveShadow = true;
    this.add(this.frameLeft);

    // Frame right
    this.frameRight = new T.Mesh(new T.BoxGeometry(t, h, t), frameMat);
    this.frameRight.position.set((w-t)/2, 0, 0);
    this.frameRight.castShadow = true;
    this.frameRight.receiveShadow = true;
    this.add(this.frameRight);

    // Glass
    this.glass = new T.Mesh(new T.PlaneGeometry(w, h), glassMat);
    this.glass.material.side = T.DoubleSide;
    this.glass.position.z = 0.05;
    this.add(this.glass);
  }
}

export class Bookshelf extends T.Group {
  constructor({ x, y, z, w, h, d, mat, rotationY=0 }) {
    super();
    this.position.set(x, y, z);
    this.rotation.y = rotationY;

    const back = new T.Mesh(new T.BoxGeometry(0.1, h, d), mat);
    back.position.set(-w/2, h/2, 0);
    this.add(back);

    const shelfCount = 4;
    for (let i = 0; i < shelfCount; i++) {
      const board = new T.Mesh(new T.BoxGeometry(w, 0.05, d), mat);
      board.position.set(0, (i) * (h / (shelfCount)), 0);
      this.add(board);
    }
  }
}

export class Table extends T.Group {
  constructor({ x, y, z, w, h, d, mat }) {
    super();
    this.position.set(x, y, z);

    const top = new T.Mesh(new T.BoxGeometry(w, 0.05, d), mat);
    top.position.set(0, h, 0);
    this.add(top);

    const legGeo = new T.BoxGeometry(0.05, h, 0.05);
    const legPositions = [
      [-w/2 + 0.1, h/2, -d/2 + 0.1],
      [ w/2 - 0.1, h/2, -d/2 + 0.1],
      [-w/2 + 0.1, h/2,  d/2 - 0.1],
      [ w/2 - 0.1, h/2,  d/2 - 0.1],
    ];

    for (const [lx, ly, lz] of legPositions) {
      const leg = new T.Mesh(legGeo, mat);
      leg.position.set(lx, ly, lz);
      this.add(leg);
    }
  }
}

export class Couch extends T.Group {
  constructor({ x, y, z, w, h, d, mat }) {
    super();
    this.position.set(x, y, z);

    const base = new T.Mesh(new T.BoxGeometry(w, h/2, d), mat);
    base.position.set(0, h/4, 0);
    this.add(base);

    const back = new T.Mesh(new T.BoxGeometry(w, h/2, 0.1), mat);
    back.position.set(0, h*0.75, -d/2 + 0.05);
    this.add(back);
  }
}

export class Cabinet extends T.Group {
  constructor({ x, y, z, w, h, d, cabinetMat, handleMat, rotationY }) {
    super();
    // Position the whole cabinet group
    this.position.set(x, y, z);
    this.rotation.y = rotationY;

    // --- Cabinet body ---
    const wallThickness = w / 20;
    
    // Back wall
    const backGeom = new T.BoxGeometry(w, h, wallThickness);
    const backMesh = new T.Mesh(backGeom, cabinetMat);
    backMesh.position.set(0, 0, -d / 2 + wallThickness / 2);
    this.add(backMesh);

    // Left wall
    const sideGeom = new T.BoxGeometry(wallThickness, h, d);
    const leftMesh = new T.Mesh(sideGeom, cabinetMat);
    leftMesh.position.set(-w / 2 + wallThickness / 2, 0, 0);
    this.add(leftMesh);

    // Right wall
    const rightMesh = new T.Mesh(sideGeom, cabinetMat);
    rightMesh.position.set(w / 2 - wallThickness / 2, 0, 0);
    this.add(rightMesh);

    // Top
    const topGeom = new T.BoxGeometry(w, wallThickness, d);
    const topMesh = new T.Mesh(topGeom, cabinetMat);
    topMesh.position.set(0, h / 2 - wallThickness / 2, 0);
    this.add(topMesh);

    // Bottom
    const bottomMesh = new T.Mesh(topGeom, cabinetMat);
    bottomMesh.position.set(0, -h / 2 + wallThickness / 2, 0);
    this.add(bottomMesh);

    // --- Hinge (positioned on left side of cabinet opening) ---
    this.hinge = new T.Group();
    this.hinge.position.set(-w / 2 + wallThickness, 0, d / 2 - wallThickness / 2);
    this.add(this.hinge);

    // --- Door (attached to hinge) ---
    const doorWidth = w - wallThickness * 2;
    const doorHeight = h - wallThickness * 2;
    const doorGeom = new T.BoxGeometry(doorWidth, doorHeight, wallThickness);
    const doorMesh = new T.Mesh(doorGeom, cabinetMat);
    // Position door to the right of hinge, so it covers the opening
    doorMesh.position.set(doorWidth / 2, 0, 0);
    this.hinge.add(doorMesh);

    // --- Handle (attached to door, on the right side) ---
    const handleRadius = w / 15;
    const handleLength = d / 12;
    const handleGeom = new T.CylinderGeometry(
      handleRadius,
      handleRadius,
      handleLength,
      16
    );
    const handleCylinder = new T.Mesh(handleGeom, handleMat);
    handleCylinder.rotation.x = Math.PI / 2;

    // Sphere at end of handle
    const sphereGeom = new T.SphereGeometry(handleRadius * 1.5, 16, 16);
    const handleSphere = new T.Mesh(sphereGeom, handleMat);
    handleSphere.position.set(0, 0, handleLength / 2);

    // Group handle parts
    this.handle = new T.Group();
    this.handle.add(handleCylinder);
    this.handle.add(handleSphere);
    // Position handle on right side of door
    this.handle.position.set(doorWidth * 0.4, 0, wallThickness / 2 + handleLength / 2);
    doorMesh.add(this.handle);

    // Store reference to door
    this.door = doorMesh;
  }
}

export class Bed extends T.Group {
  constructor({ x, y, z, w, h, d, mattressH, mattressMat, frameMat, rotationY }) {
    super();
    
    // Position the whole bed group
    this.position.set(x, y, z);
    this.rotation.y = rotationY;
    
    // --- Four leg posts ---
    const postRadius = w / 40;
    const postHeight = h / 6;
    const postGeom = new T.CylinderGeometry(postRadius, postRadius, postHeight, 16);
    
    // Front left post
    const frontLeft = new T.Mesh(postGeom, frameMat);
    frontLeft.position.set(-w / 2 + postRadius * 2, postHeight / 2, d / 2 - postRadius * 2);
    this.add(frontLeft);
    
    // Front right post
    const frontRight = new T.Mesh(postGeom, frameMat);
    frontRight.position.set(w / 2 - postRadius * 2, postHeight / 2, d / 2 - postRadius * 2);
    this.add(frontRight);
    
    // Back left post
    const backLeft = new T.Mesh(postGeom, frameMat);
    backLeft.position.set(-w / 2 + postRadius * 2, postHeight / 2, -d / 2 + postRadius * 2);
    this.add(backLeft);
    
    // Back right post
    const backRight = new T.Mesh(postGeom, frameMat);
    backRight.position.set(w / 2 - postRadius * 2, postHeight / 2, -d / 2 + postRadius * 2);
    this.add(backRight);
    
    // --- Mattress ---
    const mattressGeom = new T.BoxGeometry(w, mattressH, d);
    const mattressMesh = new T.Mesh(mattressGeom, mattressMat);
    mattressMesh.position.set(0, postHeight + mattressH / 2, 0);
    this.add(mattressMesh);
    
    // --- Headboard ---
    const headboardThickness = w / 20;
    const headboardHeight = h * 0.6;
    const headboardGeom = new T.BoxGeometry(w, headboardHeight, headboardThickness);
    const headboardMesh = new T.Mesh(headboardGeom, frameMat);
    headboardMesh.position.set(0, postHeight + headboardHeight / 2, -d / 2 - headboardThickness / 2);
    this.add(headboardMesh);
    
    // Store references
    this.mattress = mattressMesh;
    this.headboard = headboardMesh;
    this.posts = [frontLeft, frontRight, backLeft, backRight];
  }
}


export class SlidingDrawer extends T.Group {
  constructor({ x, y, z, w, h, d, drawerMat, handleMat, rotationY }) {
    super();
    // Position the whole drawer group
    this.position.set(x, y, z);
    this.rotation.y = rotationY;

    // --- Cabinet body (bottom 2/3) ---
    const bodyHeight = (2 * h) / 3;
    const bodyGeom = new T.BoxGeometry(w, bodyHeight, d);
    const bodyMesh = new T.Mesh(bodyGeom, drawerMat);
    bodyMesh.position.set(0, -h / 6, 0); // center body in lower part
    this.add(bodyMesh);

    // --- Fixed top surface (doesn't move when drawer opens) ---
    const wallThickness = h / 50; // thin top surface
    const topGeom = new T.BoxGeometry(w, wallThickness, d);
    const topMesh = new T.Mesh(topGeom, drawerMat);
    topMesh.position.set(0, h / 2 - wallThickness, 0);
    this.add(topMesh);


    // --- Sliding drawer box (open front) ---
    const drawerHeight = h / 3 - wallThickness;
    const drawerDepth = d; // full depth to align with front

    
    // Fixed edges where the drawer move
    // Drawer back
    const backStaticGeom = new T.BoxGeometry(w, drawerHeight, wallThickness);
    const backStaticMesh = new T.Mesh(backStaticGeom, drawerMat);
    backStaticMesh.position.set(0, drawerHeight, -drawerDepth / 2 + wallThickness / 2);
    this.add(backStaticMesh);

    // Drawer left side
    const sideStaticGeom = new T.BoxGeometry(wallThickness, drawerHeight, drawerDepth);
    const leftStaticMesh = new T.Mesh(sideStaticGeom, drawerMat);
    leftStaticMesh.position.set(-w / 2 + wallThickness / 2, drawerHeight, 0);
    this.add(leftStaticMesh);

    // Drawer right side
    const rightStaticMesh = new T.Mesh(sideStaticGeom, drawerMat);
    rightStaticMesh.position.set(w / 2 - wallThickness / 2, drawerHeight, 0);
    this.add(rightStaticMesh);


    this.drawer = new T.Group();
    this.drawer.position.set(0, drawerHeight, 0); // align with top of body
    this.add(this.drawer);

    // Drawer bottom
    const bottomGeom = new T.BoxGeometry(w, wallThickness, drawerDepth);
    const bottomMesh = new T.Mesh(bottomGeom, drawerMat);
    bottomMesh.position.set(0, -drawerHeight / 2 + wallThickness / 2, 0);
    this.drawer.add(bottomMesh);

    // Drawer back
    const backGeom = new T.BoxGeometry(w, drawerHeight, wallThickness);
    const backMesh = new T.Mesh(backGeom, drawerMat);
    backMesh.position.set(0, 0, -drawerDepth / 2 + wallThickness / 2);
    this.drawer.add(backMesh);

    // Drawer left side
    const sideGeom = new T.BoxGeometry(wallThickness, drawerHeight, drawerDepth);
    const leftMesh = new T.Mesh(sideGeom, drawerMat);
    leftMesh.position.set(-w / 2 + wallThickness / 2, 0, 0);
    this.drawer.add(leftMesh);

    // Drawer right side
    const rightMesh = new T.Mesh(sideGeom, drawerMat);
    rightMesh.position.set(w / 2 - wallThickness / 2, 0, 0);
    this.drawer.add(rightMesh);

    // Drawer front face
    const frontGeom = new T.BoxGeometry(w, drawerHeight, wallThickness);
    const frontMesh = new T.Mesh(frontGeom, drawerMat);
    frontMesh.position.set(0, 0, drawerDepth / 2 - wallThickness / 2);
    this.drawer.add(frontMesh);

    // --- Improved Handle (cylinder + sphere) ---
    const handleRadius = w / 15; // smaller than before
    const handleLength = d / 12;
    const handleGeom = new T.CylinderGeometry(
      handleRadius,
      handleRadius,
      handleLength,
      16
    );
    const handleCylinder = new T.Mesh(handleGeom, handleMat);
    handleCylinder.rotation.x = Math.PI / 2;

    // Sphere at end of handle
    const sphereGeom = new T.SphereGeometry(handleRadius * 1.5, 16, 16);
    const handleSphere = new T.Mesh(sphereGeom, handleMat);
    handleSphere.position.set(0, 0, handleLength / 2);

    // Group handle parts
    this.handle = new T.Group();
    this.handle.add(handleCylinder);
    this.handle.add(handleSphere);
    this.handle.position.set(0, 0, drawerDepth / 2 + handleLength / 2);
    this.drawer.add(this.handle);
  }
}

/**
 * The giant eye that peers through windows
 */
export class GiantEye extends T.Group {
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

    const geom = new T.SphereGeometry(0.6, 32, 32);
    const mat = new T.MeshPhongMaterial({
      map: texture,
      color: 0xffffff,
      shininess: 30,
    });
    this.mesh = new T.Mesh(geom, mat);
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
      const outward = new T.Vector3(0, 0, -1).applyQuaternion(this.windowTarget.quaternion);
      const eyePos = lookPos.clone().add(outward.multiplyScalar(1.4)); // just outside window
      this.position.copy(eyePos);
      this.mesh.lookAt(lookPos);
    }

    if (this.visibleNow) {
      // Gently sway
      this.rotation.y += dt*0.2;

      // Vision check (lose condition)
      const playerPos = this.getPlayerPos();
      const toPlayer = new T.Vector3().subVectors(playerPos, this.position);
      const dist = toPlayer.length();
      if (dist < CONFIG.eye.sightDistance) {
        const dir = toPlayer.normalize();
        const eyeForward = new T.Vector3(0,0,1).applyQuaternion(this.mesh.quaternion);
        const angle = Math.acos(T.MathUtils.clamp(eyeForward.dot(dir), -1, 1));
        if (angle < CONFIG.eye.fov) {
          // Check line of sight (ray no obstacles)
          const ray = new T.Raycaster(this.position, dir, 0, dist);
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

// Base Note class that extends THREE.Group
export class Note extends T.Group {
  constructor({ x = 0, y = 0, z = 0, material, useShineShader = false }) {
    super();
    
    this.position.set(x, y, z);
    this.useShineShader = useShineShader;
    this.shineMaterial = null;
    
    // Create shine shader material if needed
    if (useShineShader) {
      this.shineMaterial = createShineShader();
    }
    
    // Create a visual representation (paper/note) - make it bigger and vertical
    const geom = new T.PlaneGeometry(0.3, 0.4);
    const noteMaterial = useShineShader ? this.shineMaterial : material;
    this.mesh = new T.Mesh(geom, noteMaterial);
    
    // Keep it vertical (not flat) so it's easier to see and interact with
    this.mesh.rotation.y = Math.PI; // Face forward
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.add(this.mesh);
    
    this.baseMaterial = material; // Store base material for switching
    
    // Add a subtle glow or highlight
    const glowGeom = new T.PlaneGeometry(0.35, 0.45);
    const glowMat = new T.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.4,
      side: T.DoubleSide
    });
    this.glow = new T.Mesh(glowGeom, glowMat);
    this.glow.rotation.y = Math.PI;
    this.glow.position.z = -0.01; // Slightly behind the note
    this.add(this.glow);
    
    // Add an invisible sphere collider for easier interaction detection
    const sphereGeom = new T.SphereGeometry(0.5, 8, 8);
    const sphereMat = new T.MeshBasicMaterial({
      visible: false, // Invisible
      transparent: true,
      opacity: 0
    });
    this.collider = new T.Mesh(sphereGeom, sphereMat);
    this.add(this.collider);
  }
  
  setShineShader(enabled) {
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







