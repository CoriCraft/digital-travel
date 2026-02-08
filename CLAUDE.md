# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WeChat Mini Program (微信小程序) for a digital travel/tourism project (数字文旅), featuring creative templates, offline experiences, product purchases, photo albums, and user profile functionality.

## Development Setup

### Initial Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Import the project into WeChat Developer Tools (微信开发者工具)
4. Ensure `project.config.json` is present in the root directory (contains AppID, gitignored for security)
5. Build npm packages: In WeChat Developer Tools, go to Tools (工具) → Build npm (构建 npm)
6. Compile and run using the compile button in the simulator

### Important Configuration Files

- `project.config.json` - Contains AppID and build settings, gitignored but required for development
- `app.json` - Defines tab bar pages and global window settings
- Custom tab bar is enabled via `"custom": true` in app.json

## Architecture

### Global State Management

The app stores global data in `app.js` via `App.globalData`:
- `userInfo`: User information
- `statusBarHeight`: Device status bar height (calculated on launch)
- `navBarHeight`: Navigation bar height (calculated based on menu button position)

Access global data in pages using `getApp().globalData`.

### Custom Tab Bar

The project uses a custom tab bar component located in `/custom-tab-bar/`:
- Defined as a Component with 5 tabs: 创意模板, 线下体验, 产品购买, 电子相册, 我的
- Each page must call `this.getTabBar().setData({ value: 'pageName' })` in `onShow()` to highlight the active tab
- Navigation handled via `wx.switchTab()`

### Page Structure

Each page follows WeChat Mini Program conventions with 4 files:
- `.js` - Page logic
- `.wxml` - Template markup
- `.wxss` - Styles
- `.json` - Page configuration

Main pages:
- `pages/template/template` - Creative templates page (default/home)
- `pages/experience/experience` - Offline experiences
- `pages/purchase/purchase` - Product purchases
- `pages/album/album` - Photo album
- `pages/my/my` - User profile

### Navigation Configuration

- Navigation style is set to `"custom"` globally in `app.json`, meaning pages implement custom navigation bars
- Pages use `statusBarHeight` and `navBarHeight` from global data to position content correctly below custom navigation

### Dependencies

- `tdesign-miniprogram` (^1.12.2) - TDesign UI component library for WeChat Mini Programs

## File Conventions

- LESS is used for styling in the custom tab bar (compiled to WXSS)
- Standard WXSS is used in pages
- CommonJS module format (`module.exports`, `require`)
- Component framework: `glass-easel` (specified in app.json)

## Build Notes

- `miniprogram_npm/` is generated from `node_modules/` via WeChat Developer Tools
- Both directories are gitignored
- After adding npm dependencies, always run "Build npm" in WeChat Developer Tools

## Language Preference

**本项目全程使用中文回答** - This project requires all responses in Chinese.
