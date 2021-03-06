// Imports the mongoose module
const mongoose = require('mongoose');

// Imports the mongoose auto-increment module
const autoIncrement = require('mongoose-auto-increment');

// Imports the module for moments calculation
const momentUtils = require('../utilities/moment_util');


// Defines the ForumMessage schema
const Schema = mongoose.Schema;
const ForumMessageSchema = new Schema({
    code: { type: Number, required: true, unique: true },
    content: { type: String, min: [10, 'Too short message content'], max: [2000, 'Too long message content'], required: true },
    creation_date: { type: Date, default: Date.now, required: true },
    update_date: { type: Date, default: Date.now, required: true },
    utility: { type: Number, min: 0, default: 0, required: true },
    utility_votes: [
        { 
            user: { type: Schema.ObjectId, ref: 'User', required: true },
            vote: { type: Boolean, required: true },
            creation_date: { type: Date, default: Date.now, required: true }
        }
    ],
    _authorId: { type: Schema.ObjectId, ref: 'User', required: true },
    _forumThreadId: { type: Schema.ObjectId, ref: 'ForumThread', required: true },
    _parentMessageId: { type: Schema.ObjectId, ref: 'ForumMessage' }
}, {
    collection: 'ForumMessages',
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});


// Initializes and setups the auto-increment
autoIncrement.initialize(mongoose.connection);
ForumMessageSchema.plugin(autoIncrement.plugin, { model: 'ForumMessage', field: 'code' });


// Defines a unique compound index
ForumMessageSchema.index({ _forumThreadId: 1, code: 1 }, { unique: true });


// Virtual for past time
ForumMessageSchema
.virtual('past_time')
.get(function() {
    return momentUtils.calculatePastTime(this.creation_date, new Date());
});


/**
 * Specifies a virtual with a 'ref' property in order to enable virtual population,
 * mantaining the document small.
 * Link: http://thecodebarbarian.com/mongoose-virtual-populate.
 */
ForumMessageSchema
.virtual('comments', {
    ref: 'ForumMessage',
    localField: '_id',
    foreignField: '_parentMessageId'
});


/**
 * Populates recursively the comments of the message.
 * @param {*} next 
 */
function autoPopulateComments(next) {
    this.populate('_authorId').populate({
        path: 'comments',
        populate: {
            path: '_authorId',
            select: 'code is_anonymous first_name last_name fullname photoURL gender birth_date age',
        }
    });
    next();
}

ForumMessageSchema
    .pre('findOne', autoPopulateComments)
    .pre('find', autoPopulateComments);


/**
 * Defines a function to run before saving.
 */
ForumMessageSchema.pre('save', function(next) {

    // Gets the current date
    var currentDate = new Date();
    // Changes the updated date field to current date
    this.update_date = currentDate;
    // Sets the creation date if not already present
    if (!this.creation_date) {
        this.creation_date = currentDate;
    }

    // Calculates the total utility vote
    let votes = [];
    votes = this.utility_votes.map((v) => {
        return v.vote;
    });
    if (votes.length === 0) {
        this.utility = 0;
    } else {
        this.utility = votes.reduce((sum, vote) => {
            return sum + (vote ? 1 : -1);
        });
    }

    next();

});


// Compiles model from schema
const ForumMessage = mongoose.model('ForumMessage', ForumMessageSchema);

// Exports function to create ForumMessage model class
module.exports = ForumMessage;