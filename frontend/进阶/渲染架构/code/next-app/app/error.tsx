'use client'

// error.tsx：App Router 约定式错误边界，必须是客户端组件
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <main>
            <h1>出错了</h1>
            <button onClick={reset}>重试</button>
        </main>
    )
}
