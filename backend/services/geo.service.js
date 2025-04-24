const worldCountries = require('world-countries');

/**
* Devuelve las coordenadas del pais a partir del codigo ISO.
* @param {string|undefined} rawCountryCode Codigo del pais (ejemplo: "US", "IN")
* @returns {{lat: number, lng: number}} o null si no se encuentra
**/
exports.getCountryCoordinates = (rawCountryCode) => {
    if (!rawCountryCode) return null;
    
    const countryCode = rawCountryCode.replace(/[^A-Za-z]/g, '').toUpperCase();
    
    const country = worldCountries.find(c => 
        c.cca2 === countryCode || c.cca3 === countryCode
    );
    
    if (!country) {
        console.error(`Codigo no encontrado: ${countryCode}`);
        return null;
    }
    
    return country.latlng && country.latlng.length === 2
    ? { lat: country.latlng[0], lng: country.latlng[1] }
    : null;
};