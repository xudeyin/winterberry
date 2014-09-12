
/**
 * Module dependencies.
 */
var express        = require('express');
var path           = require('path');
var app            = express();
var http           = require('http');
//var bodyParser     = require('body-parser');
//var methodOverride = require('method-override');

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

var fortunes = [
"Conquer your fears or they will conquer you.",
"Rivers need springs.",
"Do not fear what you don't know.",
"You will have a pleasant surprise.",
"Whenever possible, keep it simple.",
];

app.get('/', function(req, res){
	res.render('home');
	});

//app.get('/users', user.list);

app.get('/about', function(req, res){
	var randomFortune =
		fortunes[Math.floor(Math.random() * fortunes.length)];
    //console.log(randomFortune);
	res.render('about', { fortune: randomFortune });
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
