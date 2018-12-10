const Slack = require('slack-node')
const slack = new Slack();

slack.setWebhook(process.env['WEBHOOK_URI']);

const send = message => {
  if (process.env['WEBHOOK_URI']) {
    const params = typeof message === 'object' ? message : { text: message };
    slack.webhook(params, (err, resp) => {
      if (err) {
        console.log(err);
      } else if (resp && resp.statusCode !== 200) {
        console.log(resp.statusCode, resp.response);
      }
    });
  } else {
    console.log('slack message not sent', message);
  }
};

module.exports.send = (pubkey, domain, message = null, deleted = false) => {
  if (deleted) {
    module.exports.sendDeleted(pubkey, domain, message);
  } else if (message === 'valid') {
    module.exports.sendVerified(pubkey, domain);
  } else {
    module.exports.sendError(pubkey, domain, message);
  }
};

module.exports.sendVerified = (pubkey, domain) => {
  send({
    icon_emoji: ':white_check_mark:',
    attachments: [{
      fallback: `Added verified domain https://${domain} for \`${pubkey}\``,
      title: 'New verified domain',
      title_link: `https://xrpcharts.ripple.com/#/validators/${pubkey}`,
      color: '#0a93eb',
      'mrkdwn_in': ['text', 'pretext'],
      text: `\n*Domain:* https://${domain}\n*Pubkey:* \`${pubkey}\``
    }]
  });
};

module.exports.sendError = (pubkey, domain, message) => {
  send({
    icon_emoji: ':x:',
    attachments: [{
      fallback: `Error saving verified domain: https://${domain} - \`${pubkey}\``,
      title: 'Domain Verification Error',
      title_link: `https://xrpcharts.ripple.com/#/validators/${pubkey}`,
      color: 'danger',
      'mrkdwn_in': ['text', 'pretext'],
      text: `\n*Domain:* https://${domain}\n*Pubkey:* \`${pubkey}\`\n\`${message}\``
    }]
  });
};

module.exports.sendDeleted = (pubkey, domain, message) => {
  send({
    icon_emoji: ':x:',
    attachments: [{
      fallback: `Verified domain no longer valid: https://${domain} - \`${pubkey}\``,
      title: 'Domain Verification invalidated',
      title_link: `https://xrpcharts.ripple.com/#/validators/${pubkey}`,
      color: 'danger',
      'mrkdwn_in': ['text', 'pretext'],
      text: `\n*Domain:* https://${domain}\n*Pubkey:* \`${pubkey}\`\n\`${message}\``
    }]
  });
};

