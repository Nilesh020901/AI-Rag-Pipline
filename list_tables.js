require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL + '&uselibpqcompat=true' });
client.connect().then(() => client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")).then(res => console.log(res.rows)).catch(console.error).finally(() => process.exit(0));
