const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const BASE_API = 'https://api-magicscreen.xcastle.net/-/txry'
const BASE_OSS = 'https://s0.xcastle.net/'
const INVALID_PATHS = new Set(['screen/app-privacy.svg', '', null, undefined])

async function login() {
  const username = process.env.KADAYA_USERNAME || 'bjlgdx'
  const password = process.env.KADAYA_PASSWORD
  const resp = await axios.post(`${BASE_API}/passport/login`, { username, password })
  if (resp.data.code !== '100') throw new Error(`登录失败: ${resp.data.message}`)
  const token = resp.data.data.token
  await cloud.database().collection('kadaya_config').doc('auth').set({
    data: { token, updatedAt: Date.now() }
  })
  return token
}

async function getToken() {
  try {
    const res = await cloud.database().collection('kadaya_config').doc('auth').get()
    if (!res.data || !res.data.token) throw new Error('token 不存在')
    return res.data.token
  } catch {
    return login()
  }
}

async function callApi(method, path, data, token) {
  const makeRequest = (t) =>
    axios({ method, url: `${BASE_API}${path}`, data: data || undefined, headers: { 'x-auth-token': t } })

  let resp
  try {
    resp = await makeRequest(token)
  } catch (err) {
    if (err.response && err.response.status === 401) {
      const newToken = await login()
      const retryResp = await makeRequest(newToken)
      return { data: retryResp.data, token: newToken }
    }
    throw err
  }

  // 旅拍机 API 有时返回 HTTP 200 但 code 非 100（静默鉴权失败），需重新登录
  if (resp.data && resp.data.code !== undefined && resp.data.code !== '100') {
    console.warn(`[!] API 返回 code=${resp.data.code}，重新登录后重试`)
    const newToken = await login()
    const retryResp = await makeRequest(newToken)
    return { data: retryResp.data, token: newToken }
  }

  return { data: resp.data, token }
}

async function downloadAndUpload(picPath, cloudPath) {
  if (INVALID_PATHS.has(picPath)) return null
  try {
    const resp = await axios.get(`${BASE_OSS}${picPath}`, { responseType: 'arraybuffer', timeout: 30000 })
    const result = await cloud.uploadFile({ cloudPath, fileContent: Buffer.from(resp.data) })
    return result.fileID
  } catch (err) {
    console.warn(`[!] 跳过照片 ${picPath}：${err.message}`)
    return null
  }
}

exports.main = async (event, context) => {
  const { businessOrderId } = event
  if (!businessOrderId || !businessOrderId.trim()) {
    return { success: false, message: '请提供订单号' }
  }

  const db = cloud.database()
  const col = db.collection('kadaya_orders')

  // 优先查本地缓存
  const cached = await col.where({ businessOrderId }).get()
  if (cached.data.length > 0) {
    return { success: true, order: cached.data[0], fromCache: true }
  }

  // 本地没有，实时从旅拍机后台抓取
  let token = await getToken()

  // 策略1：用 businessOrderId 过滤搜索
  let foundOrder = null
  const searches = [
    { businessOrderId },
    { paymentOrderNo: businessOrderId } // 兼容用户输入支付单号
  ]

  for (const filters of searches) {
    const { data: listResp, token: newToken } = await callApi(
      'post', '/v2/order/pageList',
      { pageNum: 1, pageSize: 10, filters },
      token
    )
    token = newToken
    const list = listResp.data && listResp.data.list ? listResp.data.list : []
    console.log(`[搜索] filters=${JSON.stringify(filters)} 返回 ${list.length} 条`)
    // 精确匹配，避免模糊搜索误命中
    foundOrder = list.find(o => o.businessOrderId === businessOrderId || o.paymentOrderNo === businessOrderId) || null
    if (foundOrder) break
  }

  // 策略2：过滤搜不到，翻前5页全量比对（兜底）
  if (!foundOrder) {
    console.log('[兜底] 开始翻页全量查找...')
    outer: for (let page = 1; page <= 5; page++) {
      const { data: listResp, token: newToken } = await callApi(
        'post', '/v2/order/pageList',
        { pageNum: page, pageSize: 20, filters: {} },
        token
      )
      token = newToken
      const list = listResp.data && listResp.data.list ? listResp.data.list : []
      const ids = list.map(o => o.businessOrderId)
      console.log(`[兜底] 第${page}页 ${list.length} 条: ${ids.join(', ')}`)
      foundOrder = list.find(o => o.businessOrderId === businessOrderId || o.paymentOrderNo === businessOrderId) || null
      if (foundOrder || list.length < 20) break outer
    }
  }

  if (!foundOrder) {
    return { success: false, message: '未找到该订单，请确认订单号是否正确' }
  }

  const { id: internalId } = foundOrder

  // 拉取订单详情
  const { data: detailResp } = await callApi('get', `/v2/order?id=${internalId}`, null, token)
  const orderData = detailResp.data || {}

  if (orderData.payStatus !== 1) {
    return { success: false, message: '该订单尚未支付，暂无照片' }
  }

  // 下载业务照片
  const photos = []
  const businessData = orderData.businessData || []
  for (let i = 0; i < businessData.length; i++) {
    const picUrl = businessData[i] && businessData[i].picUrl
    const fileID = await downloadAndUpload(
      picUrl,
      `kadaya-photos/${businessOrderId}/photo_${i + 1}.jpg`
    )
    if (fileID) photos.push(fileID)
  }

  // 下载并存储原始照片（不对用户展示）
  const originalPhoto = await downloadAndUpload(
    orderData.originalityPicUrl,
    `kadaya-photos/${businessOrderId}/original.jpg`
  )

  const record = {
    businessOrderId,
    internalId,
    photos,
    originalPhoto: originalPhoto || null,
    totalCount: photos.length,
    payTime: orderData.payTime || null,
    syncedAt: db.serverDate()
  }

  await col.add({ data: record })

  return { success: true, order: record, fromCache: false }
}
