var fly = require("../node-index")
var FormData = require('form-data');
var form = new FormData();
var log = console.log;
var fs = require("fs")
//设置超时
fly.config.timeout = 5000;

//设置基地址
fly.config.baseURL = "http://localhost:63341/Fly"

//get请求
// fly.get("package.json",{wd:"xxx"}).then(d=>{
//     console.log("get请求成功",d.data)
// }).catch((e)=>{
//     log(`get请求失败，错误码：${e.status}, 错误信息：${e.message}`);
// })


// 文件下载
// fly.download("http://localhost:8089/static/v.png", "./v.png")
//     .then(d => {
//         log(d)
//     }).catch(log)

// var formData = {
//     name:"v.png",
//     avatar: fs.createReadStream('./v.png'),
//     resume: fs.createReadStream('./resume.docx'),
//     attachments:[
//         fs.createReadStream('./file1.zip'),
//         fs.createReadStream('./file2.zip')
//     ]
// }

var formData={
    name:"xxx",
    file: fs.createReadStream('./v.png'),
}
// fly.upload("http://localhost/ds/test", formData)
//     .then(d => {
//         log(d)
//     }).catch(log)


fly.download("http://localhost:8089/static/v.png","./vxx.png");

// fly.request("package.json",null,{
//     formData:{xx:5}
// }).then(d=>{
//     log(d)
// })

//
// //post请求
// fly.post("http://localhost/ds/test",{xx:"xxx",aa:{bb:5}}).then(d=>{
//     console.log("post请求成功",d.data)
// }).catch((e)=>{
//     log(`post请求失败，错误码：${e.status}, 错误信息：${e.message}`);
// })