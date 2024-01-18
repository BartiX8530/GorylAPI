// api key generation

var mysql = require('mysql');

var con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gorylapi',
    connectionLimit: 10 // just a guess lol
});

function generateAPIKey(customer) {
    const { randomBytes } = require('crypto');
    const apiKey = randomBytes(16).toString('hex');
    const hashedAPIKey = hashAPIKey(apiKey);

    // Check if API key already exists in the database
    con.query('SELECT * FROM api_keys WHERE api_key = ?;', [hashedAPIKey], function(err, result) {
        if(err) {
            console.log(err);
            return;
        }

        if (result.length > 0) {
            // Regenerate a new API key
            generateAPIKey(customer);
        } else {
            // Insert the new API key into the database
            con.query('INSERT INTO api_keys (api_key, customer) VALUES (?, ?);', [hashedAPIKey, customer], function(err, result) {
                if(err) {
                    console.log(err);
                    return;
                }

                console.log("API key generated for customer '" + customer + "'" + " - " + apiKey + " - " + hashedAPIKey + "");

                return { hashedAPIKey, apiKey };
            });
        }
    });
}
  
// hash the api key

function hashAPIKey(apiKey) {
    const { createHash } = require('crypto');
  
    const hashedAPIKey = createHash('sha256').update(apiKey).digest('hex');
  
    return hashedAPIKey;
}

generateAPIKey("test");