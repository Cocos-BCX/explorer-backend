'user strict';
const mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  Mixed = Schema.Types.Mixed;

const TransSchema = new Schema({
  ref_block_num: {
    type: Number
  },
  ref_block_prefix: {
    type: Number,
  },
  expiration: {
    type: Date,
  },
  operations: [
    [
      Mixed,
      {
        fee: {
          amount: Number,
          asset_id: String
        },
        from: String,
        to: String,
        amount: {
          amount: Number,
          asset_id: String
        },
        extensions: []
      }
    ]
  ],
  extensions: [],
  signatures: [],
  operation_results: [
    [
      Mixed,
      {
        real_running_time: Number
      }
    ]
  ],
  //类型太多混合类型吧
  parse_ops: Mixed,
  trx_id: String,
  block: String
});
TransSchema.index({
  'trx_id': 1,
}, {
  sparse: true
});

TransSchema.index({
  'expiration': 1,
}, {
  sparse: true
});

// TransSchema.index({
//   'parse_ops': 1,
// }, {
//   sparse: true
// });
TransSchema.index({
  'date': 1,
}, {
  sparse: true
});

TransSchema.index({
  'block_num': 1,
}, {
  sparse: true
});

TransSchema.set('toJSON', {
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

module.exports = mongoose.model('Trans', TransSchema);