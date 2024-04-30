module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react/recommended', 'prettier'],
    overrides: [
        {
            env: {
                node: true
            },
            files: ['.eslintrc.{js,cjs}'],
            parserOptions: {
                sourceType: 'script'
            }
        }
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
    },
    plugins: ['@typescript-eslint', 'react', 'prettier'],
    rules: {
        indent: ['error', 4] // 用于指定代码缩进的方式，这里配置为使用四个空格进行缩进
    },
    settings: {
        react: {
            version: '18.2' // 设置为 'detect' 会让 ESLint 尝试自动检测你的 React 版本
            // 或者你也可以指定一个具体的版本号，例如：'17.0'
        }
    }
}
