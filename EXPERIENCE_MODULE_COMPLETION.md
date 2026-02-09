# 线下体验模块开发完成总结

## 完成时间
2026-02-09

## 模块概述
线下体验模块是数字文旅小程序的核心功能之一，为用户提供线下旅游景点、美食、住宿等体验地点的浏览、打卡、评价等功能。

## 已完成功能

### 1. 体验地点列表页面 (pages/experience/experience)

#### 1.1 Bento Box 卡片区域
- **4个分类卡片**：休闲玩乐、景点游玩、酒店民宿、特色农家菜
- **交互逻辑**：
  - 点击图片：跳转到该地点详情页
  - 点击卡片其他区域：切换到对应分类的 tab 并滚动到 Feed 列表
- **数据加载**：从 `locations` 集合加载 `isFeatured: true` 的精选地点
- **云存储图片**：自动转换云存储路径为临时 URL

#### 1.2 Tab 分类切换
- **6个分类**：关注、推荐、附近、美食、出片点、玩乐
- **筛选逻辑**：
  - 关注：显示所有地点（后续可接入用户关注列表）
  - 推荐：按评分排序
  - 附近：按打卡数排序（后续可接入地理位置）
  - 美食：筛选 `type: 'food'` 的地点
  - 出片点：筛选 `isHot: true` 的热门地点
  - 玩乐：筛选 `type: 'leisure'` 的地点

#### 1.3 Feed 流列表
- **瀑布流布局**：展示地点卡片
- **卡片信息**：封面图、地点名称、描述、地址
- **分页加载**：每页 10 条，支持上拉加载更多
- **下拉刷新**：支持下拉刷新数据
- **点击交互**：点击卡片跳转到地点详情页

#### 1.4 全局浮动按钮
- **帮助按钮**：固定在页面右下角

### 2. 地点详情页面 (pages/location-detail/location-detail)

#### 2.1 自定义导航栏
- **透明背景**：与 template-detail 页面风格一致
- **返回按钮 + 标题**：左侧显示返回图标和地点名称
- **引入 t-icon 组件**：正确显示图标

#### 2.2 地点信息展示
- **封面图**：500rpx 高度的大图展示
- **基本信息**：地点名称、评分、标签
- **统计数据**：浏览次数、打卡人数、评论数
- **详细描述**：地点介绍文字
- **地址信息**：地址、营业时间、联系电话

#### 2.3 打卡功能
- **用户登录验证**：未登录引导去登录
- **防重复打卡**：检查用户是否已打卡
- **打卡记录**：保存到 `check_ins` 集合
- **更新统计**：自动增加地点的打卡次数
- **数据库集合**：`check_ins`
- **安全规则**：用户只能读写自己的打卡记录

#### 2.4 导航功能
- **调用微信地图**：使用 `wx.openLocation` 打开导航
- **经纬度数据**：所有地点已添加经纬度信息
- **真机可用**：开发者工具中无法测试，需在真机上使用

#### 2.5 评论评分功能
- **评论列表展示**：
  - 用户头像、昵称
  - 5星评分显示
  - 评论内容
  - 相对时间（今天、昨天、N天前）
- **空状态提示**：暂无评价时显示提示
- **写评价按钮**：跳转到写评价页面

#### 2.6 底部操作栏
- **导航按钮**：打开地图导航
- **打卡按钮**：记录用户打卡

### 3. 写评价页面 (pages/write-review/write-review)

#### 3.1 评分系统
- **5星评分**：可点击星星选择评分（1-5星）
- **默认5星**：初始评分为5星

#### 3.2 评价内容
- **多行文本输入**：最多500字
- **字数统计**：实时显示已输入字数
- **占位提示**：引导用户输入

#### 3.3 提交功能
- **用户登录验证**：未登录引导去登录
- **内容验证**：评价内容不能为空
- **保存评论**：保存到 `location_reviews` 集合
- **更新统计**：自动增加地点的评论数
- **提交反馈**：显示成功提示并返回详情页

### 4. 数据库设计

#### 4.1 locations 集合（地点信息）
```javascript
{
  _id: String,
  name: String,              // 地点名称
  description: String,       // 描述
  address: String,           // 地址
  coverImage: String,        // 封面图（云存储路径）
  type: String,              // 类型：leisure/scenic/hotel/food
  latitude: Number,          // 纬度
  longitude: Number,         // 经度
  rating: Number,            // 评分
  viewCount: Number,         // 浏览次数
  checkInCount: Number,      // 打卡次数
  ratingCount: Number,       // 评论数
  isHot: Boolean,            // 是否热门
  isFeatured: Boolean,       // 是否精选（显示在Bento Box）
  status: String,            // 状态：active/inactive
  tags: Array,               // 标签
  openTime: String,          // 营业时间
  phone: String,             // 联系电话
  order: Number              // 排序
}
```

#### 4.2 check_ins 集合（打卡记录）
```javascript
{
  _id: String,
  locationId: String,        // 地点ID
  locationName: String,      // 地点名称
  userId: String,            // 用户openid
  userName: String,          // 用户昵称
  userAvatar: String,        // 用户头像
  checkInTime: Date,         // 打卡时间
  createTime: Date           // 创建时间
}
```

**安全规则**：
```javascript
{
  "read": "auth.openid == doc.userId",
  "write": "auth.openid == doc.userId"
}
```

#### 4.3 location_reviews 集合（地点评论）
```javascript
{
  _id: String,
  locationId: String,        // 地点ID
  locationName: String,      // 地点名称
  userId: String,            // 用户openid
  userName: String,          // 用户昵称
  userAvatar: String,        // 用户头像
  rating: Number,            // 评分（1-5）
  content: String,           // 评论内容
  createTime: Date           // 创建时间
}
```

**安全规则**：
```javascript
{
  "read": true,
  "write": "auth.openid == doc.userId"
}
```

### 5. 测试数据

已创建5个测试地点：
1. **云山民宿** (hotel) - 精选
2. **五台山风景区** (scenic) - 精选
3. **古城咖啡馆** (leisure) - 精选
4. **方山风景区** (scenic)
5. **老张农家菜** (food) - 精选

所有地点已添加：
- 云存储封面图（SVG格式）
- 经纬度信息
- 完整的地点信息

## 技术实现要点

### 1. 云存储路径转换
```javascript
// 批量转换云存储路径为临时URL
const fileList = data.map(item => item.coverImage).filter(url => url && url.startsWith('cloud://'));
if (fileList.length > 0) {
  const result = await wx.cloud.getTempFileURL({ fileList });
  const urlMap = {};
  result.fileList.forEach(file => {
    if (file.status === 0) urlMap[file.fileID] = file.tempFileURL;
  });
  data.forEach(item => {
    if (item.coverImage && urlMap[item.coverImage]) {
      item.coverImage = urlMap[item.coverImage];
    }
  });
}
```

### 2. 事件冒泡控制
```xml
<!-- 使用 catchtap 阻止事件冒泡 -->
<image catchtap="onBentoImageTap" data-id="{{item._id}}" />
```

### 3. 分页加载
```javascript
// 上拉加载更多
onReachBottom() {
  if (!this.data.loading && this.data.hasMore) {
    this.loadFeedList(false);
  }
}

// 下拉刷新
onPullDownRefresh() {
  this.setData({
    page: 0,
    feedList: [],
    hasMore: true
  }, () => {
    this.loadFeedList(true);
  });
}
```

### 4. 数据库更新
```javascript
// 使用 db.command.inc 原子操作增加计数
await db.collection('locations')
  .doc(locationId)
  .update({
    data: {
      checkInCount: db.command.inc(1)
    }
  });
```

## 页面注册

已在 `app.json` 中注册以下页面：
- `pages/experience/experience` - 线下体验列表
- `pages/location-detail/location-detail` - 地点详情
- `pages/write-review/write-review` - 写评价

## 待优化功能

### 1. 地理位置功能
- [ ] 接入微信地理位置API
- [ ] 实现"附近"tab的真实距离排序
- [ ] 打卡时验证用户是否在地点附近

### 2. 用户关注功能
- [ ] 实现用户关注地点功能
- [ ] "关注"tab显示用户关注的地点

### 3. Bento Box 多图展示
- [ ] 每个分类展示多个地点的图片
- [ ] 图片轮播或网格展示

### 4. 搜索功能
- [ ] 实现地点搜索功能
- [ ] 支持按名称、标签搜索

### 5. 分享功能
- [ ] 实现地点分享到微信好友/朋友圈
- [ ] 生成分享卡片

### 6. 图片上传
- [ ] 用户打卡时可上传照片
- [ ] 评论时可上传图片

## 测试建议

### 开发者工具测试
- ✅ 页面布局和样式
- ✅ 数据加载和显示
- ✅ Tab切换
- ✅ 分页加载
- ✅ 下拉刷新
- ✅ 打卡功能（需登录）
- ✅ 评论功能（需登录）

### 真机测试
- ⚠️ 导航功能（开发者工具无法测试）
- ⚠️ 地理位置获取
- ⚠️ 分享功能
- ⚠️ 性能和流畅度

## 相关文档

- [数据库直接访问说明](./DATABASE_DIRECT_ACCESS.md)
- [用户认证实现](./USER_AUTH_IMPLEMENTATION.md)
- [用户信息指南](./USER_INFO_GUIDE.md)

## 开发者备注

1. **导航功能**：在开发者工具中会显示 `ERR_UNKNOWN_URL_SCHEME` 错误，这是正常的，真机上可以正常使用。

2. **云存储路径**：所有图片使用云存储，环境ID为 `1400488372`，路径格式为 `cloud://1400488372.xxxx`。

3. **安全规则**：
   - `check_ins` 集合：用户只能读写自己的记录
   - `location_reviews` 集合：所有人可读，仅作者可写
   - `locations` 集合：需要设置合适的权限（建议所有人可读，仅管理员可写）

4. **性能优化**：
   - 使用分页加载，避免一次加载过多数据
   - 云存储图片批量转换，减少请求次数
   - 使用 `wx.pageScrollTo` 实现平滑滚动

## 总结

线下体验模块已完整实现，包括地点浏览、详情查看、打卡、导航、评论评分等核心功能。数据库结构清晰，安全规则完善，交互体验良好。后续可根据用户反馈和业务需求，逐步完善地理位置、用户关注、搜索等高级功能。
