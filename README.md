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

#### 云存储

- `templates/` - 模板封面图片
- `photosets/` - 相册照片

#### 控制台链接

- 环境ID: `cultural-tourism-7fb138kf77a2cb2`
- 文档型数据库: https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/db/doc
- templates 集合: https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/db/doc/collection/templates
- photoSets 集合: https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/db/doc/collection/photoSets
- 云存储: https://tcb.cloud.tencent.com/dev?envId=cultural-tourism-7fb138kf77a2cb2#/storage

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

## 开发说明

### 数据库优化记录

**2026-02-08 优化内容：**
1. ✅ 为所有文档添加了 `createTime` 和 `updateTime` 字段
2. ✅ 创建了必要的数据库索引（category、status、templateId等）
3. ✅ 实现了分类筛选功能
4. ✅ 优化了安全规则（photoSets 支持用户创建和管理）
5. ✅ 实现了搜索功能（名称和标签）
6. ✅ 实现了分页加载
7. ✅ 完善了创作模板功能

### 后续可扩展功能

1. **关联集合**（当需要时）：
   - `comments` - 评论功能
   - `likes` - 点赞记录
   - `users` - 用户信息

2. **高级功能**：
   - 模板审核管理
   - 用户个人中心
   - 模板收藏功能
   - 社交分享功能

## 维护说明

- 数据库集合和索引已优化，支持高效查询
- 云存储按功能分目录组织，便于管理
- 安全规则已配置，保护用户数据
- 所有时间字段使用时间戳格式（毫秒）
