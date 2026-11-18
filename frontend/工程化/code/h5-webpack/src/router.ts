import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// 五个页面各按需加载：每个 import() 就是构建时的一个独立 chunk
const routes: RouteRecordRaw[] = [
    { path: '/', redirect: '/shows' },
    {
        path: '/shows',
        name: 'shows',
        component: () => import(/* webpackChunkName: "list" */ './views/shows/ListView.vue'),
        meta: { title: '演出' }
    },
    {
        path: '/shows/new',
        name: 'show-create',
        component: () => import(/* webpackChunkName: "edit" */ './views/shows/EditView.vue'),
        meta: { title: '新增演出' }
    },
    {
        path: '/shows/:id',
        name: 'show-detail',
        component: () => import(/* webpackChunkName: "detail" */ './views/shows/DetailView.vue'),
        meta: { title: '演出详情' }
    },
    {
        path: '/shows/:id/edit',
        name: 'show-edit',
        component: () => import(/* webpackChunkName: "edit" */ './views/shows/EditView.vue'),
        meta: { title: '编辑演出' }
    },
    {
        path: '/stats',
        name: 'stats',
        component: () => import(/* webpackChunkName: "stats" */ './views/stats/StatsView.vue'),
        meta: { title: '统计' }
    },
    {
        path: '/mine',
        name: 'mine',
        component: () => import(/* webpackChunkName: "mine" */ './views/mine/MineView.vue'),
        meta: { title: '我的' }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior: () => ({ top: 0 })
})

router.afterEach(to => {
    const title = (to.meta.title as string) || ''
    document.title = title ? `${title} · 赴演记 H5` : '赴演记 H5'
})

export default router
