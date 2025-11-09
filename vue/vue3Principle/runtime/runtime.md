# 调用流程图

![img](runtime.png)

# runtime-dom

1. 基于 runtime-core 进行了所有导出
2. 提供了 createRenderer 可以自定义渲染器接口函数
3. 默认提供了一个 createApp，其提供了默认的调用 createRenderer，其返回了包含 createApp函数 的对象
4.  createAppAPI 返回了 createApp 函数，其提供了 mount 方法，使用时会调用mount方法

```
// packages\runtime-dom\src\index.ts
function createElement() {}
...

function ensureRenderer() {
  // 如果 renderer 有值的话，那么以后都不会初始化了
  return (
    renderer ||
    (renderer = createRenderer({
      createElement,
      createText,
      setText,
      setElementText,
      patchProp,
      insert,
      remove,
    }))
  );
}

export const createApp = (...args) => {
  return ensureRenderer().createApp(...args);
};

export * from "@mini-vue/runtime-core"
```

```
// packages\runtime-core\src\renderer.ts

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setText: hostSetText,
    createText: hostCreateText,
  } = options;

  const render = (vnode, container) => {
    console.log("调用 patch")
    patch(null, vnode, container);
  };
 
 function hostCreateElement() {...}
 function hostSetElementText(){...}
 ... 
 return {
    render,
    createApp: createAppAPI(render),
  };
}
```

```
// packages\runtime-core\src\createApp.ts
import { createVNode } from "./vnode";

export function createAppAPI(render) {
  return function createApp(rootComponent) {
    const app = {
      _component: rootComponent,
      mount(rootContainer) {
        console.log("基于根组件创建 vnode");
        const vnode = createVNode(rootComponent);
        console.log("调用 render，基于 vnode 进行开箱");
        render(vnode, rootContainer);
      },
    };

    return app;
  };
}
```

# runtime-core

## 初始化 Component

### 例子

```
// packages\vue\example\init-component

// index.html

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>


    <div id="root"></div>

    <script src="main.js" type="module"></script>

</body>
</html>

// App.js
import { h } from "../../dist/mini-vue.esm-bundler.js";

export default {
  name: "App",
  setup() {
    return {
      msg: "mini-vue",
    };
  },

  render() {
    return h("div", {}, "hi," + this.msg);
  },
};

// main.js
import { createApp } from "../../dist/mini-vue.esm-bundler.js";
import App from "./App.js";

const rootContainer = document.querySelector("#root");
createApp(App).mount(rootContainer);
```

### 关键实现

#### 入口挂载

1. 根据 runtime-dom 中，调用了 createApp 返回了 包含 mount 函数的对象
2. 调用mount 函数，把组件进行传入，其会先调用 createVNode 进行创建虚拟 DOM
3. 调用 render 函数，传入虚拟 DOM 和 父节点，其会调用 patch 函数进行对比虚拟DOM 更新真实 DOM

#### h 函数

其底层调用的是 createVnode

```
// packages\runtime-core\src\h.ts
import { createVNode } from "./vnode";
export const h = (type: any , props: any = null, children: string | Array<any> = []) => {
  return createVNode(type, props, children);
};
```

#### createVnode

##### 作用

可以创建多种类型的VNode

##### 参数

- type：节点类型，可以是元素、组件、文本等节点

  - 组件，数据是一个对象

    ```
    {
    	name: xxx,
    	setup(props, context) {},
    	render() {}
    }
    ```

  - 元素

    ```
    createVNode('div', props, children)
    ```

- props: 属性对象

- children: 数组或字符串

  - 数组：子节点列表
  - 字符串：字符

##### 执行流程

- 初始化 vnode 对象，通过 getShapeFlag 设置
- 根据是数组还是字符串设置 vnode 的 shapeFlag
- 两次处理的vnode

![image-20251109204246332](image-20251109204246332.png)

![image-20251109204301719](image-20251109204301719.png)

```
// packages\runtime-core\src\vnode.ts
export const createVNode = function (
  type: any,
  props?: any,
  children?: string | Array<any>
) {
  // 注意 type 有可能是 string 也有可能是对象
  // 如果是对象的话，那么就是用户设置的 options
  // type 为 string 的时候
  // createVNode("div")
  // type 为组件对象的时候
  // createVNode(App)
  const vnode = {
    el: null,
    component: null,
    key: props?.key,
    type,
    props: props || {},
    children,
    shapeFlag: getShapeFlag(type),
  };

  // 基于 children 再次设置 shapeFlag
  if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  } else if (typeof children === "string") {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  }

  normalizeChildren(vnode, children);

  return vnode;
};
```

#### shapeFlag

#### render

#### patch



