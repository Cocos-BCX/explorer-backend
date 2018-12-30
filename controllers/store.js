const bcx = require('../config/bcx.config.js')
const blockModel = require('../models/block.js')
const transModel = require('../models/trans.js')
const UserModel = require('../models/user.js')
const BlockDetailModel = require('../models/block.detail.js')
const transferModel = require('../models/transfer.js')
const FailSchema = require('../models/fail')
const query = require('./query.js')
const moment = require('moment')
const EventEmitter = require('events').EventEmitter
//监听区块信息

exports.subscribeToBlocks = async function (ctx, next) {
    ctx.locked = false
    let block_height = await bcx.subscribeToBlocks({
        callback: async result => {
            if (result.data) {
                return result.data.block_height
            }
        }
    })
    ctx.block_height = 880088;
    if (ctx.block_height) {
        let detail = await BlockDetailModel.findOne({
            detail: 'detail'
        })
        if (!detail) {
            let blocks = await blockModel
                .aggregate([{
                    $group: {
                        _id: 'block_height',
                        max_value: {
                            $max: '$block_height'
                        }
                    }
                }])
                .exec()
            let block_detail = new BlockDetailModel({
                block_height: blocks && blocks[0] && blocks[0].max_value || 0,
                detail: 'detail'
            });
            await block_detail.save();
        } else {
            let blocks = await BlockDetailModel.findOne({
                detail: 'detail'
            });
            if (!blocks) {
                ctx.blcok_length = 0
            } else {
                ctx.blcok_length = blocks.block_height;
            }
            if (ctx.blcok_length < ctx.block_height) {
                for (var i = ctx.blcok_length; i < ctx.block_height; i++) {
                    await BlockDetailModel.findOneAndUpdate({
                        detail: 'detail'
                    }, {
                        block_height: i + 1
                    })
                    await exports.Block(ctx, next, 1 + i)
                }
            }
        }

    }
}

//入库block区块
exports.Block = async function (ctx, next, length) {
    let index = length
    if (index < ctx.block_height) {
        await bcx
            .queryBlock({
                block: index
            })
            .then(async result => {
                if (result.code === 1) {
                    await saveData(result, ctx, next, index)
                } else {
                    await exports.Block(ctx, next, length)
                }
            })
            .catch(async err => {
                await exports.Block(ctx, next, length)
            })
    }

    // for (let i = ctx.blcok_length + 1; i < ctx.block_height; i++) {
    //     (async (i) => {
    //     timer = setInterval(async () => {
    //         await bcx
    //             .queryBlock({
    //                 block: i
    //             })
    //             .then(async result => {
    //                 if (result.code === 1) {
    //                     await saveData(result, ctx, next, i)
    //                 } else {
    //                     let fail = new FailSchema()
    //                     await fail.save({
    //                         index: i
    //                     })
    //                 }
    //             })
    //             .catch(async err => {
    //                 await failBlock(ctx, next, i)
    //             })
    //     }, 1)
    //     })(i);
    // }
}

//处理请求失败的
async function failBlock(ctx, next, i) {
    await bcx
        .queryBlock({
            block: i
        })
        .then(async result => {
            if (result.data) {
                await saveData(result, ctx, next, i)
            }
        })
        .catch(async err => {
            let fail = new FailSchema()
            await fail.save({
                index: index
            })
            // await failBlock(ctx, next, i)
        })
}

//保存数据
async function saveData(result, ctx, next, i) {
    // let block = await blockModel
    //     .findOne({
    //         block_height: result.data && result.data.block_height
    //     })
    //     .hint({
    //         block_height: 1,
    //         block_id: 1,
    //         timestamp: 1
    //     })
    //     .exec()
    // if (!block) {
    //查询交易
    // await BlockDetailModel.findOneAndUpdate({
    //     detail: 'detail'
    // }, {
    //     block_height: i + 1
    // })
    // exports.Block(ctx, next, i + 1)
    let transactions = [],
        trx_ids = []
    if (
        result.data &&
        result.data.transactions &&
        result.data.transactions.length
    ) {
        result.data.transactions.forEach(async item => {
            transactions.push({
                trx_id: item.trx_id
            })
            item.block = i
            let trans = new transModel(item)
            await trans.save()
            //交易去重
            // await query.subscribeToTrans(ctx, next)
            if (item.parse_ops && item.parse_ops.length) {
                ctx.trx_id = trans.trx_id
                item.parse_ops.forEach(async option => {
                    let users = []
                    let parse_ops = option && option.parse_operations
                    //新建账户
                    if (option.type === 'account_create') {
                        users = [{
                            id: parse_ops.new_account,
                            type: 'account_create'
                        }]
                        ctx.users = users
                        //用户创建时间
                        ctx.create_time = item.expiration
                        await exports.setUser(ctx, next)
                    }
                    //交易
                    if (option.type === 'transfer') {
                        // users = [...new Set([parse_ops.from || '', parse_ops.to || ''])].filter(Boolean);
                        if (parse_ops.from) {
                            users.push({
                                id: parse_ops.from,
                                type: 'transfer_from'
                            })
                        }
                        if (parse_ops.to) {
                            users.push({
                                id: parse_ops.to,
                                type: 'transfer_to'
                            })
                        }
                        option.trx_id = trans.trx_id
                        let transfer = new transferModel(option)
                        await transfer.save()
                        //转账去重
                        // await query.subscribeToTransfer(ctx, next)
                        // ctx.users = users
                        // await exports.setUser(ctx, next)
                    }
                })
            }
        })
    }
    if (result.data) {
        // result.data.transactions = transactions || []
        // transactions = []
        // if (result.data.witness) {
        //     ctx.users = [{
        //         id: result.data.witness,
        //         type: 'witness'
        //     }]
        //     await exports.setUser(ctx, next)
        // }
        const block = new blockModel(result.data)
        await block.save()
        //区块去重
        // await query.subscribeToBlocks(ctx, next)
    } else {
        exports.failBlock(ctx, next, i)
    }
}
// }

//用户表
exports.setUser = async function (ctx, next) {
    await ctx.users.map(async (item, index) => {
        console.log(item.id);
        let user = await UserModel.findOne({
            user_name: item.id
        }).exec()
        if (!user) {
            await bcx.queryUserInfo({
                account: item.id,
                callback: async result => {
                    if (result.locked || !result.data || !result.data.account) {

                    } else {
                        //用户名作索引用
                        result.data.user_name = result.data.account.name
                        result.data.trx_ids = [{
                            trx_id: ctx.trx_id
                        }]
                        //数组的话最后清除
                        if (index === ctx.users.length - 1) {
                            ctx.trx_id = null
                        }
                        //有时间就存上
                        if (ctx.create_time) {
                            result.data.create_time = moment(ctx.create_time)
                            ctx.create_time = null
                        }
                        // result.data.trans_counts = {
                        //     from_num: 0,
                        //     to_num: 0
                        // }
                        // if (item.type === 'transfer_from') {
                        //     result.data.trans_counts.from_num++
                        // }
                        // if (item.type === 'transfer_to') {
                        //     result.data.trans_counts.to_num++
                        // }
                        //查询用户余额
                        await bcx.queryAccountAllBalances({
                            unit: '',
                            account: item.id,
                            callback: async count => {
                                result.data.counts = count.data
                            }
                        })
                        const user = new UserModel(result.data)
                        await user.save()
                    }
                }
            })
        }
        // } else {
        //     await bcx.queryUserOperations({
        //         account: user.id,
        //         limit: 0,
        //         callback: async operas => {}
        //     })
        //     await bcx.queryAccountAllBalances({
        //         unit: '',
        //         account: user.user_name,
        //         callback: async count => {
        //             user.counts = count.data
        //         }
        //     })
        //     // if (item.type === 'transfer_from') {
        //     //     user.trans_counts.from_num++
        //     // }
        //     // if (item.type === 'transfer_to') {
        //     //     user.trans_counts.to_num++
        //     // }
        //     if (ctx.trx_id) {
        //         user.trx_ids.push({
        //             trx_id: ctx.trx_id
        //         })
        //     }
        //     ctx.trx_id = null
        //     await UserModel.findOneAndUpdate({
        //         user_name: user.user_name
        //     }, {
        //         counts: user.counts,
        //     }).exec()
        // }
    })
}