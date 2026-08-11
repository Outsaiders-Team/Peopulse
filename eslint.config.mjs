import nextPlugin from 'eslint-config-next';

const eslintConfig = [...nextPlugin, { ignores: ['legacy/**'] }];

export default eslintConfig;
