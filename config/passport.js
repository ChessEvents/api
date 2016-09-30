var passport = require( 'passport' );
var LocalStrategy = require( 'passport-local' ).Strategy;
var FacebookStrategy = require( 'passport-facebook' ).Strategy;
var mongoose = require( 'mongoose' );
var User = mongoose.model( 'User' );

passport.use( new LocalStrategy( {
  usernameField: 'user[email]',
  passwordField: 'user[password]'
}, function ( email, password, done ) {
  User.findOne( {
    email: email
  } ).then( function ( user ) {

    if ( !user || !user.validPassword( password ) ) {
      return done( null, false, {
        errors: {
          'email or password': 'is invalid'
        }
      } );
    }
    return done( null, user );
  } ).catch( done );
} ) );


// passport.use( new FacebookStrategy( {
//     clientID: FACEBOOK_APP_ID,
//     clientSecret: FACEBOOK_APP_SECRET,
//     callbackURL: "http://www.example.com/auth/facebook/callback"
//   },
//   function ( accessToken, refreshToken, profile, done ) {
//     User.findOrCreate( { email: profile.email }, function ( err, user ) {
//       if ( err ) {
//         return done( err );
//       }
//       done( null, user );
//     } );
//   }
// ) );
