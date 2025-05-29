
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server'); 
const Species = require('../../models/Species');

jest.mock('../../services/gbif.service', () => ({
    getGbifSpeciesRedListCategory: jest.fn(),
    getGbifSpeciesVernacularName: jest.fn(),
    getGbifSpeciesMedia: jest.fn(),
}));
jest.mock('../../services/iucn.service', () => ({
    getIucnSpeciesDescriptionByScientificName: jest.fn(),
    getIucnSpeciesAssessmentById: jest.fn(),
}));

describe('Species Routes /api/species', () => {
    beforeAll(async () => {
    });

    beforeEach(async () => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

       
    describe('GET /country/:countryCode', () => {
        it('should return species for a valid country code', async () => {
            await Species.create([
                { taxon_id: 't1', scientific_name: 'Chilean Flamingo', category: 'NT', locations: [{ country: 'CL', continent: 'South America', lat: -30, lng: -70 }], description: {}, kingdom: 'K', phylum: 'P', class: 'C', order: 'O', family: 'F', genus: 'G'},
                { taxon_id: 't2', scientific_name: 'Andean Condor', category: 'VU', locations: [{ country: 'CL', continent: 'South America', lat: -32, lng: -70 }, { country: 'AR', continent: 'South America', lat: -34, lng: -68 }], description: {}, kingdom: 'K', phylum: 'P', class: 'C', order: 'O', family: 'F', genus: 'G'}
            ]);

            const res = await request(app).get('/api/species/country/CL');
            expect(res.statusCode).toBe(200);
            expect(res.body).toBeInstanceOf(Array);
            expect(res.body.length).toBe(2);
            expect(res.body[0].scientific_name).toBe('Chilean Flamingo');
        });

        it('should return 404 if no species found for the country', async () => {
            const res = await request(app).get('/api/species/country/XX');
            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('No se encontraron especies para este país');
        });
    });

    
    describe('GET /search', () => {
        it('should return search results for a valid query', async () => {
            await Species.create([
                { taxon_id: 't1', common_name: 'Red Fox', scientific_name: 'Vulpes vulpes', category: 'LC', locations: [{ country: 'GB', continent: 'Europe', lat: 0, lng: 0}], description: {}, kingdom: 'K', phylum: 'P', class: 'C', order: 'O', family: 'F', genus: 'G'},
                { taxon_id: 't2', common_name: 'Arctic Fox', scientific_name: 'Vulpes lagopus', category: 'LC', locations: [{ country: 'CA', continent: 'North America', lat: 0, lng: 0}], description: {}, kingdom: 'K', phylum: 'P', class: 'C', order: 'O', family: 'F', genus: 'G'}
            ]);
            const res = await request(app).get('/api/species/search?q=Fox&limit=1');
            expect(res.statusCode).toBe(200);
            expect(res.body).toBeInstanceOf(Array);
            expect(res.body.length).toBe(1); 
                                        
            expect(res.body[0].common_name).toMatch(/Fox/i);
        });
        
        it('should return 400 if query term is too short', async () => {
            const res = await request(app).get('/api/species/search?q=Fo');
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('El término debe tener al menos 3 caracteres');
        });
    });

    
    describe('GET /:id', () => {
        it('should return a species by id', async () => {
            const species = await Species.create({ taxon_id: 't1', scientific_name: 'Test Species', category: 'DD', description: {}, kingdom: 'K', phylum: 'P', class: 'C', order: 'O', family: 'F', genus: 'G', locations: [{country: 'UY', continent: 'South America', lat:0,lng:0}] });
            const res = await request(app).get(`/api/species/${species._id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.scientific_name).toBe('Test Species');
        });

        it('should return 404 if species not found by id', async () => {
            const unknownId = new mongoose.Types.ObjectId().toString();
            const res = await request(app).get(`/api/species/${unknownId}`);
            expect(res.statusCode).toBe(404);
        });
         it('should return 500 if id is invalid format', async () => {
            const res = await request(app).get(`/api/species/invalididformat`);
            expect(res.statusCode).toBe(500); 
        });
    });

    
    describe('GET /', () => {
        it('should return a paginated list of species', async () => {
             await Species.create([
                { taxon_id: 't1', common_name: 'Species A', category: 'LC', description: {}, kingdom: 'K', phylum: 'P', class: 'C', order: 'O', family: 'F', genus: 'G', locations: [{country: 'AR', continent: 'South America',lat:0,lng:0}]},
                { taxon_id: 't2', common_name: 'Species B', category: 'VU', description: {}, kingdom: 'K', phylum: 'P', class: 'C', order: 'O', family: 'F', genus: 'G', locations: [{country: 'BR', continent: 'South America',lat:0,lng:0}]}
            ]);
            const res = await request(app).get('/api/species?page=1&limit=1');
            expect(res.statusCode).toBe(200);
            expect(res.body.total).toBe(2);
            expect(res.body.page).toBe(1);
            expect(res.body.totalPages).toBe(2);
            expect(res.body.species.length).toBe(1);
            expect(res.body.species[0]).toHaveProperty('common_name');
        });
    });
});