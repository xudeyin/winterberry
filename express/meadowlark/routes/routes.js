var main = require('../handlers/main.js');

module.exports = function(app) {
	app.get('/', main.home);

	app.get('/about', main.about);

	app.get('/thank-you', main.thankyou);

	// ...
};