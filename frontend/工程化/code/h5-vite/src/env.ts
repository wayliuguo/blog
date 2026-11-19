/**
 * 环境变量收口处。
 *
 * `import.meta.env.VITE_*` 在构建时是**字面量替换**：
 * 打包后产物里不存在 `import.meta.env` 这个对象，只剩下常量字符串。
 * 因此这里把值再收一层，业务代码不直接散落 `import.meta.env.xxx`。
 */
export const ENV = {
    appTitle: import.meta.env.VITE_APP_TITLE || '赴演记 H5',
    apiBase: import.meta.env.VITE_API_BASE || '/api',
    assetBase: import.meta.env.VITE_ASSET_BASE || 'https://api.show-track.top',
    apiToken: import.meta.env.VITE_API_TOKEN || '',
    isDev: import.meta.env.DEV,
    bundler: 'Vite 8'
}

/** 没配 token 时页面上的统一提示语 */
export const TOKEN_HINT = '未配置 token：复制 .env.local.example 为 .env.local，填入 VITE_API_TOKEN 后重启 dev'
