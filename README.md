# Validator Domain Verifier

Verifies XRP Ledger [validator domain verification](https://developers.ripple.com/run-rippled-as-a-validator.html#domain-verification) signatures in Google Sheet and updates [validators config](https://github.com/ripple/rippled-historical-database/blob/master/config/validators.config.json.example) file.

## Usage

````
npm install
SPREADSHEET_ID=<google-sheet-id> SHEET_TITLE=<sheet-title> VALIDATORS_CONFIG=<config-file-path> WEBHOOK_URI=<slack-webhook-uri> npm start
````

Google Sheets API service account credentials are expected to be in privatekeys.json in the project root directory.
