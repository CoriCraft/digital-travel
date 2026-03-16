// pages/my/my.js
const app = getApp();
const { checkImageSecurity, checkOperationLimit, recordOperationTime, getRemainingTime } = require('../../utils/util.js');

function getDB() {
  return wx.cloud.database();
}

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    contentPaddingTop: 0,
    userAvatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23E8F5E9"/%3E%3Cpath d="M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 5c-13.807 0-25 11.193-25 25v10h50V75c0-13.807-11.193-25-25-25z" fill="%233ECE79"/%3E%3C/svg%3E',
    userName: '微信用户',
    userPhone: '',
    checkInCount: 0,
    registerDays: 1,
    unreadCount: 0
  },

  onLoad() {
    const sbHeight = Number(app.globalData.statusBarHeight) || 0;
    const nbHeight = Number(app.globalData.navBarHeight) || 0;

    this.setData({
      statusBarHeight: sbHeight,
      navBarHeight: nbHeight,
      contentPaddingTop: sbHeight + nbHeight
    });

    this.loadUserInfo();
  },

  async loadUserInfo() {
    const userInfo = await app.ensureUserInfo();
    if (userInfo) {
      this.setData({
        userName: userInfo.nickName || '微信用户',
        userAvatar: userInfo.avatarUrl || this.data.userAvatar
      });
    }

    await this.loadStatistics();

    setTimeout(() => {
      this.loadUnreadCount();
    }, 500);
  },

  async loadStatistics() {
    const userInfo = await app.ensureUserInfo();
    if (!userInfo || !userInfo.openid) {
      console.log('用户信息未准备好，跳过统计加载');
      return;
    }

    const db = getDB();

    db.collection('check_ins')
      .where({
        userId: userInfo.openid
      })
      .count()
      .then(res => {
        this.setData({ checkInCount: res.total });
      })
      .catch(err => {
        console.error('加载打卡统计失败:', err);
      });

    let firstLogin = wx.getStorageSync('firstLoginTime');
    if (!firstLogin) {
      firstLogin = Date.now();
      wx.setStorageSync('firstLoginTime', firstLogin);
    }

    const days = Math.max(1, Math.ceil((Date.now() - firstLogin) / (1000 * 60 * 60 * 24)));
    this.setData({ registerDays: days });
  },

  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail;

    const canChange = checkOperationLimit('lastAvatarChangeTime', 1440);
    if (!canChange) {
      const remaining = getRemainingTime('lastAvatarChangeTime', 1440);
      wx.showModal({
        title: '暂时不能修改',
        content: `24 小时内仅可修改一次头像，请 ${remaining} 后再试。`,
        showCancel: false
      });
      return;
    }

    wx.showLoading({ title: '检测中...' });

    try {
      const checkResult = await checkImageSecurity(avatarUrl);
      if (!checkResult.success) {
        wx.hideLoading();
        wx.showModal({
          title: '头像检测失败',
          content: checkResult.errMsg,
          showCancel: false
        });
        return;
      }

      wx.showLoading({ title: '上传中...' });

      const userInfo = await app.ensureUserInfo();
      const cloudPath = `avatars/${userInfo.openid}_${Date.now()}.jpg`;
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: avatarUrl
      });

      this.setData({
        userAvatar: uploadRes.fileID
      });

      await app.updateUserProfile(this.data.userName, uploadRes.fileID);
      recordOperationTime('lastAvatarChangeTime');

      wx.hideLoading();
      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      });
    } catch (err) {
      console.error('头像上传失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '头像上传失败',
        icon: 'none'
      });
    }
  },

  onEditNickname() {
    const canChange = checkOperationLimit('lastNicknameChangeTime', 1440);
    if (!canChange) {
      const remaining = getRemainingTime('lastNicknameChangeTime', 1440);
      wx.showModal({
        title: '暂时不能修改',
        content: `24 小时内仅可修改一次昵称，请 ${remaining} 后再试。`,
        showCancel: false
      });
      return;
    }

    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新的昵称',
      content: this.data.userName,
      success: async res => {
        if (!res.confirm || !res.content) {
          return;
        }

        const newName = res.content.trim();
        if (!newName) {
          return;
        }

        try {
          const userInfo = await app.ensureUserInfo();
          await app.updateUserProfile(newName, userInfo?.avatarUrl || '');
          recordOperationTime('lastNicknameChangeTime');

          this.setData({
            userName: newName
          });

          wx.showToast({
            title: '昵称更新成功',
            icon: 'success'
          });
        } catch (err) {
          console.error('更新昵称失败:', err);
          wx.showToast({
            title: '昵称更新失败',
            icon: 'none'
          });
        }
      }
    });
  },

  navigateToProducts() {
    wx.navigateTo({
      url: '/pages/my-works/my-works'
    });
  },

  navigateToCollect() {
    wx.navigateTo({
      url: '/pages/my-favorites/my-favorites'
    });
  },

  navigateToLikes() {
    wx.navigateTo({
      url: '/pages/my-likes/my-likes'
    });
  },

  async loadUnreadCount() {
    try {
      const userInfo = await app.ensureUserInfo();
      if (!userInfo || !userInfo.openid) {
        console.log('用户信息未准备好，跳过未读消息统计');
        return;
      }

      const timeoutPromise = new Promise(resolve => {
        setTimeout(() => {
          resolve({ timeout: true });
        }, 5000);
      });

      const callFunctionPromise = wx.cloud.callFunction({
        name: 'getUnreadCount'
      });

      const res = await Promise.race([callFunctionPromise, timeoutPromise]);
      if (res.timeout) {
        console.log('加载未读消息超时，忽略本次请求');
        return;
      }

      if (res.result && res.result.success) {
        this.setData({
          unreadCount: res.result.count
        });
      }
    } catch (err) {
      console.error('加载未读消息失败:', err);
    }
  },

  navigateToMessages() {
    wx.navigateTo({
      url: '/pages/messages/messages'
    });
  },

  navigateToHelp() {
    wx.navigateTo({
      url: '/pages/help-center/help-center'
    });
  },

  navigateToService() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    });
  },

  navigateToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function') {
      const tabBar = this.getTabBar();
      tabBar.setData({
        value: 'my'
      });
    }

    this.loadUserInfo();
  },

  goHome() {
    wx.switchTab({
      url: '/pages/template/template'
    });
  }
});
