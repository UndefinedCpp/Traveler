interface travelToOpts {
    /**
     * Creeps won't prefer roads above plains (will still prefer them to 
     * swamps). Default is `false` unless a creep will not gain fatigue 
     * from moving on plains, then it is always `true`.
     */
    ignoreRoads?: boolean;
    /**
     * Will not path around other creeps. Default is `true`.
     */
    ignoreCreeps?: boolean;
    /**
     * Creeps won't prefer plains or roads over swamps, all costs will 
     * be 1. Default is `false` unless a creep will not gain fatigue 
     * from moving on swamps, then it is always `true`.
     */
    offRoad?: boolean;
    /**
     * Number of ticks of non-movement before a creep considers itself 
     * stuck. Default is 2.
     */
    stuckValue?: number; // TODO: check if wiki is wrongly typed to `boolean`.
    /**
     * Will not path around structures. Default is `false`.
     */
    ignoreStructures?: boolean;
    /**
     * Creep prefer to travel along highway (empty rooms in between 
     * sectors).
     */
    preferHighway?: boolean;
    /**
     * Hostile rooms will be included in path. Default is `false`.
     */
    allowHostile?: boolean;
    /**
     * SourceKeeper rooms will be included in path. (if `false`, SK 
     * rooms will still be taken if they are they only viable path).
     *  Default is `false`.
     */
    allowSK?: boolean;
    /**
     * Array of objects with property `{pos: RoomPosition}` that 
     * represent positions to avoid.
     */
    obstacles?: RoomPosition | { pos: RoomPosition }[];
    /**
     * Callback function that accepts two arguments, roomName (`string`)
     * and matrix (`CostMatrix`) and returns a `CostMatrix` or `boolean`.
     * Used for overriding the default `PathFinder` callback. If it 
     * returns `false`, that room will be excluded. If it returns a 
     * matrix, it will be used in place of the default matrix. If it 
     * returns `undefined` the default matrix will be used instead.
     */
    roomCallback?: (roomName: string, costMatrix: CostMatrix) => boolean;
    /**
     * Callback function that accepts one argument, roomName (string)
     * and returns a number representing the `foundRoute` value that 
     * roomName. Used for overriding the findRoute callback. If it returns
     * a number that value will be used to influence the route. If it 
     * returns undefined it will use the default value.
     */
    routeCallback?: (roomName: string) => number;
    /**
     * If an empty object literal is provided, the RoomPosition being 
     * moved to will be assigned to returnData.nextPos.
     */
    returnData?: Object; // $ I'm personally confused about this option
    /**
     * Limits the range the findRoute will search. Default is 32. 
     */
    restrictDistance?: number;
    /**
     * an be used to force or prohibit the use of findRoute. If `undefined`
     * it will use findRoute only for paths that span a larger number of 
     * rooms (linear distance >2).
     */
    useFindRoute?: boolean;
    /**
     * Limits the ops (CPU) that PathFinder will use. Default is 20000. 
     * (~20 CPU)
     */
    maxOps?: number;
    /**
     * Allows you to avoid making a new pathfinding call when your destination
     * is only 1 position away from what it was previously. The new 
     * direction is just added to the path. Default is `false`.
     */
    movingTarget?: boolean;
    /**
     * Float value between 0 and 1 representing the probability that creep 
     * will randomly invalidate its current path. Setting it to 1 would cause 
     * the creep to repath every tick. Default is `undefined`.
     */
    repath?: number;
    /**
     * Passing in an empty object will allow traveler to populate it with details 
     * about the current situation, including pathfinder return results, next 
     * position, and its travel state. Default is `undefined`.
     */
    travelData?: Object;
    /**
     * Limit how many rooms can be searched by PathFinder. Default is `undefined`.
     */
    maxRooms?: number;
    /**
     * Supply the route to be used by PathFinder. Default is `undefined`.
     */
    route?: Object;
}

interface Creep {
    /**
     * Move creep to destination.
     * @param destination Object with a property `{pos: RoomPosition}`.
     * @param opts Optional object with one or more of properties.
     */
    travelTo(
        destination: RoomPosition | { pos: RoomPosition },
        opts?: travelToOpts
    ): ScreepsReturnCode;   // TODO: verify my temporary doc
    // partly adopted from bonzaiferroni

    /**
     * Move creep to `target`.
     * @param target Where you want to go
     * @param distance The minimum distance to move to. 3 is good for 
     *                 building/repairing while 1 is good for things 
     *                 like harvesting, transferring, and withdrawing. Default is 1.
     * @param priority The priority of this creeps task. High priority will swap lower 
     *                 priority creeps out of the way when pushing isn't an option.
     *                 Default is 1.
     * @param options Optional object with one or more of properties described below
     */
    Move(
        target: RoomPosition | { pos: RoomPosition },
        distance?: number,
        priority?: number,
        options?: travelToOpts
    ): ScreepsReturnCode;
    /**
     * Moves a creep to an off road location near the target
     * @param target Your target.
     * @param distance Minimum distance to target. See Move()
     * @param priority The priority of this creeps task. See Move()
     */
    MoveOffRoad(
        target: RoomPosition | { pos: RoomPosition },
        distance: number,
        priority: number
    ): ScreepsReturnCode;
    /**
     * Moves a creep to the nearest room on a different shard
     * @param shard Destination shard
     * @param room Target room on destination shard. Traveler will use this to find 
     *             the closest portal room to this room when arriving at the new shard.
     * @param priority The priority of this creeps task. See Move()
     */
    MoveToShard(
        shard: string,
        room: string,
        priority: number
    ): ScreepsReturnCode;
}

interface PowerCreep {

    /**
     * Move power creep to destination.
     * @param destination Object with a property `{pos: RoomPosition}`.
     * @param opts Optional object with one or more of properties.
     */
    travelTo(
        destination: RoomPosition | { pos: RoomPosition },
        opts?: travelToOpts
    ): ScreepsReturnCode;   // TODO: verify my temporary doc
    // partly adopted from bonzaiferroni

    /**
     * Move power creep to `target`.
     * @param target Where you want to go
     * @param distance The minimum distance to move to. 3 is good for 
     *                 building/repairing while 1 is good for things 
     *                 like harvesting, transferring, and withdrawing. Default is 1.
     * @param priority The priority of this creeps task. High priority will swap lower 
     *                 priority creeps out of the way when pushing isn't an option.
     *                 Default is 1.
     * @param options Optional object with one or more of properties described below
     */
    Move(
        target: RoomPosition | { pos: RoomPosition },
        distance?: number,
        priority?: number,
        options?: travelToOpts
    ): ScreepsReturnCode;
    /**
     * Moves a power creep to an off road location near the target
     * @param target Your target.
     * @param distance Minimum distance to target. See Move()
     * @param priority The priority of this creeps task. See Move()
     */
    MoveOffRoad(
        target: RoomPosition | { pos: RoomPosition },
        distance: number,
        priority: number
    ): ScreepsReturnCode;
    /**
     * Moves a power creep to the nearest room on a different shard
     * @param shard Destination shard
     * @param room Target room on destination shard. Traveler will use this to find 
     *             the closest portal room to this room when arriving at the new shard.
     * @param priority The priority of this creeps task. See Move()
     */
    MoveToShard(
        shard: string,
        room: string,
        priority: number
    ): ScreepsReturnCode;
}

interface Room {
    /**
     * Gets walking (not linear) distance to a room
     * @param roomName Destination room.
     */
    GetDistanceToRoom(roomName: string): number;
}

interface RoomPosition {
    /**
     * Gets pathway from one object to another.
     * @param destination Destination object
     * @param opts Optional object with one or more of properties described below
     */
    FindPathTo(
        destination: RoomPosition | { pos: RoomPosition },
        opts?: travelToOpts
    ): RoomPosition[];
}
