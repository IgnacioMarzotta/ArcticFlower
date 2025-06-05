const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');
const Species = require('../../models/Species');

jest.mock('../../services/gbif.service');
jest.mock('../../services/iucn.service');
jest.mock('../../services/populate.service');

const zapataRailId = '67fd1e6ed79b4e8ecd7aa334';
const zapataRailTaxonId = '2474370';

const jamaicanPauraqueData = {
    taxon_id: "2497000",
    scientific_name: "Siphonorhis americana",
    category: "CR",
    common_name: "Jamaican Pauraque",
    kingdom: "Animalia",
    phylum: "Chordata",
    class: "Aves",
    order: "Caprimulgiformes",
    family: "Caprimulgidae",
    genus: "Siphonorhis",
    locations: [
        { country: "JM", continent: "North America", lat: 18.18, lng: -77.65 },
        { country: "HT", continent: "North America", lat: 18.842852, lng: -73.0397 }
    ],
};
let createdJamaicanPauraqueId;

describe('Species API - Integration Tests', () => {
    
    beforeAll(async () => {
        require('../../services/gbif.service').getGbifSpeciesRedListCategory.mockResolvedValue({ code: 'VU' });
        require('../../services/gbif.service').getGbifSpeciesVernacularName.mockResolvedValue({ results: [{ vernacularName: 'Updated Mock Name', language: 'eng' }] });
        require('../../services/gbif.service').getGbifSpeciesMedia.mockResolvedValue({ results: [{ identifier: 'http://mock.media/new.jpg', type:'StillImage', format:'image/jpeg' }] });
        require('../../services/iucn.service').getIucnSpeciesDescriptionByScientificName.mockResolvedValue({ assessments: [{ assessment_id: 'mockIucnId' }] });
        require('../../services/iucn.service').getIucnSpeciesAssessmentById.mockResolvedValue({ documentation: { rationale: 'Updated mock rationale from IUCN.' } });
    });
    
    afterAll(async () => {
        if (createdJamaicanPauraqueId) {
            await Species.findByIdAndDelete(createdJamaicanPauraqueId);
        }
    });

    describe('GET /species/:id', () => {
        it('should return a species by its ID', async () => {
            let tempSpecies = await Species.findOne({ taxon_id: zapataRailTaxonId });
            if (!tempSpecies) {
                tempSpecies = await new Species({
                    _id: mongoose.Types.ObjectId(zapataRailId), 
                    taxon_id: zapataRailTaxonId,
                    scientific_name: "Cyanolimnas cerverai",
                    common_name: "Zapata Rail",
                    category: "CR",
                    genus: "Cyanolimnas",
                    locations: [{ country: "CU", continent: "North America", lat: 22.3, lng: -81.3 }]
                }).save();
            }
            const testId = tempSpecies._id.toString();
            
            const res = await request(app).get(`/api/species/${testId}`);
            
            if (res.statusCode === 404) {
                console.warn(`Test species with ID ${testId} (Zapata Rail) not found for GET /species/:id. Ensure it exists in test DB.`);
            }
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('_id', testId);
            expect(res.body.taxon_id).toBe(zapataRailTaxonId);
        });
        
        it('should return 404 for a non-existent species ID', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const res = await request(app).get(`/api/species/${nonExistentId}`);
            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty('error', 'Especie no encontrada');
        });
        
        it('should return 500 for an invalid species ID format', async () => {
            const invalidId = 'invalid-id-format';
            const res = await request(app).get(`/api/species/${invalidId}`);
            expect(res.statusCode).toBe(500); 
            expect(res.body).toHaveProperty('error', 'Error al obtener especie');
        });
    });
    
    describe('GET /species/country/:country', () => {
        it('should return species for a given country code (e.g., CU)', async () => {
            const res = await request(app).get('/api/species/country/CU');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            const cubanSpecies = res.body.find(s => s.locations.some(loc => loc.country === 'CU'));
            expect(cubanSpecies).toBeDefined(); 
        });
        
        it('should return 404 if no species found for a country code', async () => {
            const res = await request(app).get('/api/species/country/XX');
            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty('error', 'No se encontraron especies para este país');
        });
    });
    
    describe('GET /species/search', () => {
        it('should return search results for a valid query', async () => {
            const res = await request(app).get('/api/species/search?q=Zapata%20Rail');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            if (res.body.length > 0) {
                expect(res.body[0]).toHaveProperty('id');
                expect(res.body[0]).toHaveProperty('lat');
            }
        });
        
        it('should return 400 if search query is too short', async () => {
            const res = await request(app).get('/api/species/search?q=Za');
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error', 'El término debe tener al menos 3 caracteres');
        });
        
        it('should return an empty array if search yields no results', async () => {
            const res = await request(app).get('/api/species/search?q=NonExistentSpeciesNameXYZ');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });
    });
    
    describe('POST /species/update-status', () => {
        let speciesToUpdateId;
        let originalSpeciesData;
        
        beforeAll(async () => {
            const speciesDataForUpdate = {
                taxon_id: "updateTest999",
                scientific_name: "Updatable specius testus",
                category: "LC",
                common_name: "Unknown",
                genus: "Updatablus",
                locations: [{ country: "UY", continent: "South America", lat: -34, lng: -56 }],
                media: [],
                description: { rationale: "Initial rationale." }
            };
            await Species.deleteOne({ taxon_id: speciesDataForUpdate.taxon_id });
            const created = await new Species(speciesDataForUpdate).save();
            speciesToUpdateId = created._id.toString();
            originalSpeciesData = created.toObject();
        });
        
        afterAll(async () => {
            if (speciesToUpdateId) {
                await Species.findByIdAndDelete(speciesToUpdateId);
            }
        });
        
        it('should update species status from external APIs', async () => {
            const res = await request(app)
            .post('/api/species/update-status')
            .send({
                id: speciesToUpdateId,
                taxon_id: originalSpeciesData.taxon_id,
                category: originalSpeciesData.category
            });
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('message', 'Especie actualizada');
            
            const updatedSpecies = await Species.findById(speciesToUpdateId).lean();
            expect(updatedSpecies.category).toBe('VU');
        });
        
        it('should return 400 if id or taxon_id is missing', async () => {
            const res = await request(app)
            .post('/api/species/update-status')
            .send({ id: speciesToUpdateId });
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error', 'Falta id o taxon_id');
        });
        
        it('should return 404 if species to update is not found', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const res = await request(app)
            .post('/api/species/update-status')
            .send({ id: nonExistentId, taxon_id: 'nonexistentTaxon' });
            expect(res.statusCode).toBe(404); 
            expect(res.body).toHaveProperty('error', 'Especie no encontrada');
        });
    });
});