# Validator Domain Verifier

Verifies Ripple validator domain verification signatures in Google Sheet and reports to Slack

https://ripple.com/build/rippled-setup/#domain-verification

## Usage

````
npm install
WEBHOOK_URI=<slack-webhook-uri> SPREADSHEET_ID=<google-sheet-id> SHEET_TITLE=<sheet-title> npm start
````

Google Sheets API service account credentials are expected to be in privatekeys.json in the project root directory.
