export const ENV = {
    appTitle: __ENV__.VITE_APP_TITLE || '赴演记 H5',
    apiBase: __ENV__.VITE_API_BASE || '/api',
    assetBase: __ENV__.VITE_ASSET_BASE || 'https://api.show-track.top',
    apiToken: __ENV__.VITE_API_TOKEN || '',
    isDev: __ENV__.DEV
}

/** 没配 token 时页面上的统一提示语 */
export const TOKEN_HINT = '未配置 token：复制 .env.local.example 为 .env.local，填入 VITE_API_TOKEN 后重启 dev'
