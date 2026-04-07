// 云函数：获取用户模板列表
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { adminId, category, status, keyword, page = 1, pageSize = 20 } = event

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

    // 构建查询条件
    const where = {
      isOfficial: false  // 只查询用户模板
    }

    // 分类筛选
    if (category) {
      where.category = category
    }

    // 状态筛选
    if (status) {
      where.status = status
    }

    // 关键词搜索
    if (keyword) {
      where._ = _.or([
        { name: db.RegExp({ regexp: keyword, options: 'i' }) },
        { description: db.RegExp({ regexp: keyword, options: 'i' }) },
        { creatorName: db.RegExp({ regexp: keyword, options: 'i' }) }
      ])
    }

    // 查询总数
    const countRes = await db.collection('templates')
      .where(where)
      .count()

    const total = countRes.total

    // 分页查询
    const skip = (page - 1) * pageSize
    const dataRes = await db.collection('templates')
      .where(where)
      .orderBy('sortOrder', 'asc')
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    return {
      success: true,
      message: '获取成功',
      data: dataRes.data,
      total: total
    }
  } catch (error) {
    console.error('获取用户模板列表失败:', error)
    return {
      success: false,
      message: '获取失败: ' + error.message
    }
  }
}
