// 图片内容安全审核云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { value } = event

  try {
    // 调用微信官方图片安全审核接口
    const result = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: 'image/png',
        value: Buffer.from(value)
      }
    })

    return {
      success: true,
      errCode: result.errCode,
      errMsg: result.errMsg
    }
  } catch (err) {
    console.error('图片审核失败:', err)

    // 如果是违规内容，返回特定错误码
    if (err.errCode === 87014) {
      return {
        success: false,
        errCode: 87014,
        errMsg: '图片包含违法违规内容'
      }
    }

    // 其他错误
    return {
      success: false,
      errCode: err.errCode || -1,
      errMsg: err.errMsg || '图片审核失败'
    }
  }
}
