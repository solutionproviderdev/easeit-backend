/* eslint-disable new-cap */
const mongoose = require('mongoose');

const settingsSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        settingsData: {
            type: mongoose.Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

settingsSchema.path('name').validate({
    async validator(value) {
        const count = await this.model('setting').countDocuments({ name: value });
        return count === 0;
    },
    message: 'The name must be unique within the enum values.',
});

const Settings = new mongoose.model('setting', settingsSchema);

module.exports = Settings;
