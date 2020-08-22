#!/usr/bin/env node -r ts-node/register

process.on('uncaughtException', function (e) {
    console.error(e);
    process.exit(1);
});

process.on('unhandledRejection', function (e) {
    console.error(e);
    process.exit(1);
});

import {Command} from 'commander';
import extract from './extract';
import discover from './discover';

import packageInfo from '../package.json';

const program = new Command()
    .name(packageInfo.name)
    .description(packageInfo.description)
    .version(packageInfo.version)
    .allowUnknownOption(false);

program
    .command('extract <source>')
    .option('--stdout', 'Prints JSON to stdout instead of creating a file')
    .option('--verbose', 'Verbose logging')
    .action(async (source, options) => await extract(source, options));

program
    .command('discover')
    .option('--stdout', 'Prints to stdout')
    .option('--csv', 'Prints to a CSV file')
    .action(async (options) => await discover(options));

program.parseAsync(process.argv);
