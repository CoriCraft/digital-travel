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
    templates: [], // 模板列表
    sortType: 'hot', // 排序类型: hot-热度, time-时间
    loading: false,
    searchKeyword: '', // 搜索关键词
    pageSize: 20, // 每页数量
    currentPage: 0, // 当前页码
    hasMore: true, // 是否还有更多数据
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
    // 加载模板列表
    this.loadTemplates();
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
    // 不需要重新加载整个列表，只需要更新可能变化的数据
    // 收藏量、点赞量、观看量等会在详情页更新，返回时自动同步
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
  onReachBottom() {
    console.log('触底加载更多');
    if (!this.data.hasMore) {
      wx.showToast({
        title: '没有更多了',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    this.loadTemplates(true);
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {},

  onLocationTap() {
    // 点击位置时手动选择位置
    this.chooseLocation();
  },

  /**
   * 获取当前位置 - 从缓存读取或提示用户选择
   */
  getCurrentLocation() {
    // 检查缓存
    const cacheKey = 'user_location_cache';
    const cachedData = wx.getStorageSync(cacheKey);
    const now = Date.now();
    const cacheExpire = 7 * 24 * 60 * 60 * 1000; // 缓存7天

    // 如果有缓存且未过期，使用缓存数据
    if (cachedData && cachedData.timestamp && (now - cachedData.timestamp < cacheExpire)) {
      console.log('使用缓存的定位数据');
      this.setData({
        location: cachedData.displayText,
        currentLocation: cachedData.location
      });
      return;
    }

    // 缓存过期或不存在，显示默认文本，等待用户点击选择
    console.log('无缓存定位数据，等待用户选择');
    this.setData({
      location: '选择位置'
    });
  },

  /**
   * 手动选择位置
   */
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        console.log('用户选择的位置:', res);
        const address = res.address || '';
        const name = res.name || '';

        // 从地址中提取市和县/区
        let city = '';
        let county = '';
        let displayText = name || address;

        if (address) {
          let match = null;

          // 1. 匹配: 地区+市
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

        const locationData = {
          name: res.name,
          address: res.address,
          city: city,
          county: county,
          latitude: res.latitude,
          longitude: res.longitude
        };

        // 更新缓存
        const cacheKey = 'user_location_cache';
        wx.setStorageSync(cacheKey, {
          displayText: displayText,
          location: locationData,
          timestamp: Date.now()
        });

        this.setData({
          location: displayText,
          currentLocation: locationData
        });
      },
      fail: (err) => {
        console.error('选择位置失败:', err);
        if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
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
      currentPage: 0,
      templates: [],
      hasMore: true
    });
    // 切换分类时重新加载模板
    this.loadTemplates();
  },

  onSearch () {
    console.log('search button click!');
    const { searchKeyword } = this.data;
    if (!searchKeyword || searchKeyword.trim() === '') {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      });
      return;
    }
    // 重置分页并加载
    this.setData({
      currentPage: 0,
      templates: [],
      hasMore: true
    });
    this.loadTemplates();
  },

  /**
   * 搜索输入变化
   */
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  /**
   * 清空搜索
   */
  onClearSearch() {
    this.setData({
      searchKeyword: '',
      currentPage: 0,
      templates: [],
      hasMore: true
    });
    this.loadTemplates();
  },

  /**
   * 加载模板列表
   */
  loadTemplates(loadMore = false) {
    if (this.data.loading) return;
    if (loadMore && !this.data.hasMore) return;

    this.setData({ loading: true });

    // 显示加载提示
    if (loadMore) {
      wx.showLoading({ title: '加载更多...' });
    } else {
      wx.showLoading({ title: '加载中...' });
    }

    const db = wx.cloud.database();
    const _ = db.command;
    const { currentTemplateFilter, searchKeyword, pageSize, currentPage, sortType } = this.data;

    // 构建查询条件
    let query = {
      status: _.in(['active', 'approved'])
    };

    // 根据分类筛选
    if (currentTemplateFilter > 0) {
      const categoryMap = {
        1: '景区主题',
        2: '风格分类',
        3: '场景打卡'
      };
      query.category = categoryMap[currentTemplateFilter];
    }

    // 搜索功能：模板名称或标签匹配
    if (searchKeyword && searchKeyword.trim() !== '') {
      const keyword = searchKeyword.trim();
      query = _.and([
        query,
        _.or([
          { name: db.RegExp({ regexp: keyword, options: 'i' }) },
          { tags: keyword }
        ])
      ]);
    }

    const skip = loadMore ? currentPage * pageSize : 0;

    // 根据排序类型设置排序字段
    let orderByField = 'sort';
    let orderByDirection = 'asc';

    if (sortType === 'hot') {
      orderByField = 'photoSetCount';
      orderByDirection = 'desc';
    } else if (sortType === 'time') {
      orderByField = 'createTime';
      orderByDirection = 'desc';
    }

    db.collection('templates')
      .where(query)
      .orderBy(orderByField, orderByDirection)
      .skip(skip)
      .limit(pageSize)
      .get()
      .then(res => {
        console.log('模板列表:', res.data);
        const newTemplates = loadMore ? [...this.data.templates, ...res.data] : res.data;
        const hasMore = res.data.length === pageSize;

        this.setData({
          templates: newTemplates,
          loading: false,
          hasMore: hasMore,
          currentPage: loadMore ? currentPage + 1 : 1
        });

        wx.hideLoading();

        // 如果是加载更多且没有更多数据，提示用户
        if (loadMore && !hasMore) {
          wx.showToast({
            title: '已加载全部',
            icon: 'none',
            duration: 1500
          });
        }
      })
      .catch(err => {
        console.error('加载模板失败:', err);
        this.setData({ loading: false });
        wx.hideLoading();
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      });
  },

  /**
   * 切换排序方式
   */
  onSortChange(e) {
    const { type } = e.currentTarget.dataset;
    if (type === this.data.sortType) return;

    // 切换排序时重新加载数据
    this.setData({
      sortType: type,
      currentPage: 0,
      templates: [],
      hasMore: true
    });
    this.loadTemplates();
  },

  /**
   * 排序模板列表（已废弃，改为后端排序）
   */
  sortTemplates() {
    // 此方法已废弃，排序逻辑已移至 loadTemplates 中的数据库查询
  },

  /**
   * 点击模板卡片
   */
  onTemplateTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/template-detail/template-detail?id=${id}`
    });
  },

  /**
   * 更新列表中的单个模板数据（从详情页返回时调用）
   */
  updateTemplateItem(templateId, updates) {
    const templates = this.data.templates;
    const index = templates.findIndex(item => item._id === templateId);
    if (index !== -1) {
      // 只更新变化的字段
      Object.assign(templates[index], updates);
      this.setData({
        [`templates[${index}]`]: templates[index]
      });
      console.log('已更新模板数据:', templateId, updates);
    }
  },

  /**
   * 创作模板
   */
  onCreateTemplate() {
    wx.navigateTo({
      url: '/pages/create-template/create-template'
    });
  }
});
