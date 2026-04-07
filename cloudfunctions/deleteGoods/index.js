// 云函数：删除商品
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const {
    adminId,
    goodsId
  } = event

  if (!adminId || !goodsId) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  try {
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
        message: '权限不足，仅内容管理员和超级管理员可以删除商品'
      }
    }

    const goodsResult = await db.collection('goods')
      .doc(goodsId)
      .get()

    if (!goodsResult.data) {
      return {
        success: false,
        message: '商品不存在'
      }
    }

    await db.collection('goods')
      .doc(goodsId)
      .remove()

    return {
      success: true,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除商品失败:', error)
    return {
      success: false,
      message: '删除失败，请稍后重试'
    }
  }
}
