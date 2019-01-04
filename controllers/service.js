const storeBlock = require('./store.js')
const queryDetail = require('./query.js')
exports.storeData = async function () {
  let ctx = {},
    next = {},
    query = {};
  //区块入库
  storeBlock.subscribeToBlocks(ctx, next)
  //首页统计信息
  setInterval(() => {
    queryDetail.queryCount()
  }, 1000)
  //首页列表信息
  setInterval(() => {
    queryDetail.queryDataBlock(10, 1)
    queryDetail.queryAllTrans(10, 1)
  }, 1000)
  setInterval(() => {
    queryDetail.countDayBlock()
  }, 1000 * 60 * 60 * 2)
}