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
// const workerService = require("../work_job/worker")


let lastestBlockNum		//最新区块高度
let currBlockHeight		//当前区块高度

function getLastestBlockNum() {
	return lastestBlockNum
}

function getCurrBlockHeight() {
	return currBlockHeight
}

async function setLastestBlockNum(bn) {
	if (bn == undefined) {
		console.log("---setLastestBlockNum---bn undefined, time:", new Date().toLocaleString())
		return
	}
    lastestBlockNum = bn
    await BlockDetailModel.findOneAndUpdate(
        {detail: 'detail'},
        {sub_block_height: lastestBlockNum, update_time: new Date() })
}

async function setCurrBlockHeight(bn) {
    if (bn == undefined) {
        console.log("---setCurrBlockHeight---bn undefined, time:", new Date().toLocaleString())
        return
    }
    currBlockHeight = bn
    await BlockDetailModel.findOneAndUpdate(
        {detail: 'detail'},
        {block_height: currBlockHeight, update_time: new Date() })
}

/**
 * 初始化最新 lastestBlockNum 和 detail表
 * */
exports.initStore = async function () {
    //初始化表
	let detail = await BlockDetailModel.findOne({ detail: 'detail'})
	if(!detail){
		let block_detail = new BlockDetailModel({
			block_height: 0,
			detail: 'detail',
			sub_block_height : 0,
			update_time : new Date()
		})
        setLastestBlockNum(0)
		await block_detail.save()

	} else {
		setLastestBlockNum( detail.sub_block_height )
		setCurrBlockHeight(detail.block_height)
	}


}


exports.subscribeToBlocks = async function (ctx, next) {
	//监听区块信息
	await bcx.subscribeToBlocks({
		callback: async result => {
			console.log("-subscribeToBlocks()--111---接收到订阅推送 新块blockNum:", result.data.block_height, ",time:", new Date().toLocaleString())

			if (result.data) {		//订阅推送过来 刚产生的新块
                console.log("-subscribeToBlocks()---222---新块高度写入Detail blockNum:", result.data.block_height, ",time:", new Date().toLocaleString())

				//更新detail表 最新区块
                await setLastestBlockNum(result.data.block_height)
			}
		}
	})

}


/**
 * 同步链上新一批区块到db
 * */
exports.syncBlockData = async function () {
    let ctx = {}
	let next = {}
    let sub_block_height = getLastestBlockNum()
    ctx.block_height = sub_block_height
    console.log("查detail最新高度---11111 sub_block_height:", sub_block_height, ",time:", new Date().toLocaleString())

    if (ctx.block_height) {

        if (!sub_block_height) {	//BlockDetail 没数据
            let blocks = await blockModel
                .aggregate([{
                    $group: {
                        _id: 'block_height',
                        max_value: {
                            $max: '$block_height',
                        },
                    },
                }, ])
                .exec()
            let block_detail = new BlockDetailModel({
                block_height: (blocks && blocks[0] && blocks[0].max_value) || 0,
                detail: 'detail',
            })
            await block_detail.save()
        } else {

            //重复查BlockDetail表----待处理
            let currBlockHeight = getCurrBlockHeight()
            console.log("查detail最新高度---222 sub_block_height:", sub_block_height, ",time:", new Date().toLocaleString())
             if (!currBlockHeight) {  //结束本次同步
                return
            } else {
                ctx.blcok_length = currBlockHeight
            }
            if (ctx.blcok_length < ctx.block_height) {
                for (var i = ctx.blcok_length; i < ctx.block_height; i++) {			//此处换成 多线程并发
                    await exports.Block(ctx, next, 1 + i)	//同步下一个区块

                    // let worker = workerService.getWork()
                    // let obj = {"ctx":ctx, "next":ctx, "blockNum": i+1 }
                    // worker.postMessage(obj)
                }
            }
        }
    }
    setTimeout(exports.syncBlockData, 3000, "sync_block_job")	//同步完一轮后
}

//入库block区块
exports.Block = async function (ctx, next, length) {
    console.log("入库Block(..)---11111 bN:", length,",最新bN:", ctx.block_height, ",time:", new Date().toLocaleString())
    let index = length
	if (index < ctx.block_height) {
		await bcx
			.queryBlock({block: index})
			.then(async result => {
                console.log("入库Block(..)---222 获取到区块bN:", index, ",code:",result.code,",time:", new Date().toLocaleString())
				if (result.code === 1) {
					await saveData(result, ctx, next, index)
				} else {
                    console.log("入库Block(..)---333 获取区块失败 bN:", index, ",time:", new Date().toLocaleString())
					await exports.Block(ctx, next, index)
				}
			})
			.catch(async err => {
				console.log("入库Block(..)---444 获取区块err,bN:", index, ",time:", new Date().toLocaleString(),",err:", err.toString())
				await exports.Block(ctx, next, index)
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
			block: i,
		})
		.then(async result => {
			if (result.data) {
				await saveData(result, ctx, next, i)
			}
		})
		.catch(async err => {
			let fail = new FailSchema()
			await fail.save({
				index: index,
			})
			// await failBlock(ctx, next, i)
		})
}

//保存数据
async function saveData(result, ctx, next, blockNum) {
    console.log("saveData()-0000 进入--bN:", blockNum, ",time:", new Date().toLocaleString())
	let block = await blockModel
		.findOne({
			block_height: result.data && result.data.block_height,
		})
		.hint({
			block_height: 1,
			block_id: 1,
			timestamp: 1,
		})
		.exec()
	console.log("saveData()-1111入库前检查区块是否存在,bN:", blockNum, ",time:", new Date().toLocaleString())
	if (block) {
        console.log("saveData()-1111.555--入库前检查  区块已存在,bN:", blockNum, ",time:", new Date().toLocaleString())
        return
    }

	let transactions = [],
		trx_ids = []
	if (result.data && result.data.transactions && result.data.transactions.length) {	//区块中有交易
		result.data.transactions.forEach(async item => {		//此处考虑交易批量入库
			transactions.push({
				trx_id: item.trx_id,
			})
			item.block = blockNum
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
							type: 'account_create',
						}, ]
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
								type: 'transfer_from',
							})
						}
						if (parse_ops.to) {
							users.push({
								id: parse_ops.to,
								type: 'transfer_to',
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
        console.log("saveData()-2222交易入库-blockNum:", blockNum, ",交易数量:", result.data.transactions.length, ",time:",  new Date().toLocaleString())

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
		let block = new blockModel(result.data)
        block.create_time = new Date()
        console.log("saveData()-2222.5555入库--前-----blockNum:", blockNum, "time:",  new Date().toLocaleString())
        await block.save()
        console.log("saveData()-3333入库成功-blockNum:", blockNum, "time:",  new Date().toLocaleString())
		await setCurrBlockHeight(blockNum)
		console.log("saveData()-44444更新detail blockNum:", blockNum, "time:",  new Date().toLocaleString())
		//区块去重
		// await query.subscribeToBlocks(ctx, next)
	} else {
		exports.failBlock(ctx, next, blockNum)
	}
}
// }

//用户表
exports.setUser = async function (ctx, next) {
	await ctx.users.map(async (item, index) => {
		let user = await UserModel.findOne({
			user_name: item.id,
		}).exec()
		if (!user) {
			await bcx.queryAccountInfo({
				account: item.id,
				callback: async result => {
					if (result.locked || !result.data || !result.data.account) {} else {
						//用户名作索引用
						result.data.user_name = result.data.account.name
						result.data.trx_ids = [{
							trx_id: ctx.trx_id,
						}, ]
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
							},
						})
						const user = new UserModel(result.data)
						await user.save()
					}
				},
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