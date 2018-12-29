'use strict'
const Router = require('koa-router')
const test = require('../controllers/test')
const store = require('../controllers/store')
const trans = require('../controllers/trans')
const query = require('../controllers/query')
const block = require('../controllers/block')
const user = require('../controllers/user')

module.exports = function () {
  var router = new Router();
  router.get('/', store.subscribeToBlocks);
  router.get('/trxToken', test.login);
  router.get('/trxToken/data', test.login, test.data);
  router.get('/query_block/:block_height', block.queryBlock);
  router.get('/query_tranfer_block/:block_height', block.queryTransferList);
  router.get('/query_block/:block_height/detail', block.queryBlockDeatil);
  router.get('/query_all_block', block.queryAllBlock);

  router.get('/query_user/:user', user.queryUser);
  router.get('/query_user_block/:user', user.queryUserBlock);
  router.get('/users', user.queryAllUser)

  router.get('/query_count', query.queryCount);
  router.get('/query_trans/:trans', trans.queryTrans);

  router.get('/query_all_trans', trans.queryTranferBlock);
  router.get('/query_trans_info', query.queryTransfer);
  router.get('/query_balances', query.queryAccountAllBalances);

  router.get('/chart_count', query.subscribeToBlocks);
  router.get('/chart', query.countDayBlock)

  router.get('/find_user', query.searchMoney)
  return router
}
//queryTransfer