const VIABLE_KINGDOMS = ['Animalia', 'Plantae']; //Only Animalia and Plantae, due to Fungi and Chromsita having too few entries to be viable

module.exports = {
    type: 'visit_by_kingdom',
    rewardXP: 50,
    
    async generateParams() {
        const randomKingdom = VIABLE_KINGDOMS[Math.floor(Math.random() * VIABLE_KINGDOMS.length)];
        
        return {
            targetKingdom: randomKingdom,
            targetCount: 5
        };
    },
    
    async getDescription(params) {
        return `Visit ${params.targetCount} species from the ${params.targetKingdom} kingdom`;
    },
    
    async onEvent(event, params) {
        
        if (event.type !== 'SPECIES_VIEW') {
            return false;
        }
        
        const { kingdom } = event.payload;
        const { targetKingdom } = params;
        
        if (!kingdom) {
            return false;
        }
        
        return kingdom === targetKingdom;
    }
};