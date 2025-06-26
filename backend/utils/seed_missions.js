const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');
require('dotenv').config();

const Mission = require('../models/Mission');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/arcticflower';

async function seed() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('✅ Conectado a MongoDB');

  const missionsDir = path.join(__dirname, '..', 'missions');
  const files = fs.readdirSync(missionsDir)
                  .filter(f => f !== 'index.js' && f.endsWith('.js'));

  for (const file of files) {
    const modPath = path.join(missionsDir, file);
    const tpl = require(modPath);

    if (!tpl.type) {
      console.warn(`⚠ El módulo ${file} no exporta 'type'; se omite.`);
      continue;
    }

    const rewardXP = typeof tpl.rewardXP === 'number' ? tpl.rewardXP : 0;

    const exists = await Mission.findOne({ type: tpl.type });
    if (exists) {
      console.log(`⚠ Misión “${tpl.type}” ya existe, omitiendo.`);
      continue;
    }

    await Mission.create({
      type:     tpl.type,
      params:   tpl.defaultParams || {},
      rewardXP
    });
    console.log(`✅ Misión “${tpl.type}” creada con rewardXP=${rewardXP}.`);
  }

  console.log('🎉 Seed completo');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Error en seed_missions:', err);
  process.exit(1);
});