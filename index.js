require('dotenv').config();

const CronJob = require('cron').CronJob
const fs = require('fs')
const slack = require('./lib/slack');
const sheets = require('./lib/sheets');
const verifyDomain = require('./lib/verify');
const hbase = require('./lib/hbase');

const saveDomains = domains => {
  return hbase.saveDomains(domains)
  .then(() => {
    domains.forEach(d => {
      sheets.writeCell(d.cell, 'valid')
      slack.sendVerified(d);
    });
    console.log(`${domains.length} domains added`)
  })
  .catch(err => {
    domains.forEach(d => {
      sheets.writeCell(d.cell, err);
      slack.sendError(d, err);
    });
    console.log(`0 domains added`)
    console.log(err);
  })
};

const deleteDomains = domains => {
  return hbase.deleteDomains(domains)
  .then(() => {
    domains.forEach(d => {
      sheets.writeCell(d.cell, d.err)
      slack.sendDeleted(d);
    });

    console.log(`${domains.length} domains deleted`)
  })
  .catch(err => {
    console.log(`0 domains deleted`)
    console.log(err);
  })
};

const handleDomain = (collectInvalid = true, d) => {
  const domain = d.data[0];
  const pubkey = d.data[1];

  try {
    console.log('verifying', pubkey, domain, d.cell)
    verifyDomain(...d.data);
    if (!collectInvalid) {
      return { domain, pubkey, cell: d.cell };
    }

  } catch (err) {
    if (collectInvalid) {
      return { domain, pubkey, cell: d.cell, err };
    } else {
      sheets.writeCell(d.cell, err);
    }
  }
}

const verifyNewDomains = () => {
  console.log('starting new domain verification');
  sheets.authorize()
  .then(async () => {
    const data = await sheets.getRows();
    console.log(`${data.length} new rows`);

    return Promise.all(data.map(handleDomain.bind(null, false)))
    .then(data => data.filter(d => Boolean(d)))
    .then(verified => {
      setTimeout(saveDomains, 1000, verified);
    });
  })
  .catch(console.log);
}

const checkVerifiedDomains = () => {
  console.log('checking verified domains');
  sheets.authorize()
  .then(async () => {
    const data = await sheets.getRows(true);
    const verified = data.filter(d => d.data[5] === 'valid');
    console.log(`${verified.length} verified domains`);

    return Promise.all(verified.map(handleDomain.bind(null, true)))
    .then(data => data.filter(d => Boolean(d)))
    .then(invalid => {
      console.log(`${invalid.length} domains no longer valid`);
      setTimeout(deleteDomains, 1000, invalid);
    });
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