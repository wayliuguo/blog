// schema.js — 默认页面：统一业务场景「运营活动页」——Banner 条件可见 + 商品循环列表 + 报名表单
export const initialState = {
  vip: true,
  items: [{ name: '商品 A' }, { name: '商品 B' }, { name: '商品 C' }],
}

export const defaultSchema = {
  id: 'page',
  type: 'Page',
  props: {},
  children: [
    {
      id: 'banner',
      type: 'Banner',
      props: { title: '大促开场', vip: 'state.vip' },
      when: 'state.vip',
    },
    {
      id: 'list',
      type: 'List',
      props: { title: '秒杀清单' },
      loop: 'state.items',
      children: [{ id: 'item', type: 'Text', props: { text: 'item.name' } }],
    },
    {
      id: 'signup',
      type: 'Input',
      props: { placeholder: '输入手机号参与报名', srcType: 'url', url: 'https://cdn.example.com/banner.png' },
    },
    { id: 'submit', type: 'Button', props: { text: '立即报名', size: 'lg' } },
  ],
}
