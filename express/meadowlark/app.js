
/**
 * Module dependencies.
 */
var express        = require('express');
var path           = require('path');
var app            = express();
var http           = require('http');
//var bodyParser     = require('body-parser');
//var methodOverride = require('method-override');
var fortune = require("./lib/fortune.js");

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');

//app.set('view engine', 'jade');

//set up handlebars view engine
var handlebars = require('express-handlebars')
.create({ defaultLayout:'main' });
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');


//app.use(express.favicon());
//app.use(express.logger('dev'));
//app.use(express.bodyParser());
//app.use(express.methodOverride());
//app.use(bodyParser()); 						// pull information from html in POST
//app.use(methodOverride()); 					// simulate DELETE and PUT
app.use(express.static(__dirname + '/public')); 	// set the static files location /public/img will be /img for users

//app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

var env = process.env.NODE_ENV || 'development';
if ('development' == env) {
   // configure stuff here
}

function getWeatherData(){
	return {
	locations: [
	{
	name: 'Portland',
	forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
	iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
	weather: 'Overcast',
	temp: '54.1 F (12.3 C)',
	},
	{
	name: 'Bend',
	forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
	iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
	weather: 'Partly Cloudy',
	temp: '55.0 F (12.8 C)',
	},
	{
	name: 'Manzanita',
	forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
	iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
	weather: 'Light Rain',
	temp: '55.0 F (12.8 C)',
	},
	],
	};
	}

app.use(function(req, res, next){
	if(!res.locals.partials) res.locals.partials = {};
	res.locals.partials.weather = getWeatherData();
	next();
});

app.get('/', function(req, res){
	res.render('home');
	});

//app.get('/users', user.list);

app.get('/about', function(req, res){
	var randomFortune =
	res.render('about', { fortune: fortune.getFortune() });
	});

//custom 404 page
app.use(function(req, res){
res.status(404);
res.render('404');
});

// custom 500 page
app.use(function(err, req, res, next){
console.error(err.stack);
res.status(500);
res.render('500');
});


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
