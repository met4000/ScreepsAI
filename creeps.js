function arrCompare (arr1, arr2) {
    if (arr1.length != arr2.length) return false;
    for (var i in arr1) if (arr1[i] != arr2[i]) return false;
    return true;
}

String.prototype.r = function (n) {
    var arr = [];
    for (var i = 0; i < n; i++) arr.push(this);
    return arr;
};

module.exports = { // Spawn/Kill creeps
    type: {
        A: [WORK, CARRY, MOVE],
        B: [WORK, WORK, CARRY, WORK, CARRY, CARRY, MOVE, MOVE],
        C: [WORK, WORK, WORK, CARRY, CARRY, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
        
        TA: [WORK].concat(CARRY.r(7)).concat(MOVE.r(7)),
        TB: [
            WORK,
            CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
            MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
        ],
        
        SA: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE],
        
        MRA: TOUGH.r(12).concat(MOVE.r(12)).concat(ATTACK.r(12).concat(MOVE.r(12))),
        DRA: TOUGH.r(3).concat(MOVE.r(3)).concat(MOVE.r(7)).concat(HEAL.r(7)),
    }, spawn: function (bodyType, role) {
        bodyType = bodyType.toUpperCase();
        if (bodyType == "X") throw new Error("Invalid body type (generic)");
        else if (!Object.keys(this.type).includes(bodyType)) throw new Error("Invalid body type");
        
        var n = 0;
        while (Memory.creeps["Creep" + bodyType + n]) n++;
        return Game.spawns[Object.keys(Game.spawns)[0]].spawnCreep(this.type[bodyType].join(",").split(","), "Creep" + bodyType + n, { memory: {
            body: this.type[bodyType],
            role: role
        }});
    }, add: function (role, bodyType) {
        var stype = "X";
        if (bodyType == undefined) {
            var body = require("role." + role).body;
            for (var n in Object.keys(this.type)) if (arrCompare(this.type[Object.keys(this.type)[n]], body)) stype = Object.keys(this.type)[n];
        } else stype = bodyType;
        return this.spawn(stype, role);
    }, body: function (bodyType) {
        var body;
        if (typeof bodyType != "string") body = bodyType;
        else if (Object.keys(this.type).includes(bodyType)) body = this.type[bodyType];
        else body = require("role." + bodyType).body;
        return body;
    }, cost: function (bodyType, room) {
        var stype, body = this.body(bodyType), energy = 0;
        for (var n in Object.keys(this.type)) if (arrCompare(this.type[Object.keys(this.type)[n]], body)) stype = Object.keys(this.type)[n];
        body.forEach(p => energy += BODYPART_COST[p]);
        if (room = Game.rooms[room.name || room]) {
            var spawns = room.find(FIND_MY_SPAWNS), spawnEnergy = spawns.reduce((t, v) => { return t + v.energy; }, 0);
            console.log(""
              + "stype: " + stype + "; Body: " + JSON.stringify(body).replace(/"/g, "").replace(/,/g, ", ").toUpperCase() + "\n"
              
              + "Requires " + energy + " energy; Spawn + "
              + ((energy - SPAWN_ENERGY_CAPACITY) / EXTENSION_ENERGY_CAPACITY[room.controller.level]) + " extensions." + "\n"
              
              + "Available; "
              + "Spawn Energy: " + spawnEnergy + "/" + (SPAWN_ENERGY_CAPACITY * spawns.length)
              + " (" + (100 * spawnEnergy / SPAWN_ENERGY_CAPACITY / spawns.length) + "%)"
              + ", Extensions: " + ((room.energyAvailable - spawnEnergy) / EXTENSION_ENERGY_CAPACITY[room.controller.level]) + "/"
              + ((room.energyCapacityAvailable - SPAWN_ENERGY_CAPACITY) / EXTENSION_ENERGY_CAPACITY[room.controller.level])
              + ", Total Energy: " + room.energyAvailable + " (" + (Math.round(1000 * room.energyAvailable / energy) / 10) + "% of required, "
              + (Math.round(1000 * room.energyAvailable / room.energyCapacityAvailable) / 10) + "% of max)"
            );
        }
        return energy;
    }, erase: function (name) {
        var creep = Game.creeps[name];
        delete Memory.creeps[name];
        return creep ? creep.suicide() : true;
    }, replace: function (name, bodyType) {
        if (typeof(name) != "string") name = name.name;
        
        var response = this.spawn(bodyType, Memory.creeps[name].role);
        if (response == OK) return this.erase(name);
        return response;
    }
};
