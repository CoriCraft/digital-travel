// 云函数：上传图片到云存储
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { fileContent, cloudPath, contentType } = event

  try {
    // 将 base64 转为 Buffer
    const buffer = Buffer.from(fileContent, 'base64')

    console.log('开始上传文件:', cloudPath, '大小:', buffer.length, 'bytes')

    // 上传到云存储
    const result = await cloud.uploadFile({
      cloudPath,
      fileContent: buffer
    })

    console.log('上传成功:', result.fileID)

    // 获取临时下载链接
    const tempUrlResult = await cloud.getTempFileURL({
      fileList: [result.fileID]
    })

    const downloadURL = tempUrlResult.fileList[0]?.tempFileURL || result.fileID

    return {
      success: true,
      fileID: result.fileID,
      downloadURL
    }
  } catch (error) {
    console.error('上传失败:', error)
    return {
      success: false,
      error: error.message || '上传失败'
    }
  }
}
