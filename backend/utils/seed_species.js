const axios = require('axios');
const { faker } = require('@faker-js/faker');

const categories = ['DD', 'LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX'];
const kingdoms = ['Animalia', 'Plantae', 'Fungi', 'Protista', 'Archaea', 'Bacteria'];

function generateRandomCountryCodes(num) {
  const codes = new Set();
  while (codes.size < num) {
    codes.add(faker.location.countryCode());
  }
  return Array.from(codes);
}

/**
* Utilidad deprecada, genera datos falsos para una especie de prueba usando faker.
* La propiedad "country" se genera como una cadena de codigos separados por comas.
*/
function generateSpeciesData() {
  // Genera un numero entero aleatorio entre 1 y 5 para la cantidad de paises a los que pertenece la especie
  const numCountries = faker.number.int({ min: 1, max: 5 });
  // Genera aleatoriamente los codigos de pais usando Faker
  const selectedCountries = generateRandomCountryCodes(numCountries);
  // Une los codigos con comas, como espera el controlador
  const countryField = selectedCountries.join(',');
  
  return {
    taxon_id: faker.string.uuid().slice(0, 8).toUpperCase(),
    common_name: faker.animal.cat(),
    scientific_name: faker.lorem.words(2),
    category: faker.helpers.arrayElement(categories),
    kingdom: faker.helpers.arrayElement(kingdoms),
    country: countryField,
    threats: faker.lorem.sentence(),
    media: faker.image.url()
  };
}

async function seedSpecies() {
  const numSpecies = 1500; // Numero de especies de prueba a generar
  for (let i = 0; i < numSpecies; i++) {
    const speciesData = generateSpeciesData();
    try {
      const response = await axios.post('http://localhost:3000/api/species', speciesData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      //console.log(`Especie ${i + 1} creada:`, response.data);
    } catch (error) {
      console.error(`Error al crear especie ${i + 1}:`, error.response ? error.response.data : error.message);
    }
  }
}

seedSpecies();