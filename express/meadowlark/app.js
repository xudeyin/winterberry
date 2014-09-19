/**
 * Module dependencies.
 */
var express = require('express');
var path = require('path');
var app = express();
var http = require('http');
var formidable = require('formidable');

var credentials = require('./credentials.js');
var fortune = require("./lib/fortune.js");
var jqupload = require('jquery-file-upload-middleware');
var fs = require('fs');
var util = require('util');
var Vacation = require('./models/vacation.js');
var geocode = require('./lib/geocode.js');

var app = express();

app.use(function(req, res, next) {
	// create a domain for this request
	var domain = require('domain').create();
	// handle errors on this domain
	domain.on('error', function(err) {
		console.error('DOMAIN ERROR CAUGHT\n', err.stack);
		try {
			// failsafe shutdown in 5 seconds
			setTimeout(function() {
				console.error('Failsafe shutdown.');
				process.exit(1);
			}, 5000);
			// disconnect from the cluster
			var worker = require('cluster').worker;
			if (worker)
				worker.disconnect();
			// stop taking new requests
			server.close();
			try {
				// attempt to use Express error route
				next(err);
			} catch (err) {
				// if Express error route failed, try
				// plain Node response
				console.error('Express error mechanism failed.\n', err.stack);
				res.statusCode = 500;
				res.setHeader('content-type', 'text/plain');
				res.end('Server error.');
			}
		} catch (err) {
			console.error('Unable to send 500 response.\n', err.stack);
		}
	});
	// add the request and response objects to the domain
	domain.add(req);
	domain.add(res);
	// execute the rest of the request chain in the domain
	domain.run(next);
});


// other middleware and routes go here

//make sure data directory exists
var dataDir = __dirname + '/data';
var vacationPhotoDir = dataDir + '/vacation-photo';
fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);

console.log('dataDir = ' + dataDir);
console.log('photoDir = ' + vacationPhotoDir);

function saveContestEntry(contestName, email, year, month, photoPath) {
	// TODO...this will come later
}

var server = http.createServer(app).listen(app.get('port'), function() {
	console.log('Listening on port %d.', app.get('port'));
});

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');

// cookie parser
//app.use(require('cookie-parser')(credentials.cookieSecret));
//app.use(require('express-session')());

var handlebars = require('express-handlebars').create({
	defaultLayout : 'main',
	helpers : {
		section : function(name, options) {
			if (!this._sections)
				this._sections = {};
			this._sections[name] = options.fn(this);
			return null;
		}
	}
});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.use(require('body-parser')());

app.use(express.static(path.join(__dirname, 'public')));

var env = process.env.NODE_ENV || 'development';
if ('development' == env) {
	// configure stuff here
}


// database stuff
var mongoose = require('mongoose');
var options = {
	server : {
		socketOptions : {
			keepAlive : 1
		}
	}
};
switch (app.get('env')) {
case 'development':
	mongoose.connect(credentials.mongo.development.connectionString, options);
	break;
case 'production':
	mongoose.connect(credentials.mongo.production.connectionString, options);
	break;
default:
	throw new Error('Unknown execution environment: ' + app.get('env'));
}

var MongoSessionStore = require('session-mongoose')(require('connect'));
var sessionStore = new MongoSessionStore({
	url : credentials.mongo.development.connectionString
});
app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
	store : sessionStore
}));

app.use(require('./lib/tourRequiresWaiver.js'));

app.use(function(req, res, next) {
	// if there's a flash message, transfer
	// it to the context, then clear it
	res.locals.flash = req.session.flash;
	delete req.session.flash;
	next();
});


//middleware to provide cart data for header
app.use(function(req, res, next) {
    var cart = req.session.cart;
    res.locals.cartItems = cart && cart.items ? cart.items.length : 0;
    next();
});


// dealer...geocoding
var Dealer = require('./models/dealer.js');

var dealerCache = {
	lastRefreshed : 0,
	refreshInterval : 10 * 1000,
	//refreshInterval : 60 * 60 * 1000,
	jsonUrl : '/dealers.json',
	geocodeLimit : 2000,
	geocodeCount : 0,
	geocodeBegin : 0,
};

dealerCache.jsonFile = __dirname + '/public' + dealerCache.jsonUrl;

function geocodeDealer(dealer) {
	var addr = dealer.getAddress(' ');
	if (addr === dealer.geocodedAddress)
		return;
	// already geocoded
	if (dealerCache.geocodeCount >= dealerCache.geocodeLimit) {
		// has 24 hours passed since we last started geocoding?
		if (Date.now() > dealerCache.geocodeCount + 24 * 60 * 60 * 1000) {
			dealerCache.geocodeBegin = Date.now();
			dealerCache.geocodeCount = 0;
		} else {
			// we can't geocode this now: we've
			// reached our usage limit
			return;
		}
	}
	geocode(addr, function(err, coords) {
		if (err)
			return console.log('Geocoding failure for ' + addr);
		dealer.lat = coords.lat;
		dealer.lng = coords.lng;
		dealer.save();
	});
}

//initialize dealer
Dealer.find(function(err, dealers) {
	console.log("+++++ dealer init is called.")
	if (dealers.length)
		return;

	new Dealer({
		name : 'Dealer 001',
		address1 : '35 winterberry street',
		city : 'Bedford',
		state : 'MA',
		zip : '01730',
		country : 'U.S.A.',
		phone : '1111111111',
		website : 'winterbery.tonidobit.com',
		active : true,
	}).save();

	new Dealer({
		name : 'Dealer 002',
		address1 : '7 Gleason Road',
		city : 'Bedford',
		state : 'MA',
		zip : '01730',
		country : 'U.S.A.',
		phone : '2222222222',
		website : 'winterbery.tonidobit.com',
		active : true,
	}).save();
	
	new Dealer({
		name : 'Dealer 003',
		address1 : '1 Russett Road',
		city : 'Bedford',
		state : 'MA',
		zip : '01730',
		country : 'U.S.A.',
		phone : '3333333333',
		website : 'winterbery.tonidobit.com',
		active : true,
	}).save();
	
	new Dealer({
		name : 'Dealer 004',
		address1 : '62 Notre Dame Road',
		city : 'Bedford',
		state : 'MA',
		zip : '01730',
		country : 'U.S.A.',
		phone : '4444444444',
		website : 'winterbery.tonidobit.com',
		active : true,
	}).save();
});

dealerCache.refresh = function(cb) {
	if (Date.now() > dealerCache.lastRefreshed + dealerCache.refreshInterval) {
		// we need to refresh the cache
		console.log('===> start dealer cache refresh.')
		Dealer.find({
			active : true
		}, function(err, dealers) {
			if (err)
				return console.log('Error fetching dealers: ' + err);
			// geocodeDealer will do nothing if coordinates are up-to-date
			dealers.forEach(geocodeDealer);
			// we now write all the dealers out to our cached JSON file
			fs.writeFileSync(dealerCache.jsonFile, JSON.stringify(dealers));
			// all done -- invoke callback
			cb();
		});
	}
}

function refreshDealerCacheForever() {
	dealerCache.refresh(function() {
		// call self after refresh interval
		setTimeout(refreshDealerCacheForever, dealerCache.refreshInterval);
	});
}

// create empty cache if it doesn't exist to prevent 404 errors
if (!fs.existsSync(dealerCache.jsonFile)) {
	fs.writeFileSync(JSON.stringify([]));
}
// start refreshing cache
refreshDealerCacheForever();


		
// initialize vacations
Vacation
		.find(function(err, vacations) {
			console.log("+++++ vacation.find is called.")
			if (vacations.length)
				return;

			new Vacation({
				name : 'Hood River Day Trip',
				slug : 'hood-river-day-trip',
				category : 'Day Trip',
				sku : 'HR199',
				description : 'Spend a day sailing on the Columbia and '
						+ 'enjoying craft beers in Hood River!',
				priceInCents : 9995,
				tags : [ 'day trip', 'hood river', 'sailing', 'windsurfing',
						'breweries' ],
				inSeason : true,
				maximumGuests : 16,
				available : true,
				packagesSold : 0,
			}).save();

			new Vacation({
				name : 'Oregon Coast Getaway',
				slug : 'oregon-coast-getaway',
				category : 'Weekend Getaway',
				sku : 'OC39',
				description : 'Enjoy the ocean air and quaint coastal towns!',
				priceInCents : 269995,
				tags : [ 'weekend getaway', 'oregon coast', 'beachcombing' ],
				inSeason : false,
				maximumGuests : 8,
				available : true,
				packagesSold : 0,
			}).save();

			new Vacation(
					{
						name : 'Rock Climbing in Bend',
						slug : 'rock-climbing-in-bend',
						category : 'Adventure',
						sku : 'B99',
						description : 'Experience the thrill of rock climbing in the high desert.',
						priceInCents : 289995,
						tags : [ 'weekend getaway', 'bend', 'high desert',
								'rock climbing', 'hiking', 'skiing' ],
						inSeason : true,
						requiresWaiver : true,
						maximumGuests : 4,
						available : false,
						packagesSold : 0,
						notes : 'The tour guide is currently recovering from a skiing accident.',
					}).save();
		});

app.use('/upload', function(req, res, next) {
	var now = Date.now();
	jqupload.fileHandler({
		uploadDir : function() {
			return __dirname + '/public/uploads/' + now;
		},
		uploadUrl : function() {
			return '/uploads/' + now;
		},
	})(req, res, next);
});

app.get('/newsletter', function(req, res) {
	// we will learn about CSRF later...for now, we just
	// provide a dummy value
	res.render('newsletter', {
		csrf : 'CSRF token goes here'
	});
});

app.post('/process', function(req, res) {
	if (req.xhr || req.accepts('json,html') === 'json') {
		// if there were an error, we would send { error: 'error description' }
		res.send({
			success : true
		});
	} else {
		// if there were an error, we would redirect to an error page
		res.redirect(303, '/thank-you');
	}
});

app.get('/dealers', function(req, res) {
	console.log('****** dealers route called');
	res.render('dealers');
});

app.get('/contest/vacation-photo', function(req, res) {
	var now = new Date();
	res.render('contest/vacation-photo', {
		year : now.getFullYear(),
		month : now.getMonth()
	});
});

app.post('/contest/vacation-photo/:year/:month', function(req, res) {
	var form = new formidable.IncomingForm();
	form.parse(req, function(err, fields, files) {
		if (err) {
			res.session.flash = {
				type : 'danger',
				intro : 'Oops!',
				message : 'There was an error processing your submission. '
						+ 'Pelase try again.',
			};
			return res.redirect(303, '/contest/vacation-photo');
		}
		console.log('received fields:');
		console.log(fields);
		console.log('received files:');
		console.log(files);

		var photo = files.photo;
		var dir = vacationPhotoDir + '/' + Date.now();
		var path = dir + '/' + photo.name;
		fs.mkdirSync(dir);

		console.log('photo.path = ' + photo.path);
		console.log('photo.name = ' + dir + '/' + photo.name);

		//fs.renameSync(photo.path, dir + '/' + photo.name);
		//to fix cross-partition copy, replace the above line with
		//the code below - dxu 0917
		var readStream = fs.createReadStream(photo.path);
		var writeStream = fs.createWriteStream(dir + '/' + photo.name);

		//		util.pump(readStream, writeStream, function() {
		//			fs.unlinkSync(photo.path);
		//		});

		readStream.pipe(writeStream);
		fs.unlinkSync(photo.path);

		saveContestEntry('vacation-photo', fields.email, req.params.year,
				req.params.month, path);
		req.session.flash = {
			type : 'success',
			intro : 'Good luck!',
			message : 'You have been entered into the contest.',
		};
		return res.redirect(303, '/contest/vacation-photo/entries');
	});
});

function getWeatherData() {
	return {
		locations : [ {
			name : 'Portland',
			forecastUrl : 'http://www.wunderground.com/US/OR/Portland.html',
			iconUrl : 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
			weather : 'Overcast',
			temp : '54.1 F (12.3 C)',
		}, {
			name : 'Bend',
			forecastUrl : 'http://www.wunderground.com/US/OR/Bend.html',
			iconUrl : 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
			weather : 'Partly Cloudy',
			temp : '55.0 F (12.8 C)',
		}, {
			name : 'Manzanita',
			forecastUrl : 'http://www.wunderground.com/US/OR/Manzanita.html',
			iconUrl : 'http://icons-ak.wxug.com/i/c/k/rain.gif',
			weather : 'Light Rain',
			temp : '55.0 F (12.8 C)',
		}, ],
	};
}

app.use(function(req, res, next) {
	if (!res.locals.partials)
		res.locals.partials = {};
	res.locals.partials.weather = getWeatherData();
	next();
});

require('./routes/routes.js')(app);

app.get('/contest/vacation-photo/entries', function(req, res) {
	res.render('contest/entries');
});

// see companion repository for /cart/add route....
app.get('/set-currency/:currency', function(req, res) {
	req.session.currency = req.params.currency;
	return res.redirect(303, '/vacations');
});
function convertFromUSD(value, currency) {
	switch (currency) {
	case 'USD':
		return value * 1;
	case 'GBP':
		return value * 0.6;
	case 'BTC':
		return value * 0.0023707918444761;
	default:
		return NaN;
	}
}

app.get('/vacations', function(req, res) {
	Vacation.find({
		available : true
	}, function(err, vacations) {
		var currency = req.session.currency || 'USD';
		var context = {
			currency : currency,
			vacations : vacations.map(function(vacation) {
				return {
					sku : vacation.sku,
					name : vacation.name,
					description : vacation.description,
					inSeason : vacation.inSeason,
					price : convertFromUSD(vacation.priceInCents / 100,
							currency),
					qty : vacation.qty,
				}
			})
		};
		switch (currency) {
		case 'USD':
			context.currencyUSD = 'selected';
			break;
		case 'GBP':
			context.currencyGBP = 'selected';
			break;
		case 'BTC':
			context.currencyBTC = 'selected';
			break;
		}
		res.render('vacations', context);
	});
});

//automatically rendering views
//add this right above the 404 handle:
var autoViews = {};
var fs = require('fs');
app.use(function(req, res, next) {
	var path = req.path.toLowerCase();
	// check cache; if it's there, render the view
	if (autoViews[path])
		return res.render(autoViews[path]);
	// if it's not in the cache, see if there's
	// a .handlebars file that matches
	if (fs.existsSync(__dirname + '/views' + path + '.handlebars')) {
		autoViews[path] = path.replace(/^\//, '');
		return res.render(autoViews[path]);
	}
	// no view found; pass on to 404 handler
	next();
});


// custom 404 page
app.use(function(req, res) {
	res.status(404);
	res.render('404');
});

// custom 500 page
app.use(function(err, req, res, next) {
	console.error(err.stack);
	res.status(500);
	res.render('500');
});

// http.createServer(app).listen(app.get('port'), function(){
// console.log('Express server listening on port ' + app.get('port'));
// });

function startServer() {
	http.createServer(app).listen(
			app.get('port'),
			function() {
				console.log('Express started in ' + app.get('env')
						+ ' mode on http://localhost:' + app.get('port')
						+ '; press Ctrl-C to terminate.');
			});
}
if (require.main === module) {
	// application run directly; start app server
	startServer();
} else {
	// application imported as a module via "require": export function
	// to create server
	module.exports = startServer;
}
