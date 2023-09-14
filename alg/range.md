## 汇总区间
### 题目
给定一个  无重复元素 的 有序 整数数组 nums 。

返回 恰好覆盖数组中所有数字 的 最小有序 区间范围列表 。也就是说，nums 的每个元素都恰好被某个区间范围所覆盖，并且不存在属于某个范围但不属于 nums 的数字 x 。

列表中的每个区间范围 [a,b] 应该按如下格式输出：

"a->b" ，如果 a != b
"a" ，如果 a == b
```
输入：nums = [0,1,2,4,5,7]
输出：["0->2","4->5","7"]
解释：区间范围是：
[0,2] --> "0->2"
[4,5] --> "4->5"
[7,7] --> "7"

输入：nums = [0,2,3,4,6,8,9]
输出：["0","2->4","6","8->9"]
解释：区间范围是：
[0,0] --> "0"
[2,4] --> "2->4"
[6,6] --> "6"
[8,9] --> "8->
```
### 思想
- 从数组位置 0 出发，向右遍历，每次遇到相邻元素之间差值大于1时，就找到了另一个区间
- 维护下标 low 和 high 分别记录区间的起点和终点
- 当 low < higt 时，区间字符串表示 `low->hight`
- 当 low = higt 时，区间字符串表示 `low`
```
var summaryRanges = function(nums) {
    const ret = []
    let i = 0
    const length = nums.length
    while(i<length) {
        const low = i
        i++
        while(i<length && nums[i] === nums[i-1] + 1) {
            i++
        }
        const high = i - 1
        if (low < high) {
            ret.push(`${nums[low]}->${nums[high]}`)
        } else {
            ret.push(`${nums[low]}`)
        }
    }
    return ret
};
```

## 合并区间
### 题目
以数组 intervals 表示若干个区间的集合，其中单个区间为 intervals[i] = [starti, endi] 。请你合并所有重叠的区间，并返回 一个不重叠的区间数组，该数组需恰好覆盖输入中的所有区间 。
```
输入：intervals = [[1,3],[2,6],[8,10],[15,18]]
输出：[[1,6],[8,10],[15,18]]
解释：区间 [1,3] 和 [2,6] 重叠, 将它们合并为 [1,6]

输入：intervals = [[1,4],[4,5]]
输出：[[1,5]]
解释：区间 [1,4] 和 [4,5] 可被视为重叠区间。
```
### 思想
```
var merge = function(intervals) {
    // 升序排序，保证前一项的[0] <= 后一项的[0]
    intervals.sort((intervals1, intervals2) => intervals1[0] - intervals2[0])
    const merged = []
    for (let i=0; i<intervals.length; i++) {
        let [L, R] = intervals[i]
        if (merged.length === 0 || merged[merged.length-1][1] < L) {
            // 当前没有合并过或者合并数组的大值小于item的小值，则属于一个新的区间
            merged.push([L, R])
        } else {
            // 属于同一个区间，更新区间的大值
            merged[merged.length - 1][1] = Math.max(merged[merged.length-1][1], R)
        }
    }
    return merged
};
```

## 插入区间
### 题目
给你一个 无重叠的 ，按照区间起始端点排序的区间列表。

在列表中插入一个新的区间，你需要确保列表中的区间仍然有序且不重叠（如果有必要的话，可以合并区间）。
```
输入：intervals = [[1,3],[6,9]], newInterval = [2,5]
输出：[[1,5],[6,9]]

输入：intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]
输出：[[1,2],[3,10],[12,16]]
解释：这是因为新的区间 [4,8] 与 [3,5],[6,7],[8,10] 重叠。

输入：intervals = [], newInterval = [5,7]
输出：[[5,7]]

输入：intervals = [[1,5]], newInterval = [2,3]
输出：[[1,5]]

输入：intervals = [[1,5]], newInterval = [2,7]
输出：[[1,7]]
```
### 思想
- 合并区间
  - 把新的区间加到到老区间中，就可以直接用上面合并区间的解法
```
var insert = function(intervals, newInterval) {
    const list = [...intervals, newInterval].sort((interval1, interval2) => interval1[0] - interval2[0])
    const merged = []
    for (let i=0; i<list.length; i++) {
        const [L, R] = list[i]
        if (merged.length === 0 || merged[merged.length-1][1] < L) {
            merged.push([L, R])
        } else {
            merged[merged.length-1][1] = Math.max(merged[merged.length-1][1], R)
        }
    }
    return merged
};
```
- 模拟
对于区间`S1=[l1,r1]`和区间`S2=[l2,r2]`，如果他们之间没有重叠（没有交集），此时有两种情况
  - S1在S2的左侧，此时 `r1 < l2`
  - S1在S2的右侧，此时 `r2 < l1`
  - 两者没满足，S1与S2有一定有交集，交集为[max(l1,l2), min(r1, r2)],并集为[min(l1,l2),max(r1,r2)]
```
var insert = function(intervals, newInterval) {
  let left = newInterval[0];
  let right = newInterval[1];
  let placed = false;
  let ansList = [];
  
  for (let interval of intervals) {
    if (interval[0] > right) {
      // 在插入区间的右侧且无交集
      if (!placed) {
        ansList.push([left, right]);
        placed = true;
      }
      ansList.push(interval);
    } else if (interval[1] < left) {
      // 在插入区间的左侧且无交集
      ansList.push(interval);
    } else {
      // 与插入区间有交集，计算它们的并集
      left = Math.min(left, interval[0]);
      right = Math.max(right, interval[1]);
    }
  }
  
  if (!placed) {
    ansList.push([left, right]);
  }
  
  return ansList;
};
```