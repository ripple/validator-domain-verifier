const decodeNodePublic = require('ripple-address-codec').decodeNodePublic
const verify = require('ripple-keypairs').verify
const execSync = require('child_process').execSync
const readFileSync = require('fs').readFileSync;
const validator = require('validator')
const validators = require('./validators.json')

function bytesToHex(a) {
  return a.map(function(byteValue) {
    const hex = byteValue.toString(16).toUpperCase()
    return hex.length > 1 ? hex : '0' + hex
  }).join('')
}

function verifyDomain(domain, valPubKey, domainSig, valPubSig, certificate) {
  if (!validator.isFQDN(domain) || !validator.isHexadecimal(domainSig) ||
      !validator.isHexadecimal(valPubSig)) {
    throw 'invalid input'
  }

  try {
    if (!verify(new Buffer(domain, 'ascii').toString('hex'),
                domainSig, bytesToHex(decodeNodePublic(valPubKey)))) {
      throw 'invalid validator signature'
    }
  } catch (err) {
    throw 'invalid validator signature'
  }

  try {
    certificate = certificate ? readFileSync(certificate) :
      new Buffer(execSync('openssl s_client -servername ' + domain + ' -connect ' + domain + ':443 </dev/null 2>/dev/null|openssl x509', { "shell": "/bin/bash" })).toString()
  } catch (err) {
    throw 'missing SSL certificate'
  }

  try {
    execSync('openssl dgst -verify <(openssl x509 -in <(echo "' + certificate + '") -pubkey -noout) -signature <(xxd -r -p <(echo "'+valPubSig+'")) <(echo '+valPubKey+') 2>/dev/null', { "shell": "/bin/bash" })
    // console.log(execSync('openssl dgst -verify <(openssl x509 -in <(echo "' + certificate + '") -pubkey -noout) -signature <(xxd -r -p <(echo "'+valPubSig+'")) <(echo '+valPubKey+') 2>/dev/null', { "shell": "/bin/bash" }))
  } catch (err) {
    try {
      execSync('openssl dgst -verify <(openssl x509 -in <(echo "' + certificate + '") -pubkey -noout) -signature <(xxd -r -p <(echo "'+valPubSig+'")) <(echo -n '+valPubKey+') 2>/dev/null', { "shell": "/bin/bash" })
    } catch (err) {
      throw 'invalid SSL signature'
    }
  }
}

for (val of validators) {
  try {
    verifyDomain(val.domain, val.validatorPublicKey,
        val.validatorSignature, val.sslSignature, val.certificate)
    console.log(val.domain + ': verified')
  } catch (err) {
    console.log(val.domain + ': ' + err)
  }
}
