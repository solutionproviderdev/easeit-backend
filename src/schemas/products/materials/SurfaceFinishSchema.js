const mongoose = require('mongoose');

const { Schema } = mongoose;

const SurfaceFinishSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            enam: ['Prefabricated', 'Formica Laminated', 'Paint'],
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

const SurfaceFinish = mongoose.model('SurfaceFinish', SurfaceFinishSchema);
module.exports = SurfaceFinish;
