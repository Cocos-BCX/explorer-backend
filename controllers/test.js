const bcx = require('../config/bcx.config');
const http = require("http");
const url = require("url");
const querystring = require('querystring');
exports.login = async function (ctx, next) {
    await bcx.passwordLogin({
        account: "tom0002", //query.loginUserName,
        password: "12345678"
    }).then(res => {

    });
    var pathname = url.parse(ctx.request.url);
    var query = querystring.parse(pathname.query);
    // if (pathname.pathname === '/trxToken') {
    //访问连接如http://192.168.27.233:8888/trxToken?to=test01&token=1
    await bcx.transferAsset({
        to: "test2", //query.to,
        amount: 1, //query.token,
        assetId: "COCOS",
        memo: ""
    }).then(result => {
        ctx.trxData = result.trxData;
        // ctx.body = JSON.stringify(result);
    })
    // }
    await bcx.subscribeToRpcConnectionStatus({
        callback: status => {
            console.info("rpc status", status);
            if (status == "closed") {
                server.close();
            }
        }
    })
    await next();
}


exports.data = async function (ctx, next) {
    var pathname = url.parse(ctx.request.url);
    var query = querystring.parse(pathname.query);
    if (pathname.pathname === '/trxToken') {
        //访问连接如http://192.168.27.233:8888/trxToken?to=test01&token=1
        await bcx.transferAsset({
            to: "test2", //query.to,
            amount: 1, //query.token,
            assetId: "COCOS",
            memo: ""
        }).then(result => {
            console.info('bcx transferAsset+++++++++++++++', result);
            ctx.body = JSON.stringify(result);
        })
    }
    await bcx.subscribeToRpcConnectionStatus({
        callback: status => {
            console.info("rpc status", status);
            if (status == "closed") {
                server.close();
            }
        }
    })
    await bcx.subscribeToChainTranscation({
        callback: function (res) {
            console.log("subscribeToChainTranscation++++++++++++++++ res", res);
            ctx.body = JSON.stringify(res);
            if (res.status == 1 && res.data.type == "account_create") {
                bcx.transferAsset({
                    to: res.data.parseOperations.new_account, //query.to,
                    amount: 100, //query.token,
                    assetId: "COCOS",
                    memo: "新账户注册送100(node服务)"
                }).then(result => {
                    ctx.body = JSON.stringify(result);
                    console.info('bcx transferAsset', result);
                })
            }
        }
    })
}