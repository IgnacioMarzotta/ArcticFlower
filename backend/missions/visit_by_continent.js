const CONTINENTS = [
    'Africa',
    'Asia',
    'Europe',
    'North America',
    'Oceania',
    'South America'
];

module.exports = {
    type: 'visit_by_continent',
    rewardXP: 20,
    
    async generateParams() {
        const randomContinent = CONTINENTS[Math.floor(Math.random() * CONTINENTS.length)];
        return {
            targetContinent: randomContinent,
            targetCount: 3
        };
    },
    
    async getDescription(params) {
        return `Visit ${params.targetCount} species in ${params.targetContinent}`;
    },
    
    async onEvent(event, params) {
        if (event.type !== 'SPECIES_VIEW') {
            return false;
        }
        
        const { clickedContinent } = event.payload;
        const { targetContinent } = params;
        if (!clickedContinent) {
            return false;
        }
        return clickedContinent === targetContinent;
    }
};