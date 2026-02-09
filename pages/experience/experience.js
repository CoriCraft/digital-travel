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
    location: "方山风景区",
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
    leisureLocation: null,    // 休闲玩乐
    scenicLocation: null,     // 景点游玩
    hotelLocation: null,      // 酒店民宿
    foodLocation: null,       // 特色美食
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
      // 查询精选地点（isFeatured=true）
      const { data } = await db.collection('locations')
        .where({
          isFeatured: true,
          status: 'active'
        })
        .orderBy('order', 'asc')
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
      const leisureLocation = data.find(item => item.type === 'leisure');
      const scenicLocation = data.find(item => item.type === 'scenic');
      const hotelLocation = data.find(item => item.type === 'hotel');
      const foodLocation = data.find(item => item.type === 'food');

      this.setData({
        leisureLocation,
        scenicLocation,
        hotelLocation,
        foodLocation
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

      // 构建查询条件
      let query = db.collection('locations').where({
        status: 'active'
      });

      // 根据当前分类筛选
      const currentCategory = this.data.currentCategory;
      if (currentCategory === 0) {
        // 关注：暂时显示所有，后续可以根据用户关注列表筛选
        query = query;
      } else if (currentCategory === 1) {
        // 推荐：按评分排序
        query = query.orderBy('rating', 'desc');
      } else if (currentCategory === 2) {
        // 附近：按距离排序（暂时按打卡数排序，后续接入地理位置）
        query = query.orderBy('checkInCount', 'desc');
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
   * 点击位置切换
   */
  onLocationTap() {
    console.log('切换位置');
    // TODO: 实现位置选择功能
  },

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