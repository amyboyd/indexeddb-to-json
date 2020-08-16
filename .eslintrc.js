module.exports = {
    root: true,
    env: {
        node: true,
        es6: true,
    },
    parserOptions: {
        ecmaVersion: 2017,
    },
    extends: ['eslint:recommended'],
    ignorePatterns: ['node_modules'],
    rules: {
        'max-len': ['error', {code: 120, ignoreStrings: true}],
    },
};
