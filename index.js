require('dotenv').config();

const CronJob = require('cron').CronJob
const fs = require('fs')
const slack = require('./lib/slack');
const sheets = require('./lib/sheets');
const mail = require('./lib/mail');
const verifyDomain = require('./lib/verify');
const hbase = require('./lib/hbase');


const handleDomain = async (d, recheck) => {
  const check = () => {
    try {
      console.log('verifying', d.cell, d.data[0], d.data[1])
      verifyDomain(...d.data);
      return 'valid';

    } catch (err) {
      return err.toString();
    }
  }

  const result = check();
  if (recheck && result === 'valid') {
    return Promise.resolve();
  }

  if (recheck) {
    await hbase.deleteDomain(d.data[1], d.data[0]);
  }
  else if (result === 'valid') {
    await hbase.saveDomain(d.data[1], d.data[0]);
  }

  return sheets.writeCell(d.cell, result)
  .then(() => {
    if (d.data[1]) {
      return Promise.all([
        slack.send(d.data[1], d.data[0], result, recheck),
        mail.notify(d.data, result)
      ]);
    }
  })
  .catch(console.log)
};


const handleDomains = (domains, recheck = false) => {
  return new Promise((resolve, reject) => {
    const total = domains.length;
    const next = () => {
      const d = domains.shift();

      if (d) {
        handleDomain(d, recheck)
        .then(() => {
          setImmediate(next);
        });
      } else {
        console.log('done');
        resolve();
      }
    }

    next();
  });
};


const verifyNewDomains = () => {
  console.log('starting new domain verification');
  sheets.authorize()
  .then(async () => {
    const data = await sheets.getRows();
    console.log(`${data.length} new rows`);
    return handleDomains(data);
  })
  .catch(console.log);
}


const checkVerifiedDomains = () => {
  console.log('checking verified domains');
  sheets.authorize()
  .then(async () => {
    const data = await sheets.getRows(true);
    const verified = data.filter(d => d.data[5] === 'valid' && d.data[6] === undefined);
    console.log(`${verified.length} verified domains`);
    return handleDomains(verified, true);
  })
  .catch(console.log);
}


const verifyCron = new CronJob({
  cronTime: '00 01 * * * *',
  onTick: verifyNewDomains,
  start: true,
  timeZone: 'America/Los_Angeles'
});

const checkCron = new CronJob({
  cronTime: '00 01 01 * * *',
  onTick: checkVerifiedDomains,
  start: true,
  timeZone: 'America/Los_Angeles'
});

verifyNewDomains();
//checkVerifiedDomains();