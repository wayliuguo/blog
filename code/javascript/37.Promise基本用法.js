// new Promise() promise.then() promise.catch
function getData (success) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (success) {
                resolve(1)
            } else {
                reject(0)
            }
        })
    })
}
getData(1).then((res) => console.log('promise.then()>>>', res)) // promise.then()>>> 1
getData().then((res) => console.log(res)).catch(err => console.log('promise.catch()>>>', err)) // promise.catch()>>> 0
// promise.all()、 promise.race()
let promise1 = new Promise((resolve,reject)=>{
	setTimeout(()=>{
       resolve(1);
	},2000)
});
let promise2 = new Promise((resolve,reject)=>{
	setTimeout(()=>{
       resolve(2);
	},1000)
});
let promise3 = new Promise((resolve,reject)=>{
	setTimeout(()=>{
       resolve(3);
	},3000)
});
Promise.all([promise1,promise2,promise3]).then(res=>{
    console.log('promise.all>>>', res); // promise.all>>> [ 1, 2, 3 ]
})
Promise.race([promise1,promise2,promise3]).then(res=>{
    console.log('promise.race>>>', res); // promise.race>>> 2
})
