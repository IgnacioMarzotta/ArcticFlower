module.exports = {
  type: 'visit_by_initial',
  rewardXP: 30,
  
  async generateParams() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
    return {
      targetLetter: randomLetter,
      targetCount: 1
    };
  },
  
  async getDescription(params) {
    return `Visit a species whose name starts with the letter "${params.targetLetter}"`;
  },
  
  async onEvent(event, params) {
    
    if (event.type !== 'SPECIES_VIEW') {
      return false;
    }
    
    const { commonName, scientificName } = event.payload;
    const { targetLetter } = params;
    
    if (!commonName && !scientificName) {
      return false;
    }
    
    const commonNameMatches = commonName && commonName.trim().toUpperCase().startsWith(targetLetter);
    const scientificNameMatches = scientificName && scientificName.trim().toUpperCase().startsWith(targetLetter);
    
    return commonNameMatches || scientificNameMatches;
  }
};