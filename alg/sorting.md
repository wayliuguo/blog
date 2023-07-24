## 冒泡排序

- 从列表的第一个元素开始，依次比较相邻的两个元素，交换后冒泡到后面
- 由于是每次取最大，所以后面取得的最大需要在之前的最大前面

```
function bubbleSort(arr) {
    for (let i=0; i<arr.length; i++) {
        // 提前退出冒泡循环的标识位
        let flag = false
        for(let j=0; j<arr.length-i-1; j++) {
            if (arr[j] > arr[j+1]) {
                [arr[j], arr[j+1]] = [arr[j+1], arr[j]]
                flag = true
            }
        }
        if (!flag) break
    }
}

let arr = [1, 3, 2, 5, 4]
bubbleSort(arr)
console.log(arr) // [1, 2, 3, 4, 5]
```

## 选择排序

升序：每次从列表中取出一个元素，记录其下标`index`，把该元素后的值与其两两比较，每一次比较更新最大元素所在下标`index`，最后把index与遍历取出元素比较更新。

```
function selectionSort (arr) {
    for (let i=0; i<arr.length; i++) {
        let index = i
        for (let j=i+1; j<arr.length;j++) {
            if (arr[index] > arr[j]) {
                index = j
            }
        }
        if (index !== i) {
            [arr[index],arr[i]] = [arr[i], arr[index]]
        }
    }
    return arr
}

console.log(selectionSort([1, 3, 2, 5, 4]))
```

## 归并排序

- 使用分治策略，将对象分裂成一个个小数组，只要数组长度不等于0，就继续分裂
- 利用递归将分裂的数组合并，利用双指针，每次保证左边的小于右边的，不断递归合并即可

```
function mergeSort (arr) {
    if (arr.length === 1) return arr
    let middle = Math.floor(arr.length / 2)
    let left = []
    let right = []
    for (let i=0; i<arr.length; i++) {
        if (i<middle) {
            left.push(arr[i])
        } else {
            right.push(arr[i])
        }
    }
    return merge(mergeSort(left), mergeSort(right))
}

function merge (left, right) {
    let result = []
    let l = 0
    let r = 0
    while(l<left.length && r<right.length) {
        if (left[l] < right[r]) {
            result.push(left[l])
            l++
        } else {
            result.push(right[r])
            r++
        }
    }
    while(l<left.length) {
        result.push(left[l])
        l++
    }
    while(r<right.length) {
        result.push(right[r])
        r++
    }
    return result
}

console.log(mergeSort([1, 3, 2, 5, 4]))
```