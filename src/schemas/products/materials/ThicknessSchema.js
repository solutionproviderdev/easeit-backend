const mongoose = require('mongoose');

const { Schema } = mongoose;

const ThicknessSchema = new Schema(
    {
        value: {
            type: Number,
            required: true,
        },
        // Fix typo 'enam' to 'enum'
        unit: {
            type: String,
            required: true,
            enum: ['mm', 'cm', 'm', 'in', 'ft'],
        },
    },
    { id: true }
);

const Thickness = mongoose.model('Thickness', ThicknessSchema);
module.exports = Thickness;
