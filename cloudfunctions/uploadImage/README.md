# 云函数部署指南

## 部署 uploadImage 云函数

### 方法一：使用微信开发者工具部署

1. 打开微信开发者工具

2. 打开项目：`D:\学习\助管\数字文旅\digital-travel`

3. 在左侧目录树中找到 `cloudfunctions/uploadImage`

4. 右键点击 `uploadImage` 文件夹

5. 选择 **上传并部署：云端安装依赖**

6. 等待部署完成（会自动安装 wx-server-sdk 依赖）

### 方法二：使用命令行部署

```bash
# 进入云函数目录
cd "D:\学习\助管\数字文旅\digital-travel\cloudfunctions\uploadImage"

# 安装依赖
npm install

# 使用 tcb CLI 部署（需要先安装 @cloudbase/cli）
tcb login
tcb fn deploy uploadImage --envId cultural-tourism-7fb138kf77a2cb2
```

## 验证部署

部署完成后，在微信开发者工具中：

1. 点击左侧 **云开发** 按钮

2. 进入 **云函数** 页面

3. 应该能看到 `uploadImage` 函数

4. 点击函数名称，可以查看详情和测试

## 测试云函数

在云函数详情页面，点击 **测试** 按钮，输入测试数据：

```json
{
  "fileContent": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "cloudPath": "test/test.png",
  "contentType": "image/png"
}
```

如果返回：

```json
{
  "success": true,
  "fileID": "cloud://...",
  "downloadURL": "https://..."
}
```

说明部署成功。

## 权限配置

确保云函数有云存储的访问权限：

1. 在云开发控制台，进入 **云函数** → **uploadImage**

2. 点击 **权限设置**

3. 确保勾选了 **云存储** 权限

## 完成后

部署完成后，刷新管理后台页面，重新尝试上传图片，应该可以成功上传了。
