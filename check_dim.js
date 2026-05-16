require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL + '&uselibpqcompat=true' });
client.connect().then(() => client.query("SELECT atttypmod FROM pg_attribute WHERE attrelid = 'mastra_vector_berkshire_letters'::regclass AND attname = 'embedding'")).then(res => console.log(res.rows)).catch(console.error).finally(() => process.exit(0));
