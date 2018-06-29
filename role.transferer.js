String.prototype.r = function (n) {
    var arr = [];
    for (var i = 0; i < n; i++) arr.push(this);
    return arr;
};

global.gck = Object.keys(global.gc = require("consts"));
for (var v in gck) global[gck[v]] = gc[gck[v]];
delete global.gc; delete global.gck;

module.exports = {
    body: [WORK].concat(CARRY.r(7)).concat(MOVE.r(7)),
    find: function (creep, resource) {
        var tombstones = creep.room.find(FIND_TOMBSTONES);
        if (tombstones.length) {
            return tombstones.sort((a, b) => {
                var c = creep.pos.findClosestByPath([a, b]);
                c = c.pos.x == b.pos.x && c.pos.y == b.pos.y;
                return _.sum(b.store) * (1 + c) - _.sum(a.store) * (2 - c);
            });
        } else {
            var containers = creep.room.find(FIND_STRUCTURES, { filter: s => {
                if (![STRUCTURE_CONTAINER].includes(s.structureType)) return false;
                if (!s.store[resource]) return false;
                // if (!s.pos.lookFor(LOOK_CREEPS, { filter: c => c.memory.targetID == s.id }).length) return false;
                return true;
            }});
            if (containers.length) {
                return containers.sort((a, b) => {
                    var c = creep.pos.findClosestByPath([a, b]);
                    c = c.pos.x == b.pos.x && c.pos.y == b.pos.y;
                    return _.sum(b.store) * (1 + c) - _.sum(a.store) * (2 - c);
                });
            } else {
                if (resource == RESOURCE_ENERGY) return creep.room.find(FIND_SOURCES, { filter: s => s.energyCapacity });
                else return creep.room.find(FIND_MINERALS, { filter: source => source.mineralType == resource });
            }
        }
        return [];
    }, collect: function (creep, target) {
        var response = target.structureType ? creep.withdraw(target, RESOURCE_ENERGY) : creep.harvest(target);
        switch (response) {
        case OK:
            if (creep.carry.energy < creep.carryCapacity) {
                creep.memory.lock = true;
                break;
            }
        case ERR_FULL:
            creep.memory.lock = false;
            break;
        
        case ERR_NOT_ENOUGH_ENERGY:
        case ERR_BUSY:
            var freeSources = this.findFree(creep, target.energy ? RESOURCE_ENERGY : target.mineralType);
            if (freeSources.length) {
                if (!freeSources.includes(target)) {
                    target = freeSources[0];
                    creep.memory.targetID = target.id;
                }
            }
        case ERR_NOT_IN_RANGE:
            creep.memory.lock = true;
            creep.moveTo(target, {
                visualizePathStyle: { stroke: "#ffaa00" },
                range: 1,
                costCallback: function (room, cost) {
                    var containers = target.pos.findInRange(FIND_STRUCTURES, 1, { filter: { structureType: STRUCTURE_CONTAINER } });
                    for (var n in containers) cost.set(containers[n].pos.x, containers[n].pos.y, 255);
                }
            });
            break;
        
        default:
            creep.say("🚧");
            console.log(creep.name + ". mode: " + creep.memory.mode + ", err:" + response);
            break;
        }
	}, store: function (creep, target) {
        var response = creep.transfer(target, RESOURCE_ENERGY);
        switch (response) {
        case OK:
            creep.memory.lock = true;
            break;
            
        case ERR_FULL:
            creep.memory.targetID = false;
            break;
            
        case ERR_INVALID_TARGET:
            creep.say("!");
            console.log(creep.name + ". mode: " + creep.memory.mode + ", err: Invalid Target (" + target + ")");
        case ERR_NOT_ENOUGH_ENERGY:
            creep.memory.lock = false;
            break;
        
        case ERR_BUSY:
        case ERR_NOT_IN_RANGE:
            creep.memory.lock = true;
            creep.moveTo(target, { visualizePathStyle: { stroke: "#ffffff" } });
            break;
        
        default:
            creep.say("🚧");
            console.log(creep.name + ". mode: " + creep.memory.mode + ", err:" + response);
            break;
        }
	}, tick: function (creep) {
        var target = Game.getObjectById(creep.memory.targetID);
        
        if (!creep.memory.lock) {
            if (creep.carry.energy < creep.carryCapacity * 0.35) creep.memory.mode = MODE_MINING;
            else creep.memory.mode = MODE_STORING;
        }
        
        creep.memory.lock = false;
        this.mode[creep.memory.mode](creep, target);
	}, mode: []
};

module.exports.mode[MODE_MINING] = function (creep, target) {
    if (!target) {
        target = module.exports.findFree(creep, RESOURCE_ENERGY);
        creep.memory.targetID = target.id;
    }
    module.exports.harvest(creep, target);
};

module.exports.mode[MODE_STORING] = function (creep, target) {
    var sp = {}; // Structure Priority
    sp[STRUCTURE_SPAWN] = 4;
    sp[STRUCTURE_EXTENSION] = 2;
    sp[STRUCTURE_TOWER] = 2.5;
    sp[STRUCTURE_LAB] = 1.5;
    sp[STRUCTURE_STORAGE] = 0.1;
    
    if (!target) {
        if (!(creep.room.controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[creep.room.controller.level] * 0.15 || !parseInt(Math.random() * 10))) {
            target = creep.room.find(FIND_STRUCTURES, {
                filter: s => {
                    return Object.keys(sp).includes(s.structureType) && s.energy < s.energyCapacity;
                }
            }).sort((a, b) => {
                var c = creep.pos.findClosestByPath([a, b]);
                if (!c) return (a.energy / a.energyCapacity / sp[a.structureType]) - (b.energy / b.energyCapacity / sp[b.structureType]);
                c = c.pos.x == a.pos.x && c.pos.y == a.pos.y;
                
                var f = (a.energy / a.energyCapacity / sp[a.structureType] / (c ? 1.5 : 1))
                      - (b.energy / b.energyCapacity / sp[b.structureType] / (c ? 1 : 1.5));
                if (f) return f;
                return c ? -1 : 1;
            })[0];
        }
        if (!target) { // Upgrading
            target = creep.room.controller;
        }
        creep.memory.targetID = target.id;
    }
    module.exports.store(creep, target);
};
