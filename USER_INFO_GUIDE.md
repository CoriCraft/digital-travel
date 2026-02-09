# 用户信息完善引导功能

## 问题说明

微信小程序从2021年4月13日开始调整了用户信息获取规则：
- ❌ 不再支持通过 `wx.getUserInfo` 静默获取用户头像和昵称
- ✅ 需要用户主动授权才能获取
- ✅ 推荐使用头像昵称填写组件

## 解决方案

实现了首次启动时的用户信息完善引导页面。

## 实现内容

### 1. 新增用户信息完善页面 (`pages/user-info/`)

#### 页面功能
- ✅ **欢迎界面** - 友好的欢迎提示
- ✅ **头像选择** - 使用微信原生 `open-type="chooseAvatar"` 组件
- ✅ **昵称输入** - 使用 `type="nickname"` 输入框
- ✅ **实时验证** - 检查头像和昵称是否已填写
- ✅ **上传保存** - 头像上传到云存储，信息保存到本地
- ✅ **跳过选项** - 允许用户跳过，稍后在"我的"页面设置

#### UI 设计
- 渐变背景（绿色到白色）
- 大头像展示（160rpx）
- 清晰的表单布局
- 动态按钮状态（填写完整后才能提交）

### 2. 更新 `app.js` 启动逻辑

#### 首次启动检测
```javascript
// 尝试从本地存储获取用户信息
const storedUserInfo = wx.getStorageSync('userProfile')
if (storedUserInfo) {
  // 已有用户信息，直接恢复
  this.globalData.userInfo.nickName = storedUserInfo.nickName
  this.globalData.userInfo.avatarUrl = storedUserInfo.avatarUrl
} else {
  // 首次使用，引导用户完善信息
  setTimeout(() => {
    wx.redirectTo({
      url: '/pages/user-info/user-info'
    })
  }, 1000)
}
```

### 3. 更新 `app.json` 页面配置

将 `pages/user-info/user-info` 添加到页面列表中。

## 用户流程

### 首次使用
```
打开小程序
    ↓
获取 openid
    ↓
检测本地存储（无数据）
    ↓
自动跳转到用户信息完善页面
    ↓
用户选择头像和输入昵称
    ↓
上传头像到云存储
    ↓
保存到本地存储
    ↓
跳转到首页
```

### 再次使用
```
打开小程序
    ↓
获取 openid
    ↓
检测本地存储（有数据）
    ↓
恢复用户信息
    ↓
直接进入首页
```

### 跳过设置
```
点击"跳过"按钮
    ↓
弹出提示："跳过后可以在'我的'页面设置"
    ↓
确认后跳转到首页
    ↓
稍后可在"我的"页面设置
```

## 页面截图说明

### 用户信息完善页面
- 顶部：导航栏显示"完善个人信息"
- 中部：
  - 欢迎标题："欢迎来到数字文旅"
  - 副标题："请设置你的头像和昵称"
  - 头像选择区：圆形头像 + "点击选择头像"提示
  - 昵称输入框：白色卡片样式
- 底部：
  - "完成"按钮（填写完整后变绿色）
  - "跳过"按钮（灰色文字）

## 技术实现

### 头像选择
使用微信原生组件：
```html
<button open-type="chooseAvatar" bindchooseavatar="onChooseAvatar">
  <image src="{{userAvatar}}" />
</button>
```

### 昵称输入
使用微信推荐的 nickname 类型：
```html
<input type="nickname" bindinput="onNicknameInput" />
```

### 表单验证
```javascript
checkCanSubmit() {
  const canSubmit = userName.trim() !== '' && userAvatar !== defaultAvatar
  this.setData({ canSubmit })
}
```

### 数据保存
```javascript
// 1. 上传头像到云存储
const uploadResult = await wx.cloud.uploadFile({
  cloudPath: `avatars/${openid}_${timestamp}.jpg`,
  filePath: userAvatar
})

// 2. 更新全局数据
app.updateUserProfile(userName, uploadResult.fileID)

// 3. 自动保存到本地存储（在 updateUserProfile 中）
wx.setStorageSync('userProfile', {
  nickName: userName,
  avatarUrl: fileID
})
```

## 优势

### 1. 符合微信规范
- 使用微信推荐的头像昵称填写组件
- 不会被微信审核拒绝

### 2. 用户体验好
- 首次使用时主动引导
- 界面友好，操作简单
- 允许跳过，不强制

### 3. 数据持久化
- 保存到本地存储
- 下次启动自动恢复
- 无需重复设置

### 4. 灵活性高
- 可以跳过设置
- 可以在"我的"页面随时修改
- 支持多次更新

## 测试建议

### 1. 首次启动测试
- 清除小程序数据（开发工具 → 清缓存 → 全部清除）
- 重新启动小程序
- 应该自动跳转到用户信息完善页面

### 2. 完善信息测试
- 点击头像，选择新头像
- 输入昵称
- 点击"完成"按钮
- 检查是否成功保存并跳转到首页

### 3. 跳过测试
- 点击"跳过"按钮
- 确认提示信息
- 检查是否跳转到首页
- 进入"我的"页面，检查是否显示默认信息

### 4. 再次启动测试
- 关闭小程序
- 重新打开
- 应该直接进入首页，不再显示引导页面
- 进入"我的"页面，检查用户信息是否正确显示

### 5. 修改信息测试
- 进入"我的"页面
- 点击头像或昵称编辑图标
- 修改信息
- 检查是否成功更新

## 注意事项

### 1. 页面跳转
使用 `wx.redirectTo` 而不是 `wx.navigateTo`，避免用户返回到空白页面。

### 2. 延迟跳转
在 `app.js` 中使用 `setTimeout` 延迟1秒跳转，确保首页已经加载完成。

### 3. 本地存储键名
使用 `userProfile` 作为本地存储的键名，与"我的"页面保持一致。

### 4. 默认头像
使用 SVG 格式的默认头像，确保在未设置时也有良好的显示效果。

## 完成状态

✅ **用户信息完善引导功能已实现**
✅ **首次启动自动引导**
✅ **支持跳过设置**
✅ **数据持久化完成**

---

**实现版本**: v1.0
**实现时间**: 2026-02-09
**符合微信规范**: ✅
**环境ID**: cultural-tourism-7fb138kf77a2cb2
