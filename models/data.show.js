'user strict';
const mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  Mixed = Schema.Types.Mixed;
const DataArraySchema = new Schema({
  dataArray: {
    type: Array,
    default: []
  },
  detail: {
    type: String,
    default: ''
  },
});

DataArraySchema.set('toJSON', {
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

module.exports = mongoose.model('DataArray', DataArraySchema);