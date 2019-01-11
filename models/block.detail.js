'user strict';
const mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  Mixed = Schema.Types.Mixed;
const BlockDetailSchema = new Schema({
  // _id: {
  //   type: String
  // },
  //前链hash
  block_height: {
    type: Number,
    default: 0
  },
  counts: {
    max: {
      type: Number,
      default: 534
    },
    tps: {
      type: Number,
      default: 0,
    }
  },
  nodes: {
    type: Number,
    default: 0
  },
  trans: {
    type: Number,
    default: 0
  },
  user_count: {
    type: Number,
    default: 0
  },
  sub_block_height: {
    type: Number,
    detail: 0,
  },
  detail: {
    type: String,
    default: 'detail'
  },
  update_time: {
    type: Date,
  }
});

BlockDetailSchema.set('toJSON', {
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

module.exports = mongoose.model('BlockDetail', BlockDetailSchema);