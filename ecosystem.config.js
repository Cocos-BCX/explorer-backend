// ecosystem.config.js
module.exports = {
  apps: [{
    // 生产环境
    name: "source",
    // 项目启动入口文件
    script: "./app.js",
    // 项目环境变量
    env: {
      "NODE_ENV": "source",
      "PORT": 5001
    }
  }, {
    // 测试环境
    name: "testing",
    script: "./app.js",
    env: {
      "NODE_ENV": "testing",
      "PORT": 5001
    }
  }, {
    // 预发布环境
    name: "released",
    script: "./app.js",
    env: {
      "NODE_ENV": "released",
      "PORT": 5001
    }
  }]
}