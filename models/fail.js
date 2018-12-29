'user strict';
const mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  Mixed = Schema.Types.Mixed;

const FailSchema = new Schema({
  index: {
    type: String,
    default: ''
  },
})


FailSchema.set('toJSON', {
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

module.exports = mongoose.model('Fail', FailSchema);