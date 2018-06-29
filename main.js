// var body = [WORK, WORK, CARRY, WORK, CARRY, CARRY, MOVE, MOVE]; Game.spawns["FirstSpawn"].spawnCreep(body, "CreepB2", { memory: { body: body, role: "builder" } })

var attack = false;

// Roles
var role = {
    builder: require("role.builder"),
    harvester: require("role.harvester"),
    miner: require("role.miner"),
    conveyor: require("role.conveyor"),
    stagnant: require("role.stagnant"),
    upgrader: require("role.upgrader"),
    
    rc: { tick: function (creep) { }, mode: [] },
    
    mineralTransferer: { tick: function (creep) {
        if (_.sum(creep.carry) < creep.carryCapacity) {
            var oxyContainer = Game.getObjectById("5b129dc175310174a5cc6715");
            if (creep.withdraw(oxyContainer, RESOURCE_OXYGEN) == ERR_NOT_IN_RANGE) creep.moveTo(oxyContainer);
        } else {
            var terminal = Game.getObjectById("5b11e36d9a5c993bf9b0ff5e");
            if (creep.transfer(terminal, RESOURCE_OXYGEN) == ERR_NOT_IN_RANGE) creep.moveTo(terminal);
        }
        
    }, mode: [] },
    
    decoy: { tick: function (creep) {
        // if (creep.room.name == "E18N57") {
        //     creep.moveTo(attack ? 0 : 2, 33);
        // } else if (creep.room.name == "E17N57") {
        //     if (creep.pos.y < 35) creep.moveTo(48, 35);
        //     else creep.heal(creep);
        // } else console.log("Confused Decoy");
    }, mode: [] },
    attack: { tick: function (creep) {
        // if (creep.room.name == "E18N57") {
        //     creep.moveTo(attack ? 0 : 3, 33);
        // } else if (creep.room.name == "E17N57") {
        //     var targetList = [
        //         "5aefaa49d4bf753171ea7de1"
        //     ], target;
        //     while (!(target = Game.getObjectById(targetList[0])) && targetList.length) targetList = targetList.slice(1);
        //     if (!targetList.length) return console.log("No More Targets in room E17N57");
        //     if (creep.attack(target) == ERR_NOT_IN_RANGE) creep.moveTo(target);
        // } else console.log("Confused Attacker");
    }, mode: [] },
};

// Global Constants
global.gck = Object.keys(global.gc = require("consts"));
for (var v in gck) global[gck[v]] = gc[gck[v]];
delete global.gc; delete global.gck;

// Load 'MODE_STAGNANT' onto all roles (except 'stagnant', of course)
for (var n in Object.keys(role))
    if (Object.keys(role)[n] != "stagnant") role[Object.keys(role)[n]].mode[MODE_STAGNANT] = role.stagnant.mode[MODE_STAGNANT];

// Main Loop
module.exports.loop = function () {
    var spawn = Game.spawns["F"];
    
    if (!spawn.room.memory) spawn.room.memory.lTick = 0;
    spawn.room.memory.lTick++;
    if (
        Game.cpu.bucket > 2048
        || spawn.room.find(FIND_HOSTILE_CREEPS).length
        || (Game.cpu.bucket > 512 && spawn.room.memory.lTick > 60 / 2.3)
            ) { // Because CPU restrictions REEEEEEEEEEEEEEEE
        spawn.room.memory.lTick = 0;
        
        // try {
        //     if (!spawn.room.memory.controllerLog) spawn.room.memory.controllerLog = {};
        //     if (!spawn.room.memory.controllerLog[Game.time]) spawn.room.memory.controllerLog[Game.time] = spawn.room.controller.progress;
        // } catch (err) { console.log("Room Log Err:\n" + err.stack); }
        
        // I don't want to die
        if (spawn.room.find(FIND_HOSTILE_CREEPS).length > 1) spawn.room.controller.activateSafeMode();
        
        // Towers
        try {
            var towers = spawn.room.find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_TOWER } });
            for (var n in towers) {
                var tower = towers[n];
                var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
                var veryDamagedFriendlies = tower.room.find(FIND_MY_CREEPS, { filter: c => c.hits / c.hitsMax < 0.6 });
                
                // Attack
                if (closestHostile) tower.attack(closestHostile);
                
                // Heal
                else if (veryDamagedFriendlies.length) tower.heal(veryDamagedFriendlies.sort((a, b) => (b.hits / b.hitsMax) - (a.hits / a.hitsMax))[0]);
                
                // Repair, etc.
                else {
                    var structures = tower.room.find(FIND_STRUCTURES);
                    structures.sort((a, b) => {
                        var ast = a.structureType, bst = b.structureType, ah = a.hits, bh = b.hits;
                        var redArr = {STRUCTURE_ROAD: 500, STRUCTURE_RAMPART: 200, STRUCTURE_CONTAINER: 12000}, redArrK = Object.keys(redArr);
                        var wallMult = 3000;
                        
                        if (ast == STRUCTURE_WALL) /*return 1;*/ ah *= wallMult;
                        if (bst == STRUCTURE_WALL) /*return -1;*/ bh *= wallMult;
                        
                        if (!(redArrK.includes(ast) && redArrK.includes(bst))) {
                            if (redArrK.includes(ast))          if (ah < redArr[ast]) return -1;
                            else if (redArrK.includes(bst))     if (bh < redArr[ast]) return 1;
                        }
                        
                        return (ah / a.hitsMax) - (bh / b.hitsMax);
                    });
                    if (structures[0]) {
                        var target = structures[0];
                        if (target.hits / target.hitsMax < 0.2 && target.hits < 1000) tower.repair(target);
                        else if (tower.energy / tower.energyCapacity > ((target.structureType == STRUCTURE_RAMPART && target.hits < 1200) ? 0.5 : 0.7)) tower.repair(target);
                    }
                }
            }
        } catch (err) { console.log("Tower Err:\n" + err.stack); }
        
        // Spawn replacement Creeps
        try {
            for (var name in Memory.creeps) {
                if (!Game.creeps[name]) {
                    var body = Memory.creeps[name].body || role[Memory.creeps[name].role].body;
                    if (spawn.canCreateCreep(body, name) == OK) spawn.spawnCreep(body, name);    
                }
            }
        } catch (err) { console.log("Spawning Err:\n" + err.stack); }
        
        // Command Creeps
        for (var name in Game.creeps) {
            try {
                var creep = Game.creeps[name];
                    
                if (!creep.spawning) {
                    var tick = true;
                    if (creep.ticksToLive < 180 && creep.memory.role != "miner") {
                        creep.memory.mode = MODE_STAGNANT;
                        creep.memory.lock = true;
                        creep.memory.targetID = false;
                    }
                    
                    if (creep.hits < creep.hitsMax) {
                        creep.memory.mode = MODE_STAGNANT;
                        creep.memory.lock = true;
                        creep.memory.targetID = creep.pos.findClosestByPath(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_TOWER } }).id;
                    }
                    
                    if (tick) {
                        try {
                            role[creep.memory.role].tick(creep);
                            if (!creep.memory.lock) creep.memory.targetID = false;
                        }
                        catch (err) { console.log("Creep Err; Name: " + name + "\n" + err.stack); }
                    }
                }
            } catch (err) { console.log("Creep Control Err; Name: " + name + "\n" + err.stack); }
        }
        
        // Tower stuff?
    }
}
