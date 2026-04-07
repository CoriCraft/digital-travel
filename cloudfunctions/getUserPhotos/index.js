// 云函数：获取用户照片列表
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { adminId, templateId, status, keyword, page = 1, pageSize = 20 } = event

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
    const allowedRoles = ['super_admin', 'content_admin', 'support_admin']
    if (!allowedRoles.includes(admin.role)) {
      return {
        success: false,
        message: '权限不足'
      }
    }

    // 构建查询条件 - 查询用户照片（isOfficial为false或不存在）
    const conditions = [
      _.or([
        { isOfficial: false },
        { isOfficial: _.exists(false) }
      ])
    ]

    // 模板筛选
    if (templateId) {
      conditions.push({ templateId: templateId })
    }

    // 状态筛选
    if (status) {
      conditions.push({ status: status })
    }

    // 关键词搜索
    if (keyword) {
      conditions.push(
        _.or([
          { photoName: db.RegExp({ regexp: keyword, options: 'i' }) },
          { sourcePhotoSetTitle: db.RegExp({ regexp: keyword, options: 'i' }) },
          { uploaderName: db.RegExp({ regexp: keyword, options: 'i' }) },
          { userName: db.RegExp({ regexp: keyword, options: 'i' }) }
        ])
      )
    }

    const where = _.and(conditions)

    // 查询总数
    const countRes = await db.collection('photos')
      .where(where)
      .count()

    const total = countRes.total

    // 分页查询
    const skip = (page - 1) * pageSize
    const dataRes = await db.collection('photos')
      .where(where)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    // 关联查询模板名称
    const photos = dataRes.data
    const templateIds = [...new Set(photos.map(p => p.templateId).filter(Boolean))]

    let templateMap = {}
    if (templateIds.length > 0) {
      const templatesRes = await db.collection('templates')
        .where({
          _id: _.in(templateIds)
        })
        .field({ _id: true, name: true })
        .get()

      templatesRes.data.forEach(t => {
        templateMap[t._id] = t.name
      })
    }

    // 添加模板名称
    const photosWithTemplate = photos.map(photo => ({
      ...photo,
      templateName: templateMap[photo.templateId] || '未知模板'
    }))

    return {
      success: true,
      message: '获取成功',
      data: photosWithTemplate,
      total: total
    }
  } catch (error) {
    console.error('获取用户照片列表失败:', error)
    return {
      success: false,
      message: '获取失败: ' + error.message
    }
  }
}
