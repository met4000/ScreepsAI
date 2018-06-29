global.gck = Object.keys(global.gc = require("consts"));
for (var v in gck) global[gck[v]] = gc[gck[v]];
delete global.gc; delete global.gck;

module.exports = {
    structures: [
        STRUCTURE_TOWER
    ],
    
    body: [
        WORK,
        CARRY,
        MOVE,
    ], find: function (creep) {
        return creep.room.find(FIND_STRUCTURES, { filter: s => {
            if ([STRUCTURE_CONTAINER].includes(s.structureType)) {
                var c = s.pos.lookFor(LOOK_CREEPS)[0];
                if (c) if (c.memory.targetID == s.id) return false;
                var structures = [STRUCTURE_SPAWN, STRUCTURE_CONTROLLER, STRUCTURE_TOWER];
                if (!s.pos.findInRange(FIND_MY_STRUCTURES, 1, { filter: s => module.exports.structures.includes(s.structureType) }).length) return false;
                
                return true;
            }
            return false;
        }})[0];
    }, withdraw: function (creep, target) {
        if (creep.pos.x != target.pos.x || creep.pos.y != target.pos.y) creep.moveTo(target);
	    else {
            var response = creep.withdraw(target, RESOURCE_ENERGY);
            switch (response) {
            case ERR_NOT_ENOUGH_RESOURCES:
            case OK:
                break;
                
            case ERR_NOT_IN_RANGE:
                creep.moveTo(target, { ignoreCreeps: true, visualizePathStyle: { stroke: "#ffaa00" } });
                break;
            
            default:
                creep.say("🚧");
                console.log(creep.name + ". mode: " + creep.memory.mode + ", err:" + response);
                break;
            }
	    }
	}, store: function (creep, target) {
	    if (creep.pos.x != target.pos.x || creep.pos.y != target.pos.y) creep.moveTo(target);
	    else {
	        var convey = target.pos.findInRange(FIND_MY_STRUCTURES, 1, { filter: s => module.exports.structures.includes(s.structureType) })[0];
            var response = creep.transfer(convey, RESOURCE_ENERGY);
            switch (response) {
            case ERR_FULL:
            case OK:
                break;
                
            case ERR_INVALID_TARGET:
                creep.say("!");
                console.log(creep.name + ". mode: " + creep.memory.mode + ", err: Invalid Target (" + target + ")");
                break;
            
            default:
                creep.say("🚧");
                console.log(creep.name + ". mode: " + creep.memory.mode + ", err:" + response);
                break;
            }
	    }
	}, tick: function (creep) {
	    var target = Game.getObjectById(creep.memory.targetID);
        if (!creep.memory.lock) creep.memory.lock = true;
        
        if (_.sum(creep.carry) < creep.carryCapacity) creep.memory.mode = MODE_MINING;
        else creep.memory.mode = MODE_STORING;
        
        // console.log(creep, target);
        this.mode[creep.memory.mode](creep, target);
	}, mode: []
};

module.exports.mode[MODE_MINING] = function (creep, target) {
    if (!target) {
        target = module.exports.find(creep);
        if (!target) return false;
        creep.memory.targetID = target.id;
    }
    module.exports.withdraw(creep, target);
};

module.exports.mode[MODE_STORING] = function (creep, target) {
    if (!target) module.exports.tick(creep);
    module.exports.store(creep, target);
};
