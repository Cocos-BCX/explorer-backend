'user strict';
const mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  Mixed = Schema.Types.Mixed;

const TransferSchema = new Schema({
  block_num: {
    type: Number
  },
  type: {
    type: String,
  },
  date: {
    type: Date,
  },
  result: {
    real_running_time: String,
  },
  parse_operations: {
    from: String,
    amount: String,
    to: String,
    fee: String
  },
  parse_operations_text: String,
  raw_data: Mixed,
  trx_id: {
    type: String,
    default: ''
  }
});
TransferSchema.index({
  'trx_id': 1,
}, {
  sparse: true
});

TransferSchema.index({
  'parse_operations.from': 1,
}, {
  sparse: true
});

TransferSchema.index({
  'parse_operations.to': 1,
}, {
  sparse: true
});

TransferSchema.index({
  'date': 1,
}, {
  sparse: true
});

// TransSchema.index({
//   'parse_ops': 1,
// }, {
//   sparse: true
// });



TransferSchema.set('toJSON', {
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

module.exports = mongoose.model('Transfer', TransferSchema);