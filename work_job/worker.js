

const {
    isMainThread, parentPort, workerData, threadId,
    MessageChannel, MessagePort, Worker } = require('worker_threads');


const Pool = require("worker-threads-pool")
let workSize = 1
var workerList = []
let post = 0
let blockNumList = []
const jobFile = "C:\\nodeapp\\explorer-source\\work_job\\job.js"

initWorkerPool()

/**
 * 初始化 workSize条线程
 * */
function initWorkerPool() {
    for(let i=0; i<workSize; i++) {
        let worker = new Worker(jobFile)
        workerList.push(worker)
    }
}

function workerSynBlock() {
    saveBlock()
}


/**
 * 取出一个线程, 轮流
 * */
exports.getWork = function() {
    let w = workerList[post]
    post ++
    if (post >= workerList.length) {
        post = 0
    }
    return w
}
