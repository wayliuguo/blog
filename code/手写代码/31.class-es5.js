function Employee(name, dept) {
    this.name = name
    this.dept = dept
    this.age = 18
}
// 静态方法
Employee.fun = function () {
    console.log('static')
}
Employee.prototype.getName = function () {
    console.log(this.name)
}
const well = new Employee('well', 'dev')
console.log(well) // Employee { name: 'well', dept: 'dev', age: 18 }
Employee.fun() // static
// well.fun() // Employee.fun is not a function
well.getName()

// 继承
function Manager(name, dept, reports) {
    // 调用 Employee 函数，并把this执行Manger，所以完成了
    // this.name = name
    // this.dept = dept
    Employee.call(this, name, dept)
    this.reports = reports
}

const wellManager = new Manager('wellManager', 'dev', 1)
// Manager.fun() // Manager.fun is not a function
console.log(wellManager) // Manager { name: 'wellManager', dept: 'dev', age: 18, reports: 1 }
// wellManager.getName() // wellManager.getName is not a function
