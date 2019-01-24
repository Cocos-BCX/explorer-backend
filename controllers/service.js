const storeBlock = require('./store.js')
const queryDetail = require('./query.js')
exports.storeData = async function () {
  let ctx = {},
    next = {},
    query = {};
  //区块入库
  storeBlock.initStore();
  storeBlock.subscribeToBlocks(ctx, next);
  storeBlock.syncBlockData();
  //首页统计信息
  setInterval(() => {
    queryDetail.queryCount()
  }, 3000)
  //首页列表信息
  setInterval(() => {
    queryDetail.queryDataBlock(10, 1)
    queryDetail.queryAllTrans(10, 1)
  }, 1000)
  setInterval(() => {
    queryDetail.countDayBlock()
  }, 1000 * 60 * 60 * 2)
}