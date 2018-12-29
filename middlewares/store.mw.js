const transModel = require('../models/trans.js');
const UserModel = require('../models/user.js');
const bcxs = require('../lib/bcx.min.js');
const bcx = require('../config/bcx.config.js');
exports.getBalance = function (account) {
  bcx.queryUserInfo({
    account: account
  }).then(result => {
    console.log(result);
    return result;
  })

}