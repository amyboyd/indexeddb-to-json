const getFolderSizeWithCallback = require('get-folder-size');
const globWithCallback = require('glob');

function timestampForFilename() {
    return (new Date())
        .toISOString()
        .replace(/[/:]/g, '-')
        .replace(/\.\d+Z$/, '')
        .replace('T', '-at-');
}

function unique(array) {
    return Array.from(new Set(array));
}

Array.prototype.unique = function () {
    return [...new Set(this)];
};

async function getFolderSizeInMb(path) {
    return new Promise((resolve, reject) => {
        getFolderSizeWithCallback(path, function(err, size) {
            if (err) {
                reject(err);
            } else {
                const sizeInMb = size === 0
                    ? 0
                    : (size / 1024 / 1024).toFixed(1);
                resolve(sizeInMb);
            }
        });
    });
}

async function globPromise(pattern, options) {
    return new Promise((resolve, reject) => {
        globWithCallback(pattern, options, function(err, matches) {
            if (err) {
                reject(err);
            } else {
                resolve(matches);
            }
        });
    });
}

module.exports = {
    timestampForFilename,
    unique,
    getFolderSizeInMb,
    globPromise,
};
