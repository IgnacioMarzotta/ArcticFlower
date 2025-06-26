const mongoose = require('mongoose');
const Mission = require('../models/Mission');
const UserMission = require('../models/UserMission');
const templates = require('../missions');
const User = require('../models/User');


exports.assignMissionsToUser = async (userId, count) => {
  const defs = await Mission.find().lean();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  
  const pickedDefs = pickRandom(defs, Math.min(count, defs.length));
  if (!pickedDefs || (Array.isArray(pickedDefs) && pickedDefs.length === 0)) {
    console.warn(`[mission.controller - assignMissionsToUser] No available mission definitions to assing to user ${userId}.`);
    return [];
  }
  
  const instances = [];
  const defsToProcess = Array.isArray(pickedDefs) ? pickedDefs : [pickedDefs];
    
  for (const def of defsToProcess) {
    if (!def || !def.type || !templates[def.type]) {
      console.error(`[mission.controller - assignMissionsToUser] Invalid mission definition or template: `, def);
      continue;
    }
    const tpl = templates[def.type];
    let params;
    try {
      params = tpl.generateParams
      ? await tpl.generateParams(def.params)
      : { ...(def.params || {}) };
    } catch (genError) {
      console.error(`[mission.controller - assignMissionsToUser] Error generating params for mission type ${def.type} (ID: ${def._id}):`, genError.message);
      continue;
    }
    
    let description = '';
    if (typeof tpl.getDescription === 'function') {
      description = await tpl.getDescription(params);
    }
    
    instances.push({
      userId,
      missionId: def._id,
      params,
      date: today,
      description,
    });
  }
  
  if (instances.length > 0) {
    await UserMission.insertMany(instances, { ordered: false });
  }
  return instances;
};


exports.getDailyMissions = async (req, res) => {
  const userId = req.userId;
  
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    let missions = await UserMission.find({
      userId: userId,
      date: { $gte: todayStart, $lt: tomorrow }
    }).lean();
    
    if (missions.length === 0) {
      console.log(`[mission.controller - getDailyMissions] No daily missions for user ${userId}, generating new ones.`);
      
      try {
        const cleanupResult = await UserMission.deleteMany({
          userId: userId,
          date: { $lt: todayStart }
        });
        
        if (cleanupResult.deletedCount > 0) {
          console.log(`[mission.controller - getDailyMissions] Cleaned up ${cleanupResult.deletedCount} old missions for user ${userId}.`);
        }
      } catch (cleanupError) {
        console.error(`[mission.controller - getDailyMissions] Error during old mission cleanup for user ${userId}:`, cleanupError);
      }
      
      try {
        const assignedMissions = await exports.assignMissionsToUser(userId, 3);
        
        if (assignedMissions.length === 0) {
          console.warn(`[mission.controller - getDailyMissions] No new missions were assigned to user ${userId}.`);
        }
        
        missions = await UserMission.find({
          userId: userId,
          date: { $gte: todayStart, $lt: tomorrow }
        }).lean();
        
      } catch (assignError) {
        if (assignError.code === 11000) {
          console.warn(`[mission.controller - getDailyMissions] E11000 (duplicate key) detected while assigning missions to user ${userId}. This likely indicates a race condition. Fetching existing missions.`);
          missions = await UserMission.find({
            userId: userId,
            date: { $gte: todayStart, $lt: tomorrow }
          }).lean();
          
          if (missions.length === 0) {
            console.error(`[mission.controller - getDailyMissions] Critical: E11000 detected, but no missions found for user ${userId} upon re-fetch. This indicates an unresolved conflict or data inconsistency.`);
            return res.status(500).json({ message: `[mission.controller - getDailyMissions] Unable to assign daily missions due to an unresolved conflict.` });
          }
        } else {
          console.error(`[mission.controller - getDailyMissions] Error during mission assignment for user ${userId}:`, assignError);
          return res.status(500).json({ message: `[mission.controller - getDailyMissions] An internal error occurred while assigning daily missions.`, error: assignError.message });
        }
      }
    }
    
    res.json(missions);
    
  } catch (err) {
    console.error(`[mission.controller - getDailyMissions] General error fetching daily missions for user ${userId}:`, err);
    if (err instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: `[mission.controller - getDailyMissions] Invalid user ID format.`, error: err.message });
    }
    res.status(500).json({ message: `[mission.controller - getDailyMissions] An unexpected error occurred while fetching daily missions.`, error: err.message });
  }
};


exports.handleEvent = async (req, res) => {
  try {
    const { event } = req.body;
    const userMission = await UserMission.findOne({ _id: req.params.id, userId: req.userId }).populate('missionId');
    
    if (!userMission) {
      return res.status(404).json({ message: 'Mission not found or not assigned to this user.' });
    }
    
    if (!userMission.missionId || !userMission.missionId.type) {
      console.error(`[mission.controller - handleEvent] Invalid mission data structure for UserMission ID: ${req.params.id}. MissionId or type missing.`);
      return res.status(500).json({ message: 'Invalid mission data.' });
    }
    
    if (!templates[userMission.missionId.type]) {
      console.error(`[mission.controller - handleEvent] No template found for mission type: ${userMission.missionId.type}`);
      return res.status(500).json({ message: `Mission template for type ${userMission.missionId.type} not found.` });
    }
    
    const tpl = templates[userMission.missionId.type];
    const ok = await tpl.onEvent(event, userMission.params);
    
    if (!ok) {
      return res.json({
        completed: userMission.completed,
        progress: userMission.progress || { seen: [] }
      });
    }
    
    userMission.progress = userMission.progress || {};
    userMission.progress.seen = userMission.progress.seen || [];
    
    const sid = event.payload.speciesId;
    
    if (sid && !userMission.progress.seen.includes(sid)) {
      userMission.progress.seen.push(sid);
    }
    
    if (!userMission.completed && userMission.params.targetCount && userMission.progress.seen.length >= userMission.params.targetCount) {
      console.log("[mission.controller - handleEvent] Mission complete, updating.");
      userMission.completed = true;
      
      const rewardXP = userMission.missionId.rewardXP;
      if (rewardXP && rewardXP > 0) {
        const user = await User.findById(req.userId);
        if (user) {
          const oldLevel = user.level;
          user.xp += rewardXP;
          const newLevel = 1 + Math.floor(user.xp / 300);

          if (newLevel > oldLevel) {
            user.level = newLevel;
            console.log(`[mission.controller - handleEvent] User ${user.username} has leveled up to level ${newLevel}!`);
            //A "level up" event could be triggered here in the future for a front-end response to the user.
          }
          await user.save();
        } else {
          console.error(`[mission.controller - handleEvent] Could not find user with ID ${req.userId} to award XP.`);
        }
      }
    }
    
    await userMission.save();
    
    res.json({
      completed: userMission.completed,
      progress: userMission.progress
    });
    
  } catch (error) {
    console.error(`[mission.controller - handleEvent] Error processing event for mission ${req.params.id}:`, error);
    
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid mission ID format.'});
    }
    res.status(500).json({ message: 'Error processing mission event.', error: error.message });
  }
};


function pickRandom(array, count = 1) {
  if (!array || array.length === 0) {
    return count === 1 ? undefined : [];
  }
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  const actualCount = Math.min(count, shuffled.length);
  return count === 1 ? (shuffled[0] || undefined) : shuffled.slice(0, actualCount);
}
