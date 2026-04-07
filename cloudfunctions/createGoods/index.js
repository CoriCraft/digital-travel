// 云函数：创建商品
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const {
    adminId,
    name,
    description,
    category,
    coverImage,
    images = [],
    tags = [],
    sortOrder = 0,
    isRecommend = false,
    recommendOrder = 0
  } = event

  if (!adminId || !name || !description || !category || !coverImage) {
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
        message: '权限不足，仅内容管理员和超级管理员可以创建商品'
      }
    }

    const result = await db.collection('goods').add({
      data: {
        name,
        description,
        category,
        coverImage,
        images,
        detailImages: [],
        tags,
        tagType: '',
        sortOrder,
        isRecommend,
        recommendOrder,
        status: 'active',
        shareCount: 0,
        copyCount: 0,
        imgWidth: 400,
        imgHeight: 400,
        targetAppId: '',
        targetPath: '',
        storeAppId: '',
        storeProductId: '',
        shortLink: '',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }
    })

    return {
      success: true,
      message: '创建成功',
      data: {
        _id: result._id
      }
    }
  } catch (error) {
    console.error('创建商品失败:', error)
    return {
      success: false,
      message: '创建失败，请稍后重试'
    }
  }
}
