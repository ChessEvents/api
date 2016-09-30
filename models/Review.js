var mongoose = require('mongoose');

var ReviewSchema = new mongoose.Schema({
  body: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  _event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }
}, {timestamps: true});

// Requires population of author
ReviewSchema.methods.toJSONFor = function(user){
  return {
    id: this._id,
    body: this.body,
    createdAt: this.createdAt,
    author: this.author.toProfileJSONFor(user)
  };
};

mongoose.model('Review', ReviewSchema);
