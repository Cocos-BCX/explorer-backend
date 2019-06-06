let host
if (process.env.NODE_ENV === 'released' || process.env.NODE_ENV === 'release') {
  host = 'mongodb://192.168.90.45/prepare'
  // host = 'mongodb://127.0.0.1/test'

} else if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing') {
  host = 'mongodb://root:xeJE0jWU@localhost/test'
} else {
  // host = 'mongodb://192.168.90.45/test'
  host = 'mongodb://localhost/newTest'
}

module.exports = exports = host