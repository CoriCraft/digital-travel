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
  await cloud.database().collection('kadaya_config').doc('auth').update({
    data: { token, updatedAt: Date.now() }
  }).catch(() =>
    cloud.database().collection('kadaya_config').doc('auth').set({
      data: { token, updatedAt: Date.now(), syncCursor: 0 }
    })
  )
  return token
}

async function getConfig() {
  try {
    const res = await cloud.database().collection('kadaya_config').doc('auth').get()
    return res.data || {}
  } catch {
    return {}
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
  const db = cloud.database()
  const col = db.collection('kadaya_orders')

  const config = await getConfig()
  let token = config.token || await login()
  // syncCursor：上次完整扫描到的最小 internalId，比它小的都已处理过（跳过）
  const syncCursor = config.syncCursor || 0

  let pageNum = 1
  let totalNew = 0
  let minInternalIdThisRun = Infinity

  outer: while (true) {
    const { data: listResp, token: newToken } = await callApi(
      'post', '/v2/order/pageList',
      { pageNum, pageSize: 20, filters: {} },
      token
    )
    token = newToken

    const orders = listResp.data && listResp.data.list ? listResp.data.list : []
    if (!orders.length) break

    for (const order of orders) {
      const { id: internalId, businessOrderId } = order

      // 已到上次扫描过的位置，后面全部处理过，停止
      if (internalId <= syncCursor) {
        console.log(`[游标] 到达上次同步位置 internalId=${internalId}，停止`)
        break outer
      }

      // 记录本次扫描的最小 internalId（用于更新游标）
      minInternalIdThisRun = Math.min(minInternalIdThisRun, internalId)

      // 已在 DB（按需抓取过的），跳过
      const { total } = await col.where({ businessOrderId }).count()
      if (total > 0) continue

      // 拉取订单详情
      const { data: detailResp } = await callApi('get', `/v2/order?id=${internalId}`, null, token)
      const orderData = detailResp.data || {}

      // 未支付，跳过（但游标照常推进）
      if (orderData.payStatus !== 1 || !orderData.businessData || orderData.businessData.length === 0) {
        console.log(`[跳过] 订单 ${businessOrderId} 未支付或无照片（payStatus=${orderData.payStatus}）`)
        continue
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

      // 存储原始照片（不对用户展示）
      const originalPhoto = await downloadAndUpload(
        orderData.originalityPicUrl,
        `kadaya-photos/${businessOrderId}/original.jpg`
      )

      await col.add({
        data: {
          businessOrderId,
          internalId,
          photos,
          originalPhoto: originalPhoto || null,
          totalCount: photos.length,
          payTime: orderData.payTime || null,
          syncedAt: db.serverDate()
        }
      })

      totalNew++
      console.log(`[+] 同步订单 ${businessOrderId}，${photos.length} 张照片`)
    }

    if (orders.length < 20) break
    pageNum++
  }

  // 更新游标：取本次扫到的最小 internalId 与原游标的较小值
  if (minInternalIdThisRun !== Infinity) {
    const newCursor = Math.min(minInternalIdThisRun, syncCursor === 0 ? minInternalIdThisRun : syncCursor)
    await db.collection('kadaya_config').doc('auth').update({
      data: { token, updatedAt: Date.now(), syncCursor: newCursor }
    })
    console.log(`[游标] 更新 syncCursor=${newCursor}`)
  }

  console.log(`[√] 同步完成，新增 ${totalNew} 条`)
  return { success: true, newOrders: totalNew }
}
