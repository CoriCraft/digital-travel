const app = getApp();

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    userAvatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23E8F5E9"/%3E%3Cpath d="M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 5c-13.807 0-25 11.193-25 25v10h50V75c0-13.807-11.193-25-25-25z" fill="%233ECE79"/%3E%3C/svg%3E',
    userName: '',
    canSubmit: false
  },

  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    });
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({
      userAvatar: avatarUrl
    });
    this.checkCanSubmit();
  },

  onNicknameInput(e) {
    const userName = e.detail.value;
    this.setData({ userName });
    this.checkCanSubmit();
  },

  onNicknameBlur(e) {
    const userName = e.detail.value;
    this.setData({ userName: userName.trim() });
    this.checkCanSubmit();
  },

  checkCanSubmit() {
    const { userName, userAvatar } = this.data;
    const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23E8F5E9"/%3E%3Cpath d="M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 5c-13.807 0-25 11.193-25 25v10h50V75c0-13.807-11.193-25-25-25z" fill="%233ECE79"/%3E%3C/svg%3E';

    const canSubmit = userName.trim() !== '' && userAvatar !== defaultAvatar;
    this.setData({ canSubmit });
  },

  async onSubmit() {
    const { userName, userAvatar, canSubmit } = this.data;

    if (!canSubmit) {
      wx.showToast({
        title: '请完善昵称和头像',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const userInfo = await app.ensureUserInfo();
      const cloudPath = `avatars/${userInfo.openid}_${Date.now()}.jpg`;
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath,
        filePath: userAvatar
      });

      await app.updateUserProfile(userName.trim(), uploadResult.fileID);

      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 1500
      });

      wx.setStorageSync('need_choose_location_after_login', true);

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/template/template'
        });
      }, 1500);
    } catch (err) {
      console.error('保存用户信息失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },

  onSkip() {
    wx.showModal({
      title: '确认跳过',
      content: '跳过后仍可在“我的”页面继续完善头像和昵称。',
      confirmText: '确认跳过',
      cancelText: '继续填写',
      success: res => {
        if (res.confirm) {
          wx.switchTab({
            url: '/pages/template/template'
          });
        }
      }
    });
  }
});
