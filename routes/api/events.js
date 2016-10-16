var router = require( 'express' ).Router();
var passport = require( 'passport' );
var mongoose = require( 'mongoose' );
var Event = mongoose.model( 'Event' );
var Comment = mongoose.model( 'Comment' );
var User = mongoose.model( 'User' );
var auth = require( '../auth' );

// Preload event objects on routes with ':event'
router.param( 'event', function ( req, res, next, slug ) {

  Event.findOne( {
      slug: slug
    } )
    .populate( 'organiser' )
    .then( function ( _event ) {
      if ( !_event ) {
        return res.sendStatus( 404 );
      }
      req._event = _event;
      return next();
    } ).catch( next );

} );

router.param( 'comment', function ( req, res, next, id ) {
  Comment.findById( id ).then( function ( comment ) {
    if ( !comment ) {
      return res.sendStatus( 404 );
    }
    req.comment = comment;
    return next();
  } ).catch( next );
} );

router.get( '/', auth.optional, function ( req, res, next ) {
  var query = {};
  var limit = 10;
  var offset = 0;

  if ( typeof req.query.limit !== 'undefined' ) {
    limit = req.query.limit;
  }

  if ( typeof req.query.offset !== 'undefined' ) {
    offset = req.query.offset;
  }

  if ( typeof req.query.tag !== 'undefined' ) {
    query.tagList = {
      "$in": [ req.query.tag ]
    };
  }

  Promise.all( [
    req.query.author ? User.findOne( {
      username: req.query.organiser
    } ) : null,
    req.query.favorited ? User.findOne( {
      username: req.query.favorited
    } ) : null
  ] ).then( function ( results ) {
    var organiser = results[ 0 ];
    var favoriter = results[ 1 ];

    if ( organiser ) {
      query.organiser = organiser._id;
    }

    if ( favoriter ) {
      query._id = {
        $in: favoriter.favorites
      };
    } else if ( req.query.favorited ) {
      query._id = {
        $in: []
      };
    }

    return Promise.all( [
      Event.find( query )
      .limit( limit )
      .skip( offset )
      .sort( {
        createdAt: 'desc'
      } )
      .populate( 'organiser' )
      .exec(),
      Event.count( query ).exec(),
      req.payload ? User.findById( req.payload.id ) : null,
    ] ).then( function ( results ) {
      var events = results[ 0 ];
      var eventsCount = results[ 1 ];
      var user = results[ 2 ];

      return res.json( {
        events: events.map( function ( _event ) {
          return _event.toJSONFor( user );
        } ),
        eventsCount: eventsCount
      } );
    } );
  } ).catch( next );
} );

router.get( '/feed', auth.required, function ( req, res, next ) {
  var limit = 20;
  var offset = 0;

  if ( typeof req.query.limit !== 'undefined' ) {
    limit = req.query.limit;
  }

  if ( typeof req.query.offset !== 'undefined' ) {
    offset = req.query.offset;
  }

  User.findById( req.payload.id ).then( function ( user ) {
    if ( !user ) {
      return res.sendStatus( 401 );
    }

    Promise.all( [
      Event.find( {
        author: {
          $in: user.following
        }
      } )
      .limit( limit )
      .skip( offset )
      .populate( 'author' )
      .exec(),
      Event.count( {
        author: {
          $in: user.following
        }
      } )
    ] ).then( function ( results ) {
      var events = results[ 0 ];
      var eventsCount = results[ 1 ];

      return res.json( {
        events: events.map( function ( _event ) {
          return _event.toJSONFor( user );
        } ),
        eventsCount: eventsCount
      } );
    } ).catch( next );
  } );
} );

router.post( '/', auth.required, function ( req, res, next ) {

  console.log( 'Payload', req.payload );

  User.findById( req.payload.id ).then( function ( user ) {
    if ( !user ) {
      return res.sendStatus( 401 );
    }

    var _event = new Event( req.body.event );

    _event.organiser = user;

    return _event.save().then( function () {
      console.log( _event.author );
      return res.json( {
        _event: _event.toJSONFor( user )
      } );
    } );
  } ).catch( next );
} );

// return a event
router.get( '/:event', auth.optional, function ( req, res, next ) {
  Promise.all( [
    req.payload ? User.findById( req.payload.id ) : null,
    req._event.populate( 'organiser' ).execPopulate()
  ] ).then( function ( results ) {
    var user = results[ 0 ];

    return res.json( {
      _event: req._event.toJSONFor( user )
    } );
  } ).catch( next );
} );

// update event
router.put( '/:event', auth.required, function ( req, res, next ) {
  if ( req.event._id.toString() === req.payload.id.toString() ) {
    if ( typeof req.body.event.title !== 'undefined' ) {
      req.event.title = req.body.event.title;
    }

    if ( typeof req.body.event.description !== 'undefined' ) {
      req.event.description = req.body.event.description;
    }

    if ( typeof req.body.event.body !== 'undefined' ) {
      req.event.body = req.body.event.body;
    }

    req.event.save().then( function ( event ) {
      return res.json( {
        event: event.toJSONFor( user )
      } );
    } ).catch( next );
  } else {
    return res.send( 403 );
  }
} );

// delete event
router.delete( '/:event', auth.required, function ( req, res, next ) {
  User.findById( req.payload.id ).then( function () {
    if ( req.event.author.toString() === req.payload.id.toString() ) {
      return req.event.remove().then( function () {
        return res.sendStatus( 204 );
      } );
    } else {
      return res.sendStatus( 403 );
    }
  } );
} );

// Favorite an event
router.post( '/:event/favorite', auth.required, function ( req, res, next ) {
  var eventId = req.event._id;

  User.findById( req.payload.id ).then( function ( user ) {
    if ( !user ) {
      return res.sendStatus( 401 );
    }

    return user.favorite( eventId ).then( function () {
      return req.event.updateFavoriteCount().then( function ( event ) {
        return res.json( {
          event: event.toJSONFor( user )
        } );
      } );
    } );
  } ).catch( next );
} );

// Unfavorite an event
router.delete( '/:event/favorite', auth.required, function ( req, res, next ) {
  var eventId = req.event._id;

  User.findById( req.payload.id ).then( function ( user ) {
    if ( !user ) {
      return res.sendStatus( 401 );
    }

    return user.unfavorite( eventId ).then( function () {
      return req.event.updateFavoriteCount().then( function ( event ) {
        return res.json( {
          event: event.toJSONFor( user )
        } );
      } );
    } );
  } ).catch( next );
} );

// return an event's comments
router.get( '/:event/comments', auth.optional, function ( req, res, next ) {
  Promise.resolve( req.payload ? User.findById( req.payload.id ) : null ).then( function ( user ) {
    return req.event.populate( {
      path: 'comments',
      populate: {
        path: 'author'
      },
      options: {
        sort: {
          createdAt: 'desc'
        }
      }
    } ).execPopulate().then( function ( event ) {
      return res.json( {
        comments: req.event.comments.map( function ( comment ) {
          return comment.toJSONFor( user );
        } )
      } );
    } );
  } ).catch( next );
} );

// create a new comment
router.post( '/:event/comments', auth.required, function ( req, res, next ) {
  User.findById( req.payload.id ).then( function ( user ) {
    if ( !user ) {
      return res.sendStatus( 401 );
    }

    var comment = new Comment( req.body.comment );
    comment.event = req.event;
    comment.author = user;

    return comment.save().then( function () {
      req.event.comments.push( comment );

      return req.event.save().then( function ( event ) {
        res.json( {
          comment: comment.toJSONFor( user )
        } );
      } );
    } );
  } ).catch( next );
} );

router.delete( '/:event/comments/:comment', auth.required, function ( req, res, next ) {
  if ( req.comment.author.toString() === req.payload.id.toString() ) {
    req.event.comments.remove( req.comment._id );
    req.event.save()
      .then( Comment.find( {
        _id: req.comment._id
      } ).remove().exec() )
      .then( function () {
        res.sendStatus( 204 );
      } );
  } else {
    res.sendStatus( 403 );
  }
} );

module.exports = router;
