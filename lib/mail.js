const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({ sendmail: true });

module.exports.notify = (data, result) => {

  if (!process.env['FROM_EMAIL']) {
    console.log('ENV variable \'FROM_EMAIL\' is required for email notifications');
    return Promise.resolve();
  }

  if (!data[4]) {
    console.log('no email address to notify');
    return Promise.resolve();
  }

  const subject = result === 'valid' ? 'Validator Domain Verfied' : 'Unable to Verify Validator Domain';
  let html = `<p>Your domain for https://${data[0]} for validator <b>${data[1]}</b> was `;

  if (result === 'valid') {
    html += 'successfully verfied.</p>'
  } else {
    html += `unable to be verified.</p><p>The verification process reported the following error: <b>'${result}'</b>`;
  }

  html += `<p>https://xrpcharts.ripple.com/#/validators/${data[1]}`

  return transport.sendMail({
    from: `XRPL Domain Verification <${process.env['FROM_EMAIL']}>`,
    to: data[4],
    cc: process.env['CC_EMAIL'],
    bcc: process.env['BCC_EMAIL'],
    subject,
    html
  })
};