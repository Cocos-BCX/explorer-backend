const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const router = require('./routes')()
const mongoose = require('mongoose')
const dbHosts = require('./config/db')
const storeBlock = require('./controllers/store.js')
app.env = process.env.NODE_ENV
app.use(async (ctx, next) => {
  await storeBlock.subscribeToBlocks(ctx, next)
  await next()
})