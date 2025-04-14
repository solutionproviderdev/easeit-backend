const mongoose = require('mongoose');

const { Schema } = mongoose;

const ThicknessSchema = new Schema(
    {
        value: {
            type: Number,
            required: true,
        },
        unit: {
            type: String,
            required: true,
            enam: ['mm', 'cm', 'm', 'in', 'ft'],
        },
    },
    { id: true }
);

const Thickness = mongoose.model('Thickness', ThicknessSchema);
module.exports = Thickness;
