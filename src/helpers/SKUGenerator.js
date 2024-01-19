/* eslint-disable prettier/prettier */
const Meterials = require('../schemas/MeterialsSchema');

// Declear SKU code for series, location, glass, application
const seriesCode = [
    { name: 'Economy', code: 'EC' },
    { name: 'Standard', code: 'SS' },
    { name: 'Premium', code: 'PR' },
    { name: 'Platinum', code: 'PL' },
];
const locationCode = [
    { name: 'Inside', code: 'I' },
    { name: 'OutSide', code: 'O' },
];
const glassCode = [
    { name: '0.5 mm', code: 'G05' },
    { name: '1.0 mm', code: 'G1' },
];
const applicationCode = [
    { name: 'Kitchen Cabinet', code: 'KC' },
    { name: 'Front Shutter', code: 'FS' },
    { name: 'Storage cabinet', code: 'SC' },
    { name: 'Modular Cabinet', code: 'MK' },
    { name: 'Dinner Wagon', code: 'DW' },
    { name: 'Full Height cabinet / Open Shelve', code: 'FH' },
    { name: 'Bi-Fold Folding Door Works', code: 'FD' },
    { name: 'TV / Media Unit Works', code: 'TV' },
];

async function getMaterialSkuCodeByName(materialName) {
    try {
        const material = await Meterials.findOne({ name: materialName }).select('skuCode');
        if (!material) {
            console.log('Material not found.');
            return null; // Or handle it as you prefer
        }
        return material.skuCode;
    } catch (error) {
        console.error('Error fetching material SKU Code:', error);
        throw error; // Or handle it as you prefer
    }
}

async function generateSKU(body) {
    // Destructure necessary properties from Body
    const {
        class: seriesName,
        location: locationName,
        glass: glassName,
        application: applicationName,
        bodyBoard,
        fsBoard,
        bodyEdging,
        frontSutterEdging
    } = body;

    // Find the corresponding codes
    const seriesCodeFound = seriesCode.find((item) => item.name === seriesName)?.code || '';
    const locationCodeFound = locationCode.find((item) => item.name === locationName)?.code || '';
    const glassCodeFound = glassCode.find((item) => item.name === glassName)?.code || '';
    const applicationCodeFound = applicationCode.find((item) => item.name === applicationName)?.code || '';

    // Retrieve SKU codes from the database
    const bodyBoardCode = await getMaterialSkuCodeByName(bodyBoard);
    const fsBoardCode = await getMaterialSkuCodeByName(fsBoard);
    const bodyEdgingCode = await getMaterialSkuCodeByName(bodyEdging);
    const forntSutterEdgingCode = await getMaterialSkuCodeByName(frontSutterEdging);

    // Construct the final SKU Code
    const finalSKUCode = `${seriesCodeFound}-${locationCodeFound}-${applicationCodeFound}${glassCodeFound ? `-${glassCodeFound}` : ''}-${fsBoardCode}-${forntSutterEdgingCode}-${bodyBoardCode}-${bodyEdgingCode}`;
    return finalSKUCode;
}

module.exports = generateSKU;
