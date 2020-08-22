module.exports = {
    root: true,
    env: {
        node: true,
        es6: true,
    },
    parserOptions: {
        ecmaVersion: 2020,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    plugins: ['@typescript-eslint'],
    ignorePatterns: ['node_modules'],
    rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
        'max-len': [
            'error',
            {
                code: 100,
                ignoreStrings: true,
                ignoreRegExpLiterals: true,
            },
        ],
    },
};
