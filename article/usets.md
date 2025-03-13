## props 类型标注

**类型定义**
```
type LoadingType = 'circular' | 'spinner'
// 指定 props 类型
const buttonProps = {
    loading: Boolean,
    loadingSize: [Number, String],
    iconPosition: {
        type: ×××
        requried: true,
        default: ×××
    },
    loadingType: String as PropType<LoadingType>
}
// 提取props类型给到外部使用
export type ButtonProps = ExtractPropTypes<typeof buttonProps>
```

`PropType<T>`
- 用于在用运行时 `props` 声明时给一个 `prop` 标注更复杂的类型定义
- 指定了其是 `String` 类型 且只能是`'circular' | 'spinner'`
```
loadingType: String as PropType<LoadingType>
```

`ExtractPropTypes<T>`
- 从运行时的 props 选项对象中提取 props 类型
- 提取到的类型是面向内部的，也就是说组件接收到的是解析后的 props

**tsx 中使用**
```
export default defineComponent({
    props: buttonProps
})
```
**SFC 中使用**
```
const props = defineProps(buttonProps)
```

## emit 类型标注
**SFC 中使用**
```
const buttonEmits = {
  click: (e: MouseEvent) => e instanceof MouseEvent
}

const emit = defineEmits(buttonEmits)
```
**tsx 中定义**
```
export default defineComponent({
    emits: ['click']
})
```

## ref 类型标注
```
let width: Ref<number> = ref(20)
let width = ref<string | number>(20)
```

## reactive 类型标注
```
interface Book {
  title: string
  year?: number
}

const book: Book = reactive({ title: 'Vue 3 指引' })
```

## computed 类型标注
```
const double = computed<number>(() => {
  // 若返回值不是 number 类型则会报错
})
```