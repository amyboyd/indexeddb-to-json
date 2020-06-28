# IndexedDB to JSON

Extract IndexedDB to JSON, from any Chrome or Electron database directory.

## Install

Using NPM: `npm install -g indexeddb-to-json`

Using Yarn: `yarn global add indexeddb-to-json`

## Usage

`indexeddb-to-json [directory] [-p]`

The `directory` parameter must be an IndexedDB directory, which could be from a Chrome user profile or an Electron app.

Add `-p` to print to stdout instead of writing to a file.

(If you want to run the executable without installing it, use `npx indexeddb-to-json`)

## Examples

Extract from the Slack app (based on Electron) on MacOS:  
`indexeddb-to-json ~/Library/Containers/com.tinyspeck.slackmacgap/Data/Library/Application\ Support/Slack/IndexedDB/https_app.slack.com_0.indexeddb.leveldb`

Extract from the Microsoft Teams app (based on Electron) on MacOS:  
`indexeddb-to-json ~/Library/Application\ Support/Microsoft/Teams/IndexedDB/https_teams.microsoft.com_0.indexeddb.leveldb`

Extract from the Slack website on MacOS:  
`indexeddb-to-json ~/Library/Application\ Support/Google/Chrome/Default/IndexedDB/https_app.slack.com_0.indexeddb.leveldb`

Extract from the Microsoft Teams website on MacOS:  
`indexeddb-to-json ~/Library/Application\ Support/Google/Chrome/Default/IndexedDB/https_teams.microsoft.com_0.indexeddb.leveldb`

Note: these Chrome examples use the `Default` profile, but you can use any profile directory e.g. `..../Chrome/Profile\ 2/IndexDB/....`

On Windows, the default Chrome profile is at: `C:\Users\USERNAME\AppData\Local\Google\Chrome\User Data\Default`

On Linux, the default Chrome profile is at: `~/.config/google-chrome/default`

You can also extract from old backups, e.g. if you use MacOS's Time Machine, use these directories:  
`/Volumes/HARD-DRIVE-NAME/Backups.backupdb/LAPTOP-NAME/TIMESTAMP/LAPTOP-NAME - Data/Users/USER-NAME/Library/Application Support/Google/Chrome/Default/IndexedDB/https_teams.microsoft.com_0.indexeddb.leveldb`  
or  
`/Volumes/HARD-DRIVE-NAME/Backups.backupdb/LAPTOP-NAME/TIMESTAMP/LAPTOP-NAME - Data/Users/USER-NAME/Library/Containers/com.tinyspeck.slackmacgap/Data/Library/Application Support/Slack/IndexedDB/https_app.slack.com_0.indexeddb.leveldb`
