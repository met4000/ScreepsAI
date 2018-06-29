global.gck = Object.keys(global.gc = require("consts"));
for (var v in gck) global[gck[v]] = gc[gck[v]];
delete global.gc; delete global.gck;

module.exports = {
    body: [
        WORK,
        CARRY,
        MOVE,
    ], find: function (creep, resource) {
        // var tombstones = creep.room.find(FIND_TOMBSTONES);
        // if (tombstones.length) {
        //     return tombstones.sort((a, b) => {
        //         var c = creep.pos.findClosestByPath([a, b]);
        //         c = c.pos.x == b.pos.x && c.pos.y == b.pos.y;
        //         return _.sum(b.store) * (1 + c) - _.sum(a.store) * (2 - c);
        //     });
        // } else {
        var drops = creep.room.find(FIND_DROPPED_RESOURCES, resource ? { filter: { resourceType: resource } } : {});
        if (drops.length) return drops;
        else {
            // var containers = [];
            var containers = creep.room.find(FIND_STRUCTURES, { filter: s => {
                if (![STRUCTURE_CONTAINER].includes(s.structureType)) return false;
                if (!s.store[resource]) return false;
                if (!REBUILD)
                    if (!s.pos.lookFor(LOOK_CREEPS, { filter: c => c.memory.targetID == s.id && c.memory.role == "miner" }).length) return false;
                return true;
            }});
            if (containers.length) {
                return containers.sort((a, b) => {
                    var c = creep.pos.findClosestByPath([a, b]);
                    c = c.pos.x == b.pos.x && c.pos.y == b.pos.y;
                    return _.sum(b.store) * (c ? 1.25 : 1) - _.sum(a.store) * (c ? 1 : 1.25);
                });
            } else {
                if (resource == RESOURCE_ENERGY) return creep.room.find(FIND_SOURCES, { filter: s => s.energyCapacity });
                else return creep.room.find(FIND_MINERALS, { filter: source => source.mineralType == resource });
            }
        }
        // }
        return [];
    }, findFree: function (creep, resource) {
        var sources = this.find(creep, resource);
        var freeSources = sources.filter(function (v) {
            if (v.pos.findInRange(FIND_STRUCTURES, { filter: s => {
                if (structureType == STRUCTURE_CONTAINER) if (s.pos.lookForAt(LOOK_CREEPS, { filter: c => c.memory.targetID == s.id })) return false;
                return true;
            }}).length) return false;
            
            var nSpaces = 1;
            if (v.ticksToRegeneration != undefined) {
                nSpaces = creep.room.lookForAtArea(LOOK_TERRAIN, v.pos.y - 1, v.pos.x - 1, v.pos.y + 1, v.pos.x + 1, true).filter(
                    v => { return v.terrain == "plain" || v.terrain == "swamp"; }
                ).length;
            }
            return nSpaces > creep.room.find(FIND_CREEPS, { filter: { memory: { targetID: v.id } } }).length;
        });
        return freeSources[0] || sources[0] || [];
    }, harvest: function (creep, target) {
        if (target.structureType) if (!target.store.energy) return false;
        var response = target.structureType ? creep.withdraw(target, RESOURCE_ENERGY) : (target.amount ? creep.pickup(target) : creep.harvest(target));
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
        if (target.id == creep.room.controller.id) creep.memory.lock = true;
        switch (response) {
        case OK:
            creep.memory.lock = true;
            break;
            
        case ERR_FULL:
            // console.log(creep.name + ": FULL");
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
        if (target.structureType == STRUCTURE_CONTROLLER) creep.memory.targetID = false;
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
    sp[STRUCTURE_TOWER] = 1.25; // 2
    sp[STRUCTURE_LAB] = 1.5;
    sp[STRUCTURE_CONTAINER] = 1.5;
    sp[STRUCTURE_STORAGE] = 0.5;
    sp[STRUCTURE_TERMINAL] = 1.25;
    
    var sc = {}; // Struture Cap (%)
    sc[STRUCTURE_SPAWN] = 100;
    sc[STRUCTURE_EXTENSION] = 100;
    sc[STRUCTURE_TOWER] = 60; // 90
    sc[STRUCTURE_LAB] = 90;
    sc[STRUCTURE_CONTAINER] = 75;
    sc[STRUCTURE_STORAGE] = 5;
    sc[STRUCTURE_TERMINAL] = 10;
    
    if (!target) {
        if (!(creep.room.controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[creep.room.controller.level] * 0.15 || !parseInt(Math.random() * 2/*10*/))) {
            target = creep.room.find(FIND_STRUCTURES, {
                filter: s => {
                    if (s.structureType == STRUCTURE_CONTAINER) if (s.pos.findInRange(FIND_SOURCES, 1)) return false;
                        
                    // if (s.structureType == STRUCTURE_TOWER)
                    //     if (s.pos.findInRange(FIND_STRUCTURES, 1, { filter: { structureType: STRUCTURE_CONTAINER }})) return false;
                        
                    return Object.keys(sp).includes(s.structureType) && s.energy < s.energyCapacity;
                }
            }).sort((a, b) => {
                var c = creep.pos.findClosestByPath([a, b]);
                var aCapacity = (a.energyCapacity || a.storeCapacity) * sc[a.structureType] / 100,
                    bCapacity = (b.energyCapacity || b.storeCapacity) * sc[b.structureType] / 100;
                if (!c) return ((a.energy || (a.store || { energy: 0 })[RESOURCE_ENERGY]) / aCapacity / sp[a.structureType])
                             - ((b.energy || (b.store || { energy: 0 })[RESOURCE_ENERGY]) / bCapacity / sp[b.structureType]);
                c = c.pos.x == a.pos.x && c.pos.y == a.pos.y;
                
                var f = (a.energy / aCapacity / sp[a.structureType] / (c ? 1.2 : 1))
                      - (b.energy / bCapacity / sp[b.structureType] / (c ? 1 : 1.2));
                if (f) return f;
                return c ? -1 : 1;
            })[0];
        }
        if (!target) { // Upgrading
            target = creep.room.controller;
        }
        creep.memory.targetID = target.id;
        //console.log(creep.name + ": " + Game.getObjectById(creep.memory.targetID));
    }
    module.exports.store(creep, target);
};
