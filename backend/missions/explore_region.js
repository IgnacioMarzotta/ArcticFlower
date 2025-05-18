module.exports = {
  type: 'explore_region',
  rewardXP: 40,

  //Regiones estaticas, definidas por una region geografica aproximada, puede no ser precisa.
  regions: {
    andes:      { name: 'Andes Mountain Range',  bounds: { minLat: -52.160455, maxLat: 4.915833, minLng: -81.035156, maxLng: -66.093750 } },
    urals:      { name: 'Urals Maountain Range',  bounds: { minLat: 46.437857, maxLat: 69.224997, minLng: 49.218750, maxLng: 66.445313 } },
    amazon:     { name: 'Amazon Rainforest', bounds: { minLat: -16.972741, maxLat: 4.214943, minLng: -72.949219, maxLng:-46.054688 } },
    alps:       { name: 'Alps Mountain Range', bounds: { minLat: 43.707594, maxLat: 47.754098, minLng: 5.053711, maxLng: 14.853516 } },
    atlas:      { name: 'Atlas Mountain Range', bounds: { minLat: 29.418068, maxLat: 36.720723, minLng: -10.274963, maxLng:  11.541138 } },
    himalayas:  { name: 'Himalayas Mountain Range', bounds: { minLat: 26.980829, maxLat: 37.260938, minLng: 71.935730, maxLng: 95.230865 } },
    great_reef: { name: 'Great Barrier Reef', bounds: { minLat: -26.313113, maxLat: -10.946585, minLng: 143.217773, maxLng: 156.085510 } },
    rockies:    { name: 'Rocky Mountain Range', bounds: { minLat: 39.398000, maxLat: 58.555359, minLng: -132.478638, maxLng: -112.022095 } },
    galapagos:  { name: 'Galapagos Islands', bounds: { minLat: -3.209761, maxLat: 2.499969, minLng: -93.646774, maxLng: -86.882629 } },
    patagonia:  { name: 'Patagonia Region', bounds: { minLat: -55.929202, maxLat: -38.389033, minLng: -78.310547, maxLng: -61.452026 } },
    appalachian:{ name: 'Appalachian Mountain Range', bounds: { minLat: 35.040046, maxLat: 44.606021, minLng: -84.636955, maxLng: -69.675422 } },
    caspian_sea:{ name: 'Caspian Sea', bounds: { minLat: 36.454427, maxLat: 46.970414, minLng: 46.761932, maxLng: 55.721970 } },
    nile:       { name: 'Nile River', bounds: { minLat: -2.903267, maxLat: 30.949347, minLng: 29.094543, maxLng: 37.161255 } },
    sahara:     { name: 'Sahara Desert', bounds: { minLat: 15.871525, maxLat: 30.977609, minLng: -16.413574, maxLng: 36.760254 } },
    congolian:  { name: 'Congolian Rainforest', bounds: { minLat: -5.911117, maxLat: 5.151128, minLng: 9.678955, maxLng: 30.047607 } },
    kalahari:   { name: 'Kalahari Desert', bounds: { minLat: -30.420256, maxLat: -17.235252, minLng: 16.987610, maxLng: 27.969818 } },
    gobi:       { name: 'Gobi Desert', bounds: { minLat: 38.539573, maxLat: 46.365884, minLng: 88.775024, maxLng: 113.384399 } },
    borneo:     { name: 'Borneo', bounds: { minLat: -4.215286, maxLat: 7.274952, minLng: 109.161186, maxLng: 118.960476 } },
  },

  async generateParams() {
    // Escoge región al azar
    const keys = Object.keys(this.regions);
    const key  = keys[Math.floor(Math.random() * keys.length)];
    const region = this.regions[key];

    // Parámetros: bounds + meta
    return {
      regionKey:    key,
      regionName:   region.name,
      bounds:       region.bounds,
      targetCount: 2
    };
  },

  async getDescription(params) {
    return `Explore ${params.targetCount} species in the ${params.regionName}`;
  },

  async onEvent(event, params) {
    if (event.type !== 'SPECIES_VIEW') return false;

    const { lat, lng, speciesId } = event.payload;
    const { bounds, targetCount } = params;

    // Verificar si la coordenada cae dentro del rectángulo
    if (
      lat  < bounds.minLat || lat  > bounds.maxLat ||
      lng  < bounds.minLng || lng  > bounds.maxLng
    ) {
      return false;
    }

    // Si está dentro del área, devolvemos true para contarla
    return true;
  }
};