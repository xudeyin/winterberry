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

function saveContestEntry(contestName, email, year, month, photoPath){
	// TODO...this will come later
	}

var server = http.createServer(app).listen(app.get('port'), function() {
	console.log('Listening on port %d.', app.get('port'));
});

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');

// cookie parser
app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')());

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

app.use(require('./lib/tourRequiresWaiver.js'));

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

app.use(function(req, res, next) {
	// if there's a flash message, transfer
	// it to the context, then clear it
	res.locals.flash = req.session.flash;
	delete req.session.flash;
	next();
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
		fs.renameSync(photo.path, dir + '/' + photo.name);
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

app.get('/', function(req, res) {
	res.render('home');
});

// app.get('/users', user.list);

app.get('/about', function(req, res) {
	var randomFortune = res.render('about', {
		fortune : fortune.getFortune()
	});
});

app.get('/thank-you', function(req, res) {
	res.render('thank-you');
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
