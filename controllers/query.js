const bcx = require('../config/bcx.config.js')
const blockModel = require('../models/block.js')
const transModel = require('../models/trans.js')
const UserModel = require('../models/user.js')
const transferModel = require('../models/transfer.js')
const BlockDetailModel = require('../models/block.detail.js')
const queryMw = require('../middlewares/query.mw.js')
const dataShow = require('../models/data.show.js')
const moment = require('moment')
const EventEmitter = require('events').EventEmitter
const util = require("../utils/util")

//统计首页信息
exports.queryCount = async function () {
  let detail = await BlockDetailModel.findOne({
    detail: 'detail',
  })
  let user_count = await UserModel.count()
  let trans
  // await bcx.lookupWSNodeList({
  //   callback: result => {
  //     nodes = result.data.nodes.length || 0
  //   }
  // })
  let end = new Date(
    new Date(new Date().toLocaleDateString()).getTime()
  )
  let start = new Date(
    new Date(new Date().toLocaleDateString()).getTime() -
    24 * 60 * 60 * 1000
  );
  let tran_num = await transModel.find({
    expiration: {
      $gte: start,
      $lt: end,
    },
  }).count().exec()
  console.log(transModel.count());
  console.log("start:", start)
  console.log("end  :", end)
  console.log("tran_num:", tran_num)
  let tps = await blockModel
    .findOne({
      block_height: detail.block_height || 0,
    })
    .hint({
      block_height: 1,
      block_id: 1,
      timestamp: 1,
    })
    .exec()
  // tps = Math.ceil(tps.transactions && tps.transactions.length / 5) || 0;
  // let max = await blockModel.findOne({
  //   transactions: {
  //     $size: 10
  //   }
  // })
  // console.log(tps.transactions);
  // console.log(tps.transactions.length);
  detail.counts.max = 5100
  let counts = {}
  if (tps && tps.transactions && tps.transactions.length) {
    counts = {
      tps: tps.transactions.length,
      max: tps.transactions.length > detail.counts.max ? tps.transactions.length : detail.counts.max
    }
  } else {
    counts = {
      tps: 0,
      max: detail.counts.max,
    }
  }

  trans = tran_num || 0
  await BlockDetailModel.findOneAndUpdate({
    detail: 'detail',
  }, {
    user_count,
    nodes: 4,
    trans,
    counts,
  })
}

//查询首页区块列表
exports.queryDataBlock = async function name(limit, page) {
  let skip = limit * (page - 1)
  let blocks = await blockModel
    .find()
    .hint({
      block_height: 1,
    })
    .limit(limit)
    .skip(skip)
    .sort({
      block_height: -1
    })
    .exec()
  if (blocks) {
    let block = []
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
      block.push(params)
    })
    let blockArray = await dataShow.findOne({
      detail: 'block',
    })
    if (!blockArray) {
      let blockModel = new dataShow({
        dataArray: block,
        detail: 'block',
      })
      await blockModel.save()
    } else {
      await dataShow.findOneAndUpdate({
        detail: 'block',
      }, {
        dataArray: block,
      })
    }
  }
}

//查询首页交易列表
exports.queryAllTrans = async function (limit, page) {
  let skip = limit * (page - 1)
  let trans = await transModel
    .find()
    .sort({
      expiration: -1
    })
    .skip(skip)
    .limit(limit)
    .exec()
  if (trans) {
    // let tran_collect = []
    // trans.forEach(item => {
    // 	let params = {
    // 		parse_ops: item.parse_ops,
    // 		ref_block_num: item.ref_block_num,
    // 		signatures: item.signatures,
    // 		ref_block_prefix: item.ref_block_prefix,
    // 		expiration: item.expiration,
    // 		trx_id: item.trx_id,
    // 		block: item.block,
    // 	}
    // 	tran_collect.push(params)
    // })
    let transArray = await dataShow.findOne({
      detail: 'transfer',
    })
    if (!transArray) {
      let tranfer = new dataShow({
        dataArray: trans,
        detail: 'transfer',
      })
      await tranfer.save()
    } else {
      await dataShow.findOneAndUpdate({
        detail: 'transfer',
      }, {
        dataArray: trans,
      })
    }
    // ctx.body = {
    //   status: 'success',
    //   trans: trans,
    //   trans_total,
    // }
  }
}

//统计转账图表信息
exports.countDayBlock = async function () {
  let time = new Date(moment(new Date().getTime() - 24 * 60 * 60 * 1000 * 15).format('YYYY-MM-DD'))
  let yesterday = new Date(moment(new Date().getTime() - 24 * 60 * 60 * 1000).format('YYYY-MM-DD'))
  let address = await UserModel.aggregate([{
      $match: {
        create_time: {
          $gt: time,
          $lt: yesterday,
        },
      },
    },
    {
      $group: {
        _id: {
          year: {
            $year: {
              $add: ['$create_time', 28800000],
            },
          },
          month: {
            $month: {
              $add: ['$create_time', 28800000],
            },
          },
          day: {
            $dayOfMonth: {
              $add: ['$create_time', 28800000],
            },
          },
        },
        number: {
          $sum: 1,
        },
      },
    },
    {
      $group: {
        _id: {
          year: '$_id.year',
          month: '$_id.month',
          day: '$_id.day',
        },
        data: {
          $push: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day',
            number: '$number',
          },
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]).allowDiskUse(true)
  let transfer = await transferModel
    .aggregate([{
        $match: {
          date: {
            $gt: time,
            $lt: yesterday,
          },
        },
      },
      {
        $group: {
          _id: {
            year: {
              $year: {
                $add: ['$date', 28800000],
              },
            },
            month: {
              $month: {
                $add: ['$date', 28800000],
              },
            },
            day: {
              $dayOfMonth: {
                $add: ['$date', 28800000],
              },
            },
          },
          number: {
            $sum: 1,
          },
        },
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day',
          },
          data: {
            $push: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day',
              number: '$number',
            },
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ])
    .allowDiskUse(true)
  let address_count = await queryMw.infoDeal(address)
  let tranfers = await queryMw.infoDeal(transfer)
  let chart_trans = await dataShow.findOne({
    detail: 'chart_trans',
  })
  // console.log(chart_trans)
  if (!chart_trans) {
    let chartTransModel = new dataShow({
      dataArray: tranfers,
      detail: 'chart_trans',
    })
    await chartTransModel.save()
  } else {
    await dataShow.findOneAndUpdate({
      detail: 'chart_trans',
    }, {
      dataArray: tranfers,
    })
  }
  let chart_address = await dataShow.findOne({
    detail: 'chart_address',
  })
  if (!chart_address) {
    let chartAddressModel = new dataShow({
      dataArray: tranfers,
      detail: 'chart_address',
    })
    await chartAddressModel.save()
  } else {
    await dataShow.findOneAndUpdate({
      detail: 'chart_address',
    }, {
      dataArray: address_count,
    })
  }
}

exports.queryTransfer = async function (ctx, next) {
  await bcx.queryUserOperations({
    account: 'test1',
    limit: 100,
    callback: async operas => {
      // console.log(operas);
      ctx.body = operas
    },
  })
}

exports.queryAccountAllBalances = async function (ctx, next) {
  await bcx.queryAccountAllBalances({
    unit: '',
    account: 'test1',
    callback: async count => {
      ctx.body = count
      3
    },
  })
}

//区块去重
exports.subscribeToBlocks = async function (ctx, next) {
  let block = await blockModel.aggregate([{
      $group: {
        _id: {
          block_id: '$block_id',
          block_height: '$block_height',
        },
        count: {
          $sum: 1,
        },
        dups: {
          $addToSet: '$_id',
        },
      },
    },
    {
      $match: {
        count: {
          $gt: 1,
        },
      },
    },
  ])
  // .allowDiskUse(true);
  block.forEach(async function (it) {
    it.dups.shift()
    await blockModel.remove({
      _id: {
        $in: it.dups,
      },
    })
  })
}

//交易去重
exports.subscribeToTrans = async function () {
  let trans = await transModel.aggregate([{
      $group: {
        _id: {
          trx_id: '$trx_id',
        },
        count: {
          $sum: 1,
        },
        dups: {
          $addToSet: '$_id',
        },
      },
    },
    {
      $match: {
        count: {
          $gt: 1,
        },
      },
    },
  ])
  // .allowDiskUse(true);
  trans.forEach(async function (it) {
    it.dups.shift()
    await transModel.remove({
      _id: {
        $in: it.dups,
      },
    })
  })
}

//转账去重
exports.subscribeToTransfer = async function () {
  let transfer = await transferModel.aggregate([{
      $group: {
        _id: {
          trx_id: '$trx_id',
          parse_operations_text: '$parse_operations_text',
        },
        count: {
          $sum: 1,
        },
        dups: {
          $addToSet: '$_id',
        },
      },
    },
    {
      $match: {
        count: {
          $gt: 1,
        },
      },
    },
  ])
  // .allowDiskUse(true);
  transfer.forEach(async function (it) {
    it.dups.shift()
    await transferModel.remove({
      _id: {
        $in: it.dups,
      },
    })
  })
}

exports.searchMoney = async function (ctx, next) {
  let users = await UserModel.find({}).exec()
  let lists = []
  users.forEach(async item => {
    await bcx.queryAccountAllBalances({
      unit: '',
      account: item.user_name,
      callback: async count => {
        item.counts = count.data
        console.log(item.counts)
        await UserModel.findOneAndUpdate({
          user_name: item.user_name,
        }, {
          counts: item.counts,
        }).exec()
      },
    })
  })
  // ctx.body = {
  //   users: lists
  // }
}