# IndexedDB to JSON

CLI tool for converting any IndexedDB directory -- including from Chrome or an Electron app -- to a JSON file.

The tool abuses a local Chome installation to unlock Google's secret/undocumented file structure.

## Install

Using NPM: `npm install -g indexeddb-to-json`

Using Yarn: `yarn global add indexeddb-to-json`

If you want to run it without a permanent installation, use `npx indexeddb-to-json`

## Usage of `extract`

`indexeddb-to-json extract [directory]`

The `directory` parameter must be an IndexedDB directory, which could be from a Chrome user profile or an Electron app.

## Usage of `discover`

This command tries to find all IndexedDB databases in common directories.

`indexeddb-to-json discover --csv` will print discovered databases to a .csv file.

`indexeddb-to-json discover --stdout` will print discovered databases to stdout.

## Examples

Run `indexeddb-to-json -h` or `indexeddb-to-json help [command]` for more information and options.

Extract from the Slack app (based on Electron) on MacOS:  
`indexeddb-to-json ~/Library/Containers/com.tinyspeck.slackmacgap/Data/Library/Application\ Support/Slack/IndexedDB/https_app.slack.com_0.indexeddb.leveldb`

Extract from the Microsoft Teams app (based on Electron) on MacOS:  
`indexeddb-to-json ~/Library/Application\ Support/Microsoft/Teams/IndexedDB/https_teams.microsoft.com_0.indexeddb.leveldb`

Extract from the Slack website on MacOS:  
`indexeddb-to-json ~/Library/Application\ Support/Google/Chrome/Default/IndexedDB/https_app.slack.com_0.indexeddb.leveldb`

Extract from the Microsoft Teams website on MacOS:  
`indexeddb-to-json ~/Library/Application\ Support/Google/Chrome/Default/IndexedDB/https_teams.microsoft.com_0.indexeddb.leveldb`

Note: these Chrome examples use the `Default` profile, but you can use any profile directory e.g. `..../Chrome/Profile\ 2/IndexedDB/....`

On Windows, the default Chrome profile is at: `C:\Users\USERNAME\AppData\Local\Google\Chrome\User Data\Default`

On Linux, the default Chrome profile is at: `~/.config/google-chrome/default`

You can also extract from old backups, e.g. if you use MacOS's Time Machine, use these directories:  
`/Volumes/HARD-DRIVE-NAME/Backups.backupdb/LAPTOP-NAME/TIMESTAMP/LAPTOP-NAME - Data/Users/USER-NAME/Library/Application Support/Google/Chrome/Default/IndexedDB/https_teams.microsoft.com_0.indexeddb.leveldb`  
or  
`/Volumes/HARD-DRIVE-NAME/Backups.backupdb/LAPTOP-NAME/TIMESTAMP/LAPTOP-NAME - Data/Users/USER-NAME/Library/Containers/com.tinyspeck.slackmacgap/Data/Library/Application Support/Slack/IndexedDB/https_app.slack.com_0.indexeddb.leveldb`

## Contributing

Please lint code changes with `yarn lint-check` and `yarn lint-fix`.
