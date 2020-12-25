"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
class Traveler {
    static travelTo(creep, destination, options = {}) {
        // uncomment if you would like to register hostile rooms entered
        // this is highly recommended
        if (!Memory.Traveler) {
            Memory.Traveler = {}
            Memory.Traveler.rooms = {}
            Memory.Traveler.Portals = {}
        }
        this.updateRoomStatus(creep.room);
        //update portals for traveler
        this.updatePortals(creep.room);
        if (!destination) {
            return ERR_INVALID_ARGS;
        }
        if (creep.fatigue > 0) {
            Traveler.circle(creep.pos, "aqua", .3);
            return ERR_TIRED;
        }
        // initialize data object
        if (!creep.memory._trav) {
            delete creep.memory._travel;
            creep.memory._trav = {};
        }
        const repathing = options.repathing ? options.repathing : false
        if (creep.memory._trav.lastMove === Game.time && !repathing) {
            return false;
        }
        if (!options.push) creep.memory._trav.lastMove = Game.time;
        //initialize our options
        const range = options.range ? options.range : 1;
        const priority = options.priority ? options.priority : 1;
        destination = this.normalizePos(destination);
        
        //get body movement Efficiency and adjust options automatically
        const muscle = this.getCreepMoveEfficiency(creep);
        if (muscle > 2) options.ignoreRoads = true;
        if (muscle > 10) options.offRoad = true;
        
        // manage case where creep is nearby destination
        let rangeToDestination = creep.pos.getRangeTo(destination);
        if (options.range && rangeToDestination <= options.range && !this.isExit(creep.pos)) {
            return OK;
        }
        else if (rangeToDestination <= 1) {
            if (rangeToDestination === 1 && !options.range) {
                let direction = creep.pos.getDirectionTo(destination);
                if (options.returnData) {
                    options.returnData.nextPos = destination;
                    options.returnData.path = direction.toString();
                }
                return creep.move(direction);
            }
            return OK;
        }
        let travelData = creep.memory._trav;
        let state = this.deserializeState(travelData, destination);
        // uncomment to visualize destination
        // this.circle(destination.pos, "orange");
        // check if creep is stuck
        if (this.isStuck(creep, state)) {
            state.stuckCount++;
            Traveler.circle(creep.pos, "magenta", state.stuckCount * .2);
        } else {
            state.stuckCount = 0;
        }
        // handle case where creep is stuck
        if (!options.stuckValue) {
            options.stuckValue = DEFAULT_STUCK_VALUE;
        }
        if (!options.push) {
            options.push = false;
        }
        if (state.stuckCount >= options.stuckValue && Math.random() > .5) {
            options.ignoreCreeps = false;
            options.freshMatrix = true;
            delete travelData.path;
        }
        // TODO:handle case where creep moved by some other function, but destination is still the same
        // delete path cache if destination is different
        if (!this.samePos(state.destination, destination)) {
            if (options.movingTarget && state.destination.isNearTo(destination)) {
                travelData.path += state.destination.getDirectionTo(destination);
                state.destination = destination;
            } else {
                delete travelData.path;
            }
        }
        if (options.repath && Math.random() < options.repath) {
            // add some chance that you will find a new path randomly
            delete travelData.path;
        }
        // pathfinding
        let newPath = false;
        if (!travelData.path) {
            newPath = true;
            if (creep.spawning) {
                return ERR_BUSY;
            }
            state.destination = destination;
            let cpu = Game.cpu.getUsed();
            let ret = this.findTravelPath(creep.pos, destination, options);
            let cpuUsed = Game.cpu.getUsed() - cpu;
            state.cpu = _.round(cpuUsed + state.cpu);
            if (state.cpu > REPORT_CPU_THRESHOLD) {
                // see note at end of file for more info on this
                console.log(`TRAVELER: heavy cpu use: ${creep.name}, cpu: ${state.cpu} origin: ${creep.pos}, dest: ${destination}`);
            }
            let color = "orange";
            if (ret.incomplete) {
                // uncommenting this is a great way to diagnose creep behavior issues
                // console.log(`TRAVELER: incomplete path for ${creep.name}`);
                color = "red";
            }
            if (options.returnData) {
                options.returnData.pathfinderReturn = ret;
            }
            travelData.path = Traveler.serializePath(creep.pos, ret.path, color);
            state.stuckCount = 0;
        }
        this.serializeState(creep, destination, state, travelData);
        if (!travelData.path || travelData.path.length === 0) {
            return ERR_NO_PATH;
        }
        // consume path
        if (state.stuckCount === 0 && !newPath) {
            travelData.path = travelData.path.substr(1);
        }
        let nextDirection = parseInt(travelData.path[0], 10);
        if (options.returnData) {
            if (nextDirection) {
                let nextPos = Traveler.positionAtDirection(creep.pos, nextDirection);
                if (nextPos) {
                    options.returnData.nextPos = nextPos;
                }
            }
            options.returnData.state = state;
            options.returnData.path = travelData.path;
        }
        
        //Don't push
        if (!(state.stuckCount > 0  || options.push)) {
            return creep.move(nextDirection);
        }
        //Find if a creep is blocking our movement
        const blocker = creep.pos.findInRange(FIND_MY_CREEPS, 1, {filter: c => creep.pos.getDirectionTo(c) === nextDirection})[0];
        if (blocker) {
            //ignore if fatigued and creeps that have already moved.
            if (!blocker.memory._trav || !blocker.memory._trav.target) {
                //hasn't run yet... Lets swap in case the creep is idle
                this.travelTo(blocker, creep.pos, {range: 0}); //swap
                if (blocker._trav){
                    blocker._trav.state[STATE_STUCK] = 999 //force repath in case it moved out of range
                }
            } else {
                if (blocker.memory._trav.lastMove < Game.time-2) { //blocker has not moved for 2 ticks.. Working or idle
                    if (!blocker.fatigue) { //no fatigue, should be idle or poorly built.
                        const blockerPriority = blocker.memory._trav.target.priority;
                        const blockerTarget = new RoomPosition(blocker.memory._trav.target.x, blocker.memory._trav.target.y, blocker.memory._trav.target.roomName);
                        const blockerRange = blocker.memory._trav.target.range;
                        const currentRange = blocker.pos.getRangeTo(blockerTarget);
                        //Can we move closer?
                        if (currentRange > 1) {
                            this.travelTo(blocker,blockerTarget, {push: true, range: 1, repath: true}); //push to target
                        } else {
                            //if a higher priority, swap
                            if (priority > blockerPriority) {
                                //move to a new free position if able
                                if (!this.moveToNewFreePosition(blocker, blockerTarget)) {
                                    this.travelTo(blocker, creep.pos, {push:true, range: 0})
                                    delete blocker.memory._trav.path //force repath in case it moved out of range
                                }
                            } else {
                                if (blockerRange !== 0) {
                                    //less than or equal priority.. Can you move the blocker to an adjacent position and make room for us?
                                    if (!this.moveToNewFreePosition(blocker, blockerTarget)){
                                        return this.repath(creep, destination, options)
                                    }
                                } else {
                                    return this.repath(creep, destination, options)
                                }
                            }
                        }
                    } else { //blocker is fatigued, lets go around.
                        return this.repath(creep, destination, options)
                    }
                }
            }
        }
        return creep.move(nextDirection);
    }
    //calls a same tick repath
    static repath(creep, destination, options) {
        creep.memory._trav.state[STATE_STUCK] = 999; //artificially set it to stuck and repath
        return this.travelTo(creep, destination, options, {repath: true})
        
    }
    //Finds a new free position near the target and moves there
    static moveToNewFreePosition(blocker, blockerTarget) {
        const newPosition = this.findNewFreePosition(blocker, blockerTarget);
        if (newPosition) {
            this.travelTo(blocker, newPosition, {range: 0, push: true})
            return true
        }
        return false
    }
    //normalized to desitnations passed to a position instead of a object with a pos in it
    static normalizePos(destination) {
        if (!(destination instanceof RoomPosition)) {
            return destination.pos;
        }
        return destination;
    }
    //registers the target with traveler for push logic
    static registerTarget(creep, target, range, priority) {
        if (!target) return;
        if (!creep) return;
        if (target.pos) target = target.pos;
        if (!range) range = 1;
        if (!priority) priority = 1;
        if (!creep.memory._trav) creep.memory._trav = {};
        if (this.isExit(target)) range = 0 //protect the user from themselves. If it is an edge tile, we need a value of zero
        creep.memory._trav.target = {x: target.x, y: target.y, roomName: target.roomName, range: range, priority: priority};
    }
    //get an x grid in a direction from a start point
    static GetXFromDirection(dir, sp) {
        return dir === LEFT || dir === TOP_LEFT || dir === BOTTOM_LEFT ?
            sp - 1
            :
            dir === RIGHT || dir === TOP_RIGHT || dir === BOTTOM_RIGHT ?
                sp + 1
                :
                sp;
    }
    //get an y grid in a direction from a start point
    static GetYFromDirection(dir, sp) {
        return dir === TOP || dir === TOP_LEFT || dir === TOP_RIGHT ?
            sp - 1
            :
            dir === BOTTOM || dir === BOTTOM_LEFT || dir === BOTTOM_RIGHT ?
                sp + 1
                :
                sp;
    }
    //finds and returns a new free position nearby to move to relative to it's target
    static findNewFreePosition(creep, target) {
        let direction = creep.pos.getDirectionTo(target);//get direction to target
        let positions = []; //hold positions we can move to
        let offsets = {};
        let curDirection;
        switch(direction) {
            case TOP:
            case LEFT:
            case RIGHT:
            case BOTTOM:
                curDirection = direction -3;
                if (curDirection < 1) curDirection += 8;
                for (let i = 0; i < 5; i++){
                    curDirection += 1;
                    if (curDirection > 8) curDirection -= 8;
                    if (i === 2) continue; //don't move to the target
                    offsets[_.size(offsets)] = {x: this.GetXFromDirection(curDirection, creep.pos.x), y: this.GetYFromDirection(curDirection, creep.pos.y)};
                }
                break;
            case TOP_RIGHT:
            case BOTTOM_RIGHT:
            case BOTTOM_LEFT:
            case TOP_LEFT:
                curDirection = direction -2;
                if (curDirection < 1) curDirection += 8;
                for (let i = 0; i < 3; i++){
                    curDirection += 1;
                    if (curDirection > 8) curDirection -= 8;
                    if (i === 1) continue; //don't move to the target
                    offsets[_.size(offsets)] = {x: this.GetXFromDirection(curDirection, creep.pos.x), y: this.GetYFromDirection(curDirection, creep.pos.y)};
                }
                break;
        }
        const t = new Room.Terrain(creep.room.name);
        const structureMatrix = this.getStructureMatrix(creep.room, false);
        const creepMatrix = this.getCreepMatrix(creep.room, false);
        for (let o in offsets) {
            //Out of bounds/exit
            if (offsets[o].x <= 0 || offsets[o].x >= 49 || offsets[o].y <= 0 || offsets[o].y >= 49) {
                continue;
            }
            //don't try to move on a wall.
            if (t.get(offsets[o].x,offsets[o].y) === TERRAIN_MASK_WALL) {
                continue;
            }
            if (structureMatrix.get(offsets[o].x, offsets[o].y) < 255 // No impassable structures
            && creepMatrix.get(offsets[o].x, offsets[o].y) < 255) { //no creep there
                return new RoomPosition(offsets[o].x, offsets[o].y, creep.room.name);
            }
        }
        return;
    }
    //moves to a nearby off of a road position
    static moveOffRoad(creep, targetpos, distance, priority) {
        if (!creep.memory._trav) {
            creep.memory._trav = {};
        }
        if (!creep.memory._trav.offroad) {
            creep.memory._trav.offroad = 0;
        }
        if (creep.memory._trav.lastMove === Game.time) {
            return false;
        }
        if (creep.memory._trav.offroad > Game.time - 20) {
            return false;
        }
        // see if we are offroad
        if (!_.some(creep.pos.lookFor(LOOK_STRUCTURES), (s) => s instanceof StructureRoad)) {
            return true;
        }
        const t = new Room.Terrain(creep.room.name);
        const structureMatrix = this.getStructureMatrix(creep.room, false);
        const creepMatrix = this.getCreepMatrix(creep.room, false);
        let positions = [];
        let offsets = []
        for (let x = -distance; x <= distance; x++) {
            offsets.push(x); // ah, push it
        }
        // find each valid position around the target that does not have a road
        _.forEach(offsets, (x) => _.forEach(offsets, (y) => {
            let xpos = targetpos.x + x ;
            let ypos = targetpos.y + y;
            //not out of bounds/exit
            if (!(xpos <= 0 || xpos >= 49 || ypos <= 0 || ypos >= 49)) {
                if (t.get(x,y) !== TERRAIN_MASK_WALL//don't try to move on a wall.
                && structureMatrix.get(xpos, ypos) < 255 // No impassable structures
                && creepMatrix.get(xpos, ypos) < 255) { //no creep there
                    positions.push(new RoomPosition(xpos, ypos, creep.room.name)); //ah, push it
                }
            }
        }));
        if (_.size(positions) === 0) {
            creep.memory._trav.offroad = Game.time; //don't spam this function if it fails!
            return false; // no positions, move towards the target to make room for people behind them
        }
        let posit = creep.pos.findClosestByPath(positions); // find the closest position to the creep
        return this.travelTo(creep, posit, {range: 0, priority: priority}); // move to that position
    }
    //gets the move efficiency of a creep based on it's number of move parts and boost realative to it's size
    static getCreepMoveEfficiency(creep) {
        if (creep instanceof PowerCreep) return 9999; //no fatgiue!
        let totalreduction= 0;
        let totalparts = 0;
        let used = creep.store.getUsedCapacity();
        creep.body.forEach((b) => {
            switch(b.type) {
                case MOVE:
                    totalreduction += b.hits > 0 ? b.boost ? (BOOSTS[b.type][b.boost].fatigue * -2) : -2 : 0;
                    return;
                    break;
                case CARRY:
                    if (used > 0 && b.hits > 0) {
                        used -= b.boost ? (BOOSTS[b.type][b.boost].capacity * CARRY_CAPACITY) : CARRY_CAPACITY;
                        totalparts += 1;
                    }
                    break;
                default:
                    totalparts += 1;
                    break;
            }
        })
        return totalparts > 0 ? totalreduction/totalparts : totalreduction;
    }
    //gets a pos to a direction from a starting point
    static getPosFromDirection(source, dir) {
        let xoffset = 0;
        let yoffset = 0;
        switch (dir){
            case TOP:
                yoffset = 1;
                break;
            case TOP_RIGHT:
                xoffset = 1;
                yoffset = 1;
                break;
            case RIGHT:
                xoffset = 1;
                break;
            case BOTTOM_RIGHT:
                xoffset = 1;
                yoffset = -1;
                break;
            case BOTTOM:
                yoffset = -1;
                break;
            case BOTTOM_LEFT:
                xoffset = -1;
                yoffset = -1;
                break;
            case LEFT:
                xoffset = -1;
                break;
            case TOP_LEFT:
                xoffset = -1;
                yoffset = 1;
                break;
        }
        return new RoomPosition(source.x+xoffset, source.y+yoffset, source.roomName);
    }
    //check if room should be avoided by findRoute algorithm
    static checkAvoid(roomName) {
        return Memory.Traveler.rooms[roomName] && Memory.Traveler.rooms[roomName].avoid
    }
    //check if a position is an exit
    static isExit(pos) {
        return pos.x === 0 || pos.y === 0 || pos.x === 49 || pos.y === 49;
    }
    //check two coordinates match
    static sameCoord(pos1, pos2) {
        return pos1.x === pos2.x && pos1.y === pos2.y;
    }
    //check if two positions match
    static samePos(pos1, pos2) {
        return this.sameCoord(pos1, pos2) && pos1.roomName === pos2.roomName;
    }
    //draw a circle at position
    static circle(pos, color, opacity) {
        new RoomVisual(pos.roomName).circle(pos, {
            radius: .45,
            fill: "transparent",
            stroke: color,
            strokeWidth: .15,
            opacity: opacity,
        });
    }
    //update memory on whether a room should be avoided based on controller owner
    //TODO: Add whitelist functionality..or add your own..whatever
    static updateRoomStatus(room) {
        if (!room) {
            return;
        }
        if (!Memory.Traveler.rooms[room.name]) {
            Memory.Traveler.rooms[room.name] = {}
        }
        if (room.controller) {
            if (room.controller.owner && !room.controller.my) {
                Memory.Traveler.rooms[room.name].avoid = 1
            } else {
                delete Memory.Traveler.rooms[room.name].avoid
            }
        }
    }
    //find a path from origin to destination
    static findTravelPath(origin, destination, options = {}) {
        _.defaults(options, {
            ignoreCreeps: true,
            maxOps: DEFAULT_MAXOPS,
            range: 1,
        });
        if (options.movingTarget) {
            options.range = 0;
        }
        origin = this.normalizePos(origin);
        destination = this.normalizePos(destination);
        let originRoomName = origin.roomName;
        let destRoomName = destination.roomName;
        // check to see whether findRoute should be used
        let roomDistance = Game.map.getRoomLinearDistance(origin.roomName, destination.roomName);
        let allowedRooms = options.route;
        if (!allowedRooms && (options.useFindRoute || (options.useFindRoute === undefined && roomDistance > 2))) {
            let route = this.findRoute(origin.roomName, destination.roomName, options);
            if (route) {
                allowedRooms = route;
            }
        }
        let roomsSearched = 0;
        let callback = (roomName) => {
            if (allowedRooms) {
                if (!allowedRooms[roomName]) {
                    return false;
                }
            } else if (!options.allowHostile && Traveler.checkAvoid(roomName) && roomName !== destRoomName && roomName !== originRoomName) {
                return false;
            }
            roomsSearched++;
            let matrix;
            let room = Game.rooms[roomName];
            if (room) {
                if (options.ignoreStructures) {
                    matrix = new PathFinder.CostMatrix();
                    if (!options.ignoreCreeps) {
                        Traveler.addCreepsToMatrix(room, matrix);
                    }
                } else if (options.ignoreCreeps || roomName !== originRoomName) {
                    matrix = this.getStructureMatrix(room, options.freshMatrix);
                } else {
                    matrix = this.getCreepMatrix(room);
                }
                if (options.obstacles) {
                    matrix = matrix.clone();
                    for (let obstacle of options.obstacles) {
                        if (obstacle.pos.roomName !== roomName) {
                            continue;
                        }
                        matrix.set(obstacle.pos.x, obstacle.pos.y, 0xff);
                    }
                }
            }
            if (options.roomCallback) {
                if (!matrix) {
                    matrix = new PathFinder.CostMatrix();
                }
                let outcome = options.roomCallback(roomName, matrix.clone());
                if (outcome !== undefined) {
                    return outcome;
                }
            }
            return matrix;
        };
        let ret = PathFinder.search(origin, {
            pos: destination,
            range: options.range,
        }, {
            maxOps: options.maxOps,
            maxRooms: options.maxRooms,
            plainCost: options.offRoad ? 1 : options.ignoreRoads ? 1 : 2,
            swampCost: options.offRoad ? 1 : options.ignoreRoads ? 5 : 10,
            roomCallback: callback,
        });
        if (ret.incomplete && options.ensurePath) {
            if (options.useFindRoute === undefined) {
                // handle case where pathfinder failed at a short distance due to not using findRoute
                // can happen for situations where the creep would have to take an uncommonly indirect path
                // options.allowedRooms and options.routeCallback can also be used to handle this situation
                if (roomDistance <= 2) {
                    console.log(`TRAVELER: path failed without findroute, trying with options.useFindRoute = true`);
                    console.log(`from: ${origin}, destination: ${destination}`);
                    options.useFindRoute = true;
                    ret = this.findTravelPath(origin, destination, options);
                    console.log(`TRAVELER: second attempt was ${ret.incomplete ? "not " : ""}successful`);
                    return ret;
                }
                // TODO: handle case where a wall or some other obstacle is blocking the exit assumed by findRoute
            } else {}
        }
        return ret;
    }
    //find a viable sequence of rooms that can be used to narrow down pathfinder's search algorithm
    static findRoute(origin, destination, options = {}) {
        let restrictDistance = options.restrictDistance || Game.map.getRoomLinearDistance(origin, destination) + 10;
        let allowedRooms = {[origin]: true, [destination]: true};
        let highwayBias = 1;
        if (options.preferHighway) {
            highwayBias = 2.5;
            if (options.highwayBias) {
                highwayBias = options.highwayBias;
            }
        }
        let ret = Game.map.findRoute(origin, destination, {
            routeCallback: (roomName) => {
                if (options.routeCallback) {
                    let outcome = options.routeCallback(roomName);
                    if (outcome !== undefined) {
                        return outcome;
                    }
                }
                let rangeToRoom = Game.map.getRoomLinearDistance(origin, roomName);
                if (rangeToRoom > restrictDistance) {
                    // room is too far out of the way
                    return Number.POSITIVE_INFINITY;
                }
                if (!options.allowHostile && Traveler.checkAvoid(roomName) && roomName !== destination && roomName !== origin) {
                    // room is marked as "avoid" in room memory
                    return Number.POSITIVE_INFINITY;
                }
                let parsed;
                if (options.preferHighway) {
                    parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                    let isHighway = (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
                    if (isHighway) {
                        return 1;
                    }
                }
                // SK rooms are avoided when there is no vision in the room, harvested-from SK rooms are allowed
                if (!options.allowSK && !Game.rooms[roomName]) {
                    if (!parsed) {
                        parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                    }
                    let fMod = parsed[1] % 10;
                    let sMod = parsed[2] % 10;
                    let isSK = !(fMod === 5 && sMod === 5) && ((fMod >= 4) && (fMod <= 6)) && ((sMod >= 4) && (sMod <= 6));
                    if (isSK) {
                        return 10 * highwayBias;
                    }
                }
                return highwayBias;
            },
        });
        if (!_.isArray(ret)) {
            console.log(`couldn't findRoute to ${destination}`);
            return;
        }
        for (let value of ret) {
            allowedRooms[value.room] = true;
        }
        return allowedRooms;
    }
    //check how many rooms were included in a route returned by findRoute
    static routeDistance(origin, destination) {
        let linearDistance = Game.map.getRoomLinearDistance(origin, destination);
        if (linearDistance >= 32) {
            return linearDistance;
        }
        let allowedRooms = this.findRoute(origin, destination);
        if (allowedRooms) {
            return Object.keys(allowedRooms).length;
        }
    }
    //build a cost matrix based on structures in the room. Will be cached for more than one tick. Requires vision.
    static getStructureMatrix(room, freshMatrix) {
        if (!this.structureMatrixCache[room.name] || (freshMatrix && Game.time !== this.structureMatrixTick)) {
            this.structureMatrixTick = Game.time;
            let matrix = new PathFinder.CostMatrix();
            this.structureMatrixCache[room.name] = Traveler.addStructuresToMatrix(room, matrix, 1);
        }
        return this.structureMatrixCache[room.name];
    }
    //build a cost matrix based on creeps and structures in the room. Will be cached for one tick. Requires vision.
    static getCreepMatrix(room) {
        if (!this.creepMatrixCache[room.name] || Game.time !== this.creepMatrixTick) {
            this.creepMatrixTick = Game.time;
            this.creepMatrixCache[room.name] = Traveler.addCreepsToMatrix(room, this.getStructureMatrix(room, true).clone());
        }
        return this.creepMatrixCache[room.name];
    }
    //add structures to matrix so that impassible structures can be avoided and roads given a lower cost
    static addStructuresToMatrix(room, matrix, roadCost) {
        let impassibleStructures = [];
        for (let structure of room.find(FIND_STRUCTURES)) {
            if (structure instanceof StructureRampart) {
                if (!structure.my && !structure.isPublic) {
                    impassibleStructures.push(structure);
                }
            } else if (structure instanceof StructureRoad) {
                matrix.set(structure.pos.x, structure.pos.y, roadCost);
            } else if (structure instanceof StructureContainer) {
                continue;
                //matrix.set(structure.pos.x, structure.pos.y, 5); //creeps can walk over containers. So this doesn't matter. Saving it just in case it breaks something
            } else {
                impassibleStructures.push(structure);
            }
        }
        for (let site of room.find(FIND_MY_CONSTRUCTION_SITES)) {
            if (site.structureType === STRUCTURE_CONTAINER || site.structureType === STRUCTURE_ROAD || site.structureType === STRUCTURE_RAMPART) {
                continue;
            }
            matrix.set(site.pos.x, site.pos.y, 0xff);
        }
        for (let structure of impassibleStructures) {
            matrix.set(structure.pos.x, structure.pos.y, 0xff);
        }
        return matrix;
    }
    //add creeps to matrix so that they will be avoided by other creeps
    static addCreepsToMatrix(room, matrix) {
        room.find(FIND_CREEPS).forEach((creep) => matrix.set(creep.pos.x, creep.pos.y, 0xff));
        return matrix;
    }
    //serialize a path, traveler style. Returns a string of directions.
    static serializePath(startPos, path, color = "orange") {
        let serializedPath = "";
        let lastPosition = startPos;
        this.circle(startPos, color);
        for (let position of path) {
            if (position.roomName === lastPosition.roomName) {
                new RoomVisual(position.roomName).line(position, lastPosition, {color: color, lineStyle: "dashed"});
                serializedPath += lastPosition.getDirectionTo(position);
            }
            lastPosition = position;
        }
        return serializedPath;
    }
    //returns a position at a direction relative to origin
    static positionAtDirection(origin, direction) {
        let offsetX = [0, 0, 1, 1, 1, 0, -1, -1, -1];
        let offsetY = [0, -1, -1, 0, 1, 1, 1, 0, -1];
        let x = origin.x + offsetX[direction];
        let y = origin.y + offsetY[direction];
        if (x > 49 || x < 0 || y > 49 || y < 0) {
            return;
        }
        return new RoomPosition(x, y, origin.roomName);
    }
    static deserializeState(travelData, destination) {
        let state = {};
        if (travelData.state) {
            state.lastCoord = {x: travelData.state[STATE_PREV_X], y: travelData.state[STATE_PREV_Y]};
            state.cpu = travelData.state[STATE_CPU];
            state.stuckCount = travelData.state[STATE_STUCK];
            state.destination = new RoomPosition(travelData.state[STATE_DEST_X], travelData.state[STATE_DEST_Y], travelData.state[STATE_DEST_ROOMNAME]);
        } else {
            state.cpu = 0;
            state.destination = destination;
        }
        return state;
    }
    static serializeState(creep, destination, state, travelData) {
        travelData.state = [creep.pos.x, creep.pos.y, state.stuckCount, state.cpu, destination.x, destination.y, destination.roomName];
    }
    static isStuck(creep, state) {
        if (state.lastCoord !== undefined) {
            if (this.sameCoord(creep.pos, state.lastCoord)) {
                // didn't move
                return true
            } else if (this.isExit(creep.pos) && this.isExit(state.lastCoord)) {
                // moved against exit
                return true
            }
        }
        return false;
    }
    static updatePortals(room) {
        if (!room) return
        if (Memory.Traveler.rooms[room.name].updatetime > Game.time - 100) return
        Memory.Traveler.rooms[room.name].updatetime = Game.time
        
        const portals = room.portals ? room.portals : room.find(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_PORTAL})
        if (portals.length === 0) return
        Memory.Traveler.Portals[room.name] = {}
        Memory.Traveler.Portals[room.name].shards = {}
        Memory.Traveler.Portals[room.name].rooms = {}
        for (let p of portals) {
            if (p.destination.shard) {
                if (!Memory.Traveler.Portals[room.name].shards[p.destination.shard]) {
                    Memory.Traveler.Portals[room.name].shards[p.destination.shard] = {}
                }
                Memory.Traveler.Portals[room.name].shards[p.destination.shard][p.destination.room] = ''
            } else {
                //TODO: Add intrashard portals
                Memory.Traveler.Portals[room.name].rooms[p.destination.roomName] = {}
            }
        }
    }
    static findPathToNearestPortal(creep, shard, room) {
        const count = Game.cpu.getUsed()
        let shards = [];
        let shardDestIndex;
        let shardOrgIndex
        //get shards (not hard coded so it can change later if the game is updated with new shards)
        for (let i in Game.cpu.shardLimits) {
            if (i === shard) shardDestIndex = shards.length
            if (i === Game.shard.name) shardOrgIndex = shards.length
            shards[shards.length] = i
        }
        //find the nearest shard incase we don't have a portal to the destinaton shard
        const nearestShard = shardDestIndex > shardOrgIndex ? shards[shardOrgIndex+1] : shards[shardOrgIndex-1]
            
        let dist = 999999
        let xferroom
        let nextRoom
        let nextShard = nearestShard
        const shardPortals = Memory.Traveler.Portals
        for (const xferRoom in shardPortals) {
            
            //TODO: Make sure the portal isn't too far away
            if (Game.map.getRoomLinearDistance(creep.room.name, xferRoom) > 10) continue;
            //get portal destinations for the destination shard
            for (const destRoom in shardPortals[xferRoom].shards[shard]) {
                //get the linear distance of travel from this room, to the transfer room, to the destination room, to the actual room number
                const newdist = Game.map.getRoomLinearDistance(creep.room.name, xferRoom) + Game.map.getRoomLinearDistance(destRoom, room)
                
                //if better set out new room
                if (newdist < dist) {
                    dist = newdist
                    xferroom = xferRoom
                    nextRoom = destRoom
                    nextShard = shard
                }
            }
            if (shard === nearestShard) continue; //same shard, skip
            //and check ones for the next shard on the 'z axis' of the game
            for (const destRoom in shardPortals[xferRoom].shards[nearestShard]) {
                //get the linear distance of travel from this room, to the transfer room, to the destination room, to the actual room number
                //as of Dec 2020, shard 1 is the best place to make massive jumps due to the portals on shard0. We will attempt to get to that shard
                //and then find the best portal to make the shortest path. Until then, we are just going to push to the nearest portal.
                const newdist = ((Game.shard.name === 'shard3' || Game.shard.name === 'shard2') && shard === 'shard0') ? Game.map.getRoomLinearDistance(creep.room.name, xferRoom)
                : Game.map.getRoomLinearDistance(creep.room.name, xferRoom, destRoom, room)
                //if better set out new room
                if (newdist < dist) {
                    dist = newdist
                    xferroom = xferRoom
                    nextRoom = destRoom
                    nextShard = nearestShard
                }
            }
            
        }
        if (!xferroom) return false //probably need more portal intel to run this.. Tell the user
        console.log('TRAVELER: ' + creep.name + ' found best move to ' + shard + ' destination of ' + room + ' through ' + nextShard  + ' - ' + nextRoom + ' cpu ' + (Game.cpu.getUsed()-count))
        creep.memory._trav.ISM = {currentShard: Game.shard.name, shard: shard, room: room, destShard: nextShard, xferRoom: xferroom, destRoom: nextRoom}
        return true
    }
    static checkShardTransferData(creep, shard, room) {
        if (!creep.memory._trav) creep.memory._trav = {}
        if (creep.memory._trav.ISM 
        && creep.memory._trav.ISM.currentShard === Game.shard.name //this is in case the user pulls all their memory over to include movement
        && creep.memory._trav.ISM.shard === shard 
        && creep.memory._trav.ISM.room === room) {
            return true //yay!
        }
        //needs new path
        if (!this.findPathToNearestPortal(creep, shard, room)) {
            return ERR_NO_PATH //well, damn
        }
        return true
    }
    static moveToShard(creep, shard, room, priority) {
        const check = this.checkShardTransferData(creep, shard, room)
        if (check !== true) {
            return ERR_NO_PATH
        }
        
        const xferData = creep.memory._trav.ISM 
        
        if (xferData.xferRoom === creep.room.name) {
            let portal
            //move to nearest portal
            if (!xferData.portalId) {
                portal = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_PORTAL && s.destination.shard === xferData.destShard && s.destination.room === xferData.destRoom})
            } else {
                portal = Game.getObjectById(xferData.portalId)
            }
            
            if (!portal) {
                delete creep.memory._trav.ISM
                return false
            }
            creep.memory._trav.ISM.portalId = portal.id
            this.registerTarget(creep, portal, 0, priority);
            this.travelTo(creep, portal)
        } else {
            let dest = new RoomPosition(25,25, xferData.xferRoom)
            this.registerTarget(creep, dest, 0, priority);
            this.travelTo(creep, dest, {preferHighway: true, ensurePath: true, useFindRoute: true})
        }
        return true
    }
}
Traveler.structureMatrixCache = {};
Traveler.creepMatrixCache = {};
exports.Traveler = Traveler;
// this might be higher than you wish, setting it lower is a great way to diagnose creep behavior issues. When creeps
// need to repath to often or they aren't finding valid paths, it can sometimes point to problems elsewhere in your code
const REPORT_CPU_THRESHOLD = 1000;
const DEFAULT_MAXOPS = 20000;
const DEFAULT_STUCK_VALUE = 2;
const STATE_PREV_X = 0;
const STATE_PREV_Y = 1;
const STATE_STUCK = 2;
const STATE_CPU = 3;
const STATE_DEST_X = 4;
const STATE_DEST_Y = 5;
const STATE_DEST_ROOMNAME = 6;
// assigns a function to Creep.prototype: creep.travelTo(destination)
Creep.prototype.travelTo = (function(destination, options) {
    return Traveler.travelTo(this, destination, options);
});

PowerCreep.prototype.travelTo = Creep.prototype.travelTo;
// call this in every room to update it's status
Room.prototype.UpdateRoomStatus = (function() {
    Traveler.updateRoomStatus(this);
    Traveler.updatePortals(this)
});
// Get a path to a destiniation... Good for building roads.
RoomPosition.prototype.FindPathTo = (function(destination, options) {
    let ret = Traveler.findTravelPath(this, destination, options);
    return ret.path;
});
// Get the route distance to a room instead of linear distance
Room.prototype.GetDistanceToRoom = (function(destination) {
    return Traveler.routeDistance(this.name, destination);
});
// Moves to a target
// Add you own code here to interface with traveler
Creep.prototype.Move = (function(target, range, priority, opts = {}) {
    if (!target) {
        return false;
    }
    if (this.body && this.getActiveBodyparts(MOVE) === 0) {
        return false;
    }
    if (range === undefined) {
        range = 1;
    }
    if (priority === undefined) {
        priority = 1;
    }
    opts.range = range;
    opts.priority = priority;
    Traveler.registerTarget(this, target, opts.range, opts.priority);
    if (this.pos.getRangeTo(target) <= range) {
        return true;
    }
    if (target.pos && target.pos.roomName !== this.room.name) {
        opts.preferHighway = true;
        opts.ensurePath = true;
        opts.useFindRoute = true;
        return Traveler.travelTo(this, target, opts);
    }
    return Traveler.travelTo(this, target, opts);
}); 
PowerCreep.prototype.Move = Creep.prototype.Move

Creep.prototype.MoveToShard = function(shard, room, priority) {
    if (Game.shard.name !== shard) {
        return Traveler.moveToShard(this, shard, room, priority)
    }
    return false
}
PowerCreep.prototype.MoveToShard = Creep.prototype.MoveToShard

// Move a creep off road... Good for building, repairing, idling.
Creep.prototype.MoveOffRoad = (function(target, dist, priority) {
    if (!target) {
        return false;
    }
    if (priority === undefined) {
        priority = 1;
    }
    if (dist === undefined) {
        dist = 3;
    }
    if (target.pos) {
        target = target.pos;
    }
    Traveler.registerTarget(this, target, dist, priority);
    return Traveler.moveOffRoad(this, target, dist, priority);
});
PowerCreep.prototype.MoveOffRoad = Creep.prototype.MoveOffRoad;