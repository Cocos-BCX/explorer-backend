const UserModel = require('../models/user');
const bcx = require('../config/bcx.config');
const transModel = require('../models/trans.js')
const transferModel = require('../models/transfer.js')
const moment = require('moment')
//查询用户
exports.queryUser = async function (ctx, next) {
  try {
    if (!ctx.params.user) {
      ctx.status = 404
      ctx.body = {
        errmsg: '无用户id'
      }
      return
    }
    let user = await UserModel.findOne({
      user_name: ctx.params.user
    }).exec()
    await bcx.queryAccountAllBalances({
      unit: '',
      account: ctx.params.user,
      callback: async count => {
        counts = count.data
        await UserModel.findOneAndUpdate({
          user_name: ctx.params.user
        }, {
          counts: counts
        }).exec()
      }
    })
    let params = {
      user_name: user.user_name,
      user_id: user.account.id,
      counts: user.counts,
      trans_counts: user.trans_counts
    }
    ctx.body = {
      status: 'success',
      user: params
    }
  } catch (err) {
    ctx.status = 403
    ctx.body = {
      errmsg: '用户不可访问'
    }
  }
}

exports.queryAllUser = async function (ctx, next) {
  let user = await UserModel.find();
  user.forEach(async item => {
    if (item.create_time) {
      item.date = moment(new Date(item.create_time))
      await UserModel.findByIdAndUpdate(item.id, item).exec()
    }
  })
}

//查询用户上的转账
exports.queryUserBlock = async function (ctx, next) {
  try {
    if (!ctx.params.user) {
      ctx.status = 404
      ctx.body = {
        errmsg: '无用户id'
      }
      return
    }
    let page = parseInt(ctx.query.page),
      limit = parseInt(ctx.query.limit);
    if (page <= 0) page = 1;
    // if (page > 100) page = 100;
    let skip = limit * (page - 1);
    let condition = {
      '$or': [{
        "parse_operations.from": ctx.params.user
      }, {
        "parse_operations.to": ctx.params.user
      }]
    }
    let transfer = await transferModel.find(condition).limit(limit).skip(skip).sort('-date').exec()
    let count = await transferModel.find(condition).count().exec();
    let from = await transferModel.find({
      "parse_operations.from": ctx.params.user
    }).hint({
      'parse_operations.from': 1,
    }).count();
    let to = await transferModel.find({
      "parse_operations.to": ctx.params.user
    }).hint({
      'parse_operations.to': 1,
    }).count();
    ctx.body = {
      status: 'success',
      transfer,
      num: {
        from,
        to
      },
      count
    }
  } catch (err) {
    ctx.status = 500
    ctx.body = {
      errmsg: '服务器错误'
    }
  }
}
// exports.queryUserTransfer = async function (ctx, next) {
//   if (!ctx.trx_ids || !ctx.trx_ids.length) {
//     ctx.body = {
//       status: 'success',
//       trx_ids: []
//     }
//   } else {
//     let page = parseInt(ctx.query.page),
//       limit = parseInt(ctx.query.limit);
//     if (page <= 0) page = 1;
//     if (page > 100) page = 100;
//     let skip = limit * (page - 1);
//     let trx_ids = [];
//     for (let i = skip; i < limit * page; i++) {
//       let trx_id = await transModel.find({
//         trx_id: ctx.trx_ids[i],
//         parse_ops: [{
//           type: 'transfer'
//         }]
//       });
//       trx_ids.push(trx_id);
//     }
//     ctx.body = {
//       status: 'success',
//       trx_ids
//     }
//   }
// }