const bcx = require('../config/bcx.config.js')
const transferModel = require('../models/transfer.js')
const transModel = require('../models/trans.js')
//查询当前交易
exports.queryTrans = async function (ctx, next) {
  if (!ctx.params.trans) {
    ctx.status = 404
    ctx.body = {
      errmsg: '无区块'
    }
    return
  }
  try {
    let trans = await transModel
      .findOne({
        trx_id: ctx.params.trans
      })
      .exec()
    ctx.body = {
      status: 'success',
      trans: trans
    }
  } catch (err) {
    ctx.status = 500
    ctx.body = {
      errmsg: '服务器错误'
    }
  }
}

//查询交易列表
exports.queryAllTrans = async function (ctx, next) {
  try {
    let page = parseInt(ctx.query.page),
      limit = parseInt(ctx.query.limit);
    if (page <= 0) page = 1;
    let skip = limit * (page - 1);
    let trans_total = await transModel.find({
      parse_ops: {
        $elemMatch: {
          $ne: null
        }
      }
    }).count();
    let trans = await transModel.find({
      parse_ops: {
        $elemMatch: {
          $ne: null
        }
      }
    }).limit(limit).skip(skip).sort({
      block: -1
    }).exec();
    if (trans) {
      ctx.body = {
        status: 'success',
        trans: trans,
        trans_total,
      }
    }
  } catch (err) {
    ctx.status = 500
    ctx.body = {
      errmsg: '服务器错误'
    }
  }
}

//查询交易上的转账
exports.queryTranferBlock = async function (ctx, next) {
  try {
    let page = parseInt(ctx.query.page),
      limit = parseInt(ctx.query.limit);
    if (page <= 0) page = 1;
    let skip = limit * (page - 1);
    let transfer = await transferModel.find().hint({
      date: 1
    }).limit(limit).skip(skip).sort({
      date: -1,
      block_num: -1
    }).exec()
    let count = await transferModel.count().exec();
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