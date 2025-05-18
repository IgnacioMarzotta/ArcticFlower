const mongoose = require('mongoose');
const Mission = require('../models/Mission');
const UserMission = require('../models/UserMission');
const templates = require('../missions');
const User = require('../models/User');


exports.assignMissionsToUser = async (userId, count = 3) => {
  const defs  = await Mission.find().lean();
  const today = new Date(); today.setHours(0,0,0,0);

  const instances = [];
  for (const def of pickRandom(defs, count)) {
    const tpl = templates[def.type];
    const params = tpl.generateParams
      ? await tpl.generateParams(def.params)
      : def.params;

    let description = '';
    if (typeof tpl.getDescription === 'function') {
      description = await tpl.getDescription(params);
    }

    instances.push({
      userId,
      missionId: def._id,
      params,
      date: today,
      description
    });
  }

  await UserMission.insertMany(instances, { ordered: false });
  return instances;
};


exports.getDailyMissions = async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const tomorrow    = new Date(todayStart.getTime() + 24*60*60*1000);

    // 1) Buscar misiones de hoy
    let missions = await UserMission
      .find({
        userId: req.userId,
        date:    { $gte: todayStart, $lt: tomorrow }
      })
      .lean();

    // 2) Si no hay, asignar nuevas
    if (missions.length === 0) {
      console.log('No hay misiones para hoy, asignando nuevas');
      await exports.assignMissionsToUser(req.userId, 3);
      missions = await UserMission
        .find({
          userId: req.userId,
          date:   { $gte: todayStart, $lt: tomorrow }
        })
        .lean();
    }

    // 3) Devolver
    res.json(missions);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo misiones', error: err.message });
  }
};


exports.completeMission = async (req, res) => {
  try {
    const um = await UserMission.findOne({ _id: req.params.id, userId: req.userId }).populate('missionId');
    if (!um) return res.status(404).json({ message: 'Misión no encontrada' });
    um.completed = true;
    await um.save();

    await User.findByIdAndUpdate(req.userId, {
      $inc: { xp: um.missionId.rewardXP }
    });

    res.json({ message: 'Misión marcada como completada' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.claimMission = async (req, res) => {
  try {
    const um = await UserMission.findOne({ _id: req.params.id, userId: req.userId }).populate('missionId');
    if (!um) return res.status(404).json({ message: 'Misión no encontrada' });
    if (!um.completed) return res.status(400).json({ message: 'Misión no completada' });

    // suma XP al usuario (aquí tu lógica)
    // await User.findByIdAndUpdate(req.userId, { $inc: { xp: um.missionId.rewardXP } });

    await um.remove();
    res.json({ message: 'Recompensa reclamada', rewardXP: um.missionId.rewardXP });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error reclamando misión', error: err.message });
  }
};


exports.handleEvent = async (req, res) => {
  const { event } = req.body;
  const userMission = await UserMission.findOne({ _id: req.params.id, userId: req.userId }).populate('missionId');  
  const tpl = templates[userMission.missionId.type];
  const ok  = await tpl.onEvent(event, userMission.params);

  if (!ok) {
    return res.json(false);
  }

  userMission.progress = userMission.progress || {};
  userMission.progress.seen = userMission.progress.seen || [];

  const sid = event.payload.speciesId;
  if (!userMission.progress.seen.includes(sid)) {
    userMission.progress.seen.push(sid);
  }

  if (userMission.progress.seen.length >= userMission.params.targetCount) {
    console.log("MISSION COMPLETE - UPDATING");
    userMission.completed = true;
    await User.findByIdAndUpdate(req.userId, { $inc: { xp: userMission.missionId.rewardXP } });
  }

  await userMission.save();
  res.json(userMission.completed);
};


function pickRandom(array, count = 1) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return count === 1 ? shuffled[0] : shuffled.slice(0, count);
}
