// 云函数：查询模板列表（用于调试）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 获取所有模板数据
    const result = await db.collection('templates').get()

    console.log('查询到的模板数量:', result.data.length)
    console.log('模板数据:', JSON.stringify(result.data, null, 2))

    return {
      success: true,
      count: result.data.length,
      templates: result.data
    }
  } catch (err) {
    console.error('查询模板失败:', err)
    return {
      success: false,
      error: err
    }
  }
}
