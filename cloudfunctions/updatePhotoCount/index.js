// 云函数：更新所有模板的照片数量
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    console.log('开始更新模板照片数量...')

    // 1. 获取所有模板
    const templatesResult = await db.collection('templates').get()
    const templates = templatesResult.data
    console.log(`找到 ${templates.length} 个模板`)

    const results = []

    // 2. 为每个模板统计照片数量
    for (const template of templates) {
      const templateId = template._id

      // 统计该模板的照片数量
      const photosResult = await db.collection('photos')
        .where({
          templateId: templateId,
          status: 'approved'
        })
        .count()

      const photoCount = photosResult.total

      // 更新模板的照片数量
      await db.collection('templates').doc(templateId).update({
        data: {
          photoSetCount: photoCount
        }
      })

      const result = {
        templateId,
        templateName: template.name,
        photoCount
      }

      console.log(`模板 "${template.name}" (${templateId}): ${photoCount} 张照片`)
      results.push(result)
    }

    return {
      success: true,
      message: '所有模板照片数量更新完成',
      totalTemplates: templates.length,
      results
    }
  } catch (err) {
    console.error('更新失败:', err)
    return {
      success: false,
      message: '更新失败',
      error: err.message
    }
  }
}
