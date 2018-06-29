module.exports = {
    body: [
        WORK,
        CARRY,
        MOVE,
    ], renew: function (creep, target) {
        if (target.structureType == STRUCTURE_SPAWN) {
            var response = target.renewCreep(creep);
            switch (response) {
            case OK:
                creep.memory.lock = true;
                if (creep.carry.energy) creep.transfer(target, RESOURCE_ENERGY);
                if (creep.ticksToLive < 650) break;
            case ERR_FULL:
                creep.memory.lock = false;
                break;
                
            case ERR_NOT_ENOUGH_RESOURCES:
                creep.memory.lock = true;
                console.log("WARNING: " + target.name + " is out of energy, and " + creep.name + " requires renewing!");
                break;
                
            case ERR_BUSY:
            case ERR_NOT_IN_RANGE:
                creep.moveTo(target, { visualizePathStyle: { stroke: "#ff0000" } });
                creep.memory.lock = true;
                break;
                
            default:
                creep.say("🚧");
                console.log(creep.name + ". mode: " + creep.memory.mode + ", err:" + response);
                break;
            }
        } else if (target.structureType == STRUCTURE_TOWER) {
            if (creep.hits == creep.hitsMax) {
                creep.memory.lock = false;
                return;
            }
            
            if (creep.pos.getRangeTo(target) < 4) {
                var response = target.heal(creep);
                switch (response) {
                case OK:
                    creep.memory.lock = creep.hits < creep.hitsMax;
                    if (creep.carry.energy) creep.transfer(target, RESOURCE_ENERGY);
                    break;
                    
                default:
                    creep.say("🚧");
                    console.log(creep.name + ". mode: " + creep.memory.mode + ", err:" + response);
                    break;
                }
            } else {
                var response = creep.moveTo(target, { range: 4, visualizePathStyle: { stroke: "#ff0000" } });
                switch (response) {
                case OK:
                    creep.memory.lock = true;
                    break;
                    
                case ERR_TIRED:
                    creep.memory.lock = true;
                    break;
                    
                default:
                    creep.say("🚧");
                    console.log(creep.name + ". mode: " + creep.memory.mode + ", err:" + response);
                    break;
                }
            }
        } else throw new Error("Err: Target not valid stagnant target type");
    }, tick: function (creep) {
        var target = creep.memory.targetID;
        
        if (!creep.memory.lock) {
            if (creep.ticksToLive < 180) creep.memory.mode = MODE_STAGNANT;
            else {
                creep.memory.role = "harvester";
                return;
            }
        }
        
        creep.memory.lock = false;
        this.mode[creep.memory.mode](creep, target);
    }, mode: []
};

module.exports.mode[MODE_STAGNANT] = function (creep, target) {
    if (!target) {
        var spawns = creep.room.find(FIND_MY_STRUCTURES, { filter: s => s.structureType == STRUCTURE_SPAWN })
        if (Object.keys(spawns)[0]) target = spawns[Object.keys(spawns)[0]];
        else target = Game.spawns[Object.keys(Game.spawns)[0]];
        creep.memory.targetID = target.id;
    }
    module.exports.renew(creep, target);
};
