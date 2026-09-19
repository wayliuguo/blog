/**
 * 启动本机无头 Chrome 打开一个页面（零依赖，不用 puppeteer）
 * 页面自己把指标 POST 回实验台服务器，所以这里不需要 CDP
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const CANDIDATES = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'google-chrome',
    'chromium'
].filter(Boolean)

export function findChrome() {
    for (const file of CANDIDATES) {
        if (!file.includes('/') && !file.includes('\\')) return file
        if (fs.existsSync(file)) return file
    }
    throw new Error('没找到 Chrome，可用环境变量 CHROME_PATH 指定可执行文件路径')
}

// 复用同一个 profile 目录：省掉每次启动的初始化开销，也避免频繁创建/删除临时目录
export const PROFILE_DIR = process.env.PERF_LAB_PROFILE || path.join(os.tmpdir(), 'perf-lab-chrome-profile')

/** 打开 url，返回子进程句柄（调用方拿到上报后 kill） */
export function openChrome(url, flags = []) {
    const args = [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--no-first-run',
        '--disable-extensions',
        '--disable-background-networking',
        '--window-size=1280,800',
        `--user-data-dir=${PROFILE_DIR}`,
        ...flags,
        url
    ]
    return spawn(findChrome(), args, { stdio: 'ignore' })
}
