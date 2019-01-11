
const {
    isMainThread, parentPort, workerData, threadId,
    MessageChannel, MessagePort, Worker } = require('worker_threads');
const store = require("../controllers/store")

syncBlockJob()

function syncBlockJob() {

    parentPort.on("message", async (value) => {

        console.log(value)
        // "ctx":ctx, "next":ctx, "blockNum": i+1
        let ctx = value.ctx
        let next = value.next
        let blockNum = value.blockNum

        await store.Block(ctx, next, 1 + i)   //从链上取区块，并入库( block, transaction, user )
    })
}

