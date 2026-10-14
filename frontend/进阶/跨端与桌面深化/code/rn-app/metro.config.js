const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')

/**
 * Metro 配置：默认配置已覆盖 RN 全部需求；
 * 这里显式留出扩展位（自定义 resolver/transformer 时改这里）。
 */
module.exports = mergeConfig(getDefaultConfig(__dirname), {})
