'user strict';
const mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  Mixed = Schema.Types.Mixed;
const UserSchema = new Schema({
  account: Mixed,
  // user_id: {
  //   type: String,
  //   default: '',
  // },
  user_name: {
    type: String,
    default: '',
  },

  assets: {
    type: Array,
    default: []
  },
  total_coins: {
    type: Array,
    default: []
  },
  balances: {
    type: Array,
    default: []
  },
  call_orders: {
    type: Array,
    default: []
  },
  lifetime_referrer_name: {
    type: String,
    default: '',
  },
  limit_orders: {
    type: Array,
    default: []
  },
  proposals: {
    type: Array,
    default: []
  },
  referrer_name: {
    type: String,
    default: '',
  },
  registrar_name: {
    type: String,
    default: '',
  },
  settle_orders: {
    type: Array,
    default: []
  },
  statistics: Mixed,
  settle_orders: {
    type: Array,
    default: []
  },
  votes: {
    type: Array,
    default: []
  },
  vesting_balances: {
    type: Array,
    default: []
  },
  withdraws: {
    type: Array,
    default: []
  },
  //账户资产
  counts: {
    type: Array,
    default: []
  },
  //创建时间
  create_time: {
    type: Date,
    default: '',
  },
  //交易id
  trx_ids: {
    type: Array,
    default: []
  },
  //转账统计
  trans_counts: {
    from_num: {
      type: Number,
      default: 0
    },
    to_num: {
      type: Number,
      default: 0
    }
  },
});
UserSchema.index({
  'user_name': 1,
}, {
  sparse: true
});

UserSchema.index({
  'create_time': 1,
}, {
  sparse: true
});

UserSchema.index({
  'referrer_name': 1,
}, {
  sparse: true
});

UserSchema.set('toJSON', {
  getters: true,
  virtuals: true,
  transform: function (doc, ret, options) {
    if (options.hide) {
      options.hide.split(' ').forEach(function (prop) {
        delete ret[prop];
      });
    }
    delete ret['_id'], delete ret['__v'];
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);