const bcx = require('../lib/bcx.min.js')

let bcxNodes = []
// bcxNodes.push({
//     url: 'ws://47.93.62.96:8050',
//     name: 'COCOS节点1',
//     ip: '47.93.62.96'
// })
// bcxNodes.push({
//     url: 'ws://39.96.33.61:8080',
//     name: 'COCOS节点2',
//     ip: '39.96.33.61'
// })
// bcxNodes.push({
//     url: 'ws://39.96.29.40:8050',
//     name: 'COCOS节点3',
//     ip: '39.96.29.40'
// })
// bcxNodes.push({
//     url: 'ws://39.106.126.54:8050',
//     name: 'COCOS节点4',
//     ip: '39.106.126.54'
// })

bcxNodes.push({
    url: "ws://39.106.126.54:8040",
    name: "COCOS3.0节点2",
    ip: '39.106.126.54'
})
bcxNodes.push({
    url: "ws://47.93.62.96:8049",
    name: "COCOS3.0节点1",
    ip: '47.93.62.96'
})
// bcxNodes.push({
//     url: "ws://192.168.81.129:8090",
//     name: "COCOS3.0节点1",
//     ip: '192.168.81.129'
// })

let nodeIndex = 0
let node = bcxNodes[nodeIndex]

module.exports = new BCX({
    default_ws_node: node.url,
    ws_node_list: [{
        url: node.url,
        name: node.name
    }],
    networks: [{
        core_asset: 'COCOS',
        chain_id: '7d89b84f22af0b150780a2b121aa6c715b19261c8b7fe0fda3a564574ed7d3e9'
        // chain_id: 'b9e7cee4709ddaf08e3b7cba63b71c211c845e37c9bf2b865a7b2a592c8adb28'
        // chain_id: '92fbb36866f823592e183bf129c9cc9011378686dc099224b7d98d5042313096'
    }],
    faucet_url: 'http://47.93.62.96:8041',
    auto_reconnect: true,
    worker: false
})

exports.changeNode = function () {
    console.log('---changeNode---切换节点,time:', new Date())

    if (nodeIndex == bcxNodes.length - 1) {
        nodeIndex = 0
    } else {
        nodeIndex += 1
        node = bcxNodes[nodeIndex]
    }
    console.log(
        '---changeNode---切换节点结束---nodeIndex:',
        nodeIndex,
        'ip:',
        node.ip,
        ',name:',
        node.name
    )
}