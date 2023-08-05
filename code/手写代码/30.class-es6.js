class Employee {
    constructor(name, dept) {
        this.name = name
        this.dept = dept
        this.age = 18
    }
    // 静态方法
    static fun() {
        console.log('static')
    }
    getName() {
        console.log(this.name)
    }
}

Employee.fun() // static

const well = new Employee('well', 'dev')
console.log(well) // Employee { name: 'well', dept: 'dev', age: 18 }
// well.fun() // well.fun is not a function
well.getName()

// extends继承父类创建子类
class Manager extends Employee {
    constructor(name, dept, reports) {
        super(name, dept)
        this.reports = reports
    }
}
const wellManager = new Manager('wellManager', 'dev', 1)
Manager.fun() // static
console.log(wellManager) // Manager { name: 'wellManager', dept: 'dev', age: 18, reports: 1 }
wellManager.getName() // wellManager
