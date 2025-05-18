module.exports = {
  type: 'add_species_to_fav',
  rewardXP: 20,

  async generateParams() {
    return {
    };
  },

  async getDescription(params) {
    return `Add a species to favorites.`;
  },

  async onEvent(event, params) {
    if (event.type !== 'ADD_TO_FAVORITES') return false;

    const {  } = event.payload;
    const {  } = params;

    return true;
  }
};