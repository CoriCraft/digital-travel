// app.js
const miniShopPlugin = requirePlugin('mini-shop-plugin');
const migration = require('./utils/migration.js');

App({
  onLaunch() {
    miniShopPlugin.initApp(this, wx);

    wx.cloud.init({
      env: 'cultural-tourism-7fb138kf77a2cb2',
      traceUser: true
    });

    const systemInfo = wx.getWindowInfo();
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();

    this.globalData.statusBarHeight = systemInfo.statusBarHeight;
    this.globalData.navBarHeight = (menuButtonInfo.top - systemInfo.statusBarHeight) * 2 + menuButtonInfo.height;
    this.globalData.menuButtonRight = systemInfo.windowWidth - menuButtonInfo.left;

    console.log('小程序导航栏初始化完成', {
      statusBarHeight: this.globalData.statusBarHeight,
      navBarHeight: this.globalData.navBarHeight,
      menuButtonRight: this.globalData.menuButtonRight
    });

    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);

    this.getUserInfo();

    setTimeout(() => {
      this.startDataMigration();
    }, 2000);
  },

  async startDataMigration() {
    try {
      console.log('[App] 开始执行旧数据迁移...');
      const result = await migration.startMigration();

      if (result.success) {
        console.log('[App] 数据迁移完成:', result);
      } else {
        console.log('[App] 数据迁移跳过:', result.message);
      }
    } catch (error) {
      console.error('[App] 数据迁移失败:', error);
    }
  },

  getUserInfo() {
    if (this.globalData.userInfoPromise) {
      return this.globalData.userInfoPromise;
    }

    this.globalData.userInfoPromise = this.fetchUserInfo().finally(() => {
      this.globalData.userInfoPromise = null;
    });

    return this.globalData.userInfoPromise;
  },

  async fetchUserInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getUserInfo'
      });

      console.log('用户 openid 获取成功:', res.result);

      const baseUserInfo = {
        openid: res.result.openid,
        unionid: res.result.unionid || '',
        nickName: '微信用户',
        avatarUrl: ''
      };

      this.globalData.userInfo = baseUserInfo;
      await this.syncUserProfileFromCloud(baseUserInfo);
      return this.globalData.userInfo;
    } catch (err) {
      console.error('用户信息获取失败:', err);
      this.globalData.userInfo = {
        openid: '',
        unionid: '',
        nickName: '微信用户',
        avatarUrl: ''
      };
      return this.globalData.userInfo;
    }
  },

  async ensureUserInfo() {
    if (this.globalData.userInfoPromise) {
      return this.globalData.userInfoPromise;
    }

    const currentUserInfo = this.globalData.userInfo;
    if (currentUserInfo && currentUserInfo.openid) {
      return currentUserInfo;
    }

    return this.getUserInfo();
  },

  async syncUserProfileFromCloud(baseUserInfo) {
    const db = wx.cloud.database();
    const storedUserInfo = wx.getStorageSync('userProfile') || {};

    try {
      const { data } = await db.collection('user_profiles')
        .where({
          userId: baseUserInfo.openid
        })
        .limit(1)
        .get();

      if (data.length > 0) {
        const profile = data[0];
        this.globalData.userInfo = {
          ...baseUserInfo,
          nickName: profile.nickName || storedUserInfo.nickName || '微信用户',
          avatarUrl: profile.avatarUrl || storedUserInfo.avatarUrl || '',
          profileId: profile._id
        };

        wx.setStorageSync('userProfile', {
          nickName: this.globalData.userInfo.nickName,
          avatarUrl: this.globalData.userInfo.avatarUrl
        });
        return;
      }

      // 新用户首次进入，跳转到用户信息填写页面
      console.log('新用户首次进入，需要完善用户信息');
      wx.reLaunch({
        url: '/pages/user-info/user-info'
      });
    } catch (error) {
      console.error('同步云端用户资料失败，回退到本地缓存:', error);
      this.globalData.userInfo = {
        ...baseUserInfo,
        nickName: storedUserInfo.nickName || '微信用户',
        avatarUrl: storedUserInfo.avatarUrl || ''
      };
    }
  },

  async updateUserProfile(nickName, avatarUrl) {
    const userInfo = await this.ensureUserInfo();
    if (!userInfo || !userInfo.openid) {
      throw new Error('用户 openid 不存在，无法更新资料');
    }

    const db = wx.cloud.database();
    const profileData = {
      userId: userInfo.openid,
      nickName: nickName || '微信用户',
      avatarUrl: avatarUrl || '',
      updateTime: new Date()
    };

    const { data } = await db.collection('user_profiles')
      .where({
        userId: userInfo.openid
      })
      .limit(1)
      .get();

    if (data.length > 0) {
      await db.collection('user_profiles').doc(data[0]._id).update({
        data: profileData
      });
      this.globalData.userInfo.profileId = data[0]._id;
    } else {
      const addResult = await db.collection('user_profiles').add({
        data: {
          ...profileData,
          createTime: new Date()
        }
      });
      this.globalData.userInfo.profileId = addResult._id;
    }

    this.globalData.userInfo.nickName = profileData.nickName;
    this.globalData.userInfo.avatarUrl = profileData.avatarUrl;

    wx.setStorageSync('userProfile', {
      nickName: profileData.nickName,
      avatarUrl: profileData.avatarUrl
    });

    console.log('用户资料已更新:', this.globalData.userInfo);
    return this.globalData.userInfo;
  },

  globalData: {
    userInfo: null,
    userInfoPromise: null,
    statusBarHeight: 0,
    navBarHeight: 0,
    menuButtonRight: 0
  }
});
