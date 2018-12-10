require('dotenv').config();
const hbase = require('./lib/hbase');
const domains = require('./legacy-domains.json');

const rows = {};
Object.keys(domains).forEach(pubkey => {
  rows[pubkey] = { domain: domains[pubkey] };
});

hbase.client.putRows({
  table: 'validator_state',
  rows
})
.then(() => {
  console.log('done');
  process.exit();
})
.catch(err => {
  console.log(err);
  process.exit(1);
});