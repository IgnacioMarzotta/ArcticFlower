const {
  getRandomSpeciesByCategory,
  getRandomClusterFromSpecies
} = require('../services/mission.service');
const Cluster = require('../models/Cluster');

module.exports = {
  type: 'visit_cr_species',
  rewardXP: 10,

  async generateParams() {
    const species = await getRandomSpeciesByCategory('CR');
    const { country, clusterId } = await getRandomClusterFromSpecies(species);
    return {
      country,
      clusterId,
      targetCount: 1
    };
  },

  async getDescription(params) {
    const cluster = await Cluster.findOne({ country: params.country }).lean();
    const countryName = cluster ? cluster.countryName : params.country;
    return `Visit a critically endangered species in ${countryName}`;
  },

  async onEvent(event, params) {
    console.log('onEvent', event, params);
    if (event.type === 'SPECIES_VIEW' && event.payload.status === 'CR' && event.payload.clusterId === params.country) {
      console.log("===========");
      console.log("VALID");
      console.log("===========");
    }
    return (
      event.type === 'SPECIES_VIEW' &&
      event.payload.status === 'CR' &&
      event.payload.clusterId === params.country
    );
  }
};