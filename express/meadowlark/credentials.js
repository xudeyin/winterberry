module.exports = {
	cookieSecret : 'your cookie secret goes here',

	mongo : {
		development : {
			connectionString : 'mongodb://expresstest:expresstest@ds037990.mongolab.com:37990/icetruck_db',
		},
		production : {
			connectionString : 'mongodb://expresstest:expresstest@ds037990.mongolab.com:37990/icetruck_db',
		},
	},
};