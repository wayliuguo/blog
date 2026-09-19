/**
 * 站点数据：一份真实体量的静态字典。
 * 它由「静态组件」使用 —— 岛化之后浏览器根本不会下载它，这个体积差就是岛的第一笔收益。
 */
const RAW =
    '北京,上海,广州,深圳,杭州,南京,苏州,成都,重庆,武汉,西安,天津,长沙,郑州,青岛,宁波,东莞,无锡,佛山,合肥,大连,福州,厦门,哈尔滨,济南,温州,南宁,长春,泉州,石家庄,贵阳,南昌,金华,常州,南通,嘉兴,太原,徐州,潍坊,烟台,兰州,乌鲁木齐,绍兴,海口,呼和浩特,洛阳,珠海,汕头,惠州,中山'

export const cities = RAW.split(',').map((name, i) => ({
    id: i + 1,
    name,
    code: `CITY-${String(i + 1).padStart(3, '0')}`
}))

/** 每个站点一条运营位文案：纯静态内容，不需要任何 JavaScript */
export const slogans = cities.map((city) => `${city.name}站 · 满 99 减 20 · 次日达`)

export function byName(name) {
    return cities.find((city) => city.name === name) || cities[0]
}

export function sloganAt(index) {
    return slogans[((index % slogans.length) + slogans.length) % slogans.length]
}
