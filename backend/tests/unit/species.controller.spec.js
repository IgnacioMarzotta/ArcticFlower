const speciesController = require('../../controllers/species.controller');
const Species = require('../../models/Species');
const gbifService = require('../../services/gbif.service');
const iucnService = require('../../services/iucn.service');
const sanitizeHtml = require('sanitize-html');

jest.mock('../../models/Species');
jest.mock('../../services/gbif.service');
jest.mock('../../services/iucn.service');
jest.mock('sanitize-html');

const createMockSpeciesInstance = (initialData = {}) => ({
    ...initialData,
    save: jest.fn().mockResolvedValue(true),
});


describe('Species Controller - Unit Tests (Active Functions)', () => {
    let mockReq, mockRes;
    let sharedMockSave;
    
    
    beforeEach(() => {
        mockReq = {
            body: {},
            params: {},
            query: {},
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
        
        sanitizeHtml.mockImplementation(text => text ? text.replace(/<[^>]*>/g, '').trim() : '');
        
        sharedMockSave = jest.fn().mockResolvedValue(true);
        
        Species.findById = jest.fn().mockImplementation((id) => {
            if (id === 'validId' || id === 'speciesIdToUpdate' || id === 'id1' || id === 'id2' || id === 'descTestId' ) {
                return Promise.resolve(createMockSpeciesInstance({ 
                    _id: id,
                    category: 'LC', 
                    common_name: 'Unknown', 
                    media: [], 
                    description: { rationale: '', habitat: ''}, 
                    genus: 'Testus',
                    scientific_name: 'Testus specius',
                }));
            }
            return Promise.resolve(null);
        });
        
        Species.create = jest.fn().mockImplementation(data => Promise.resolve({ ...data, _id: 'newMockId', save: jest.fn().mockResolvedValue(true) }));
    });
    
    describe('getSpeciesById', () => {
        it('should return a species if found', async () => {
            mockReq.params.id = 'validId';
            const mockSpeciesData = createMockSpeciesInstance({ _id: 'validId', scientific_name: 'Testus Validus' });
            Species.findById.mockResolvedValue(mockSpeciesData);
            
            await speciesController.getSpeciesById(mockReq, mockRes);
            
            expect(Species.findById).toHaveBeenCalledWith('validId');
            expect(mockRes.json).toHaveBeenCalledWith(mockSpeciesData);
        });
        
        it('should return 404 if species not found', async () => {
            mockReq.params.id = 'invalidId';
            Species.findById.mockResolvedValue(null);
            
            await speciesController.getSpeciesById(mockReq, mockRes);
            
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Especie no encontrada' });
        });
        
        it('should return 500 if there is a server error', async () => {
            mockReq.params.id = 'validId';
            Species.findById.mockRejectedValue(new Error('Server error'));
            
            await speciesController.getSpeciesById(mockReq, mockRes);
            
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error al obtener especie' });
        });
    });
    
    describe('getSpeciesByCountry', () => {
        it('should return species for a given country', async () => {
            mockReq.params.country = 'CU';
            const mockSpeciesList = [{ scientific_name: 'Cubanus Specius' }];
            Species.find.mockResolvedValue(mockSpeciesList);
            
            await speciesController.getSpeciesByCountry(mockReq, mockRes);
            
            expect(Species.find).toHaveBeenCalledWith({ "locations.country": 'CU' });
            expect(mockRes.json).toHaveBeenCalledWith(mockSpeciesList);
        });
    });
    
    describe('searchSpecies', () => {
        let mockQuery;
        const dbResults = [
            { _id: '1', common_name: 'León', scientific_name: 'Panthera leo', category: 'VU', locations: [{ country: 'KE', lat: 1, lng: 36 }] },
        ];
        const emptyDbResults = [
            { _id: 'noloc', common_name: 'No Location', scientific_name: 'NoLocationSpecies scientificus', category: 'DD', locations: [] },
            { _id: 'nulloc', common_name: 'Null Location', scientific_name: 'NullLocationSpecies scientificus', category: 'DD', locations: null },
        ];
        
        
        beforeEach(() => {
            mockQuery = {
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                maxTimeMS: jest.fn()
            };
            Species.find = jest.fn().mockReturnValue(mockQuery);
        });
        
        it('should return formatted search results', async () => {
            mockReq.query = { q: 'Panthera', limit: '5' };
            mockQuery.maxTimeMS.mockResolvedValue(dbResults);
            
            await speciesController.searchSpecies(mockReq, mockRes);
            
            expect(Species.find).toHaveBeenCalledWith({
                $or: [
                    { common_name: new RegExp('Panthera', 'i') },
                    { scientific_name: new RegExp('Panthera', 'i') },
                    { 'locations.country': new RegExp('Panthera', 'i') },
                ]
            });
            expect(mockQuery.select).toHaveBeenCalledWith('_id common_name scientific_name category locations');
            expect(mockQuery.limit).toHaveBeenCalledWith(5);
            expect(mockQuery.lean).toHaveBeenCalled();
            expect(mockQuery.maxTimeMS).toHaveBeenCalledWith(5000);
            expect(mockRes.json).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({ common_name: 'León', country: 'KE' })
            ]));
        });
        
        it('should return 400 if search term is too short', async () => {
            mockReq.query = { q: 'Pa' };
            await speciesController.searchSpecies(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'El término debe tener al menos 3 caracteres', code: 'SHORT_QUERY' });
        });
        
        it('should handle empty locations gracefully during formatting', async () => {
            mockReq.query = { q: 'NoLocationSpecies', limit: '5' };
            mockQuery.maxTimeMS.mockResolvedValue(emptyDbResults);
            
            await speciesController.searchSpecies(mockReq, mockRes);
            
            expect(mockRes.json).toHaveBeenCalledWith([]); 
        });
        
        it('should return 500 on server error', async () => {
            mockReq.query = { q: 'ErrorTerm' };
            mockQuery.maxTimeMS.mockRejectedValue(new Error('DB search error'));
            
            await speciesController.searchSpecies(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error interno' }));
        });
    });
    
    describe('createSpecies', () => {
        beforeEach(() => {
            jest.spyOn(speciesController, 'updateSpeciesStatusFromAPI').mockImplementation(async (req, res) => {
                return res.status(200).json({ message: 'Internally updated' });
            });
        });
        
        afterEach(() => {
            if (speciesController.updateSpeciesStatusFromAPI.mockRestore) {
                speciesController.updateSpeciesStatusFromAPI.mockRestore();
            }
        });
        
        it('should create a species and call updateSpeciesStatusFromAPI', async () => {
            mockReq.body = {
                taxon_id: 'newTaxon123',
                scientific_name: 'Novus Specius',
                category: 'NE',
                genus: 'Novus',
                locations: [{ country: 'BR', continent: 'South America', lat: -10, lng: -55 }],
            };
            const createdSpeciesData = { ...mockReq.body, _id: 'newMockId', common_name: 'Unknown', description: {}, media: [], gbifIds: [], references:[] };
            Species.create.mockResolvedValue(createdSpeciesData);
            
            await speciesController.createSpecies(mockReq, mockRes);
            
            expect(Species.create).toHaveBeenCalledWith(expect.objectContaining({
                taxon_id: 'newTaxon123',
            }));
            expect(speciesController.updateSpeciesStatusFromAPI).toHaveBeenCalledWith(
                expect.objectContaining({ body: { id: 'newMockId', taxon_id: 'newTaxon123', category: 'NE' } }),
                expect.anything() 
            );
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(createdSpeciesData);
        });
    });
    
    describe('updateSpeciesStatusFromAPI', () => {
        let speciesInstanceForUpdate; 
        let mockSaveForUpdate;
        
        beforeEach(() => {
            mockSaveForUpdate = jest.fn().mockResolvedValue(true);
            speciesInstanceForUpdate = { 
                _id: 'speciesIdToUpdate', 
                taxon_id: 'taxon123', 
                category: 'LC', 
                common_name: 'Unknown', 
                media: [], 
                description: { rationale: '', habitat: ''}, 
                genus: 'Testus', 
                scientific_name: 'Testus speciusoriginal',
                save: mockSaveForUpdate,
            };
            
            Species.findById.mockImplementation(async (id) => {
                if (id === 'speciesIdToUpdate') {
                    return speciesInstanceForUpdate;
                }
                return null;
            });
            
            gbifService.getGbifSpeciesRedListCategory.mockResolvedValue({ code: 'VU' });
            gbifService.getGbifSpeciesVernacularName.mockResolvedValue({ results: [{ vernacularName: 'Updated Name', language: 'eng' }] });
            gbifService.getGbifSpeciesMedia.mockResolvedValue({ results: [{ identifier: 'http://new.media/img.jpg', type: 'StillImage', format: 'image/jpeg' }] });
            iucnService.getIucnSpeciesDescriptionByScientificName.mockResolvedValue({ assessments: [{ assessment_id: 'iucnAssessment1' }] });
            iucnService.getIucnSpeciesAssessmentById.mockResolvedValue({ documentation: { rationale: 'Updated rationale from IUCN.' } });
        });
        
        it('should update species fields successfully', async () => {
            mockReq.body = { id: 'speciesIdToUpdate', taxon_id: 'taxon123', category: 'LC' };
            
            await speciesController.updateSpeciesStatusFromAPI(mockReq, mockRes);
            
            expect(Species.findById).toHaveBeenCalledTimes(4); 
            expect(mockSaveForUpdate).toHaveBeenCalledTimes(4); 
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Especie actualizada',
                category: expect.objectContaining({ updated: true, after: 'VU' }),
            }));
        });
        
        it('should handle species not found error from validation functions', async () => {
            mockReq.body = { id: 'nonExistentId', taxon_id: 'taxon123', category: 'LC' };
            Species.findById.mockResolvedValue(null);
            
            await speciesController.updateSpeciesStatusFromAPI(mockReq, mockRes);
            
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Especie no encontrada' 
            }));
        });
    });
    
    describe('Internal Logic - validateSpeciesIucnCategory (via updateSpeciesStatusFromAPI)', () => {
        let specificMockSave;
        let speciesInstanceForCategoryTest;
        
        beforeEach(() => {
            specificMockSave = jest.fn().mockResolvedValue(true);
        });
        
        it('should update category if different', async () => {
            speciesInstanceForCategoryTest = { _id: 'id1', category: 'LC', taxon_id: 'tx1', save: specificMockSave };
            Species.findById.mockImplementation(async (id) => id === 'id1' ? speciesInstanceForCategoryTest : null);
            
            gbifService.getGbifSpeciesRedListCategory.mockResolvedValue({ code: 'EN' });
            gbifService.getGbifSpeciesVernacularName.mockResolvedValue({ results: [] });
            gbifService.getGbifSpeciesMedia.mockResolvedValue({ results: [] });
            iucnService.getIucnSpeciesDescriptionByScientificName.mockResolvedValue({ assessments: [] });
            iucnService.getIucnSpeciesAssessmentById.mockResolvedValue({ documentation: {} });
            
            
            mockReq.body = { id: 'id1', taxon_id: 'tx1', category: 'LC' };
            await speciesController.updateSpeciesStatusFromAPI(mockReq, mockRes);
            
            const result = mockRes.json.mock.calls[0][0];
            expect(result.category.updated).toBe(true);
            expect(result.category.before).toBe('LC');
            expect(result.category.after).toBe('EN');
            expect(specificMockSave).toHaveBeenCalled();
        });
        
        it('should not update category if same or newCode is not a string', async () => {
            speciesInstanceForCategoryTest = { _id: 'id2', category: 'VU', taxon_id: 'tx2', save: specificMockSave };
            Species.findById.mockImplementation(async (id) => id === 'id2' ? speciesInstanceForCategoryTest : null);
            
            gbifService.getGbifSpeciesRedListCategory.mockResolvedValue({ code: 'VU' });
            gbifService.getGbifSpeciesVernacularName.mockResolvedValue({ results: [] });
            gbifService.getGbifSpeciesMedia.mockResolvedValue({ results: [] });
            iucnService.getIucnSpeciesDescriptionByScientificName.mockResolvedValue({ assessments: [] });
            iucnService.getIucnSpeciesAssessmentById.mockResolvedValue({ documentation: {} });
            
            
            mockReq.body = { id: 'id2', taxon_id: 'tx2', category: 'VU' };
            await speciesController.updateSpeciesStatusFromAPI(mockReq, mockRes);
            
            const result = mockRes.json.mock.calls[0][0];
            expect(result.category.updated).toBe(false);
            expect(result.category.current).toBe('VU');
            expect(specificMockSave).not.toHaveBeenCalled();
        });
    });
    
    describe('cleanText utility (tested via validateSpeciesDescription)', () => {
        let speciesInstanceForDesc;
        let saveMockForDesc;
        
        beforeEach(() => {
            saveMockForDesc = jest.fn().mockResolvedValue(true);
            speciesInstanceForDesc = {
                _id: 'descTestId',
                genus: 'TestGenus',
                scientific_name: 'TestGenus descriptus',
                description: { rationale: '', habitat: ''},
                save: saveMockForDesc
            };
            
            Species.findById.mockImplementation(async (id) => {
                if (id === 'descTestId') {
                    return speciesInstanceForDesc;
                }
                return createMockSpeciesInstance({ _id: id, save: jest.fn().mockResolvedValue(true) }); 
            });
            
            gbifService.getGbifSpeciesRedListCategory.mockResolvedValue({ code: 'LC' });
            gbifService.getGbifSpeciesVernacularName.mockResolvedValue({ results: [] });
            gbifService.getGbifSpeciesMedia.mockResolvedValue({ results: [] });
            iucnService.getIucnSpeciesDescriptionByScientificName.mockResolvedValue({ 
                assessments: [{ assessment_id: 'iucnDesc1' }] 
            });
            iucnService.getIucnSpeciesAssessmentById.mockResolvedValue({ 
                documentation: { 
                    rationale: '<p>Some <b>bold</b> text. </p>  Extra   spaces. ',
                    habitats: '  leading and trailing spaces  '
                } 
            });
        });
        
        it('should clean HTML and extra spaces from text via validateSpeciesDescription', async () => {
            mockReq.body = { id: 'descTestId', taxon_id: 'descTaxon', category: 'LC' };
            await speciesController.updateSpeciesStatusFromAPI(mockReq, mockRes);
            
            // La instancia 'speciesInstanceForDesc' fue modificada en su propiedad 'description'
            // por la función validateSpeciesDescription ANTES de llamar a save().
            expect(speciesInstanceForDesc.description.rationale).toBe('Some bold text. Extra spaces.');
            expect(speciesInstanceForDesc.description.habitat).toBe('leading and trailing spaces');
            expect(saveMockForDesc).toHaveBeenCalled(); // Verificar que se intentó guardar
            expect(sanitizeHtml).toHaveBeenCalledWith('<p>Some <b>bold</b> text. </p>  Extra   spaces. ', {"allowedAttributes": {}, "allowedTags": []});
        });
    });
});