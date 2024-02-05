// set constants for express

const express = require('express');
const app = express();
const port = 8080;

app.use(express.json()); // for parsing json

// listen on port 8080 - get method for quote of the day

app.listen(port, () => {
    console.log(`Server is listening on port http://localhost:${port}`);
});

// import the routes - here they are set for a local database for testing - refer to databasesetup.sql

const mysql = require('mysql')

// create a mysql connection

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gorylapi',
    connectionLimit: 10, // just a guess lol
    connectionLimit : 1000,
    connectTimeout  : 60 * 60 * 1000,
    acquireTimeout  : 60 * 60 * 1000,
    timeout         : 60 * 60 * 1000,
});

// check the connection

try {
    pool.query('SELECT 1 + 1 AS solution', (err, rows, fields) => {
        console.log('The solution is: ', rows[0].solution);
    });
} catch(err) {
    throw err;
};

// get a new quote at the beggining of the day

let currentQuote = null;

function checkTime(getQuote) {
    (function loop() {
        var now = new Date();
        // set the time at which the quote will be picked here
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            getQuote();
            console.log("New quote of the day picked!");
        }
        now = new Date();
        var delay = 60000 - (now % 60000);
        setTimeout(loop, delay);
    })();
}

// get a quote from the database

function getQuote() {
    var sql = 'SELECT quote_id FROM quotes WHERE has_been_used = 0 ORDER BY RAND() LIMIT 1;'

    // query to get the quote_id

    pool.query(sql, function(err, result) {
        if(err) {
            console.log(err);
            return;
        }

        try {
            var quoteId = result[0].quote_id;
        } 
        catch(err) {
            console.log("WARNING - no more quotes available");
            return;
        }

        pool.query('SELECT quote, author, has_been_used FROM quotes WHERE quote_id = ? AND has_been_used = 0;', [quoteId], function(err, result) {
            if(err) {
                console.log(err);
                return;
            }

            // Store the selected quote in the currentQuote variable
            currentQuote = result[0];

            // Set the has_been_used flag to 1

            pool.query('UPDATE quotes SET has_been_used = 1 WHERE quote_id = ?;', [quoteId], function(err, result) {
                if(err) {
                    console.log(err);
                    return;
                }
            });
        });
    });
}

// Call checkTime with getQuote as the argument when the server starts

checkTime(getQuote);

// Route handler for /quote

app.get('/quote', (req, res) => {
    if (currentQuote) {
        res.json(currentQuote);
    } else {
        res.status(404).json({ message: 'No quote available' });
    }
});

app.post('/submitquote', async (req, res) => {

    // get the api key from the request and check if it's not empty

    const { apiKey, quote, author, } = req.body;

    if (!apiKey) {
        return res.status(418).json({success: false, data: "Missing API key"});
    }

    // hash the api key

    const { createHash } = require('crypto');
  
    const hashedAPIKey = createHash('sha256').update(apiKey).digest('hex');

    // TODO validate the api key

    if (pool.query('SELECT * FROM api_keys WHERE api_key = ?;', [hashedAPIKey])) {
        console.log("API key validated");
    } else {
        res.status(401).json({success: false, data: "API key not valid"});
    }

    // check if the quote and author are not empty

    if (!quote || !author) {
        return res.status(418).json({success: false, data: "Missing quote or author"});
    }

    // query to insert the quote and author

    pool.query('INSERT INTO quotes (quote, author, has_been_used) VALUES (?, ?, 0);', [quote, author], function(err, result) {
        if(err) {
            console.log(err);
            return res.status(500).json({success: false, data: err});
        }
        res.json({success: true, data: result});
    });

});
