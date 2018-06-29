global.gck = Object.keys(global.gc = require("consts"));
for (var v in gck) global[gck[v]] = gc[gck[v]];
delete global.gc; delete global.gck;

module.exports = {
    body: [
        WORK, WORK, WORK, WORK, WORK, WORK, WORK,
        CARRY,
        MOVE,
    ], find: function (creep, resource) {
        return creep.room.find(FIND_STRUCTURES, { filter: s => {
            if ([STRUCTURE_CONTAINER].includes(s.structureType)) {
                var c = s.pos.lookFor(LOOK_CREEPS)[0];
                if (c) if (c.memory.targetID == s.id) return false;
                
                if (resource == RESOURCE_ENERGY) {
                    if (!s.pos.findInRange(FIND_SOURCES, 1).length) return false;
                } else if (Object.keys(REACTIONS).includes(resource)) {
                    if (!s.pos.findInRange(FIND_MINERALS, 1, { filter: { mineralType: resource } }).length) return false;
                } else {
                    if (!(
                        s.pos.findInRange(FIND_SOURCES, 1).length
                      + s.pos.findInRange(FIND_MINERALS, 1).length
                    )) return false;
                }
                
                return true;
            }
            return false;
        }})[0];
    }, harvest: function (creep, target, resource) {
        if (creep.pos.x != target.pos.x || creep.pos.y != target.pos.y) {
            var response = creep.moveTo(target /*, { ignoreCreeps: true }*/);
            switch (response) {
            case OK:
                var bc = target.pos.lookFor(LOOK_CREEPS);
                if (bc.length) if (bc[0].memory.targetID == target.id) creep.memory.targetID = false;
                break;
                
            case ERR_TIRED:
                break;
                
            default:
                creep.say("🚧");
                console.log(creep.name + ". mode: " + creep.memory.mode + ", err:" + response);
                break;
            }
	    } else {
	        var harvest;
	        if (resource == RESOURCE_ENERGY) {
                harvest = target.pos.findInRange(FIND_SOURCES, 1)[0];
            } else if (Object.keys(REACTIONS).includes(resource)) {
                harvest = target.pos.findInRange(FIND_MINERALS, 1, { filter: { mineralType: resource } })[0];
            } else {
                harvest = target.pos.findInRange(FIND_SOURCES, 1).concat(
                    target.pos.findInRange(FIND_MINERALS, 1)
                )[0];
            }
            if (!harvest) return this.mode[MODE_STORING](creep, target);
            var response = creep.harvest(harvest);
            switch (response) {
            case ERR_TIRED:
            case ERR_NOT_ENOUGH_RESOURCES:
            case OK:
                break;
            
            default:
                creep.say("🚧");
                console.log(creep.name + ". mode: " + creep.memory.mode + ", err:" + response);
                break;
            }
	    }
	}, store: function (creep, target) {
	    if (creep.pos.x != target.pos.x || creep.pos.y != target.pos.y) creep.moveTo(target /*, { ignoreCrees: true }*/);
	    else {
            var response;
            
            for (var resource in creep.carry) {
                if (!response) response = creep.transfer(target, resource);
                else creep.transfer(target, resource);
                
                if ([OK, ERR_BUSY, ERR_NOT_ENOUGH_RESOURCES, ERR_FULL].includes(response)) response = undefined;
            }
            
            if (response) {
                switch (response) {
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
	    }
	}, tick: function (creep) {
	    var target = Game.getObjectById(creep.memory.targetID);
        if (!creep.memory.lock) creep.memory.lock = true;
        
        if (_.sum(creep.carry) + creep.memory.body.filter(v => v == WORK).length * 2 <= creep.carryCapacity) creep.memory.mode = MODE_MINING;
        else creep.memory.mode = MODE_STORING;
        
        this.mode[creep.memory.mode](creep, target);
	}, mode: []
};

module.exports.mode[MODE_MINING] = function (creep, target) {
    if (!target) {
        target = module.exports.find(creep);
        if (!target) throw new Error("Cannot find mining target for " + creep.name);
        creep.memory.targetID = target.id;
    }
    module.exports.harvest(creep, target);
};

module.exports.mode[MODE_STORING] = function (creep, target) {
    if (!target) module.exports.tick(creep);
    module.exports.store(creep, target);
};
