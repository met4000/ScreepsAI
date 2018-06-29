// require("creeps").add("builder", "B")

var role = {
    harvester: require("role.harvester")
};

global.gck = Object.keys(global.gc = require("consts"));
for (var v in gck) global[gck[v]] = gc[gck[v]];
delete global.gc; delete global.gck;

module.exports = {
    body: [
        WORK,
        CARRY,
        MOVE,
    ], build: function (creep, target) {
        var response = creep.build(target);
        switch (response) {
        case OK:
            creep.memory.lock = true;
            break;
            
        case ERR_RCL_NOT_ENOUGH:
            creep.memory.lock = true;
            creep.memory.mode = MODE_UPGRADING;
            break;
        
        case ERR_INVALID_TARGET:
            creep.say("!");
            console.log(creep.name + ". mode: " + creep.memory.mode + ", err: Invalid Target (" + target + ")");
        case ERR_BUSY:
        case ERR_RCL_NOT_ENOUGH:
        case ERR_NOT_ENOUGH_ENERGY:
            creep.memory.lock = false;
            break;
            
        case ERR_NOT_IN_RANGE:
            creep.memory.lock = true;
            creep.moveTo(target, { /*ignoreCreeps: true,*/ visualizePathStyle: { stroke: "#ffffff" } });
            break;
            
        default:
            creep.say("🚧");
            console.log(creep.name + ". mode: " + creep.memory.mode + ", err:" + response);
            break;
        }
    }, tick: function (creep) {
        var target = Game.getObjectById(creep.memory.targetID);
        
        if (!creep.memory.lock) {
            if (creep.carry.energy < creep.carryCapacity) creep.memory.mode = MODE_MINING;
            else creep.memory.mode = MODE_BUILDING;
        }
        
        creep.memory.lock = false;
        this.mode[creep.memory.mode](creep, target);
	}, mode: []
};

module.exports.mode[MODE_MINING] = role.harvester.mode[MODE_MINING];
module.exports.mode[MODE_STORING] = role.harvester.mode[MODE_STORING];
module.exports.mode[MODE_BUILDING] = function (creep, target) {
    if (!target) {
        var sites = creep.room.find(FIND_MY_CONSTRUCTION_SITES), sitesSorted = [];
        for (var n in sites) sitesSorted.push(sites[Object.keys(sites)[n]]);
        sitesSorted.sort((a, b) => {
            /**/
            if (a.structureType == STRUCTURE_CONTAINER || b.structureType == STRUCTURE_CONTAINER) {
                if (a.structureType == b.structureType) return b.progress - a.progress;
                return a.structureType == STRUCTURE_CONTAINER ? -1 : 1;
            }
            /**/
            var totalDiff = b.progressTotal - a.progressTotal;
            if (totalDiff) return totalDiff;
            
            var diff = b.progress - a.progress;
            if (diff) return diff;
            var c = creep.pos.findClosestByPath([a, b]);
            return (c.pos.x == b.pos.x && c.pos.y == b.pos.y) ? 1 : -1;
        });
        target = sitesSorted[0];
        if (!target) { // Just feed stuff
            creep.memory.lock = true;
            creep.memory.mode = 2;
            return;
        }
        creep.memory.targetID = target.id;
    }
    module.exports.build(creep, target);
};
