const bcx = require('../lib/bcx.min.js')
module.exports = new BCX({
    default_ws_node: "ws://47.93.62.96:8050",
    ws_node_list: [{
        url: "ws://47.93.62.96:8050",
        name: "COCOS最新测试链"
    }],
    networks: [{
        core_asset: "COCOS",
        chain_id: "53b98adf376459cc29e5672075ed0c0b1672ea7dce42b0b1fe5e021c02bda640"
    }],
    faucet_url: "http://47.93.62.96:3000",
    auto_reconnect: true,
    worker: false
})