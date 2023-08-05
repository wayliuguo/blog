## 1.异步与事件循环

### 1.宏任务与微任务执行过程

```
Promise.resolve().then(() => {
  console.log('promise1');
  const timer2 = setTimeout(() => {
    console.log('timer2')
  }, 0)
});
const timer1 = setTimeout(() => {
  console.log('timer1')
  Promise.resolve().then(() => {
    console.log('promise2')
  })
}, 0)
console.log('start');
```

```
start
promise1
timer1
promise2
timer2
```

代码的执行过程如下：

1. 首先，`Promise.resolve().then`是一个微任务，加入微任务队列
2. 执行timer1，它是一个宏任务，加入宏任务队列
3. 继续执行下面的同步代码，打印出`start`
4. 这样第一轮宏任务就执行完了，开始执行微任务`Promise.resolve().then`，打印出`promise1`
5. 遇到`timer2`，它是一个宏任务，将其加入宏任务队列，此时宏任务队列有两个任务，分别是`timer1`、`timer2`；
6. 这样第一轮微任务就执行完了，开始执行第二轮宏任务，首先执行定时器`timer1`，打印`timer1`；
7. 遇到`Promise.resolve().then`，它是一个微任务，加入微任务队列
8. 开始执行微任务队列中的任务，打印`promise2`；
9. 最后执行宏任务`timer2`定时器，打印出`timer2`；

### 2.promise.then()接收一个值而不是一个函数

```
Promise.resolve(1)
  .then(2)
  .then(Promise.resolve(3))
  .then(console.log)
```

```
1
Promise {<fulfilled>: undefined}
```

`.then` 或`.catch` 的参数期望是函数，传入非函数则会发生**值透传**。

### 3. promise.then()中抛出错误

```
const promise1 = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve('success')
  }, 1000)
})
const promise2 = promise1.then(() => {
  throw new Error('error!!!')
})
console.log('promise1', promise1)
console.log('promise2', promise2)
setTimeout(() => {
  console.log('promise1', promise1)
  console.log('promise2', promise2)
}, 2000)
```

```
promise1 Promise {<pending>}
promise2 Promise {<pending>}

Uncaught (in promise) Error: error!!!
promise1 Promise {<fulfilled>: "success"}
promise2 Promise {<rejected>: Error: error!!}
```

### 4. promise.then()返回一个值

```
Promise.resolve(1)
  .then(res => {
    console.log(res);
    return 2;
  })
  .catch(err => {
    return 3;
  })
  .then(res => {
    console.log(res);
  });
```

```
1   
2
```

Promise是可以链式调用的，由于每次调用 `.then` 或者 `.catch` 都会返回一个新的 promise，从而实现了链式调用, 它并不像一般任务的链式调用一样return this。

上面的输出结果之所以依次打印出1和2，是因为`resolve(1)`之后走的是第一个then方法，并没有进catch里，所以第二个then中的res得到的实际上是第一个then的返回值。并且return 2会被包装成`resolve(2)`，被最后的then打印输出2。

### 5. promise.then() 返回错误

```
Promise.resolve().then(() => {
  return new Error('error!!!')
}).then(res => {
  console.log("then: ", res)
}).catch(err => {
  console.log("catch: ", err)
})
```

```
"then: " "Error: error!!!"
```

返回任意一个非 promise 的值都会被包裹成 promise 对象，因此这里的`return new Error('error!!!')`也被包裹成了`return Promise.resolve(new Error('error!!!'))`，因此它会被then捕获而不是catch。

### 6.promise.then()返回一个promise

```
const promise = Promise.resolve().then(() => {
  return promise;
})
promise.catch(console.err)
```

```
Uncaught (in promise) TypeError: Chaining cycle detected for promise #<Promise>
```

这里其实是一个坑，`.then` 或 `.catch` 返回的值不能是 promise 本身，否则会造成死循环。

### 7. promise.then捕捉错误与catch同时存在

```
Promise.reject('err!!!')
  .then((res) => {
    console.log('success', res)
  }, (err) => {
    console.log('error', err)
  }).catch(err => {
    console.log('catch', err)
  })
```

```
error err!!!
```

我们知道，`.then`函数中的两个参数：

- 第一个参数是用来处理Promise成功的函数
- 第二个则是处理失败的函数

也就是说`Promise.resolve('1')`的值会进入成功的函数，`Promise.reject('2')`的值会进入失败的函数。

在这道题中，错误直接被`then`的第二个参数捕获了，所以就不会被`catch`捕获了，输出结果为：`error err!!!'`

### 8. promise.finally

```
Promise.resolve('1')
  .then(res => {
    console.log(res)
  })
  .finally(() => {
    console.log('finally')
  })
Promise.resolve('2')
  .finally(() => {
    console.log('finally2')
  	return '我是finally2返回的值'
  })
  .then(res => {
    console.log('finally2后面的then函数', res)
  })
```

```
1
finally2
finally
finally2后面的then函数 2
```

`.finally()`一般用的很少，只要记住以下几点就可以了：

- `.finally()`方法不管Promise对象最后的状态如何都会执行
- `.finally()`方法的回调函数不接受任何的参数，也就是说你在`.finally()`函数中是无法知道Promise最终的状态是`resolved`还是`rejected`的
- 它最终返回的默认会是一个上一次的Promise对象值，不过如果抛出的是一个异常则返回异常的Promise对象。
- finally本质上是then方法的特例

### 9. promise.catch 捕捉异常

```
Promise.resolve('1')
  .finally(() => {
    console.log('finally1')
    throw new Error('我是finally中抛出的异常')
  })
  .then(res => {
    console.log('finally后面的then函数', res)
  })
  .catch(err => {
    console.log('捕获错误', err)
  })
```

```
'finally1'
'捕获错误' Error: 我是finally中抛出的异常
```

或者：

```
Promise.resolve('1')
  .then(res => {
    throw new Error('我是then中抛出的异常')
  })
  .catch(err => {
    console.log('捕获错误', err)
  })
```

```
'捕获错误' Error: 我是then中抛出的异常
```

### 10.promise.all 

```
function runAsync (x) {
    const p = new Promise(r => setTimeout(() => r(x, console.log(x)), 1000))
    return p
}

Promise.all([runAsync(1), runAsync(2), runAsync(3)]).then(res => console.log(res))
```

```
1
2
3
[1, 2, 3]
```

### 11.promise.all resolve与reject

```
function runAsync (x) {
  const p = new Promise(r => setTimeout(() => r(x, console.log(x)), 1000))
  return p
}
function runReject (x) {
  const p = new Promise((res, rej) => setTimeout(() => rej(`Error: ${x}`, console.log(x)), 1000 * x))
  return p
}
Promise.all([runAsync(1), runReject(4), runAsync(3), runReject(2)])
       .then(res => console.log('res>>>', res))
       .catch(err => console.log('err>>>', err))
```

```
// 1s后输出
1
3
// 2s后输出
2
Error: 2
// 4s后输出
4
```

### 12. async & await

**遇到await会阻塞后面的代码，先执行async外面的同步代码，同步代码执行完，再回到async内部，继续执行await后面的代码。**

```
async function async1() {
  console.log("async1 start");
  await async2();
  console.log("async1 end");
  setTimeout(() => {
    console.log('timer1')
  }, 0)
}
async function async2() {
  setTimeout(() => {
    console.log('timer2')
  }, 0)
  console.log("async2");
}
async1();
setTimeout(() => {
  console.log('timer3')
}, 0)
console.log("start")
```

```
async1 start
async2
start
async1 end
timer2
timer3
timer1
```

1. 首先进入`async1`，打印出`async1 start`；
2. 之后遇到`async2`，进入`async2`，遇到定时器`timer2`，加入宏任务队列，之后打印`async2`；
3. 由于`async2`阻塞了后面代码的执行，所以执行后面的定时器`timer3`，将其加入宏任务队列，之后打印`start`；
4. 然后执行async2后面的代码，打印出`async1 end`，遇到定时器timer1，将其加入宏任务队列；
5. 最后，宏任务队列有三个任务，先后顺序为`timer2`，`timer3`，`timer1`，没有微任务，所以直接所有的宏任务按照先进先出的原则执行。

### 13. async await 与 promise.resolve

```
async function async1 () {
  console.log('async1 start');
  await new Promise(resolve => {
    console.log('promise1')
    resolve('promise1 resolve')
  }).then(res => console.log(res))
  console.log('async1 success');
  return 'async1 end'
}
console.log('srcipt start')
async1().then(res => console.log(res))
console.log('srcipt end')
```

```
script start
async1 start
promise1
script end
promise1 resolve
async1 success
async1 end
```

1. 首先 **srcipt start**
2. 进入async1()，打印**async1 start**，Promise 里的会立即执行，打印**promise1**
3. 由于async1()阻塞了后面代码的执行，所以打印**srcipt end**
4. 执行 Promise.then 打印**promise1 resolve**
5. 打印**async1 success**
6. 打印**async1 end**

### 14.await 后面的代码进入了微任务队列

```
async function async1() {
  console.log("async1 start");
  await async2();
  console.log("async1 end");
}

async function async2() {
  console.log("async2");
}

console.log("script start");

setTimeout(function() {
  console.log("setTimeout");
}, 0);

async1();

new Promise(resolve => {
  console.log("promise1");
  resolve();
}).then(function() {
  console.log("promise2");
});
console.log('script end')
```

```
script start
async1 start
async2
promise1
script end
async1 end
promise2
setTimeout
```

代码执行过程如下： 

1. 开头定义了async1和async2两个函数，但是并未执行，执行script中的代码，所以打印出script start；
2. 遇到定时器Settimeout，它是一个宏任务，将其加入到宏任务队列；
3. 之后执行函数async1，首先打印出async1 start；
4. 遇到await，执行async2，打印出async2，并阻断后面代码的执行，将后面的代码加入到微任务队列；
5. 然后跳出async1和async2，遇到Promise，打印出promise1；
6. 遇到resolve，将其加入到微任务队列，然后执行后面的script代码，打印出script end；
7. 之后就该执行微任务队列了，首先打印出async1 end，然后打印出promise2；
8. 执行完微任务队列，就开始执行宏任务队列中的定时器，打印出setTimeout。

### 15.async await 与 reject

```
async function async1 () {
  await async2();
  console.log('async1');
  return 'async1 success'
}
async function async2 () {
  return new Promise((resolve, reject) => {
    console.log('async2')
    reject('error')
  })
}
async1().then(res => console.log(res))
```

```
async2
Uncaught (in promise) error
```

可以看到，如果async函数中抛出了错误，就会终止错误结果，不会继续向下执行。

## 2. this

### 1.全局执行环境

```
function foo() {
  console.log( this.a );
}

function doFoo() {
  foo();
}

var obj = {
  a: 1,
  doFoo: doFoo
};

var a = 2; 
obj.doFoo()
```

输出结果：2 

在Javascript中，this指向函数执行时的当前对象。在执行foo的时候，执行环境就是doFoo函数，执行环境为全局。所以，foo中的this是指向window的，所以会打印出2。

### 2.箭头函数this与非箭头函数

```
var a = 10
var obj = {
  a: 20,
  say: () => {
    console.log(this.a)
  }
}
obj.say() 

var anotherObj = { a: 30 } 
obj.say.apply(anotherObj) 
```

输出结果：10  10

我么知道，箭头函数时不绑定this的，它的this来自原其父级所处的上下文，所以首先会打印全局中的 a 的值10。后面虽然让say方法指向了另外一个对象，但是仍不能改变箭头函数的特性，它的this仍然是指向全局的，所以依旧会输出10。

```
var a = 10  
var obj = {  
  a: 20,  
  say(){
    console.log(this.a)  
  }  
}  
obj.say()   
var anotherObj={a:30}   
obj.say.apply(anotherObj)
```

输出结果：20 30

这时，say方法中的this就会指向他所在的对象，输出其中的a的值。

### 3.call(null)在严格模式与非严格模式

```
function a() {
  console.log(this);
}
a.call(null);
```

打印结果：window对象

根据ECMAScript262规范规定：如果第一个参数传入的对象调用者是null或者undefined，call方法将把全局对象（浏览器上是window对象）作为this的值。所以，不管传入null 还是 undefined，其this都是全局对象window。所以，在浏览器上答案是输出 window 对象。

要注意的是，在严格模式中，null 就是 null，undefined 就是 undefined：

```
'use strict';

function a() {
    console.log(this);
}
a.call(null); // null
a.call(undefined); // undefined
```

### 4. 函数表达式

```
var obj = {
   say: function() {
     var f1 = () =>  {
       console.log("1111", this);
     }
     f1();
   },
   pro: {
     getPro:() =>  {
        console.log(this);
     }
   }
}
var o = obj.say;
o();
obj.say();
obj.pro.getPro();
```

```
1111 window对象
1111 obj对象
window对象
```

1. o()，o是在全局执行的，而f1是箭头函数，它是没有绑定this的，它的this指向其父级的this，其父级say方法的this指向的是全局作用域，所以会打印出window；
2. obj.say()，谁调用say，say 的this就指向谁，所以此时this指向的是obj对象；
3. obj.pro.getPro()，我们知道，箭头函数时不绑定this的，getPro处于pro中，而对象不构成单独的作用域，所以箭头的函数的this就指向了全局作用域window。

### 5.函数中自执行函数与匿名函数

```
var myObject = {
    foo: "bar",
    func: function() {
        var self = this;
        console.log(this.foo);  
        console.log(self.foo);  
        (function() {
            console.log(this.foo);  
            console.log(self.foo);  
        }());
    }
};
myObject.func();
```

输出结果：bar bar undefined bar

1. 首先func是由myObject调用的，this指向myObject。又因为var self = this;所以self指向myObject。
2. 这个立即执行匿名函数表达式是由window调用的，this指向window 。立即执行匿名函数的作用域处于myObject.func的作用域中，在这个作用域找不到self变量，沿着作用域链向上查找self变量，找到了指向 myObject对象的self。

### 6.对象中自执行函数与匿名函数

```
window.number = 2;
var obj = {
 number: 3,
 db1: (function(){
   console.log(this);
   this.number *= 4;
   return function(){
     console.log(this);
     this.number *= 5;
   }
 })()
}
var db1 = obj.db1;
db1();
obj.db1();
console.log(obj.number);     // 15
console.log(window.number);  // 40
```

1. 执行db1()时，this指向全局作用域，所以window.number * 4 = 8，然后执行匿名函数， 所以window.number * 5 = 40；
2. 执行obj.db1();时，this指向obj对象，执行匿名函数，所以obj.numer * 5 = 15。

### 7.arguments

```
var length = 10;
function fn() {
    console.log(this.length);
}
 
var obj = {
  length: 5,
  method: function(fn) {
    fn();
    arguments[0]();
  }
};
 
obj.method(fn, 1);
```

输出结果： 10 2 

1. 第一次执行fn()，this指向window对象，输出10。
2. 第二次执行arguments[0]()，相当于arguments调用方法，this指向arguments，而这里传了两个参数，故输出arguments长度为2。

### 8.对象的方法中调用方法

```
var a = 1;
function printA(){
  console.log(this.a);
}
var obj={
  a:2,
  foo:printA,
  bar:function(){
    printA();
  }
}

obj.foo(); // 2
obj.bar(); // 1
var foo = obj.foo;
foo(); // 1
```

输出结果： 2 1 1 

1. obj.foo()，foo 的this指向obj对象，所以a会输出2；
2. obj.bar()，printA在bar方法中执行，所以此时printA的this指向的是window，所以会输出1；
3. foo()，foo是在全局对象中执行的，所以其this指向的是window，所以会输出1；

### 9.匿名函数

```
var x = 3;
var y = 4;
var obj = {
    x: 1,
    y: 6,
    getX: function() {
        var x = 5;
        return function() {
            return this.x;
        }();
    },
    getY: function() {
        var y = 7;
        return this.y;
    }
}
console.log(obj.getX()) // 3
console.log(obj.getY()) // 6
```

输出结果：3  6

1. 我们知道，匿名函数的this是指向全局对象的，所以this指向window，会打印出3；
2. getY是由obj调用的，所以其this指向的是obj对象，会打印出6。