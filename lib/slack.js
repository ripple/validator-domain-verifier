const Slack = require('slack-node')
const slack = new Slack();

slack.setWebhook(process.env['WEBHOOK_URI']);

module.exports.send = message => {
  const params = typeof message === 'object' ? message : { text: message };
  slack.webhook(params, (err, resp) => {
    if (err) {
      console.log(err);
    } else if (resp && resp.statusCode !== 200) {
      console.log(resp.statusCode, resp.response);
    }
  });
};

module.exports.sendVerified = data => {
  module.exports.send({
    icon_emoji: ':white_check_mark:',
    attachments: [{
      fallback: `Added verified domain https://${data.domain} for \`${data.pubkey}\``,
      title: 'New verified domain',
      title_link: `https://xrpcharts.ripple.com/#/validators/${data.pubkey}`,
      color: '#0a93eb',
      'mrkdwn_in': ['text', 'pretext'],
      text: `\n*Domain:* https://${data.domain}\n*Pubkey:* \`${data.pubkey}\``
    }]
  });
};

module.exports.sendError = (data, error) => {
  module.exports.send({
    icon_emoji: ':x:',
    attachments: [{
      fallback: `Error saving verified domain: https://${data.domain} - \`${data.pubkey}\``,
      title: 'Domain Verification Error',
      color: 'danger',
      'mrkdwn_in': ['text', 'pretext'],
      text: `\n*Domain:* https://${data.domain}\n*Pubkey:* \`${data.pubkey}\`\n\`${error.toString()}\``
    }]
  });
};

