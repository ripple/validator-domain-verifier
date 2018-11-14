const decodeNodePublic = require('ripple-address-codec').decodeNodePublic
const execSync = require('child_process').execSync
const validator = require('validator')
const verify = require('ripple-keypairs').verify


const bytesToHex = a => {
  return a.map(function(byteValue) {
    const hex = byteValue.toString(16).toUpperCase()
    return hex.length > 1 ? hex : '0' + hex
  }).join('')
}

module.exports = (domain, valPubKey, valPubSig, domainSig) => {
  if (domain===undefined || !validator.isFQDN(domain) ||
      domainSig===undefined || !validator.isHexadecimal(domainSig) ||
      valPubSig===undefined || !validator.isHexadecimal(valPubSig)) {
    throw 'invalid input'
  }

  if (!verify(Buffer.from(domain, 'ascii').toString('hex'),
              domainSig, bytesToHex(decodeNodePublic(valPubKey)))) {
    throw 'invalid validator signature'
  }

  let certificate
  try {
    certificate = Buffer.from(execSync(
      'gtimeout 10 openssl s_client -servername ' + domain + ' -connect ' + domain + ':443 </dev/null 2>/dev/null|openssl x509', { "shell": "/bin/bash" })).toString()
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
};
