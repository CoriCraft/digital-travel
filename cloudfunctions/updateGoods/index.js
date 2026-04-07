// 云函数：更新商品
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const {
    adminId,
    goodsId,
    name,
    description,
    category,
    coverImage,
    images,
    tags,
    sortOrder,
    isRecommend,
    recommendOrder,
    status
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
        message: '权限不足，仅内容管理员和超级管理员可以更新商品'
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

    const updateData = {
      updateTime: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (coverImage !== undefined) updateData.coverImage = coverImage
    if (images !== undefined) updateData.images = images
    if (tags !== undefined) updateData.tags = tags
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (isRecommend !== undefined) updateData.isRecommend = isRecommend
    if (recommendOrder !== undefined) updateData.recommendOrder = recommendOrder
    if (status !== undefined) updateData.status = status

    await db.collection('goods')
      .doc(goodsId)
      .update({
        data: updateData
      })

    return {
      success: true,
      message: '更新成功'
    }
  } catch (error) {
    console.error('更新商品失败:', error)
    return {
      success: false,
      message: '更新失败，请稍后重试'
    }
  }
}
