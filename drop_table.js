require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL + '&uselibpqcompat=true' });
client.connect().then(() => client.query("DROP TABLE IF EXISTS berkshire_letters")).then(() => console.log('Dropped')).catch(console.error).finally(() => process.exit(0));
