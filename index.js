require('dotenv').config();

const CronJob = require('cron').CronJob
const fs = require('fs')
const slack = require('./lib/slack');
const sheets = require('./lib/sheets');
const verifyDomain = require('./lib/verify');
const hbase = require('./lib/hbase');
const START_ROW = 2;

const saveDomain = data => {
  return hbase.saveDomain(data)
  .then(() => {
    sheets.writeCell(data.cell, 'valid')
    slack.sendVerified(data);
    return true;
  })
  .catch(err => {
    sheets.writeCell(data.cell, err);
    slack.sendError(data, err);
    console.log(err);
    return false;
  })
};

const handleDomain = async (d,i) => {
  if (d.length >= 6) {
    return; // already checked
  }

  const cell = `G${START_ROW + i}`;
  const domain = d[0];
  const pubkey = d[1];

  try {
    console.log('verifying', pubkey, domain, cell)
    verifyDomain(...d)
    return { domain, pubkey, cell };

  } catch (err) {
    sheets.writeCell(cell, err);
  }
}

const verifyDomains = () => {
  console.log('starting domain verification');
  sheets.authorize()
  .then(async () => {

    const data = await sheets.getRows();
    const length = data.filter(d => d.length < 6).length;
    console.log(`${length} new rows`);

    return Promise.all(data.map(handleDomain))
    .then(data => data.filter(d => Boolean(d)))
    .then(verified => {

      return Promise.all(verified.map(saveDomain))
      .then(resp => {
        const count = resp.filter(d => d).length;
        console.log(`${count} domains added`);
      });
    });
  })
  .catch(console.log);
}

const verifyCron = new CronJob({
  cronTime: '00 01 * * * *',
  onTick: verifyDomains,
  start: true,
  timeZone: 'America/Los_Angeles'
});

verifyDomains();