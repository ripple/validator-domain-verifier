const Hbase = require('ripple-hbase-client');
const hbase = new Hbase({
  prefix: process.env['HBASE_PREFIX'] || 'prod_',
  host: process.env['HBASE_HOST'],
  port: process.env['HBASE_PORT']
});


module.exports.saveDomain = data => {
  console.log('saving domain:', data.domain, data.pubkey);
  return hbase.putRow({
    table: 'validators',
    rowkey: data.pubkey,
    columns: {
      domain: data.domain,
      domain_state: 'verified'
    }
  })
};