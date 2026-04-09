// 云函数：生成电子相册小程序码
const axios = require('axios')

const APPID = process.env.APPID
const APPSECRET = process.env.APPSECRET

async function getAccessToken() {
  const res = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
    params: {
      grant_type: 'client_credential',
      appid: APPID,
      secret: APPSECRET
    }
  })
  if (res.data.errcode) {
    throw new Error(`获取access_token失败: ${res.data.errmsg}`)
  }
  return res.data.access_token
}

exports.main = async (event, context) => {
  const { albumId } = event

  if (!albumId) {
    return { success: false, message: '缺少相册ID参数' }
  }

  try {
    const accessToken = await getAccessToken()

    const result = await axios.post(
      `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`,
      {
        scene: `code=${albumId}`,
        page: 'pages/template/template',
        check_path: false,
        width: 280,
        is_hyaline: false,
        env_version: 'trial'
      },
      { responseType: 'arraybuffer' }
    )

    // 微信返回错误时 content-type 是 application/json
    const contentType = result.headers['content-type'] || ''
    if (contentType.includes('application/json')) {
      const errInfo = JSON.parse(Buffer.from(result.data).toString('utf8'))
      throw new Error(`微信接口错误: ${errInfo.errmsg} (${errInfo.errcode})`)
    }

    return {
      success: true,
      buffer: result.data,
      contentType: contentType
    }
  } catch (error) {
    console.error('生成小程序码失败:', error.message)
    return {
      success: false,
      message: '生成失败',
      error: error.message
    }
  }
}
