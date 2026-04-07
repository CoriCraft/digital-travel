// 云函数：修复所有模板的照片数量统计
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { adminId } = event

  try {
    // 验证管理员权限
    const adminRes = await db.collection('admins').doc(adminId).get()
    if (!adminRes.data || adminRes.data.length === 0) {
      return {
        success: false,
        message: '管理员不存在'
      }
    }

    const admin = adminRes.data[0] || adminRes.data
    if (admin.role !== 'super_admin') {
      return {
        success: false,
        message: '权限不足，仅超级管理员可以执行此操作'
      }
    }

    // 获取所有模板
    const templatesRes = await db.collection('templates').get()
    const templates = templatesRes.data

    const results = []
    let successCount = 0
    let errorCount = 0

    // 遍历每个模板，统计实际照片数量
    for (const template of templates) {
      try {
        // 统计该模板下已审核通过的照片数量
        const photosCountRes = await db.collection('photos')
          .where({
            templateId: template._id,
            status: 'approved'
          })
          .count()

        const actualCount = photosCountRes.total
        const oldCount = template.photoSetCount || 0

        // 如果数量不一致，更新模板
        if (actualCount !== oldCount) {
          await db.collection('templates').doc(template._id).update({
            data: {
              photoSetCount: actualCount,
              updateTime: new Date()
            }
          })

          results.push({
            templateId: template._id,
            templateName: template.name,
            oldCount: oldCount,
            newCount: actualCount,
            status: 'updated'
          })
          successCount++
        } else {
          results.push({
            templateId: template._id,
            templateName: template.name,
            count: actualCount,
            status: 'correct'
          })
        }
      } catch (error) {
        console.error(`处理模板 ${template._id} 失败:`, error)
        results.push({
          templateId: template._id,
          templateName: template.name,
          status: 'error',
          error: error.message
        })
        errorCount++
      }
    }

    return {
      success: true,
      message: `修复完成：${successCount} 个模板已更新，${errorCount} 个失败`,
      data: {
        totalTemplates: templates.length,
        successCount: successCount,
        errorCount: errorCount,
        details: results
      }
    }
  } catch (error) {
    console.error('修复照片数量失败:', error)
    return {
      success: false,
      message: '修复失败: ' + error.message
    }
  }
}
