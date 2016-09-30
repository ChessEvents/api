var router = require( 'express' ).Router();
var stripe = require( "stripe" )("sk_test_KDX2tajb82MzwascGrJJOw4J");
var auth = require('../auth');

// make a payment:
router.post( '/', auth.required, function ( req, res, next ) {

  var stripeToken = req.body.stripeToken;

  var charge = stripe.charges.create( {
    amount: 1299, // amount in cents, again
    currency: "gbp",
    card: stripeToken,
    description: "test@chessevents.co.uk"
  }, function ( err, charge ) {
    if ( err /*&& err.type === 'StripeCardError'*/ ) {
      // The card has been declined
      console.log( 'error' );
      res.json( err );

    } else {
        console.log( 'success', charge );
      //Render a thank you page called "Charge"
      res.json( charge )
    }
  } );

} );

module.exports = router;
