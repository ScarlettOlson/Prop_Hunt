import * as T from '../CS559-Three/build/three.module.js';
import { HingedDoor } from './interactive.js';



export function createHouse(w, h, d, t, floorMat, wallMat, frameMat, doorMat, handleMat, windowMat) {
    const doorW = 1.5;
    const doorH = Math.min(h, 2.5);
    
    // Create Groups
    const house = new T.Group();
    let groundObjs = [];
    let obstacles = [];
    let interactables = [];

    // Create Floor and ceiling
    const floor = createFloor(w, d, 0.01, floorMat);
    const ceil = createFloor(w, d, h, floorMat);
    house.add(floor);
    house.add(ceil);
    groundObjs.push(floor);
    obstacles.push(floor);

    // Create all walls except front
    const backWall = createWall(0, h/2, -d/2, w, h, t, wallMat);
    const leftWall = createWall(-w/2, h/2, 0, t, h, d, wallMat);
    const rightWall = createWall(w/2, h/2, 0, t, h, d, wallMat);
    house.add(backWall);
    house.add(leftWall);
    house.add(rightWall);
    obstacles.push(backWall);
    obstacles.push(leftWall);
    obstacles.push(rightWall);

    // Create Front door, wall, and windows
    const frontDoor = new HingedDoor({
        x:0, y:doorH/2, z:d/2, width:doorW, height:doorH, depth:t, frameMat:frameMat,
        doorMat:doorMat, handleMat:handleMat
    })
    // const frontDoor = createDoor(
    //     0, doorH/2 , d/2, doorW, doorH, t, frameMat, doorMat
    // );
    const frontDoorWall = createWall(0, (h+doorH)/2, d/2, doorW, (h-doorH), t, wallMat);
    const frontLeftWall = createWallWithWindow(
       (w+doorW)/4, h/2, d/2, (w-doorW)/2, h, t, 
        1.5, 0, 1.2, 1,
        wallMat, frameMat, windowMat, Math.PI 
    );
    const frontRightWall = createWallWithWindow(
        -(w+doorW)/4, h/2, d/2, (w-doorW)/2, h, t, 
        -1.5, 0, 1.2, 1,
        wallMat, frameMat, windowMat, Math.PI 
    );
    house.add(frontDoor);
    house.add(frontDoorWall);
    house.add(frontLeftWall);
    house.add(frontRightWall);
    interactables.push(frontDoor);
    obstacles.push(frontLeftWall);
    obstacles.push(frontRightWall);
    obstacles.push(frontDoor);    
    obstacles.push(frontDoorWall);

    // Create a living room at the front of the house

    // Create internal walls to build rooms
    const kitchenHallWall = createWallWithPassage(
        5, h/2, 7+t/2, 7.5-t, h, t, 1, doorW, doorH, wallMat, -Math.PI/2
    );
    const kitchenDiningWall = createWallWithPassage(
        8, h/2, 3.5, 6, h, t, 0, doorW, doorH, wallMat, 0
    );
    house.add(kitchenHallWall);
    house.add(kitchenDiningWall);

    
    // Create Door to the basement
    const basementDoor = createDoor(
        0, doorH/2, -d/2 - t/2, doorW, doorH, t, frameMat, doorMat
    );
    house.add(basementDoor.frame);
    obstacles.push(basementDoor.door, basementDoor.frameLeft, basementDoor.frameTop, basementDoor.frameRight);

    return {house, groundObjs, obstacles, interactables};
}

// Helper function to create walls
export function createWall(x, y, z, w, h, d, mat) {
    const wall = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    
    return wall;
};

export function createWallWithWindow(
    x, y, z, w, h, t,
    winOffsetX, winOffsetY, winW, winH,
    wallMat, frameMat, glassMat,
    rotationY = 0
) {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotationY;

    // Window bounds relative to wall center
    const winBottom = winOffsetY - winH/2;
    const winTop    = winOffsetY + winH/2;
    const winLeft   = winOffsetX - winW/2;
    const winRight  = winOffsetX + winW/2;

    // --- Top wall segment ---
    const topHeight = h/2 - winTop;
    if (topHeight > 0) {
        const topWall = new T.Mesh(new T.BoxGeometry(w, topHeight, t), wallMat);
        topWall.position.set(0, winTop + topHeight/2, 0);
        group.add(topWall);
    }

    // --- Bottom wall segment ---
    const bottomHeight = winBottom - (-h/2);
    if (bottomHeight > 0) {
        const bottomWall = new T.Mesh(new T.BoxGeometry(w, bottomHeight, t), wallMat);
        bottomWall.position.set(0, -h/2 + bottomHeight/2, 0);
        group.add(bottomWall);
    }

    // --- Left wall segment ---
    const leftWidth = winLeft - (-w/2);
    if (leftWidth > 0) {
        const leftWall = new T.Mesh(new T.BoxGeometry(leftWidth, winH, t), wallMat);
        leftWall.position.set(-w/2 + leftWidth/2, winOffsetY, 0);
        group.add(leftWall);
    }

    // --- Right wall segment ---
    const rightWidth = w/2 - winRight;
    if (rightWidth > 0) {
        const rightWall = new T.Mesh(new T.BoxGeometry(rightWidth, winH, t), wallMat);
        rightWall.position.set(w/2 - rightWidth/2, winOffsetY, 0);
        group.add(rightWall);
    }

    // --- Window itself ---
    const window = createWindow(winOffsetX, winOffsetY, 0, winW, winH, t, frameMat, glassMat);
    group.add(window.window);

    return group;
}

export function createWallWithPassage(
    x, y, z, w, h, t,
    passageOffsetX, passageW, passageH,
    wallMat,
    rotationY = 0
) {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotationY;

    // Passage bounds relative to wall center
    const passLeft  = passageOffsetX - passageW/2;
    const passRight = passageOffsetX + passageW/2;
    const passTop   = passageH;

    // --- Left wall segment ---
    const leftWidth = passLeft - (-w/2);
    if (leftWidth > 0) {
        const leftWall = new T.Mesh(new T.BoxGeometry(leftWidth, h, t), wallMat);
        leftWall.position.set(-w/2 + leftWidth/2, 0, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        group.add(leftWall);
    }

    // --- Right wall segment ---
    const rightWidth = w/2 - passRight;
    if (rightWidth > 0) {
        const rightWall = new T.Mesh(new T.BoxGeometry(rightWidth, h, t), wallMat);
        rightWall.position.set(w/2 - rightWidth/2, 0, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        group.add(rightWall);
    }

    // --- Top wall segment (above passage) ---
    const topHeight = h - passageH;
    if (topHeight > 0) {
        const topWall = new T.Mesh(new T.BoxGeometry(passageW, topHeight, t), wallMat);
        topWall.position.set(passageOffsetX, passageH + topHeight/2 - h/2, 0);
        topWall.castShadow = true;
        topWall.receiveShadow = true;
        group.add(topWall);
    }

    return group;
}





// Helper functoin to create floor
export function createFloor(w, d, h, mat) {
    // Floor (interior)
    const floor = new T.Mesh(new T.PlaneGeometry(w, d), mat);

    floor.position.set(0, h, 0);

    floor.rotation.x = -Math.PI/2;
    floor.material.side = T.DoubleSide; // Render both sides
    floor.receiveShadow = true;

    return floor;
}

export function createDoor(x, y, z, w, h, t, frameMat, doorMat, handleMat, rotationY) {
    // Create the Frame of the door
    const frame = new T.Group();
    frame.position.set(x, y, z);
    

    const frameTop = new T.Mesh(new T.BoxGeometry(w, t, t), frameMat);
    frameTop.position.set(0, (h-t)/2, 0);
    frameTop.castShadow = true;
    frameTop.receiveShadow = true;
    frame.add(frameTop);

    const frameLeft = new T.Mesh(new T.BoxGeometry(t, h, t), frameMat);
    frameLeft.position.set((-w + t)/2, 0, 0);
    frameLeft.castShadow = true;
    frameLeft.receiveShadow = true;
    frame.add(frameLeft);

    const frameRight = new T.Mesh(new T.BoxGeometry(t, h, t), frameMat);
    frameRight.position.set((w - t)/2, 0, 0);
    frameRight.castShadow = true;
    frameRight.receiveShadow = true;
    frame.add(frameRight);

    // Create the door for the frame
    const door = new T.Mesh(new T.BoxGeometry(w - 2*t, h-t, t), doorMat);
    door.position.set(0, -t/2, 0);
    door.castShadow = true;
    door.receiveShadow = true;
    frame.add(door);

    // Create a handle for each side of the door
    const frontHandle = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.15, 16), handleMat);
    frontHandle.rotation.x = Math.PI / 2; // Lay it horizontally
    frontHandle.position.set(1*w/4, 0, t/2);
    frame.add(frontHandle);

    const backHandle = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.15, 16), handleMat);
    backHandle.rotation.x = -Math.PI / 2; // Lay it horizontally
    backHandle.position.set(1*w/4, 0, -t/2);
    frame.add(backHandle);

    return { frame, door, frameLeft, frameTop, frameRight };
}

export function createWindow(x, y, z, w, h, t, frameMat, glassMat, rotationY=0) {
    const window = new T.Group();
    window.position.set(x, y, z);
    window.rotation.y = rotationY;

    // Window frame
    const frameTop = new T.Mesh(new T.BoxGeometry(w-t, t, t), frameMat);
    frameTop.position.set(0, (h-t)/2, 0);
    frameTop.castShadow = true;
    frameTop.receiveShadow = true;
    window.add(frameTop);

    const frameBottom = new T.Mesh(new T.BoxGeometry(w-t, t, t), frameMat);
    frameBottom.position.set(0, (-h+t)/2, 0);
    frameBottom.castShadow = true;
    frameBottom.receiveShadow = true;
    window.add(frameBottom);

    const frameLeft = new T.Mesh(new T.BoxGeometry(t, h, t), frameMat);
    frameLeft.position.set((-w+t)/2, 0, 0);
    frameLeft.castShadow = true;
    frameLeft.receiveShadow = true;
    window.add(frameLeft);

    const frameRight = new T.Mesh(new T.BoxGeometry(t, h, t), frameMat);
    frameRight.position.set((w-t)/2, 0, 0);
    frameRight.castShadow = true;
    frameRight.receiveShadow = true;
    window.add(frameRight);

    // Window glass
    const glass = new T.Mesh(new T.PlaneGeometry(w, h), glassMat);
    glass.position.z = 0.05;
    window.add(glass);

    return {window, frameBottom, frameLeft, frameTop, frameRight, glass };
}

export function createBookshelf(x, y, z, w, h, d, mat) {
    const shelf = new T.Group();
    shelf.position.set(x, y, z);

    const back = new T.Mesh(new T.BoxGeometry(0.1, h, d), mat);
    back.position.set(0, h/2, 0);
    shelf.add(back);

    const shelfCount = 4;
    for (let i = 0; i < shelfCount; i++) {
        const board = new T.Mesh(new T.BoxGeometry(w, 0.05, d), mat);
        board.position.set(0, (i + 1) * (h / (shelfCount + 1)), 0);
        shelf.add(board);
    }

    return shelf;
}

export function createTable(x, y, z, w, h, d, mat) {
    const table = new T.Group();
    table.position.set(x, y, z);

    const top = new T.Mesh(new T.BoxGeometry(w, 0.05, d), mat);
    top.position.set(0, h, 0);
    table.add(top);

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
        table.add(leg);
    }

    return table;
}

export function createCouch(x, y, z, w, h, d, mat) {
    const couch = new T.Group();
    couch.position.set(x, y, z);

    const base = new T.Mesh(new T.BoxGeometry(w, h/2, d), mat);
    base.position.set(0, h/4, 0);
    couch.add(base);

    const back = new T.Mesh(new T.BoxGeometry(w, h/2, 0.1), mat);
    back.position.set(0, h*0.75, -d/2 + 0.05);
    couch.add(back);

    return couch;
}

export function createCabinet(x, y, z, w, h, d, mat) {
    const cab = new T.Group();
    cab.position.set(x, y, z);

    const body = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    body.position.set(0, h/2, 0);
    cab.add(body);

    return cab;
}







