# digital-travel
数字文旅项目的小程序端

## 项目架构

### CloudBase 资源

#### 文档型数据库（NoSQL）

**templates 集合** - 创意模板
- 字段：
  - `_id`: 模板ID
  - `name`: 模板名称
  - `description`: 描述
  - `category`: 分类（景区主题/风格分类/场景打卡）
  - `tags`: 标签数组
  - `cover`: 封面图片（云存储路径）
  - `isOfficial`: 是否官方模板
  - `allowUserUpload`: 是否允许用户上传
  - `status`: 状态（active/approved/pending）
  - `likeCount`: 点赞数
  - `photoSetCount`: 相册数量
  - `sort`: 排序
  - `creatorId`: 创建者ID
  - `creatorName`: 创建者名称
  - `createTime`: 创建时间（时间戳）
  - `updateTime`: 更新时间（时间戳）
- 索引：
  - `_id_`: 主键索引
  - `_openid_1`: OpenID索引
  - `category_1`: 分类索引
  - `status_1`: 状态索引
  - `createTime_-1`: 创建时间倒序索引
  - `status_1_sort_1`: 状态+排序复合索引
- 安全规则：READONLY（所有人只读）

**photoSets 集合** - 电子相册
- 字段：
  - `_id`: 相册ID
  - `title`: 标题
  - `description`: 描述
  - `templateId`: 关联的模板ID
  - `coverPhoto`: 封面照片（云存储路径）
  - `photos`: 照片数组（云存储路径）
  - `userId`: 用户ID
  - `userName`: 用户名
  - `userAvatar`: 用户头像
  - `isOfficial`: 是否官方
  - `status`: 状态（approved/pending）
  - `likeCount`: 点赞数
  - `commentCount`: 评论数
  - `viewCount`: 浏览数
  - `createTime`: 创建时间（时间戳）
  - `updateTime`: 更新时间（时间戳）
- 索引：
  - `_id_`: 主键索引
  - `_openid_1`: OpenID索引
  - `templateId_1`: 模板ID索引（重要）
  - `status_1`: 状态索引
  - `userId_1`: 用户ID索引
  - `createTime_-1`: 创建时间倒序索引
- 安全规则：CUSTOM
  - 所有人可读
  - 登录用户可创建
  - 用户只能修改/删除自己的相册

**goods 集合** - 商品信息（导流模式）
- 字段：
  - `_id`: 商品ID
  - `name`: 商品名称
  - `description`: 商品描述
  - `category`: 分类（粮油调味/土特产/文创产品）
  - `coverImage`: 封面图片（本地SVG路径或云存储路径）
  - `images`: 图片数组（云存储路径）
  - `detailImages`: 详情图片数组
  - `price`: 现价
  - `originalPrice`: 原价
  - `stock`: 库存
  - `sold`: 已售数量
  - `tags`: 标签数组
  - `tagType`: 标签类型（hot/discount-text/green/plain）
  - `isRecommend`: 是否推荐
  - `status`: 状态（active/inactive）
  - `imgWidth`: 图片宽度（用于瀑布流布局）
  - `imgHeight`: 图片高度（用于瀑布流布局）
  - `shortLink`: 商品短链接（用于复制跳转，如：#小程序://一方粮川/xxxxx）
  - `targetAppId`: 目标小程序AppID（可选，用于直接跳转）
  - `targetPath`: 目标小程序页面路径（可选）
  - `createTime`: 创建时间
  - `updateTime`: 更新时间
- 安全规则：READONLY（所有人只读）
- 导流说明：
  - 本小程序为一方粮川等商家导流，不实现完整电商功能
  - 用户点击"立即购买"后，复制商品短链接到剪贴板
  - 用户在微信聊天窗口粘贴后，自动跳转到目标小程序完成购买
  - 详见：`商品导流功能说明.md`

#### 云存储

- `templates/` - 模板封面图片
- `photosets/` - 相册照片
- `goods-images/` - 商品图片

#### 控制台链接

- 环境ID: `cultural-tourism-7fb138kf77a2cb2`
- 文档型数据库: https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/db/doc
- templates 集合: https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/db/doc/collection/templates
- photoSets 集合: https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/db/doc/collection/photoSets
- goods 集合: https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/db/doc/collection/goods
- 云存储: https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/storage
- 云函数: https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/scf

## 功能模块

### 创意模板模块

**主要功能：**
1. ✅ 模板列表展示
2. ✅ 分类筛选（全部/景区主题/风格分类/场景打卡）
3. ✅ 搜索功能（模板名称和标签搜索）
4. ✅ 排序功能（热度/发布时间）
5. ✅ 分页加载（每页20条，上拉加载更多）
6. ✅ 创作模板（用户可创建自定义模板）

**页面文件：**
- `pages/template/template.*` - 模板列表页
- `pages/create-template/create-template.*` - 创建模板页
- `pages/template-detail/template-detail.*` - 模板详情页

**核心功能实现：**

1. **搜索功能** (`pages/template/template.js`)
   - 支持模板名称模糊搜索
   - 支持标签精确匹配
   - 使用正则表达式实现模糊搜索

2. **分页加载** (`pages/template/template.js`)
   - 每页加载20条数据
   - 上拉触底自动加载更多
   - 显示加载状态和到底提示

3. **创作模板** (`pages/create-template/create-template.js`)
   - 表单验证（名称、描述、分类、标签、封面）
   - 图片上传到云存储
   - 数据保存到数据库
   - 创建的模板状态为 `pending`（待审核）

### 产品购买模块

**主要功能：**
1. ✅ 商品列表展示（瀑布流布局）
2. ✅ 分类筛选（推荐/土特产/文创产品）
3. ✅ 搜索功能（商品名称搜索）
4. ✅ 分页加载（每页20条，上拉加载更多）
5. ✅ 推荐商品轮播
6. ✅ 商品详情跳转

**页面文件：**
- `pages/purchase/purchase.*` - 商品列表页
- `pages/good-info/good-info.*` - 商品详情页（待完善）

**数据访问方式：**
- 小程序直连数据库（无需云函数）
- 使用 `wx.cloud.database()` 直接查询 goods 集合
- 性能更好，代码更简洁

**核心功能实现：**

1. **瀑布流布局** (`pages/purchase/purchase.js`)
   - 根据图片比例预估卡片高度
   - 动态分配到左右两列
   - 保持两列高度平衡

2. **分类切换** (`pages/purchase/purchase.js`)
   - 推荐：显示 `isRecommend=true` 的商品
   - 土特产/文创产品：按 `category` 字段筛选
   - 切换分类时重置列表

3. **搜索功能** (`pages/purchase/purchase.js`)
   - 支持商品名称模糊搜索
   - 使用正则表达式实现
   - 搜索时重置列表

4. **图片处理** (`pages/purchase/purchase.js`)
   - 使用 `wx.cloud.getTempFileURL()` 转换云存储路径
   - 批量获取临时URL（2小时有效期）
   - 在小程序端处理，无需云函数

## 开发说明

### 数据库优化记录

**2026-02-11 产品购买模块完善：**
1. ✅ 创建 goods 集合（商品信息）
2. ✅ 上传示例商品图片到云存储（goods-images/）
3. ✅ 插入10条测试商品数据
4. ✅ 实现商品列表页面（分类、搜索、分页）
5. ✅ 实现瀑布流布局
6. ✅ 优化为小程序直连数据库（无需云函数，性能更好）

**2026-02-08 优化内容：**
1. ✅ 为所有文档添加了 `createTime` 和 `updateTime` 字段
2. ✅ 创建了必要的数据库索引（category、status、templateId等）
3. ✅ 实现了分类筛选功能
4. ✅ 优化了安全规则（photoSets 支持用户创建和管理）
5. ✅ 实现了搜索功能（名称和标签）
6. ✅ 实现了分页加载
7. ✅ 完善了创作模板功能

### 后续可扩展功能

1. **产品购买模块待完善**：
   - 商品详情页完善
   - 购物车功能
   - 订单管理
   - 支付功能集成

2. **关联集合**（当需要时）：
   - `cart` - 购物车
   - `orders` - 订单
   - `comments` - 评论功能
   - `likes` - 点赞记录
   - `users` - 用户信息

3. **高级功能**：
   - 模板审核管理
   - 用户个人中心
   - 模板收藏功能
   - 社交分享功能

## 维护说明

- 数据库集合和索引已优化，支持高效查询
- 云存储按功能分目录组织，便于管理
- 安全规则已配置，保护用户数据
- 所有时间字段使用时间戳格式（毫秒）
