// Imports the mongoose module
const mongoose = require('mongoose');

// Defines the RareDisease schema
const Schema = mongoose.Schema;
const RareDiseaseSchema = new Schema({
    code: { type: Number, required: true, unique: true },
    names: [{
        language: { type: String, trim: true, min: 2, max: 2, required: true },
        name: { type: String, max: [50, 'Too long disease name'], required: true }
    }],
    _forumId: { type: Schema.ObjectId, ref: 'Forum', required: true }
}, {
    collection: 'RareDiseases'
});

// Compiles model from schema
const RareDisease = mongoose.model('RareDisease', RareDiseaseSchema);

// Exports function to create RareDisease model class
module.exports = RareDisease;