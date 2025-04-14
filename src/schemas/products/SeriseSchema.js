const mongoose = require('mongoose');

const { Schema } = mongoose;

const SeriesSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        image: {
            type: String,
        },
    },
    { id: true }
);

const Series = mongoose.model('Series', SeriesSchema);
module.exports = Series;
