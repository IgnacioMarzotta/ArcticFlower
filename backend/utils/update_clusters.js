const mongoose = require('mongoose');
const { updateAllClusterOccurrences } = require('../controllers/cluster.controller');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/arcticflower';

//Funcion utilizada para refrescar los atributos de los clusters, recalcula la cantidad de especies y otros atributos.
(async () => {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Conectado a MongoDB, arrancando actualización de occurrences…');
  const fakeReq = {};
  const fakeRes = { json: console.log, status: () => fakeRes };
  await updateAllClusterOccurrences(fakeReq, fakeRes);
  await mongoose.disconnect();
})();