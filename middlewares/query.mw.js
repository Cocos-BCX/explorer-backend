const util = require('../lib/util');
const moment = require('moment')
exports.infoDeal = function (Array) {
  let counts = [];
  Array.forEach(item => {
    if (item.data && item.data.length) {
      let data = item.data[0];
      let params = {
        time: `${data.year}-${data.month > 9 ? data.month : '0' + data.month}-${data.day > 9 ? data.day : '0' + data.day}`,
        date: `${data.month > 9 ? data.month : '0' + data.month}-${data.day > 9 ? data.day : '0' + data.day}`,
        count: data.number
      }
      counts.push(params)
    }
  });
  var lastMonth = [];
  for (var i = 1; i < 15; i++) {
    lastMonth.unshift(moment(new Date(new Date()
      .setDate(new Date().getDate() - i))).format('YYYY-MM-DD'))
  }
  let lists = [];
  lastMonth.forEach(item => {
    counts.forEach(list => {
      if (item == list.time) {
        lists.push(item);
      }
    })
  });
  let difference = lastMonth.filter(v => !lastMonth.includes(v) || !lists.includes(v))
  difference.forEach(item => {
    let params = {
      time: item,
      date: item.substr(5, 10),
      count: 0
    }
    counts.push(params);
  })
  counts.sort(util.createComprisonFunction("time"));
  return counts;
}