// pages/experience/experience.js
const app = getApp()
const db = wx.cloud.database()
const _ = db.command

Page({

  /**
   * 页面的初始数据
   */
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    location: "当前位置",
    searchKeyword: "", // 搜索关键词
    currentCategory: 1, // 默认选中"推荐"
    categoryList: [
      { label: '关注', value: 0 },
      { label: '推荐', value: 1 },
      { label: '附近', value: 2 },
      { label: '美食', value: 3 },
      { label: '出片点', value: 4 },
      { label: '玩乐', value: 5 },
    ],
    // Bento Box 数据
    leisureLocations: [],    // 休闲玩乐（2张）
    scenicLocations: [],     // 景点游玩（3张）
    hotelLocations: [],      // 酒店民宿（2张）
    foodLocations: [],       // 特色美食（2张）
    // Feed 列表数据
    feedList: [],
    page: 0,
    pageSize: 10,
    hasMore: true,
    loading: false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    });

    // 加载数据
    this.loadBentoBoxData();
    this.loadFeedList();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === 'function') {
      const tabBar = this.getTabBar();
      tabBar.setData({
        value: 'experience',
      });
    }

    // 读取全局位置
    const cachedLocation = wx.getStorageSync('selectedLocation');
    if (cachedLocation && Date.now() - cachedLocation.timestamp < 7 * 24 * 60 * 60 * 1000) {
      this.setData({
        location: cachedLocation.displayText || cachedLocation.name || '当前位置'
      });
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 加载 Bento Box 数据
   */
  async loadBentoBoxData() {
    try {
      // 查询精选地点（isFeatured=true），按 featuredOrder 排序
      const { data } = await db.collection('locations')
        .where({
          isFeatured: true,
          status: 'active'
        })
        .orderBy('featuredOrder', 'asc')
        .get();

      // 转换云存储路径为临时URL
      const fileList = data.map(item => item.coverImage).filter(url => url && url.startsWith('cloud://'));
      if (fileList.length > 0) {
        const result = await wx.cloud.getTempFileURL({
          fileList: fileList
        });

        const tempFiles = result.fileList;

        // 创建路径映射
        const urlMap = {};
        tempFiles.forEach(file => {
          if (file.status === 0) {
            urlMap[file.fileID] = file.tempFileURL;
          }
        });

        // 替换为临时URL
        data.forEach(item => {
          if (item.coverImage && urlMap[item.coverImage]) {
            item.coverImage = urlMap[item.coverImage];
          }
        });
      }

      // 按类型分类，每个类型取前N个（按 featuredOrder 排序）
      const leisureLocations = data.filter(item => item.type === 'leisure').slice(0, 2);
      const scenicLocations = data.filter(item => item.type === 'scenic').slice(0, 3);
      const hotelLocations = data.filter(item => item.type === 'hotel').slice(0, 2);
      const foodLocations = data.filter(item => item.type === 'food').slice(0, 2);

      this.setData({
        leisureLocations,
        scenicLocations,
        hotelLocations,
        foodLocations
      });
    } catch (error) {
      console.error('加载 Bento Box 数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 加载 Feed 列表数据
   */
  async loadFeedList(reset = false) {
    if (this.data.loading) return;
    if (!reset && !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const page = reset ? 0 : this.data.page;
      const pageSize = this.data.pageSize;
      const searchKeyword = this.data.searchKeyword;

      // 构建查询条件
      let whereCondition = {
        status: 'active'
      };

      // 搜索功能：地点名称或描述匹配
      if (searchKeyword && searchKeyword.trim() !== '') {
        const keyword = searchKeyword.trim();
        whereCondition = _.and([
          whereCondition,
          _.or([
            { name: db.RegExp({ regexp: keyword, options: 'i' }) },
            { description: db.RegExp({ regexp: keyword, options: 'i' }) }
          ])
        ]);
      }

      let query = db.collection('locations').where(whereCondition);

      // 根据当前分类筛选
      const currentCategory = this.data.currentCategory;
      if (currentCategory === 0) {
        // 关注：暂时显示所有，后续可以根据用户关注列表筛选
        query = query;
      } else if (currentCategory === 1) {
        // 推荐：按评分排序
        query = query.orderBy('rating', 'desc');
      } else if (currentCategory === 2) {
        // 附近：按地理位置距离排序
        try {
          const location = await this.getUserLocation();
          if (location) {
            const geoPoint = db.Geo.Point(location.longitude, location.latitude);
            query = db.collection('locations')
              .where(_.and([
                whereCondition,
                {
                  location: db.command.geoNear({
                    geometry: geoPoint,
                    maxDistance: 100000,
                    minDistance: 0
                  })
                }
              ]));
            // 保存用户位置用于计算距离
            this.userLocation = location;
          } else {
            query = query.orderBy('checkInCount', 'desc');
            this.userLocation = null;
          }
        } catch (err) {
          console.error('获取位置失败:', err);
          query = query.orderBy('checkInCount', 'desc');
          this.userLocation = null;
        }
      } else if (currentCategory === 3) {
        // 美食
        query = query.where({ type: 'food' }).orderBy('rating', 'desc');
      } else if (currentCategory === 4) {
        // 出片点：按热度排序
        query = query.where({ isHot: true }).orderBy('checkInCount', 'desc');
      } else if (currentCategory === 5) {
        // 玩乐
        query = query.where({ type: 'leisure' }).orderBy('rating', 'desc');
      }

      // 分页查询
      const { data } = await query
        .skip(page * pageSize)
        .limit(pageSize)
        .get();

      // 转换云存储路径为临时URL
      const fileList = data.map(item => item.coverImage).filter(url => url && url.startsWith('cloud://'));
      if (fileList.length > 0) {
        const { fileList: tempFiles } = await wx.cloud.getTempFileURL({
          fileList: fileList
        });

        // 创建路径映射
        const urlMap = {};
        tempFiles.forEach(file => {
          urlMap[file.fileID] = file.tempFileURL;
        });

        // 替换为临时URL
        data.forEach(item => {
          if (item.coverImage && urlMap[item.coverImage]) {
            item.coverImage = urlMap[item.coverImage];
          }
        });
      }

      // 如果是附近模式且有用户位置，计算距离
      if (currentCategory === 2 && this.userLocation) {
        data.forEach(item => {
          if (item.latitude && item.longitude) {
            const distance = this.calculateDistance(
              this.userLocation.latitude,
              this.userLocation.longitude,
              item.latitude,
              item.longitude
            );
            item.distance = distance;
            item.distanceText = this.formatDistance(distance);
          }
        });
      }

      const feedList = reset ? data : [...this.data.feedList, ...data];
      const hasMore = data.length === pageSize;

      this.setData({
        feedList,
        page: page + 1,
        hasMore,
        loading: false
      });
    } catch (error) {
      console.error('加载 Feed 列表失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 切换分类标签
   */
  onCategoryChange(e) {
    const { value } = e.currentTarget.dataset;
    const categoryValue = parseInt(value); // 转换为数字
    this.setData({
      currentCategory: categoryValue,
      page: 0,
      feedList: [],
      hasMore: true
    }, () => {
      this.loadFeedList(true);
    });
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  /**
   * 搜索
   */
  onSearch(e) {
    const searchKeyword = e.detail.value || this.data.searchKeyword;
    console.log('搜索关键词:', searchKeyword);

    this.setData({
      searchKeyword,
      page: 0,
      feedList: [],
      hasMore: true
    }, () => {
      this.loadFeedList(true);
    });
  },

  /**
   * 获取用户当前位置
   */
  getUserLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02', // 返回可以用于wx.openLocation的经纬度
        success: (res) => {
          console.log('获取位置成功:', res);
          resolve({
            latitude: res.latitude,
            longitude: res.longitude
          });
        },
        fail: (err) => {
          console.error('获取位置失败:', err);
          // 如果用户拒绝授权，提示用户
          if (err.errMsg.includes('auth deny')) {
            wx.showModal({
              title: '需要位置权限',
              content: '查看附近地点需要获取您的位置信息，请在设置中开启位置权限',
              confirmText: '去设置',
              success: (res) => {
                if (res.confirm) {
                  wx.openSetting();
                }
              }
            });
          }
          resolve(null);
        }
      });
    });
  },

  /**
   * 计算两点之间的距离（单位：米）
   * 使用 Haversine 公式
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // 地球半径（米）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * 格式化距离显示
   */
  formatDistance(distance) {
    if (distance < 1000) {
      return Math.round(distance) + 'm';
    } else {
      return (distance / 1000).toFixed(1) + 'km';
    }
  },

  /**
   * 点击位置切换 - 已移除，使用创意模板页面的位置选择
   */

  /**
   * 查看景点详情
   */
  onViewDetail(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) {
      console.error('缺少地点ID');
      return;
    }
    wx.navigateTo({
      url: `/pages/location-detail/location-detail?id=${id}`
    });
  },

  /**
   * Bento卡片点击 - 跳转到分类列表
   */
  onBentoCardTap(e) {
    const { type } = e.currentTarget.dataset;
    if (!type) return;

    // 根据类型切换到对应的tab
    let categoryValue = 1; // 默认推荐
    if (type === 'food') {
      categoryValue = 3; // 美食
    } else if (type === 'leisure') {
      categoryValue = 5; // 玩乐
    } else if (type === 'scenic') {
      categoryValue = 1; // 推荐（景点）
    } else if (type === 'hotel') {
      categoryValue = 1; // 推荐（酒店）
    }

    // 切换tab并滚动到feed区域
    this.setData({
      currentCategory: categoryValue,
      page: 0,
      feedList: [],
      hasMore: true
    }, () => {
      this.loadFeedList(true);
      // 滚动到feed区域
      wx.pageScrollTo({
        selector: '.tab-section',
        duration: 300
      });
    });
  },

  /**
   * Bento卡片图片点击 - 跳转到地点详情
   */
  onBentoImageTap(e) {
    const { id } = e.currentTarget.dataset;
    if (id) {
      wx.navigateTo({
        url: `/pages/location-detail/location-detail?id=${id}`
      });
    }
    // 阻止事件冒泡，避免触发卡片的tab切换
    return false;
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    this.loadFeedList();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadBentoBoxData();
    this.loadFeedList(true);
    wx.stopPullDownRefresh();
  }
})