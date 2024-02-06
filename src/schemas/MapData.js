const mongoose = require('mongoose');

const mapDataSchema = new mongoose.Schema({
    division: {
        type: String,
        required: true,
    },
    districts: [
        {
            name: {
                type: String,
                required: true,
            },
            areas: [
                {
                    name: {
                        type: String,
                        required: true,
                    },
                    visitCharge: {
                        type: Number,
                        required: true,
                    },
                },
            ],
        },
    ],
});

const MapData = mongoose.model('MapData', mapDataSchema);

module.exports = MapData;
