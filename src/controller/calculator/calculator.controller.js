const { calculateCabinetComponents } = require('../../helpers/calculator/CabinetCalculator');

const calculateCabinet = async (req, res) => {
    try {
        const results = await calculateCabinetComponents(req.body);
        res.json(results);
    } catch (err) {
        console.error('Calculation error:', err);
        res.status(500).json({ error: 'Calculation failed', message: err.message });
    }
};

module.exports = {
    calculateCabinet,
};
