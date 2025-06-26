module.exports = {
  type: 'add_species_to_fav',

  rewardXP: 10,

  async generateParams() {
    return {
      targetCount: 1
    };
  },

  async getDescription(params) {
    return `Add ${params.targetCount} species to your favorites`;
  },

  async onEvent(event, params) {
    if (event.type === 'SPECIES_FAVORITED') {
      return true;
    }
    return false;
  }
};