# Cloudflare 域名配置指南

## ✅ 已清理

- ✅ 已删除云函数 `autoRenewSSL`
- ✅ 已删除本地相关文件

---

## 🚀 Cloudflare 配置步骤

Cloudflare 是最简单的方案：**永久有效、完全自动化、完全免费**。

### 第一步：注册 Cloudflare 账号

1. 访问：https://www.cloudflare.com
2. 点击"Sign Up"注册账号
3. 验证邮箱

### 第二步：添加域名

1. 登录后，点击"Add a Site"
2. 输入域名：`yunwenlv.cn`
3. 选择"Free"计划（免费）
4. 点击"Continue"

### 第三步：修改 DNS 服务器

1. Cloudflare 会给你两个 NS 记录，类似：
   ```
   ns1.cloudflare.com
   ns2.cloudflare.com
   ```

2. 前往腾讯云域名管理：
   https://console.cloud.tencent.com/domain

3. 找到 `yunwenlv.cn`，点击"管理"

4. 找到"DNS 服务器"，点击"修改"

5. 将 DNS 服务器修改为 Cloudflare 提供的 NS 记录

6. 保存，等待生效（通常 5-10 分钟）

### 第四步：配置 DNS 记录

回到 Cloudflare，在 DNS 管理中添加记录：

#### 1. 主域名记录
```
类型: CNAME
名称: @
目标: cultural-tourism-7fb138kf77a2cb2-1400488372.tcloudbaseapp.com
代理状态: 已代理（橙色云朵图标）
```

#### 2. www 子域名记录
```
类型: CNAME
名称: www
目标: cultural-tourism-7fb138kf77a2cb2-1400488372.tcloudbaseapp.com
代理状态: 已代理（橙色云朵图标）
```

**重要**：确保"代理状态"是**已代理**（橙色云朵），这样才能使用 Cloudflare 的 SSL 证书。

### 第五步：配置 SSL/TLS

1. 在 Cloudflare 左侧菜单，点击"SSL/TLS"

2. 选择加密模式：**完全（严格）**
   - 这样可以确保 Cloudflare 到 CloudBase 的连接也是加密的

3. 点击"源服务器"标签

4. 点击"创建证书"

5. 保持默认设置，点击"创建"

6. 下载证书文件：
   - 源证书（Origin Certificate）
   - 私钥（Private Key）

### 第六步：上传证书到腾讯云

1. 打开腾讯云 SSL 证书管理：
   https://console.cloud.tencent.com/ssl

2. 点击"上传证书"

3. 填写信息：
   - 证书名称：`yunwenlv.cn-cloudflare`
   - 证书内容：粘贴 Cloudflare 的源证书
   - 私钥内容：粘贴 Cloudflare 的私钥

4. 点击"确定"上传

### 第七步：在 CloudBase 中配置域名

1. 打开 HTTP 访问服务：
   https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/env/http-access

2. 在"自定义域名"区域，点击"添加域名"

3. 填写信息：
   - 域名：`yunwenlv.cn`
   - 证书：选择刚才上传的 `yunwenlv.cn-cloudflare`

4. 点击"确定"

5. 配置"域名关联资源"：
   - 点击"新建"
   - 关联资源类型：静态网站托管
   - 域名：`yunwenlv.cn`
   - 触发路径：`/admin`（或 `/`）

### 第八步：等待生效

1. DNS 传播需要 5-10 分钟
2. 完成后，访问：`https://yunwenlv.cn/admin`
3. 应该可以正常访问后台管理页面

---

## 🎁 Cloudflare 的优势

### ✅ SSL 证书
- **永久有效**，自动续期
- 完全不需要手动操作
- 支持通配符证书

### ✅ CDN 加速
- 全球 200+ 数据中心
- 自动缓存静态资源
- 访问速度更快

### ✅ 安全防护
- DDoS 防护
- Web 应用防火墙（WAF）
- Bot 防护

### ✅ 其他功能
- 页面规则（Page Rules）
- 缓存控制
- 流量分析
- 邮件路由

### ✅ 完全免费
- 所有基础功能都免费
- 无流量限制
- 无带宽限制

---

## 📊 对比总结

| 方案 | 自动化 | 操作频率 | 成本 | 推荐指数 |
|------|--------|---------|------|---------|
| 腾讯云免费证书 | ❌ | 每90天 | 0元 | ⭐⭐ |
| Let's Encrypt + 云函数 | 95% | 每3个月 | 0元 | ⭐⭐⭐⭐ |
| **Cloudflare** | ✅ **100%** | **0次** | **0元** | ⭐⭐⭐⭐⭐ |

---

## ⚠️ 注意事项

### 1. DNS 服务器修改
- 修改 DNS 服务器后，域名的 DNS 解析将由 Cloudflare 管理
- 如果有其他子域名（如 `api.yunwenlv.cn`），需要在 Cloudflare 中添加相应的 DNS 记录

### 2. 代理状态
- 确保 CNAME 记录的代理状态是"已代理"（橙色云朵）
- 如果是"仅 DNS"（灰色云朵），将不会使用 Cloudflare 的 SSL 证书

### 3. SSL 模式
- 推荐使用"完全（严格）"模式
- 不要使用"灵活"模式（不安全）

### 4. 缓存问题
- Cloudflare 会缓存静态资源
- 如果更新了网站内容，可能需要清除缓存
- 在 Cloudflare 控制台：缓存 → 清除缓存

---

## 🔧 故障排查

### 问题1：域名无法访问

**检查**：
1. DNS 是否已生效（使用 `nslookup yunwenlv.cn`）
2. Cloudflare 的代理状态是否为"已代理"
3. CloudBase 的域名配置是否正确

### 问题2：SSL 证书错误

**检查**：
1. Cloudflare 的 SSL 模式是否为"完全（严格）"
2. CloudBase 是否上传了 Cloudflare 的源证书
3. 证书是否过期（Cloudflare 源证书有效期 15 年）

### 问题3：网站加载缓慢

**优化**：
1. 在 Cloudflare 中启用"自动压缩"
2. 启用"Brotli 压缩"
3. 配置缓存规则

---

## 📚 相关链接

- **Cloudflare 官网**：https://www.cloudflare.com
- **Cloudflare 文档**：https://developers.cloudflare.com
- **腾讯云域名管理**：https://console.cloud.tencent.com/domain
- **CloudBase HTTP 访问服务**：https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/env/http-access

---

## 🎉 完成！

配置完成后，你将拥有：
- ✅ 永久有效的 SSL 证书
- ✅ 全球 CDN 加速
- ✅ DDoS 防护
- ✅ 完全免费

**完全不需要担心证书过期问题！** 🚀
