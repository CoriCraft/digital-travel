// 云函数：更新照片集浏览次数和点赞
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { photoSetId, action, increment } = event

  if (!photoSetId) {
    return {
      success: false,
      message: '缺少photoSetId参数'
    }
  }

  try {
    // 根据action决定更新哪个字段
    const updateData = {}

    if (action === 'like') {
      // 更新点赞数
      updateData.likeCount = _.inc(increment || 1)
    } else {
      // 默认更新浏览次数
      updateData.viewCount = _.inc(1)
    }

    await db.collection('photoSets')
      .doc(photoSetId)
      .update({
        data: updateData
      })

    return {
      success: true,
      message: action === 'like' ? '点赞更新成功' : '浏览次数更新成功'
    }
  } catch (err) {
    console.error('更新失败:', err)
    return {
      success: false,
      message: err.message
    }
  }
}
