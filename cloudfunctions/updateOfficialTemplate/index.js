// 云函数：更新官方模板
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const {
    adminId,
    templateId,
    name,
    description,
    category,
    cover,
    tags,
    allowUserUpload,
    sortOrder,
    status
  } = event

  // 参数验证
  if (!adminId || !templateId) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  try {
    // 验证管理员权限
    const adminResult = await db.collection('admins')
      .doc(adminId)
      .get()

    if (!adminResult.data) {
      return {
        success: false,
        message: '权限不足'
      }
    }

    const admin = adminResult.data
    if (admin.role !== 'super_admin' && admin.role !== 'content_admin') {
      return {
        success: false,
        message: '权限不足，仅内容管理员和超级管理员可以更新官方模板'
      }
    }

    // 获取模板信息
    const templateResult = await db.collection('templates')
      .doc(templateId)
      .get()

    if (!templateResult.data) {
      return {
        success: false,
        message: '模板不存在'
      }
    }

    if (!templateResult.data.isOfficial) {
      return {
        success: false,
        message: '只能更新官方模板'
      }
    }

    // 如果修改了名称，检查是否重复
    if (name && name !== templateResult.data.name) {
      const existResult = await db.collection('templates')
        .where({
          name: name,
          isOfficial: true,
          _id: db.command.neq(templateId)
        })
        .count()

      if (existResult.total > 0) {
        return {
          success: false,
          message: '该模板名称已存在'
        }
      }
    }

    // 构建更新数据
    const updateData = {
      updateTime: db.serverDate()
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (cover !== undefined) updateData.cover = cover
    if (tags !== undefined) updateData.tags = tags
    if (allowUserUpload !== undefined) updateData.allowUserUpload = allowUserUpload
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (status !== undefined) updateData.status = status

    // 更新模板
    await db.collection('templates')
      .doc(templateId)
      .update({
        data: updateData
      })

    return {
      success: true,
      message: '更新成功'
    }
  } catch (error) {
    console.error('更新官方模板失败:', error)
    return {
      success: false,
      message: '更新失败，请稍后重试'
    }
  }
}
