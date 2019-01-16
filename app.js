const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const cors = require('koa-cors')
const router = require('./routes')()
const mongoose = require('mongoose')
const dbHosts = require('./config/db')
const services = require('./controllers/service.js')

const EventEmitter = require('events').EventEmitter
app.env = process.env.NODE_ENV
// const dbName = 'DATABASE_TEST';
// error handler
onerror(app)
// middlewares
app.use(
	bodyparser({
		enableTypes: ['json', 'form', 'text'],
	})
)
app.use(json())
app.use(logger())
app.use(require('koa-static')(__dirname + '/public'))

app.use(
	views(__dirname + '/views', {
		extension: 'pug',
	})
)
//连接数据库
mongoose.connect(
	dbHosts, {
		promiseLibrary: global.Promise,
		useNewUrlParser: true,
		poolSize: 50,
		reconnectTries: Number.MAX_VALUE,
	}
)
console.log("connet mongodb ", dbHosts)


app.use(async (ctx, next) => {
	ctx.set('Access-Control-Allow-Origin', '*')
	ctx.set('Access-Control-Allow-Credentials', 'true')
	ctx.set('Content-Type', 'text/html;charset=UTF-8;application/x-www-form-urlencoded')
	ctx.set('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS')
	ctx.set(
		'Access-Control-Allow-Headers',
		'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild'
	)
	ctx.set('Access-Control-Max-Age', 1728000)
	if (ctx.req.method == 'OPTIONS') {
		ctx.status = 204
	} else {
		await next()
	}
})

let conn = mongoose.connection
conn.on('connected', function () {
	console.info('[MonoDB]:开盘')
	services.storeData()
})
conn.once('open', function () {
	console.info('[MonoDB]:开户')
})
conn.on('error', function (err) {
	console.error(err)
})
conn.on('disconnected', function () {
	console.warn('[MonoDB]:熔断')
})
conn.on('reconnected', function () {
	console.info('[MonoDB]:重开')
})


app.use(async (ctx, next) => {
	const start = new Date()
	await next()
	const ms = new Date() - start
	console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

app.use(router.routes()).use(router.allowedMethods())
// error-handling

app.on('error', (err, ctx) => {
	console.error('server error', err, ctx)
})

console.log("----服务启动-----time:", new Date().toLocaleString())


app.listen(5001)

module.exports = app