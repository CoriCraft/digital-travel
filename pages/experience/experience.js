// pages/experience/experience.js
const app = getApp()

function getDB() {
  return wx.cloud.database()
}

Page({

  /**
   * 页面的初始数据
   */
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    location: "方山风景区",
    searchKeyword: "", // 搜索关键词
    currentCategory: 0, // 默认选中"推荐"
    categoryList: [
      { label: '推荐', value: 0 },
      { label: '附近', value: 1 },
      { label: '住宿', value: 2 },
      { label: '美食', value: 3 },
      { label: '景点', value: 4 },
      { label: '玩乐', value: 5 },
    ],
    // Bento Box 数据
    leisureLocations: [],    // 休闲玩乐（2张）
    scenicLocations: [],     // 景点游玩（3张）
    hotelLocations: [],      // 酒店民宿（2张）
    foodLocations: [],       // 特色美食（2张）
    hotLocationIds: [],      // 在 bento box 中显示的地点 ID 列表
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

    // 读取全局位置（使用与创意模板相同的缓存键）
    const cachedLocation = wx.getStorageSync('user_location_cache');
    if (cachedLocation && cachedLocation.timestamp && Date.now() - cachedLocation.timestamp < 7 * 24 * 60 * 60 * 1000) {
      this.setData({
        location: cachedLocation.displayText || '当前位置'
      });
    } else {
      // 缓存过期或不存在，显示默认位置
      this.setData({
        location: '方山风景区'
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
      const db = getDB()
      // 查询精选地点（isFeatured=true）
      const { data } = await db.collection('locations')
        .where({
          isFeatured: true,
          status: 'active'
        })
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

      // 按类型分类
      const leisureData = data.filter(item => item.type === 'leisure');
      const scenicData = data.filter(item => item.type === 'scenic');
      const hotelData = data.filter(item => item.type === 'hotel');
      const foodData = data.filter(item => item.type === 'food');

      // 对每个类型应用 sortOrder 排序逻辑
      const sortByOrder = (items) => {
        const pinned = items.filter(item => (item.sortOrder || 0) > 0);
        const dynamic = items.filter(item => (item.sortOrder || 0) <= 0);

        // 置顶按 sortOrder 升序
        pinned.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        // 动态按默认算法排序：评分高 → 打卡多 → _id
        dynamic.sort((a, b) => {
          // 优先按评分降序
          const ratingDiff = (b.rating || 0) - (a.rating || 0);
          if (ratingDiff !== 0) return ratingDiff;

          // 评分相同,按打卡数降序
          const checkInDiff = (b.checkInCount || 0) - (a.checkInCount || 0);
          if (checkInDiff !== 0) return checkInDiff;

          // 都相同,按 _id 排序(保证稳定性)
          return a._id.localeCompare(b._id);
        });

        return [...pinned, ...dynamic];
      };

      // 每个类型取前N个
      const leisureLocations = sortByOrder(leisureData).slice(0, 2);
      const scenicLocations = sortByOrder(scenicData).slice(0, 3);
      const hotelLocations = sortByOrder(hotelData).slice(0, 2);
      const foodLocations = sortByOrder(foodData).slice(0, 2);

      // 收集所有在 bento box 中显示的地点 ID
      const hotLocationIds = [
        ...leisureLocations.map(item => item._id),
        ...scenicLocations.map(item => item._id),
        ...hotelLocations.map(item => item._id),
        ...foodLocations.map(item => item._id)
      ];

      this.setData({
        leisureLocations,
        scenicLocations,
        hotelLocations,
        foodLocations,
        hotLocationIds
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
      const db = getDB()
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
        whereCondition = db.command.and([
          whereCondition,
          db.command.or([
            { name: db.RegExp({ regexp: keyword, options: 'i' }) },
            { description: db.RegExp({ regexp: keyword, options: 'i' }) }
          ])
        ]);
      }

      // 根据当前分类添加筛选条件
      const currentCategory = this.data.currentCategory;
      if (currentCategory === 2) {
        // 住宿
        whereCondition.type = 'hotel';
      } else if (currentCategory === 3) {
        // 美食
        whereCondition.type = 'food';
      } else if (currentCategory === 4) {
        // 景点
        whereCondition.type = 'scenic';
      } else if (currentCategory === 5) {
        // 玩乐
        whereCondition.type = 'leisure';
      }

      // 查询数据（不在数据库层面排序，改为前端排序）
      let query = db.collection('locations').where(whereCondition);

      // 附近模式需要特殊处理
      if (currentCategory === 1) {
        try {
          const location = await this.getUserLocation();
          if (location) {
            const geoPoint = db.Geo.Point(location.longitude, location.latitude);
            query = db.collection('locations')
              .where(db.command.and([
                whereCondition,
                {
                  location: db.command.geoNear({
                    geometry: geoPoint,
                    maxDistance: 100000,
                    minDistance: 0
                  })
                }
              ]));
            this.userLocation = location;
          } else {
            this.userLocation = null;
          }
        } catch (err) {
          console.error('获取位置失败:', err);
          this.userLocation = null;
        }
      }

      // 获取所有数据（用于前端排序和分页）
      const { data } = await query.get();

      // 转换云存储路径为临时URL
      const fileList = data.map(item => item.coverImage).filter(url => url && url.startsWith('cloud://'));
      if (fileList.length > 0) {
        const { fileList: tempFiles } = await wx.cloud.getTempFileURL({
          fileList: fileList
        });

        const urlMap = {};
        tempFiles.forEach(file => {
          urlMap[file.fileID] = file.tempFileURL;
        });

        data.forEach(item => {
          if (item.coverImage && urlMap[item.coverImage]) {
            item.coverImage = urlMap[item.coverImage];
          }
        });
      }

      // 如果是附近模式且有用户位置，计算距离
      if (currentCategory === 1 && this.userLocation) {
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

      // 标记热门地点（在 bento box 中显示的地点）
      const hotLocationIds = this.data.hotLocationIds || [];
      data.forEach(item => {
        item.isHot = hotLocationIds.includes(item._id);
      });

      // 前端排序：分离置顶、热门和普通地点
      const pinnedLocations = data.filter(item => (item.sortOrder || 0) > 0);
      const hotLocations = data.filter(item => (item.sortOrder || 0) <= 0 && item.isHot);
      const normalLocations = data.filter(item => (item.sortOrder || 0) <= 0 && !item.isHot);

      // 置顶地点按 sortOrder 升序排列
      pinnedLocations.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      // 热门地点保持 bento box 的顺序（按在 hotLocationIds 中的索引排序）
      hotLocations.sort((a, b) => {
        return hotLocationIds.indexOf(a._id) - hotLocationIds.indexOf(b._id);
      });

      // 普通地点按不同规则排序
      if (currentCategory === 0) {
        // 推荐：按评分 → 打卡数 → _id
        normalLocations.sort((a, b) => {
          const ratingDiff = (b.rating || 0) - (a.rating || 0);
          if (ratingDiff !== 0) return ratingDiff;

          const checkInDiff = (b.checkInCount || 0) - (a.checkInCount || 0);
          if (checkInDiff !== 0) return checkInDiff;

          return a._id.localeCompare(b._id);
        });
      } else if (currentCategory === 1) {
        // 附近：按距离排序
        normalLocations.sort((a, b) => (a.distance || 999999) - (b.distance || 999999));
      } else {
        // 其他分类：按评分 → 打卡数 → _id
        normalLocations.sort((a, b) => {
          const ratingDiff = (b.rating || 0) - (a.rating || 0);
          if (ratingDiff !== 0) return ratingDiff;

          const checkInDiff = (b.checkInCount || 0) - (a.checkInCount || 0);
          if (checkInDiff !== 0) return checkInDiff;

          return a._id.localeCompare(b._id);
        });
      }

      // 合并：置顶 → 热门(bento box顺序) → 普通
      const sortedData = [...pinnedLocations, ...hotLocations, ...normalLocations];

      // 前端分页
      const start = page * pageSize;
      const end = start + pageSize;
      const paginatedData = sortedData.slice(start, end);

      const feedList = reset ? paginatedData : [...this.data.feedList, ...paginatedData];
      const hasMore = end < sortedData.length;

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
    let categoryValue = 0; // 默认推荐
    if (type === 'food') {
      categoryValue = 3; // 美食
    } else if (type === 'leisure') {
      categoryValue = 5; // 玩乐
    } else if (type === 'scenic') {
      categoryValue = 4; // 景点
    } else if (type === 'hotel') {
      categoryValue = 2; // 住宿
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
   * 返回首页
   */
  goHome() {
    wx.switchTab({
      url: '/pages/template/template'
    });
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
  },

  /**
   * 点击帮助按钮
   */
  onHelpTap() {
    wx.navigateTo({
      url: '/pages/help-center/help-center'
    });
  }
})