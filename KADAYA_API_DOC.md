# 云裳一刻 AI 打卡机后台 API 文档

本文档记录了 `https://kadaya.xcastle.net/` 管理后台的核心接口逻辑，用于自动化脚本开发及数据对齐。

## 1. 基础信息
- **API 根地址**: `https://api-magicscreen.xcastle.net/-/txry`
- **OSS 资源根地址**: `https://s0.xcastle.net/`
- **认证方式**: 在 HTTP Header 中携带 `x-auth-token`。

---

## 2. 认证流程 (Authentication)

### 2.1 登录接口
用于获取访问令牌（Token）。该系统不使用 Cookie，完全依赖 Header 鉴权。

- **URL**: `/passport/login`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "username": "bjlgdx",
    "password": "密码"
  }
  ```
- **核心响应**:
  - `data.token`: 后续所有请求必须携带的字符串。
  - `data.privileges`: 权限列表，决定了当前账号能调用哪些接口。

---

## 3. 订单管理接口 (Order Management)

### 3.1 获取订单列表 (分页)
支持搜索、分页，默认按创建时间倒序（最新的在最前面）。

- **URL**: `/v2/order/pageList`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "pageNum": 1,
    "pageSize": 10,
    "filters": {
      "storeId": 371,
      "businessOrderId": "",  // 业务单号搜索
      "paymentOrderNo": "",   // 支付单号搜索
      "phone": "",            // 手机号搜索
      "payStatus": null       // 1:已支付, 0:未支付
    }
  }
  ```
- **关键返回字段**:
  - `id`: **系统内部 ID**（详情接口必传）。
  - `businessOrderId`: 业务层面的唯一订单号。
  - `paymentOrderNo`: **支付凭证单号**（微信/支付宝侧的对齐指纹）。
  - `phone`: 用户手机号（目前观察多为 `null`）。

### 3.2 获取订单详情
用于获取订单关联的照片下载地址。

- **URL**: `/v2/order?id={internal_id}`
- **Method**: `GET`
- **响应结构 (`data`)**:
  - `businessData`: 数组，包含处理后的业务照片。
    - `picUrl`: 图片相对路径。
  - `originalityPicUrl`: **用户原始照片路径**（最高清晰度）。

---

## 4. 图片资源获取 (Image Retrieval)

### 4.1 下载逻辑
系统没有专门的二进制下载流接口，直接通过 OSS 公网地址访问。

- **拼接规则**: `BASE_OSS` + `picUrl`
- **示例**: `https://s0.xcastle.net/screen/20260104/DMN088/1767517782585/original.jpg`
- **注意**:
  - 图片体积通常在 **0.8MB - 1.5MB** 之间（原图）。
  - 下载时建议携带 `x-auth-token` 的 Header（虽然部分资源可能允许匿名访问，但携带 Token 更稳定）。

---

## 5. 关键业务逻辑说明

### 5.1 Token 刷新
- **机制**: 滑动窗口。
- **说明**: 接口没有返回 `expires_in`。只要持续调用任何业务接口（如 `pageList`），Token 的有效期会在服务端自动延长。若长时间（约 2 小时以上）无操作，Token 将失效。

### 5.2 用户对齐凭证优先序
由于手机号（`phone`）字段大概率为空，建议的对齐优先级为：
1. **`paymentOrderNo` (支付单号)**：最强凭证，可直接与微信支付流水对齐。
2. **`businessOrderId` (业务单号)**：其次，可与前端展示的订单号对齐。
3. **`id` (内部自增 ID)**：仅用于 API 间跳转。
