// pages/template/template.js
const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    location: "定位中...",
    currentLocation: null, // 存储完整的位置信息
    statusBarHeight: 0,
    navBarHeight: 0,
    currentTemplateFilter: 0,
    templateFilterList: [
      { label: '全部', value: 0 },
      { label: '景区主题', value: 1 },
      { label: '风格分类', value: 2 },
      { label: '场景打卡', value: 3 },
    ],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log(app.globalData);
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    });
    // 获取当前位置
    this.getCurrentLocation();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === "function") {
      const tabBar = this.getTabBar();
      tabBar.setData({
        value: "template",
      });
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {},

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {},

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {},

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {},

  onLocationTap() {
    // 点击位置时重新获取定位
    this.getCurrentLocation();
  },

  /**
   * 获取当前位置 - 用户手动选择
   */
  getCurrentLocation() {
    wx.chooseLocation({
      success: (res) => {
        console.log('用户选择的位置:', res);
        console.log('地址字符串:', res.address);

        const address = res.address || '';
        const name = res.name || '';

        // 从地址中提取市和县/区
        let city = '';
        let county = '';
        let displayText = name || address;

        if (address) {
          // 优先匹配更精确的模式
          let match = null;

          // 1. 匹配: 地区+市 (如"喀什地区喀什市")
          // 使用非贪婪匹配,并且排除"省|自治区"等字符
          match = address.match(/([^省自治区]{2,}?)地区([^地区市县区]{2,}?)市/);
          if (match) {
            city = match[1];
            county = match[2] + '市';
          }

          // 2. 匹配: 市+区/县
          if (!match) {
            match = address.match(/([^省自治区]{2,}?)市([^市县区]{2,}?[区县])/);
            if (match) {
              city = match[1];
              county = match[2];
            }
          }

          // 3. 匹配: 地区+县
          if (!match) {
            match = address.match(/([^省自治区]{2,}?)地区([^地区市县区]{2,}?县)/);
            if (match) {
              city = match[1];
              county = match[2];
            }
          }

          // 4. 匹配: 自治州+县
          if (!match) {
            match = address.match(/([^省自治区]{2,}?)自治州([^自治州市县区]{2,}?县)/);
            if (match) {
              city = match[1];
              county = match[2];
            }
          }

          // 5. 匹配: 盟+旗/县
          if (!match) {
            match = address.match(/([^省自治区]{2,}?)盟([^盟市县区旗]{2,}?[旗县])/);
            if (match) {
              city = match[1];
              county = match[2];
            }
          }

          if (city && county) {
            displayText = `${city}·${county}`;
          }
        }

        console.log('提取结果 - city:', city, 'county:', county, 'displayText:', displayText);

        this.setData({
          location: displayText,
          currentLocation: {
            name: res.name,
            address: res.address,
            city: city,
            county: county,
            latitude: res.latitude,
            longitude: res.longitude
          }
        });
      },
      fail: (err) => {
        console.error('选择位置失败:', err);

        if (err.errMsg && err.errMsg.indexOf('cancel') !== -1) {
          console.log('用户取消选择位置');
        } else {
          wx.showToast({
            title: '获取位置失败',
            icon: 'none'
          });
        }
      }
    });
  },

  onTabChange(e) {
    const { value } = e.detail;
    this.setData({
      currentTemplateFilter: value,
    })
  },

  onSearch () {
    console.log('search button click!')
  }
});
