const Hbase = require('ripple-hbase-client');
const hbase = new Hbase({
  prefix: process.env['HBASE_PREFIX'] || 'prod_',
  host: process.env['HBASE_HOST'],
  port: process.env['HBASE_PORT'],
});

module.exports.client = hbase;

module.exports.saveDomains = domains => {
  const rows = {};

  domains.forEach(d => {
    console.log('saving domain:', d.domain, d.pubkey);
    rows[d.pubkey] = { domain: d.domain };
  });

  return hbase.putRows({ table: 'validator_state', rows });
};

module.exports.deleteDomains = domains => {
  const rows = {};

  domains.forEach(d => {
    console.log('removing domain:', d.domain, d.pubkey);
    rows[d.pubkey] = { domain: '' };
  });

  return hbase.putRows({ table: 'validator_state', rows, removeEmptyColumns: true });
};