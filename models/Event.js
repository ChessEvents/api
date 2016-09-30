var mongoose = require( 'mongoose' );
var uniqueValidator = require( 'mongoose-unique-validator' );
var slug = require( 'slug' );
var User = mongoose.model( 'User' );

var EventSchema = new mongoose.Schema( {
  slug: {
    type: String,
    lowercase: true,
    unique: true
  },
  title: String,
  description: String,
  body: String,
  favoritesCount: {
    type: Number,
    default: 0
  },
  reviews: [ {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  } ],
  tagList: [ {
    type: String
  } ],
  organiser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
} );

EventSchema.plugin( uniqueValidator, {
  message: 'is already taken'
} );

EventSchema.pre( 'validate', function ( next ) {
  this.slugify();

  next();
} );

EventSchema.methods.slugify = function () {
  this.slug = slug( this.title );
};

EventSchema.methods.updateFavoriteCount = function () {
  var _event = this;

  return User.count( {
    favorites: {
      $in: [ _event._id ]
    }
  } ).then( function ( count ) {

    _event.favoritesCount = count;

    return _event.save();
  } );
};

EventSchema.methods.toJSONFor = function ( user ) {
  return {
    slug: this.slug,
    title: this.title,
    description: this.description,
    body: this.body,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    tagList: this.tagList,
    favorited: user ? user.isFavorite( this._id ) : false,
    favoritesCount: this.favoritesCount,
    organiser: this.organiser.toProfileJSONFor( user )
  };
};

mongoose.model( 'Event', EventSchema );
