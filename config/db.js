let host
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing') {
	host = 'mongodb://192.168.90.45/test'
} else {
	host = 'mongodb://localhost/test'
}

module.exports = exports = host