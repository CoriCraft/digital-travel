// cloudfunctions/getUserInfo/index.js
const cloud = require('wx-server-sdk')

// Initialize cloud with dynamic environment
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  // Get user identity - this is automatically injected by WeChat
  const { OPENID, APPID, UNIONID } = cloud.getWXContext()

  console.log('User identity:', { OPENID, APPID, UNIONID })

  // Return user identity
  return {
    openid: OPENID,
    appid: APPID,
    unionid: UNIONID || null
  }
}
