# digital-travel

数字文旅项目的小程序端

# 本地部署步骤

## git clone

```bash
git clone https://github.com/CoriCraft/digital-travel.git
```

## 导入微信开发者工具

打开微信开发者工具->导入->选中本地仓库->选择 AppId->打开

## 粘贴 project.config.json 到项目根目录

project.config.json 含有 AppId，已被 gitignore

## 在根目录安装依赖

```bash
npm install
```

## 将 node_module 转为 miniprogram_npm

开发者工具左上角->工具->构建 npm

## 编译运行

模拟器右上角编译运行按钮
