const bcx = require('../config/bcx.config.js')
const blockModel = require('../models/block.js')
const transModel = require('../models/trans.js')
const transferModel = require('../models/transfer')
//查询单条区块
exports.queryBlock = async function (ctx, next) {
  if (!ctx.params.block_height) {
    ctx.status = 406
    ctx.body = {
      errmsg: '暂无无区块'
    }
    return
  }
  try {
    let block = await blockModel
      .findOne({
        block_height: ctx.params.block_height
      })
      .exec()
    if (block) {
      ctx.body = {
        status: 'success',
        block: block
      }
    } else {
      ctx.status = 404
      ctx.body = {
        errmsg: '无区块'
      }
      return
    }
  } catch (err) {
    ctx.status = 500
    ctx.body = {
      errmsg: '服务器错误'
    }
  }
}

//查询所有区块
exports.queryAllBlock = async function (ctx, next) {
  let page = parseInt(ctx.query.page),
    limit = parseInt(ctx.query.limit);
  if (page <= 0) page = 1;
  if (page > 100) page = 100;
  let skip = limit * (page - 1);
  let blocks = await blockModel.find().hint({
    block_height: 1
  }).limit(limit).skip(skip).sort({
    block_height: -1
  }).exec();
  let block_height = await blockModel.count();
  if (blocks) {
    let block = [];
    blocks.forEach(item => {
      let params = {
        id: item._id,
        block_id: item.block_id,
        block_height: item.block_height,
        time: item.time,
        timestamp: item.timestamp,
        witness_name: item.witness_name,
        trx_count: item.trx_count,
      }
      block.push(params);
    })
    ctx.body = {
      status: 'success',
      blocks: block,
      block_height,
    }
  }
}

//查询区块上的转账
exports.queryTransferList = async function (ctx, next) {
  try {
    if (!ctx.params.block_height) {
      ctx.status = 406
      ctx.body = {
        errmsg: '无区块高度'
      }
      return
    }
    let page = parseInt(ctx.query.page),
      limit = parseInt(ctx.query.limit);
    if (page <= 0) page = 1;
    // if (page > 100) page = 100;
    let skip = limit * (page - 1);
    let condition = {
      block_num: ctx.params.block_height
    }
    let transfer = await transferModel.find(condition).limit(limit).skip(skip).sort('-date').exec()
    let count = await transferModel.count(condition).exec();
    ctx.body = {
      status: 'success',
      transfer,
      count
    }
  } catch (err) {
    ctx.status = 500
    ctx.body = {
      errmsg: '服务器错误'
    }
  }
}

//查询区块上的交易
exports.queryBlockDeatil = async function (ctx, next) {
  let page = parseInt(ctx.query.page),
    limit = parseInt(ctx.query.limit);
  if (page <= 0) page = 1;
  if (page > 100) page = 100;
  let skip = limit * (page - 1);
  if (!ctx.params.block_height) {
    ctx.status = 406
    ctx.body = {
      errmsg: '无区块高度'
    }
    return
  }

  try {
    let trans_length = await transModel.find({
      block: ctx.params.block_height
    }).count();
    let transactions = await transModel.find({
      block: ctx.params.block_height
    }).limit(limit).skip(skip).exec();
    if (transactions) {
      ctx.body = {
        status: 'success',
        transactions: transactions,
        trans_length,
      }
    } else {
      ctx.status = 404
      ctx.body = {
        errmsg: '无区块'
      }
      return
    }
  } catch (err) {
    ctx.status = 500
    ctx.body = {
      errmsg: '服务器错误'
    }
  }
}