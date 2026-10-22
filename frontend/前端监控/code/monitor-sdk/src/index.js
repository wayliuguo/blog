// monitor-sdk 公共出口
// 五个能力文件：init（初始化装配）/ exceptions（异常）/ performance（性能）/ declarative（声明上报）/ report（上报）
// 手动上报入口：report()——业务侧区分上报类型的二次封装（如 PV/点击/错误）在接入层完成
export { init, getCurrentInstance } from './init.js'
export { report } from './report.js'
