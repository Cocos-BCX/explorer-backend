'user strict';
const mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  Mixed = Schema.Types.Mixed;
const BlockSchema = new Schema({
  // _id: {
  //   type: String
  // },
  //前链hash
  previous: {
    type: String,
    default: ''
  },
  //时间戳
  timestamp: {
    type: Date,
  },
  //见证人
  witness: {
    type: String,
  },
  //根节点
  transaction_merkle_root: {
    type: String,
    default: ''
  },
  //扩展
  extensions: {
    type: Array
  },
  //见证人签名
  witness_signature: {
    type: String,
  },
  //交易
  transactions: [
    //   {
    //   id: {
    //     type: Schema.ObjectId,
    //     ref: 'Trans'
    //   }
    // }
  ],
  //区块id
  block_id: {
    type: String
  },
  //签名key
  signing_key: {
    type: String
  },
  //区块高度
  block_height: {
    type: Number
  },
  //见证人名字
  witness_name: {
    type: String
  },
  //时间
  time: {
    type: Date
  },
  //区块总数
  trx_count: {
    type: Number
  }
});
BlockSchema.index({
  'block_height': 1,
  block_id: 1,
  timestamp: 1
}, {
  sparse: true,
});

BlockSchema.index({
  block_height: 1
}, {
  sparse: true
});

BlockSchema.index({
  block_id: 1
}, {
  sparse: true
});

BlockSchema.index({
  timestamp: 1
}, {
  sparse: true
});


BlockSchema.set('toJSON', {
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

module.exports = mongoose.model('Block', BlockSchema);