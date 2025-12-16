import * as T from '../CS559-Three/build/three.module.js';
import { InteractiveCabinet, InteractiveDoor, InteractiveDrawer, InteractiveNote, BasementDoor } from './interactive.js';



export function createHouse(
  w, h, d, t, 
  floorMat, ceilingMat, wallMat, frameMat, doorMat, handleMat, glassMat,
  couchMat, bookshelfMat, drawerMat, noteMat, tableMat, isPrototype
) {
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
  const exterior = createHouseExterior(w, h, d, t, floorMat, wallMat, frameMat, doorMat, handleMat, glassMat);
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
  const bedroomFurniture = createBedroomFurniture(couchMat, frameMat, drawerMat, handleMat, bookshelfMat);
  bedroomFurniture.objects.forEach(obj => house.add(obj));
  bedroomFurniture.obstacles.forEach(obj => obstacles.push(obj));
  bedroomFurniture.interactables.forEach(obj => interactables.push(obj));


  const kitchen = createKitchen({
    x: 7, y: 0, z: 6.5,
    w: 6, h: h, d: 7,
    wallT: t, wallMat, drawerMat, handleMat,
    doorW, doorH
  });
  kitchen.objects.forEach(obj => house.add(obj));
  kitchen.obstacles.forEach(obj => obstacles.push(obj));
  kitchen.interactables.forEach(obj => interactables.push(obj));

  // Create the dining Room
  const diningRoom = createDiningRoom(h, t, wallMat, tableMat, doorW, doorH);
  diningRoom.objects.forEach(obj => house.add(obj));
  diningRoom.obstacles.forEach(obj => obstacles.push(obj));

  // Create the basement rooom
  const basementRoom = createBasementRoom(h, t, wallMat, frameMat, doorW, doorH, doorMat, handleMat);
  basementRoom.objects.forEach(obj => house.add(obj));
  basementRoom.obstacles.forEach(obj => obstacles.push(obj));
  basementRoom.interactables.forEach(obj => interactables.push(obj));

  // Create the Living Room
  const livingRoom = createLivingRoom(h, couchMat, tableMat, drawerMat, handleMat);
  livingRoom.objects.forEach(obj => house.add(obj));
  livingRoom.obstacles.forEach(obj => obstacles.push(obj));
  livingRoom.interactables.forEach(obj => interactables.push(obj));

  // Create and place the notes
  // First Note is on a shelf in the fartest away door
  const note1 = new InteractiveNote({
    passwordPiece: '26',
    content: 'I found this note hidden on the old bookshelf.\nIndex: 1\nPassword piece: 26',
    material: noteMat,
    position: new T.Vector3(-2.3, 1.8, -6),
    passwordIndex: 0,
    useShineShader: !isPrototype,
    rotationY: 0,
  });
  const note2 = new InteractiveNote({
    passwordPiece: '43',
    content: 'I found this note hidden in the bedroom closet\nIndex: 2\nPassword piece: 43',
    material: noteMat,
    position: new T.Vector3(-6, 1.5, 2.2),
    passwordIndex: 1,
    useShineShader: !isPrototype,
    rotationY: Math.PI,
  });
  const note3 = new InteractiveNote({
    passwordPiece: '91',
    content: 'I found this note hidden in the kitchen cupboard\nIndex: 3\nPassword piece: 91',
    material: noteMat,
    position: new T.Vector3(9.6, 1.5, 6.2),
    passwordIndex: 2,
    useShineShader: !isPrototype,
    rotationY: Math.PI/2,
  });
  house.add(note1, note2, note3);
  interactables.push(note1, note2, note3);

  return { house, groundObjs, obstacles, interactables };
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
  const frontZ = d / 2 + t / 2;
  const rightX = w / 2 + t / 2
  const backZ = -frontZ;
  const leftX = -rightX;

  // Create Front walls, Windows, and Door
  // Shifted to x=-0.5 to center in remaining hallway
  const frontLeftWindow = new WallWithWindow({
    x: -6, y: h / 2, z: frontZ, w: 8, h: h, t: t,
    winX: 0, winY: winY, winW: winW, winH: winH,
    wallMat: wallMat, frameMat: frameMat, glassMat: windowMat, rotationY: 0
  });
  const frontDoorWall = new WallWithPassage({
    x: -0.5, y: h / 2, z: frontZ, h: h, w: 3, t: t,
    passageX: 0, passageW: doorW, passageH: doorH,
    wallMat: wallMat, rotationY: 0
  })
  const frontDoor = new Door({
    x: -0.5, y: doorH / 2, z: frontZ,
    w: doorW, h: doorH, t: t,
    frameMat, doorMat, handleMat, rotationY: 0
  });
  const frontCenterWindow = new WallWithWindow({
    x: 3.5, y: h / 2, z: frontZ,
    w: 5, h: h, t: t,
    winX: -0.5, winY: winY, winW: winW, winH: winH,
    wallMat: wallMat, frameMat: frameMat, glassMat: windowMat, rotationY: 0
  });
  const frontRightWindow = new WallWithWindow({
    x: 8, y: h / 2, z: frontZ,
    w: 4, h: h, t: t,
    winX: 0, winY: winY, winW: winW, winH: winH,
    wallMat: wallMat, frameMat: frameMat, glassMat: windowMat, rotationY: 0
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
    x: rightX, y: h / 2, z: 7, w: 6, h: h, t: t,
    winX: 1, winY: winY, winW: winW, winH: winH,
    wallMat: wallMat, frameMat: frameMat, glassMat: windowMat, rotationY: -Math.PI / 2
  });
  const rightCenterWindow = new WallWithWindow({
    x: rightX, y: h / 2, z: 1, w: 6, h: h, t: t,
    winX: 0, winY: winY, winW: winW, winH: winH,
    wallMat: wallMat, frameMat: frameMat, glassMat: windowMat, rotationY: -Math.PI / 2
  });
  const rightBackWall = new Wall({
    x: rightX, y: h / 2, z: -6,
    w: 8, h: h, t: t, mat: wallMat, rotationY: Math.PI / 2
  });
  group.add(rightFrontWindow);
  group.add(rightCenterWindow);
  group.add(rightBackWall);
  obstacles.push(rightFrontWindow);
  obstacles.push(rightCenterWindow);
  obstacles.push(rightBackWall);

  // Create the Back Walls and Windows
  const backRightWall = new Wall({
    x: 6, y: h / 2, z: backZ,
    w: 8, h: h, t: t,
    mat: wallMat, rotationY: 0
  });
  const backCenterWindow = new WallWithWindow({
    x: -1, y: h / 2, z: backZ,
    w: 6, h: h, t: t,
    winX: -1, winY: winY, winW: 2 * winW, winH: 1.5 * winH,
    wallMat, frameMat, glassMat: windowMat, rotationY: Math.PI
  });
  const backLeftWindow = new WallWithWindow({
    x: -7, y: h / 2, z: backZ,
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
    x: leftX, y: h / 2, z: -7.5,
    w: 5, h: h, t: t,
    winX: 0, winY: winY, winW, winH,
    wallMat, frameMat, glassMat: windowMat, rotationY: -Math.PI / 2
  });
  const leftCenterWindow = new WallWithWindow({
    x: leftX, y: h / 2, z: -1.5,
    w: 7, h: h, t: t,
    winX: 0, winY: winY, winW, winH,
    wallMat, frameMat, glassMat: windowMat, rotationY: -Math.PI / 2
  });
  const leftFrontWindow = new WallWithWindow({
    x: leftX, y: h / 2, z: 6,
    w: 8, h: h, t: t,
    winX: 0, winY: winY, winW, winH,
    wallMat, frameMat, glassMat: windowMat, rotationY: -Math.PI / 2
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
    x: -2, y: h / 2, z: 6, w: 8, h, t,
    passageX: 0, passageW: doorW, passageH: doorH,
    wallMat, rotationY: -Math.PI / 2
  });
  const bedroomDoor1 = new InteractiveDoor({
    x: -2, y: doorH / 2, z: 6, w: doorW, h: doorH, t: t,
    frameMat, doorMat, handleMat, rotationY: -Math.PI / 2
  });
  group.add(bedroomHallwayWall1);
  group.add(bedroomDoor1);
  obstacles.push(bedroomHallwayWall1);
  obstacles.push(bedroomDoor1);
  interactables.push(bedroomDoor1);

  const bedroomHallwayWall2 = new WallWithPassage({
    x: -2, y: h / 2, z: -2, w: 8, h, t,
    passageX: -2, passageW: doorW, passageH: doorH,
    wallMat, rotationY: Math.PI / 2
  });
  const bedroomDoor2 = new InteractiveDoor({
    x: -2, y: doorH / 2, z: 0, w: doorW, h: doorH, t: t,
    frameMat, doorMat, handleMat, rotationY: -Math.PI / 2
  });
  group.add(bedroomHallwayWall2);
  group.add(bedroomDoor2);
  obstacles.push(bedroomHallwayWall2);
  obstacles.push(bedroomDoor2);
  interactables.push(bedroomDoor2);

  const bedroomHallwayWall3 = new WallWithPassage({
    x: -2, y: h / 2, z: -8, w: 4, h, t,
    passageX: 0, passageW: doorW, passageH: doorH,
    wallMat, rotationY: Math.PI / 2
  });
  const bedroomDoor3 = new InteractiveDoor({
    x: -2, y: doorH / 2, z: -8, w: doorW, h: doorH, t: t,
    frameMat, doorMat, handleMat, rotationY: -Math.PI / 2
  });
  group.add(bedroomHallwayWall3);
  group.add(bedroomDoor3);
  obstacles.push(bedroomHallwayWall3);
  obstacles.push(bedroomDoor3);
  interactables.push(bedroomDoor3);

  // Create walls separating the bedrooms
  const bedroomSeperateWall1 = new Wall({ x: -6, y: h / 2, z: 2, w: 8, h, t: t, mat: wallMat });
  const bedroomSeperateWall2 = new Wall({ x: -6, y: h / 2, z: -5, w: 8, h, t: t, mat: wallMat });
  group.add(bedroomSeperateWall1);
  group.add(bedroomSeperateWall2);
  obstacles.push(bedroomSeperateWall1);
  obstacles.push(bedroomSeperateWall2);

  return { group, obstacles, interactables };
}

export function createBedroomFurniture(bedMat, frameMat, drawerMat, handleMat, bookshelfMat) {
  let objects = [];
  let obstacles = [];
  let interactables = [];

  // Create Beds for each of the rooms
  const bed1 = new Bed({
    x: -9.1, y: 0, z: 8.4, w: 1.5, h: 3, d: 3, mattressH: 0.5,
    mattressMat: bedMat, frameMat, rotationY: Math.PI
  });
  const bed2 = new Bed({
    x: -8.4, y: 0, z: 1.1, w: 1.5, h: 3, d: 3, mattressH: 0.5,
    mattressMat: bedMat, frameMat, rotationY: Math.PI / 2
  });
  const bed3 = new Bed({
    x: -9.1, y: 0, z: -8.4, w: 1.5, h: 3, d: 3, mattressH: 0.5,
    mattressMat: bedMat, frameMat, rotationY: 0
  });
  objects.push(bed1, bed2, bed3);
  obstacles.push(bed1, bed2, bed3);


  // Create nightstand beside beds
  const nightstand1 = new InteractiveDrawer({
    x: -7.75, y: 0, z: 9.5, w: 1, h: 3, d: 1,
    drawerMat, handleMat, rotationY: Math.PI
  });
  const nightstand2 = new InteractiveDrawer({
    x: -9.2, y: 0, z: -0.2, w: 1, h: 3, d: 1,
    drawerMat, handleMat, rotationY: Math.PI / 2
  });
  const nightstand3 = new InteractiveDrawer({
    x: -7.75, y: 0, z: -9.3, w: 1, h: 3, d: 1,
    drawerMat, handleMat, rotationY: 0
  });
  objects.push(nightstand1, nightstand2, nightstand3);
  obstacles.push(nightstand1, nightstand2, nightstand3);


  // Create Bookshelfs for each of the rooms
  const bookShelf1 = new Bookshelf({
    x: -8.5, y: 0.05, z: 2.5, w: 0.8, h: 2, d: 3,
    mat: bookshelfMat, rotationY: -Math.PI / 2
  });
  const bookShelf2 = new Bookshelf({
    x: -3.5, y: 0.05, z: 2.5, w: 0.8, h: 2, d: 3,
    mat: bookshelfMat, rotationY: -Math.PI / 2
  });
  const bookShelf3 = new Bookshelf({
    x: -8.5, y: 0.05, z: -4.4, w: 0.8, h: 2, d: 3,
    mat: bookshelfMat, rotationY: -Math.PI / 2
  });
  const bookShelf4 = new Bookshelf({
    x: -3.5, y: 0.05, z: 1.4, w: 0.8, h: 2, d: 3,
    mat: bookshelfMat, rotationY: Math.PI / 2
  });
  const bookShelf5 = new Bookshelf({
    x: -3.5, y: 0.05, z: -6, w: 0.8, h: 2, d: 3,
    mat: bookshelfMat, rotationY: Math.PI / 2
  });
  const bookShelf6 = new Bookshelf({
    x: -8.5, y: 0.05, z: -6, w: 0.8, h: 2, d: 3,
    mat: bookshelfMat, rotationY: Math.PI / 2
  });

  objects.push(bookShelf1, bookShelf2, bookShelf3, bookShelf4, bookShelf5, bookShelf6);
  obstacles.push(bookShelf1, bookShelf2, bookShelf3, bookShelf4, bookShelf5, bookShelf6);

  // Create Dressers
  const dresser1 = new InteractiveCabinet({
    x: -6, y: 1.25, z: 2.5, w: 2, h: 2.5, d: 1,
    cabinetMat: drawerMat, handleMat, openAngle: 5 * Math.PI / 6
  });
  const dresser2 = new InteractiveCabinet({
    x: -6, y: 1.25, z: -4.4, w: 2, h: 2.5, d: 1,
    cabinetMat: drawerMat, handleMat, openAngle: 5 * Math.PI / 6
  });
  const dresser3 = new InteractiveCabinet({
    x: -6, y: 1.25, z: -6, w: 2, h: 2.5, d: 1,
    cabinetMat: drawerMat, handleMat,
    rotationY: Math.PI, openAngle: 5 * Math.PI / 6
  });
  objects.push(dresser1, dresser2, dresser3);
  obstacles.push(dresser1, dresser2, dresser3);
  interactables.push(dresser1, dresser2, dresser3);


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
    x: x + (-w / 2), y: y + h / 2, z: z,
    w: d, h, t: wallT,
    passageX: 0, passageW: doorW, passageH: doorH,
    wallMat, rotationY: Math.PI / 2
  });

  const diningRoomPassage = new WallWithPassage({
    x: x, y: y + (h / 2), z: z + (-d / 2),
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
      x: x + wallT / 2 + (i * drawerW),
      y: y + drawerW / 2,
      z: z + (d - drawerW) / 2,
      w: drawerW, h: drawerW, d: drawerW,
      drawerMat, handleMat, rotationY: Math.PI
    });
    objects.push(drawer);
    drawers.push(drawer);
    obstacles.push(drawer);
    interactables.push(drawer);
  }

  // Create cabinets on the other wall
  for (let i = -3; i < 0; i++) {
    const cabinet = new InteractiveCabinet({
      x: x + d / 2 - drawerW,
      y: y + drawerW,
      z: z + wallT + ((i + 0.5) * drawerW),
      w: drawerW, h: 2 * drawerW, d: drawerW,
      cabinetMat: drawerMat, handleMat, rotationY: -Math.PI / 2
    });
    objects.push(cabinet)
    obstacles.push(cabinet);
    interactables.push(cabinet);
  }

  return { objects, obstacles, interactables, drawers };
}

export function createDiningRoom(h, t, wallMat, tableMat, doorW, doorH) {
  let objects = [];
  let obstacles = [];

  const passage1 = new WallWithPassage({
    x: 7, y: h / 2, z: -4, w: 6, h, t: t,
    passageX:0, passageW: doorW, passsageH: 1,
    wallMat: wallMat

  });
  const passage2 = new WallWithPassage({
    x: 4, y: h / 2, z: -0.5, w: 7, h, t,
    passageX: -1, passageW: doorW, passageH: doorH,
    wallMat, rotationY: Math.PI / 2
  });
  objects.push(passage1, passage2);
  obstacles.push(passage1, passage2);

  const table = new Table({
    x: 7, y: 0, z: -1, w: 2, h: 1, d: 3,
    mat: tableMat
  })
  objects.push(table);
  obstacles.push(table);

  return { objects, obstacles }
}

export function createBasementRoom(h, t, wallMat, frameMat, doorW, doorH, doorMat, handleMat) {
  let objects = [];
  let obstacles = [];
  let interactables = [];

  // West Wall (separating from Hall)
  // X range [1, 4] -> West boundary is at x=1
  // Z range [3, 10] -> Center Z=6.5, Length=7
  const westWall = new WallWithPassage({
    x: 1, y: h / 2, z: 6.5, w: 7, h, t,
    passageX: 0, passageW: doorW, passageH: doorH,
    wallMat, rotationY: -Math.PI / 2
  });

  // North Wall (separating from middle/dining area) with Basement Door
  // X range [1, 4] -> Center X=2.5, Length=3
  // Z=3
  // Passage needed for door
  const northWall = new WallWithPassage({
    x: 2.5, y: h / 2, z: 3, w: 3, h, t,
    passageX: 0, passageW: doorW, passageH: doorH,
    wallMat, rotationY: 0
  });

  const basementDoor = new BasementDoor({
    x: 2.5, y: doorH / 2, z: 3, w: doorW, h: doorH, t,
    frameMat, doorMat, handleMat, rotationY: 0
  });

  objects.push(westWall, northWall, basementDoor);
  obstacles.push(westWall, northWall, basementDoor);
  interactables.push(basementDoor);

  // --- Staircase Room (Behind the door) ---
  // Extends North from z=3 to z=-3
  // X range: same as vestibule (1 to 4)

  // West Wall of staircase (x=1, z=0, len=6)
  const stairWestInfo = { x: 1, y: h / 2, z: 0, w: 6, h, t };
  const stairWest = new Wall({ ...stairWestInfo, mat: wallMat, rotationY: -Math.PI / 2 });

  // East Wall of staircase (x=4, z=0, len=6)
  const stairEastInfo = { x: 4, y: h / 2, z: 0, w: 6, h, t };
  const stairEast = new Wall({ ...stairEastInfo, mat: wallMat, rotationY: -Math.PI / 2 });

  // Rear Wall (North end) (x=2.5, z=-3, len=3)
  const stairRear = new Wall({ x: 2.5, y: h / 2, z: -3, w: 3, h, t, mat: wallMat, rotationY: 0 });

  // Ceiling/Roof for stairs? (Optional, skipping for now as per prompt "literally just a descending staircase")

  objects.push(stairWest, stairEast, stairRear);
  obstacles.push(stairWest, stairEast, stairRear);

  // --- Stairs ---
  const stairCount = 10;
  const stairW = 2.5; // fits within 3 width room
  const stairD = 0.5;
  const stairH = 0.3;
  // Starting just inside the door at z=3, going down towards z=-3
  // Door is at z=3.
  for (let i = 0; i < stairCount; i++) {
    const step = new T.Mesh(new T.BoxGeometry(stairW, stairH, stairD), wallMat);
    // Position:
    // x: center 2.5
    // z: starts at 2.5 (just past door), decreases by depth
    const zPos = 2.5 - (i * stairD);
    // y: starts at 0, decreases by height
    const yPos = -0.15 - (i * stairH);

    step.position.set(2.5, yPos, zPos);
    step.receiveShadow = true;
    objects.push(step);
    obstacles.push(step);
  }

  return { objects, obstacles, interactables };
}

export function createLivingRoom(h, couchMat, tableMat, drawerMat, handleMat) {
  let objects = [];
  let obstacles = [];
  let interactables = [];

  const couch = new Couch({
    x:9.3, y:0, z:-7, w:6, h:2, d:1.2, mat:couchMat, rotationY: -Math.PI/2
  });
  const table = new Table({
    x:4, y:0, z:-8, w:1.5, h:1, d:3, mat:tableMat,
  });
  const drawer1 = new InteractiveDrawer({
    x:3.1, y:0.75, z:-3.7, w:1.5, h:1.25, d:1.25, drawerMat, handleMat, rotationY:Math.PI
  });
  const drawer2 = new InteractiveDrawer({
    x:1.6, y:0.75, z:-3.7, w:1.5, h:1.25, d:1.25, drawerMat, handleMat, rotationY:Math.PI
  });
  objects.push(couch, table, drawer1, drawer2);
  obstacles.push(couch, table, drawer1, drawer2);
  interactables.push(drawer1, drawer2);

  return { objects, obstacles, interactables };
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
    const winBottom = winY - winH / 2;
    const winTop = winY + winH / 2;
    const winLeft = winX - winW / 2;
    const winRight = winX + winW / 2;

    // --- Top wall segment ---
    const topHeight = h / 2 - winTop;
    if (topHeight > 0) {
      const topWall = new T.Mesh(new T.BoxGeometry(w, topHeight, t), wallMat);
      topWall.position.set(0, winTop + topHeight / 2, 0);
      this.add(topWall);
    }

    // --- Bottom wall segment ---
    const bottomHeight = winBottom - (-h / 2);
    if (bottomHeight > 0) {
      const bottomWall = new T.Mesh(new T.BoxGeometry(w, bottomHeight, t), wallMat);
      bottomWall.position.set(0, -h / 2 + bottomHeight / 2, 0);
      this.add(bottomWall);
    }

    // --- Left wall segment ---
    const leftWidth = winLeft - (-w / 2);
    if (leftWidth > 0) {
      const leftWall = new T.Mesh(new T.BoxGeometry(leftWidth, winH, t), wallMat);
      leftWall.position.set(-w / 2 + leftWidth / 2, winY, 0);
      this.add(leftWall);
    }

    // --- Right wall segment ---
    const rightWidth = w / 2 - winRight;
    if (rightWidth > 0) {
      const rightWall = new T.Mesh(new T.BoxGeometry(rightWidth, winH, t), wallMat);
      rightWall.position.set(w / 2 - rightWidth / 2, winY, 0);
      this.add(rightWall);
    } WallWithPassage

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
    const passLeft = passageX - passageW / 2;
    const passRight = passageX + passageW / 2;

    // --- Left wall segment ---
    const leftWidth = passLeft - (-w / 2);
    if (leftWidth > 0) {
      const leftWall = new T.Mesh(new T.BoxGeometry(leftWidth, h, t), wallMat);
      leftWall.position.set(-w / 2 + leftWidth / 2, 0, 0);
      leftWall.castShadow = true;
      leftWall.receiveShadow = true;
      this.add(leftWall);
    }

    // --- Right wall segment ---
    const rightWidth = w / 2 - passRight;
    if (rightWidth > 0) {
      const rightWall = new T.Mesh(new T.BoxGeometry(rightWidth, h, t), wallMat);
      rightWall.position.set(w / 2 - rightWidth / 2, 0, 0);
      rightWall.castShadow = true;
      rightWall.receiveShadow = true;
      this.add(rightWall);
    }

    // --- Top wall segment (above passage) ---
    const topHeight = h - passageH;
    if (topHeight > 0) {
      const topWall = new T.Mesh(new T.BoxGeometry(passageW, topHeight, t), wallMat);
      topWall.position.set(passageX, passageH + topHeight / 2 - h / 2, 0);
      topWall.castShadow = true;
      topWall.receiveShadow = true;
      this.add(topWall);
    }
  }
}

// Classes for simple objects

export class Wall extends T.Group {
  constructor({ x, y, z, w, h, t, mat, rotationY = 0 }) {
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
    this.mesh.rotation.x = -Math.PI / 2;
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
    this.frameTop.position.set(0, (h - t) / 2, 0);
    this.frameTop.castShadow = true;
    this.frameTop.receiveShadow = true;
    this.add(this.frameTop);

    // Frame left
    this.frameLeft = new T.Mesh(new T.BoxGeometry(t, h, t), frameMat);
    this.frameLeft.position.set((-w + t) / 2, 0, 0);
    this.frameLeft.castShadow = true;
    this.frameLeft.receiveShadow = true;
    this.add(this.frameLeft);

    // Frame right
    this.frameRight = new T.Mesh(new T.BoxGeometry(t, h, t), frameMat);
    this.frameRight.position.set((w - t) / 2, 0, 0);
    this.frameRight.castShadow = true;
    this.frameRight.receiveShadow = true;
    this.add(this.frameRight);

    // Door with hinge
    this.hinge = new T.Object3D();
    this.door = new T.Mesh(new T.BoxGeometry(w - 2 * t, h - t, t), doorMat);
    this.hinge.position.set(-(w - t) / 2, 0, 0);
    this.door.position.set((w - t) / 2, -t / 2, 0);
    this.door.castShadow = true;
    this.door.receiveShadow = true;
    this.hinge.add(this.door);
    this.add(this.hinge);

    // Handles
    const frontHandle = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.15, 16), handleMat);
    frontHandle.rotation.x = Math.PI / 2;
    frontHandle.position.set(3 * w / 4, 0, t / 2);
    this.hinge.add(frontHandle);

    const backHandle = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.15, 16), handleMat);
    backHandle.rotation.x = -Math.PI / 2;
    backHandle.position.set(3 * w / 4, 0, -t / 2);
    this.hinge.add(backHandle);
  }
}

export class Window extends T.Group {
  constructor({ x, y, z, w, h, t, frameMat, glassMat, rotationY = 0 }) {
    super();
    this.position.set(x, y, z);
    this.rotation.y = rotationY;

    // Frame top
    this.frameTop = new T.Mesh(new T.BoxGeometry(w - t, t, t), frameMat);
    this.frameTop.position.set(0, (h - t) / 2, 0);
    this.frameTop.castShadow = true;
    this.frameTop.receiveShadow = true;
    this.add(this.frameTop);

    // Frame bottom
    this.frameBottom = new T.Mesh(new T.BoxGeometry(w - t, t, t), frameMat);
    this.frameBottom.position.set(0, (-h + t) / 2, 0);
    this.frameBottom.castShadow = true;
    this.frameBottom.receiveShadow = true;
    this.add(this.frameBottom);

    // Frame left
    this.frameLeft = new T.Mesh(new T.BoxGeometry(t, h, t), frameMat);
    this.frameLeft.position.set((-w + t) / 2, 0, 0);
    this.frameLeft.castShadow = true;
    this.frameLeft.receiveShadow = true;
    this.add(this.frameLeft);

    // Frame right
    this.frameRight = new T.Mesh(new T.BoxGeometry(t, h, t), frameMat);
    this.frameRight.position.set((w - t) / 2, 0, 0);
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
  constructor({ x, y, z, w, h, d, mat, rotationY = 0 }) {
    super();
    this.position.set(x, y, z);
    this.rotation.y = rotationY;

    const back = new T.Mesh(new T.BoxGeometry(0.1, h, d), mat);
    back.position.set(-w / 2, h / 2, 0);
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
      [-w / 2 + 0.1, h / 2, -d / 2 + 0.1],
      [w / 2 - 0.1, h / 2, -d / 2 + 0.1],
      [-w / 2 + 0.1, h / 2, d / 2 - 0.1],
      [w / 2 - 0.1, h / 2, d / 2 - 0.1],
    ];

    for (const [lx, ly, lz] of legPositions) {
      const leg = new T.Mesh(legGeo, mat);
      leg.position.set(lx, ly, lz);
      this.add(leg);
    }
  }
}

export class Couch extends T.Group {
  constructor({ x, y, z, w, h, d, mat, rotationY=0 }) {
    super();
    this.position.set(x, y, z);
    this.rotation.y = rotationY;

    const base = new T.Mesh(new T.BoxGeometry(w, h / 2, d), mat);
    base.position.set(0, h / 4, 0);
    this.add(base);

    const back = new T.Mesh(new T.BoxGeometry(w, h / 2, 0.1), mat);
    back.position.set(0, h * 0.75, -d / 2 + 0.05);
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
    return CONFIG.eye.intervalMin + Math.random() * (CONFIG.eye.intervalMax - CONFIG.eye.intervalMin);
  }

  chooseWindow() {
    return this.houseWindows[Math.floor(Math.random() * this.houseWindows.length)];
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
      this.rotation.y += dt * 0.2;

      // Vision check (lose condition)
      const playerPos = this.getPlayerPos();
      const toPlayer = new T.Vector3().subVectors(playerPos, this.position);
      const dist = toPlayer.length();
      if (dist < CONFIG.eye.sightDistance) {
        const dir = toPlayer.normalize();
        const eyeForward = new T.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
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







