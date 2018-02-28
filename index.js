const CronJob = require('cron').CronJob
const decodeNodePublic = require('ripple-address-codec').decodeNodePublic
const execSync = require('child_process').execSync
const {google} = require('googleapis')
const privatekey = require("./privatekey.json")
const promisify = require('util.promisify');
const Slack = require('slack-node')
const validator = require('validator')
const verify = require('ripple-keypairs').verify

var slack = new Slack();
slack.setWebhook(process.env['WEBHOOK_URI']);

const sheets = google.sheets('v4')
const getSheetValues = promisify(sheets.spreadsheets.values.get)
const updateSheetValues = promisify(sheets.spreadsheets.values.update)

const SPREADSHEET_ID = process.env['SPREADSHEET_ID']
const SHEET_TITLE = process.env['SHEET_TITLE']

let jwtClient = new google.auth.JWT(
  privatekey.client_email,
  null,
  privatekey.private_key,
  ['https://www.googleapis.com/auth/spreadsheets'])

function messageSlack (verified) {
  if (!verified.length)
    return

  console.log(verified)

  let message = 'New verified domains\n```\n'

  for (let val of verified) {
    console.log(val)
    message += '    "' + val.pubKey + '" : "' + val.domain + '",\n'
  }

  message += '```'

  slack.webhook({
    text: message
  }, function(err, response) {
    if (err)
      console.log(err)
  })
}

function getRows() {
  return getSheetValues({
    auth: jwtClient,
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_TITLE + '!B2:G'
  }).then(resp => {
    return resp.data.values ? resp.data.values : []
  }).catch(err => {
    console.log(err)
  })
}

function writeCell(cell, value) {
  console.log('writing', value, 'to', cell)
  return updateSheetValues({
    auth: jwtClient,
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_TITLE + '!' + cell,
    valueInputOption: 'RAW',
    resource: {
      values: [[value]]
    }
  }).catch(err => {
    console.log('failed to write', value, 'to', cell)
  })
}

function bytesToHex(a) {
  return a.map(function(byteValue) {
    const hex = byteValue.toString(16).toUpperCase()
    return hex.length > 1 ? hex : '0' + hex
  }).join('')
}

function verifyDomain(domain, valPubKey, valPubSig, domainSig) {
  if (!validator.isFQDN(domain) || !validator.isHexadecimal(domainSig) ||
      !validator.isHexadecimal(valPubSig)) {
    throw 'invalid input'
  }

  if (!verify(new Buffer(domain, 'ascii').toString('hex'),
              domainSig, bytesToHex(decodeNodePublic(valPubKey)))) {
    throw 'invalid validator signature'
  }

  let certificate
  try {
    certificate = new Buffer(execSync(
      'openssl s_client -servername ' + domain + ' -connect ' + domain + ':443 </dev/null 2>/dev/null|openssl x509', { "shell": "/bin/bash" })).toString()
  } catch (err) {
    throw 'missing SSL certificate'
  }

  try {
    execSync('openssl dgst -verify <(openssl x509 -in <(echo "' + certificate + '") -pubkey -noout) -signature <(xxd -r -p <(echo "'+valPubSig+'")) <(echo '+valPubKey+') 2>/dev/null', { "shell": "/bin/bash" })
  } catch (err) {
    try {
      execSync('openssl dgst -verify <(openssl x509 -in <(echo "' + certificate + '") -pubkey -noout) -signature <(xxd -r -p <(echo "'+valPubSig+'")) <(echo -n '+valPubKey+') 2>/dev/null', { "shell": "/bin/bash" })
    } catch (err) {
      throw 'invalid SSL signature'
    }
  }
}

function verifyDomains() {
  jwtClient.authorize(function (err, tokens) {
    if (err) {
      console.log(err)
      return
    }

    const startRow = 2
    getRows().then(data => {
      let verified = []
      for (let i=0; i<data.length; i++) {
        if (data[i].length >= 6)
          continue // already checked

        const row = startRow + i
        try {
          console.log('verifying', data[i][1], data[i][0])
          verifyDomain(...data[i])
          writeCell('G' + row, 'valid')
          verified.push({
            domain: data[i][0],
            pubKey: data[i][1]
          })
        } catch (err) {
          writeCell('G' + row, err)
        }

        messageSlack(verified)
      }
    })
  })
}

const verifyCron = new CronJob({
  cronTime: '00 00 10 * * 1-5',
  onTick: verifyDomains,
  start: true,
  timeZone: 'America/Los_Angeles'
});
