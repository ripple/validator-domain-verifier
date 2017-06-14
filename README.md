# Validator Domain Verifier

Verifies Ripple validator domain verification signatures
https://ripple.com/build/rippled-setup/#domain-verification

## Usage

````
npm install
npm start
````

To verify a new validator, add its information to
[validators.json](validators.json)

If its SSL certificate cannot be retrieved from the domain, the path to a local
copy of the certificate can be added to the entry in validators.json
