'user strict';
const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    Mixed = Schema.Types.Mixed;
const ButBlockSchema = new Schema({
    block_height: {
        type: Number,
        default: 0
    },
    //创建时间
    create_time: {
        type: Date,
        default: '',
    }
});


ButBlockSchema.set('toJSON', {
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

module.exports = mongoose.model('ButBlock', ButBlockSchema);