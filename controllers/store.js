const bcx = require('../config/bcx.config.js')
const blockModel = require('../models/block.js')
const transModel = require('../models/trans.js')
const UserModel = require('../models/user.js')
const BlockDetailModel = require('../models/block.detail.js')
const transferModel = require('../models/transfer.js')
const butBlockModel = require('../models/but_block.js')
const FailSchema = require('../models/fail')
const query = require('./query.js')
const moment = require('moment')
const EventEmitter = require('events').EventEmitter
// const workerService = require("../work_job/worker")

let lastestBlockNum		//最新区块高度
let currBlockHeight	= 0	//当前区块高度
let nodeErrCount = 0	//用于累计节点连续 异常次数，和 切换节点

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

	console.log("----initStore()--最新区块高度:", getLastestBlockNum(), ",当前区块高度:", getCurrBlockHeight())
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
			} else {
				console.log("---订阅返回异常，result:", result )
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
    console.log("-----syncBlockData()--查detail最新高度---11111 ----currBlockHeight:",  getCurrBlockHeight() ," lastestBlockNum:", sub_block_height, ",time:", new Date().toLocaleString())
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
			await toFetchBlock(ctx, next)
        } else {
			await toFetchBlock(ctx, next)
        }
    }
    setTimeout(exports.syncBlockData, 3000, "sync_block_job")	//同步完一轮后
}

async function toFetchBlock(ctx, next) {
	//重复查BlockDetail表----待处理
	let currBlockHeight = getCurrBlockHeight()
	console.log("查detail最新高度---222 sub_block_height:", ctx.block_height, ",time:", new Date().toLocaleString())
	if (!currBlockHeight) {  //结束本次同步
		console.log("---syncBlockData()--currBlockHeight:为0")
		// return
	}
	ctx.blcok_length = currBlockHeight

	if ((ctx.block_height > ctx.blcok_length) && (ctx.block_height - ctx.blcok_length < 10)) {
		await fetchBlock(ctx, next)
	} else {
		let num = (ctx.block_height - ctx.blcok_length) / 40
		forkWork(ctx, next,0, num)
		if (num >= 1) {
			forkWork(ctx, next,1, num)
			forkWork(ctx, next,2, num)
			forkWork(ctx, next,3, num)
		}
	}
}

async function forkWork(ctx, next, v, num) {

	let startNum = v * num
	let endNum = (v + 1) * num
	console.log("----------------------------------------------------------------")
	console.log("----------------------------------------------------------------:", startNum)
	console.log("----------------------------------------------------------------:", endNum)
	console.log("----------------------------------------------------------------")
	for (var i = startNum; i <= endNum; i ++){
		let ctxTmp = {}
		ctxTmp.block_height = ctx.blcok_length + (i + 1) * 10
		if (ctxTmp.block_height > ctx.block_height) {
			ctxTmp.block_height = ctx.block_height
		}
		ctxTmp.blcok_length = ctx.blcok_length + i * 10
		await fetchBlock(ctxTmp, next)
	}
}

async function fetchBlock(ctx, next) {
	var resultBlocks = []
	for (var i = ctx.blcok_length; i < ctx.block_height; i++) {
		await exports.Block(ctx, next, 1 + i, resultBlocks)	//同步下一个区块
	}
	await saveData(resultBlocks, ctx, next, ctx.blcok_length)
}

//入库block区块
exports.Block = async function (ctx, next, length, resultBlocks) {		//length:本次同步目标块
    console.log("入库Block(..)---11111 bN:", length,",最新bN:", ctx.block_height, ",time:", new Date().toLocaleString())
    let index = length
	if (index <= ctx.block_height) {
		await bcx
			.queryBlock({block: index})
			.then(async result => {
                console.log("入库Block(..)---222 获取到区块bN:", index, ",code:",result.code,",time:", new Date().toLocaleString())
				if (result.code === 1) {
					resultBlocks.push(result.data)
					resetNodeErrCount()
				} else {
                    console.log("入库Block(..)---333 获取区块--失败 bN:", index, ",result.code:" + result.code + ",time:", new Date().toLocaleString())
                    addnodeErrCount()
					await exports.Block(ctx, next, index)
				}
			})
			.catch(async err => {
				console.log("入库Block(..)---444.1 获取区块err,bN:", index, ",time:", new Date().toLocaleString(),",err:", err)
                addnodeErrCount()
				await failBlock(index)
			})
	}
}

//处理请求失败的   记录出错blockNum ，跳过
async function failBlock(blockNum) {

    console.log("----failBlock()---11111--获取区块失败-----blockNum:", blockNum, "time:", new Date().toLocaleString())

    let butBlockdb = await butBlockModel.findOne({ block_height: blockNum})
	if (butBlockdb && butBlockdb.block_height == blockNum ) {
        console.log("----failBlock()---22222--blockNum有记录过，跳过-----blockNum:", blockNum, "time:", new Date().toLocaleString())
		return
	}

	butBlock = new butBlockModel()
    butBlock.block_height = blockNum
    butBlock.create_time = new Date()
	await butBlock.save()
    console.log("----failBlock()---33333--已记录下 blockNum:", blockNum, "time:", new Date().toLocaleString())
}

//检查区块是否存在
async function existBlock(blocks, blockNum){

	for (var i = 0; i < blocks.length; i++) {
		let block = await blockModel
			.findOne({
				block_height: blocks[i] && blocks[i].block_height,
			})
			.hint({
				block_height: 1,
				block_id: 1,
				timestamp: 1,
			})
			.exec()
		console.log("saveData()-1111入库前检查区块是否存在,bN:", (blockNum + i), ",time:", new Date().toLocaleString())
		if (block) {
			console.log("saveData()-1111.555--入库前检查  区块已存在,bN:", (blockNum + i), ",time:", new Date().toLocaleString())
			blocks.splice(i, 1)
			i--
		}
	}
}

//保存交易
async function saveTransactions(blocks, ctx, next, blockNum) {
	let transactions = [],
		trx_ids = [],
		trans = [],
		transfers = [],
		createUsers = [],
		realUsers = []
	if (blocks && blocks.length > 0) {

		for (var i = 0; i < blocks.length; i++) {
			if (blocks[i].transactions && blocks[i].transactions.length > 0) {	//区块中有交易
				blocks[i].transactions.forEach(async item => {
					transactions.push({
						trx_id: item.trx_id,
					})
					item.block = blockNum
					trans.push(item)

					//交易去重
					// await query.subscribeToTrans(ctx, next)
					if (item.parse_ops && item.parse_ops.length) {
						ctx.trx_id = item.trx_id
						item.parse_ops.forEach(async option => {
							let users = []
							let parse_ops = option && option.parse_operations
							//新建账户
							if (option.type === 'account_create') {
								users = [{
									id: parse_ops.new_account,
									type: 'account_create',
								},]
								ctx.users = users
								//用户创建时间
								ctx.create_time = item.expiration
								createUsers.push(ctx)
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
								option.trx_id = item.trx_id
								transfers.push(option)
							}
						})
					}
				})
			}
		}

		if (trans && trans.length > 0) {
			let transModels = new transModel()
			await transModels.collection.insert(trans, onInsert)
		}

		if (transfers && transfers.length > 0) {
			let transferModels = new transferModel()
			await transferModels.collection.insert(transfers, onInsert)
		}

		if (createUsers && createUsers.length > 0) {
			await saveUsers(createUsers, next, realUsers)
		}
		console.log("saveData()-2222交易入库-start blockNum:", blockNum, "end blockNum:", (blockNum + blocks.length), "交易数量:", transactions.length, ",time:", new Date().toLocaleString())
	}
}

function onInsertBlocks(err, docs) {
	if (err) {
		if (docs && docs.ops && docs.ops.length > 0 ){
			for (var i = 0; i < docs.ops.length; i++) {
				console.info('insert block to mongodb failed, block height:', docs.ops[i].block_height);
				failBlock(docs.ops[i].block_height)
			}
		}
	} else {
		console.info('insert block to mongodb sucess, block nums:', docs.ops.length);
	}
}

function onInsert(err, docs) {
	if (err) {
		console.info("insert data to mongodb failed, error: ", err.toString());
	} else {
		console.info("insert data to mongodb sucess...");
	}
}

//保存Users
async function saveUsers(users, next, realUsers) {

	for (var i = 0; i < users.length; i++) {
		let ctx = users[i]
		await ctx.users.map(async (item, index) => {
			let user = await UserModel.findOne({
				user_name: item.id,
			}).exec()
			if (!user) {
				await bcx.queryAccountInfo({
					account: item.id,
					callback: async result => {
						if (result.locked || !result.data || !result.data.account) {
						} else {
							//用户名作索引用
							result.data.user_name = result.data.account.name
							result.data.trx_ids = [{
								trx_id: ctx.trx_id,
							},]
							//数组的话最后清除
							if (index === ctx.users.length - 1) {
								ctx.trx_id = null
							}
							//有时间就存上
							if (ctx.create_time) {
								result.data.create_time = moment(ctx.create_time)
								ctx.create_time = null
							}

							//查询用户余额
							await bcx.queryAccountAllBalances({
								unit: '',
								account: item.id,
								callback: async count => {
									result.data.counts = count.data
								},
							})
							// realUsers.push(result.data)
							let userModels = new UserModel(result.data)
							userModels.save()
						}
					},
				})
			}
		})
	}

	// if (realUsers && realUsers.length){
	// 	let userModels = new UserModel()
	// 	userModels.collection.insert(realUsers, onInsert)
	// }
}

//保存区块
async function saveBlocks(blocks, ctx, next, blockNum) {
	if (blocks && blocks.length > 0) {
		let blockModels = new blockModel()
		console.log("saveData()-2222.5555入库--前-----start blockNum:", blockNum, " end blockNum:", (blockNum + blocks.length), "time:",  new Date().toLocaleString())
		blockModels.collection.insert(blocks, onInsertBlocks)
		console.log("saveData()-3333入库成功-start blockNum:", blockNum, " end blockNum:", (blockNum + blocks.length), "time:",  new Date().toLocaleString())
		await setCurrBlockHeight((blockNum + blocks.length))
		console.log("saveData()-44444更新detail blockNum:", (blockNum + blocks.length), "time:",  new Date().toLocaleString())
		//区块去重
		// await query.subscribeToBlocks(ctx, next)
	} else {
		for (var i = 0; i < blocks.length; i++) {
			failBlock(ctx, next, (blockNum + i))
		}
	}
}

//保存数据
async function saveData(blocks, ctx, next, blockNum) {
	console.log("saveData()-0000 进入--bN:", blockNum, ", num:", blocks.length, ",time:", new Date().toLocaleString())
	existBlock(blocks, blockNum)
	saveTransactions(blocks, ctx, next, blockNum)
	saveBlocks(blocks, ctx, next, blockNum)
}

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
	})
}

//累加 节点出错次数
function addnodeErrCount() {
	setNodeErrCount( getNodeErrCount() + 1)
	if (getNodeErrCount() > 50) {
		//切换节点  清零
        bcx.changeNode()
        resetNodeErrCount()
	}
}

//重置清零
function resetNodeErrCount() {
	setNodeErrCount(0)
}

function getNodeErrCount() {
    return nodeErrCount
}

function setNodeErrCount(next) {
    nodeErrCount = next
}
