// 目录里有这个文件，但它不在依赖图里 —— dev 与 build 都不会碰它。
// 用来对照"模块图才是边界"：build 只收可达模块，不是把 src/ 整个目录打包。
export const lazy = 'never-imported'
