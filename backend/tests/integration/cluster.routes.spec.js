const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const Cluster = require('../../models/Cluster');
const Species = require('../../models/Species');

jest.mock('axios');
const axios = require('axios');

jest.mock('../../controllers/species.controller', () => ({
  createSpecies: jest.fn().mockImplementation((req, res) => {
    if (res && res.status) { return Promise.resolve(res.status(201).json({ message: 'Mocked species created for cluster test' })); }
    return Promise.resolve({ message: 'Mocked species created internally for cluster test' });
  }),
  updateSpeciesStatusFromAPI: jest.fn().mockImplementation((req, res) => {
    if (res && res.status) { return Promise.resolve(res.json({ message: 'Mocked species status updated' })); }
    return Promise.resolve({ message: 'Mocked species status updated internally' });
  }),
  getSpeciesByCountry: jest.fn().mockImplementation((req, res) => {
    if (res && res.status) { return Promise.resolve(res.json({ message: 'Mocked a list of species by country.' })); }
    return Promise.resolve({ message: 'Mocked a list of species by country.' });
  }),
  searchSpecies: jest.fn().mockImplementation((req, res) => {
    if (res && res.status) { return Promise.resolve(res.json({ message: 'Mocked a species search' })); }
    return Promise.resolve({ message: 'Mocked a species search' });
  }),
  getSpeciesById: jest.fn().mockImplementation((req, res) => {
    if (res && res.status) { return Promise.resolve(res.json({ message: 'Mocked getSpeciesById' })); }
    return Promise.resolve({ message: 'Mocked getSpeciesById' });
  }),
  getAllSpecies: jest.fn().mockImplementation((req, res) => {
    if (res && res.status) { return Promise.resolve(res.json({ message: 'Mocked obtained all species.' })); }
    return Promise.resolve({ message: 'Mocked obtained all species.' });
  }),
}));

describe('Cluster Routes - Integration Tests', () => {
  
  beforeAll(async () => {
    await Cluster.deleteMany({});
    await Species.deleteMany({});
  });
  
  afterEach(async () => {
    await Cluster.deleteMany({});
    await Species.deleteMany({});
    axios.get.mockClear();
    if (require('../../controllers/species.controller').createSpecies.mockClear) {
      require('../../controllers/species.controller').createSpecies.mockClear();
    }
  });
  
  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });
  
  describe('GET /api/clusters (getSpeciesClusters)', () => {
    it('should return all clusters sorted by country code', async () => {
      await Cluster.create([
        { country: 'ZM', countryName: 'Zambia', count: 1, lat: -15, lng: 30, worstCategory: 'LC', markerSize: 50 },
        { country: 'AR', countryName: 'Argentina', count: 5, lat: -34, lng: -64, worstCategory: 'CR', markerSize: 70 },
        { country: 'UY', countryName: 'Uruguay', count: 2, lat: -32, lng: -55, worstCategory: 'EN', markerSize: 60 }
      ]);
      
      const response = await request(app).get('/api/clusters');
      
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(3);
      expect(response.body[0].country).toBe('AR');
      expect(response.body[1].country).toBe('UY');
      expect(response.body[2].country).toBe('ZM');
    });
    
    it('should return an empty array if no clusters exist', async () => {
      const response = await request(app).get('/api/clusters');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });
    
});