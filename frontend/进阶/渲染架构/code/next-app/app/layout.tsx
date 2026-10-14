import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'

export const metadata: Metadata = { title: '订单中心 · next-app' }

// layout.tsx 是 App Router 的根布局：所有页面共享这层外壳，导航切换时不重渲染
export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="zh-CN">
            <body style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '24px auto' }}>
                <nav>
                    <Link href="/">首页</Link> · <Link href="/orders">订单列表</Link>
                </nav>
                <hr />
                {children}
            </body>
        </html>
    )
}
