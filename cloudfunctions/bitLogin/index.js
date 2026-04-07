'use strict'

const CAS_RESTAPI = 'https://sso.bit.edu.cn/cas/v1/tickets'

exports.main = async (event) => {
  // HTTP 访问时参数在 body 里，直接调用时在 event 里
  let params = event
  if (event.body) {
    try {
      params = JSON.parse(event.body)
    } catch {
      params = event
    }
  }
  const { username, password, service } = params

  if (!username || !password || !service) {
    return { code: 400, message: '缺少参数 username/password/service' }
  }

  // 1. 获取 TGT
  const r1 = await fetch(CAS_RESTAPI, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    redirect: 'manual'
  })

  if (r1.status !== 201) {
    const body = await r1.text()
    return { code: 401, message: `用户名或密码错误 (${r1.status})`, body: body.slice(0, 500) }
  }

  const tgtUrl = r1.headers.get('location')
  if (!tgtUrl) {
    return { code: 500, message: '无法获取 TGT' }
  }

  // 2. 用 TGT 换 ST
  const r2 = await fetch(tgtUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `service=${encodeURIComponent(service)}`
  })

  if (r2.status !== 200) {
    return { code: 500, message: `获取 ST 失败 (${r2.status})` }
  }

  const st = (await r2.text()).trim()

  const sep = service.includes('?') ? '&' : '?'

  return {
    code: 200,
    tgt: tgtUrl,
    st,
    serviceUrl: `${service}${sep}ticket=${st}`
  }
}
