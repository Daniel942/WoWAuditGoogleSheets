module.exports = {
    extends: [
        './rules/best-practices',
        './rules/errors',
        './rules/style',
        './rules/variables',
        './rules/es6',
        './rules/strict'
    ].map(require.resolve),
    parserOptions: {
        ecmaVersion: 11
    }
};
