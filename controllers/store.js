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

let lastestBlockNum //最新区块高度
let currBlockHeight = 0 //当前区块高度
let nodeErrCount = 0 //用于累计节点连续 异常次数，和 切换节点
let failedBlockData = []
let needCheckBlockData = []

function getLastestBlockNum() {
  return lastestBlockNum
}

function getCurrBlockHeight() {
  return currBlockHeight
}

function getFailedBlockData() {
  return failedBlockData
}

function setFailedBlockData(blockNum) {
  return failedBlockData.push({
    "block_height": blockNum
  })
}

async function setLastestBlockNum(bn) {
  if (bn == undefined) {
    console.log("---setLastestBlockNum---bn undefined, time:", new Date().toLocaleString())
    return
  }
  lastestBlockNum = bn
  await BlockDetailModel.findOneAndUpdate({
    detail: 'detail'
  }, {
    sub_block_height: lastestBlockNum,
    update_time: new Date()
  })
}

async function setCurrBlockHeight(bn) {
  if (bn == undefined) {
    console.log("---setCurrBlockHeight---bn undefined, time:", new Date().toLocaleString())
    return
  }
  currBlockHeight = bn
  await BlockDetailModel.findOneAndUpdate({
    detail: 'detail'
  }, {
    block_height: currBlockHeight,
    update_time: new Date()
  })
}

/**
 * 初始化最新 lastestBlockNum 和 detail表
 * */
exports.initStore = async function () {
  //初始化表
  let detail = await BlockDetailModel.findOne({
    detail: 'detail'
  })
  if (!detail) {
    let block_detail = new BlockDetailModel({
      block_height: 0,
      detail: 'detail',
      sub_block_height: 0,
      update_time: new Date()
    })
    setLastestBlockNum(0)
    await block_detail.save()

  } else {
    setLastestBlockNum(detail.sub_block_height)
    setCurrBlockHeight(detail.block_height)
  }

  console.log("----initStore()--最新区块高度:", getLastestBlockNum(), ",当前区块高度:", getCurrBlockHeight())
}

exports.subscribeToBlocks = async function (ctx, next) {
  //监听区块信息
  await bcx.subscribeToBlocks({
    callback: async result => {
      console.log("-subscribeToBlocks()--111---接收到订阅推送 新块blockNum:", result.data.block_height, ",time:", new Date().toLocaleString())

      if (result.data) { //订阅推送过来 刚产生的新块
        console.log("-subscribeToBlocks()---222---新块高度写入Detail blockNum:", result.data.block_height, ",time:", new Date().toLocaleString())

        //更新detail表 最新区块
        await setLastestBlockNum(result.data.block_height)
      } else {
        console.log("---订阅返回异常，result:", result)
      }
    }
  })
}

//处理请求失败的   记录出错blockNum ，跳过
async function failBlock(blockNum) {

  console.log("----failBlock()---11111--获取区块失败-----blockNum:", blockNum, "time:", new Date().toLocaleString())

  let butBlockdb = await butBlockModel.findOne({
    block_height: blockNum
  })
  if (butBlockdb && butBlockdb.block_height == blockNum) {
    console.log("----failBlock()---22222--blockNum有记录过，跳过-----blockNum:", blockNum, "time:", new Date().toLocaleString())
    return
  }

  setFailedBlockData(blockNum)
  butBlock = new butBlockModel()
  butBlock.block_height = blockNum
  butBlock.create_time = new Date()
  await butBlock.save()
  console.log("----failBlock()---33333--已记录下 blockNum:", blockNum, "time:", new Date().toLocaleString())
}

/**
 * 处理need check block data
 * */
async function handleNeedCheckBlockData() {
  if (!needCheckBlockData || needCheckBlockData.length <= 0) {
    for (var j = 0; j < needCheckBlockData.length; j++) {
      let start = needCheckBlockData[j].start
      let num = needCheckBlockData[j].num
      for (var i = start; i <= num; i++) {
        failBlock(i)
      }
    }
  }
}

/**
 * 处理failed block
 * */
async function handleFailedBlockData() {
  let failedBlockDatas = getFailedBlockData()
  if (!failedBlockDatas || failedBlockDatas.length <= 0) {
    failedBlockDatas = await butBlockModel.find()
  }

  if (failedBlockDatas && failedBlockDatas.length > 0) {
    for (var j = 0; j < failedBlockDatas.length; j++) {
      await bcx
        .queryBlock({
          block: failedBlockDatas[j].block_height
        })
        .then(async result => {
          console.log("....................................................................................")
          console.log("入库Block(..)---222 获取到区块bN:", failedBlockDatas[j].block_height, ",code:", result.code, ",time:", new Date().toLocaleString())
          console.log("....................................................................................")
          if (result.code === 1) {
            let blockModels = new blockModel(result.data)
            blockModels.save()
            butBlockModel.findByIdAndRemove({block_height:failedBlockDatas[j].block_height})
            failedBlockDatas.splice(j, 1)
            j--
            resetNodeErrCount()
          }
        })
    }
  }
}

/**
 * 同步链上新一批区块到db
 * */
exports.syncBlockData = async function () {
    let ctx = {}
	let next = {}
    let sub_block_height = getLastestBlockNum()
	let currBlockHeight = getCurrBlockHeight()
	ctx.block_height = sub_block_height
	console.log("-----syncBlockData()--查detail最新高度---11111 ----currBlockHeight:",  currBlockHeight, " lastestBlockNum:", sub_block_height, ",time:", new Date().toLocaleString())
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
		}
		let nums = parseInt((ctx.block_height - currBlockHeight) / 800)
		if (nums > 0){
			for (var k = 0; k < nums; k++) {
				let ctxTmp = {}
				ctxTmp.block_height = currBlockHeight + (k + 1) * 800
				if (k == nums - 1){
					ctxTmp.block_height = ctx.block_height
				}
				await setCurrBlockHeight(currBlockHeight + k * 800)
				await toFetchBlock(ctxTmp, next)
			}
		}else{
			let ctxTmp = {}
			ctxTmp.block_height = ctx.block_height
			await toFetchBlock(ctxTmp, next)
		}
		await setCurrBlockHeight(ctx.block_height)
		console.log("saveData()-44444更新 detail blockNum:", ctx.block_height, "time:",  new Date().toLocaleString())
		await handleNeedCheckBlockData()
		await handleFailedBlockData()
	}
    setTimeout(exports.syncBlockData, 3000, "sync_block_job")	//同步完一轮后
}

async function toFetchBlock(ctx, next) {
  console.log("------------------------------------------------------------------------------------")
  console.log("666666666666666666666666666666666666666666666666666666666666666666666666666666666666")
  console.log("------------------------------------------------------------------------------------")
  //重复查BlockDetail表----待处理
  let currBlockHeight = getCurrBlockHeight()
  console.log("查detail最新高度---222 sub_block_height:", ctx.block_height, ",time:", new Date().toLocaleString())
  if (!currBlockHeight) { //结束本次同步
    console.log("---syncBlockData()--currBlockHeight:为0")
    // return
  }
  ctx.blcok_length = currBlockHeight

  if ((ctx.block_height > ctx.blcok_length) && (ctx.block_height - ctx.blcok_length < 20)) {
    await fetchBlock(ctx, next)
  } else if (ctx.block_height - ctx.blcok_length >= 20 && ctx.block_height - ctx.blcok_length < 40) {
    let num = parseInt((ctx.block_height - ctx.blcok_length) / 2)
    let job0 = forkWork(ctx.blcok_length, ctx.blcok_length + num, next).then().catch((err) => {
      needCheckBlockData.push({
        "start": ctx.blcok_length,
        "num": (ctx.block_height - num - ctx.blcok_length)
      })
    })
    let job1 = forkWork(ctx.blcok_length + num, ctx.block_height, next).then().catch((err) => {
      needCheckBlockData.push({
        "start": ctx.blcok_length,
        "num": (ctx.block_height - num - ctx.blcok_length)
      })
    })
    await Promise.all([job0, job1])
      .then((result) => {
        console.log("job success ....")
      })
      .catch((error) => {
        console.error(error)
      })
  } else if (ctx.block_height - ctx.blcok_length >= 40 && ctx.block_height - ctx.blcok_length < 800) {
    let num = parseInt((ctx.block_height - ctx.blcok_length) / 4)
    let job0 = forkWork(ctx.blcok_length, ctx.blcok_length + num, next).then().catch((err) => {
      needCheckBlockData.push({
        "start": ctx.blcok_length,
        "num": num
      })
    }) //分4个任务
    let job1 = forkWork(ctx.blcok_length + num, ctx.blcok_length + 2 * num, next).then().catch((err) => {
      needCheckBlockData.push({
        "start": ctx.blcok_length,
        "num": num
      })
    })
    let job2 = forkWork(ctx.blcok_length + 2 * num, ctx.blcok_length + 3 * num, next).then().catch((err) => {
      needCheckBlockData.push({
        "start": ctx.blcok_length,
        "num": num
      })
    })
    let job3 = forkWork(ctx.blcok_length + 3 * num, ctx.block_height, next).then().catch((err) => {
      needCheckBlockData.push({
        "start": ctx.blcok_length,
        "num": (ctx.block_height - 3 * num - ctx.blcok_length)
      })
    })
    await Promise.all([job0, job1, job2, job3])
      .then((result) => {
        console.log("job success ....")
      })
      .catch((error) => {
        console.error(error)
      })
  } else if (ctx.block_height - ctx.blcok_length >= 800) { //&& ctx.block_height - ctx.blcok_length < 3200) {
    let num = parseInt((ctx.block_height - ctx.blcok_length) / 8)
    let job0 = forkWork(ctx.blcok_length, ctx.blcok_length + num, next).then().catch((err) => {
      needCheckBlockData.push({
        "start": ctx.blcok_length,
        "num": num
      })
    }) //分8个任务
    let job1 = forkWork(ctx.blcok_length + num, ctx.blcok_length + 2 * num, next).then().catch((err) => {
      needCheckBlockData.push({
        "start": ctx.blcok_length,
        "num": num
      })
    })
    let job2 = forkWork(ctx.blcok_length + 2 * num, ctx.blcok_length + 3 * num, next).then().catch((err) => {
      needCheckBlockData.push({
        "start": ctx.blcok_length,
        "num": num
      })
    })
    let job3 = forkWork(ctx.blcok_length + 3 * num, ctx.blcok_length + 4 * num, next).then().catch((err) => {
      needCheckBlockData.push({
        "start": ctx.blcok_length,
        "num": num
      })
    })
    let job4 = forkWork(ctx.blcok_length + 4 * num, ctx.blcok_length + 5 * num, next).then().catch((err) => {
      needCheckBlockData.push({
        "start": ctx.blcok_length,
        "num": num
      })
    })
    let job5 = forkWork(ctx.blcok_length + 5 * num, ctx.blcok_length + 6 * num, next).then().catch((err) => {
      needCheckBlockData.push({
        "start": ctx.blcok_length,
        "num": num
      })
    })
    let job6 = forkWork(ctx.blcok_length + 6 * num, ctx.blcok_length + 7 * num, next).then().catch((err) => {
      needCheckBlockData.push({
        "start": ctx.blcok_length,
        "num": num
      })
    })
    let job7 = forkWork(ctx.blcok_length + 7 * num, ctx.block_height, next).then().catch((err) => {
      needCheckBlockData.push({
        "start": ctx.blcok_length,
        "num": (ctx.block_height - 7 * num - ctx.blcok_length)
      })
    })
    await Promise.all([job0, job1, job2, job3, job4, job5, job6, job7])
      .then((result) => {
        console.log("job success ....")
      })
      .catch((error) => {
        console.error(error)
      })
  }
}

async function forkWork(startNum, endNum, next) {
	let num = parseInt((endNum - startNum) / 10)			// 10个块为一批
	if (num > 0) {
		for (var i = 0; i < num; i ++){
			let ctxTmp = {}
			ctxTmp.block_height = startNum + (i + 1) * 10
			if (i == num - 1) {
				ctxTmp.block_height = endNum
			}
			ctxTmp.blcok_length = startNum + i * 10
			await fetchBlock(ctxTmp, next)
		}
	}else {
		let ctxTmp = {}
		ctxTmp.block_height = endNum
		ctxTmp.blcok_length = startNum
		await fetchBlock(ctxTmp, next)
	}
}

async function fetchBlock(ctx, next) {
	let resultBlocks = []
	for (var i = ctx.blcok_length; i < ctx.block_height; i++) {
		await exports.Block(ctx, next, i + 1, resultBlocks)	//同步下一个区块
	}
	await saveData(resultBlocks, ctx, next, ctx.blcok_length)
}

//入库block区块
exports.Block = async function (ctx, next, length, resultBlocks) { //length:本次同步目标块
  console.log("入库Block(..)---11111 bN:", length, ",最新bN:", ctx.block_height, ",time:", new Date().toLocaleString())
  let index = length
  if (index <= ctx.block_height) {
    await bcx
      .queryBlock({
        block: index
      })
      .then(async result => {
        console.log("入库Block(..)---222 获取到区块bN:", index, ",code:", result.code, ",time:", new Date().toLocaleString())
        if (result.code === 1) {
          resultBlocks.push(result.data)
          resetNodeErrCount()
        } else {
          console.log("入库Block(..)---333 获取区块--失败 bN:", index, ",result.code:" + result.code + ",time:", new Date().toLocaleString())
          addnodeErrCount()
          await exports.Block(ctx, next, index, resultBlocks)
        }
      })
      .catch(async err => {
        console.error(err)
        console.log("入库Block(..)---444.1 获取区块err,bN:", index, ",time:", new Date().toLocaleString(), ",err:", err)
        addnodeErrCount()
        await failBlock(index)
      })
  }
}

//检查区块是否存在
async function existBlock(blocks, blockNum){

	for (var i = 0; i < blocks.length; i++) {
		if (blocks[i]) {
			let block = await blockModel
				.findOne({
					block_height: blocks[i].block_height,
				})
				.hint({
					block_height: 1,
					block_id: 1,
					timestamp: 1,
				})
				.exec()
			console.log("saveData()-1111入库前检查区块是否存在,bN:", blocks[i].block_height, ",time:", new Date().toLocaleString())
			if (block) {
				console.log("saveData()-1111.555--入库前检查  区块已存在,bN:", blocks[i].block_height, ",time:", new Date().toLocaleString())
				blocks.splice(i, 1)
				i--
			}
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
      if (blocks[i].transactions && blocks[i].transactions.length > 0) { //区块中有交易
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
                }, ]
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
	  for (var i = 0; i < trans.length; i++){
		  if (trans[i].parse_ops && trans[i].parse_ops.length) {
			  trans[i].block = trans[i].parse_ops[0].block_num
		  }
	  }
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
    if (docs && docs.ops && docs.ops.length > 0) {
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
              // realUsers.push(result.data)
              let userModels = new UserModel(result.data)
              userModels.save()
            }
          },
        })
      }
    })
  }
}

//保存区块
async function saveBlocks(blocks, ctx, next, blockNum) {
  if (blocks && blocks.length > 0) {
    let blockModels = new blockModel()
    console.log("saveData()-2222.5555入库--前-----start blockNum:", blockNum, " end blockNum:", (blockNum + blocks.length), "time:", new Date().toLocaleString())
    blockModels.collection.insert(blocks, onInsertBlocks)
    console.log("saveData()-3333入库成功-start blockNum:", blockNum, " end blockNum:", (blockNum + blocks.length), "time:", new Date().toLocaleString())
    // await setCurrBlockHeight((blockNum + blocks.length))
    // console.log("saveData()-44444更新detail blockNum:", (blockNum + blocks.length), "time:",  new Date().toLocaleString())
    //区块去重
    // await query.subscribeToBlocks(ctx, next)
  }
}

//保存数据
async function saveData(blocks, ctx, next, blockNum) {
	console.log("saveData()-0000 进入--bN:", blockNum, ", num:", blocks.length, ",time:", new Date().toLocaleString())
	await existBlock(blocks, blockNum)
	saveTransactions(blocks, ctx, next, blockNum)
	saveBlocks(blocks, ctx, next, blockNum)
	blocks = null
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
  setNodeErrCount(getNodeErrCount() + 1)
  if (getNodeErrCount() > 50) {
    //切换节点  清零
    // bcx.changeNode()
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
