// pages/template/template.js
const app = getApp()
const { getThumbnailUrl } = require('../../utils/util.js')
const interaction = require('../../utils/interaction.js')

function getDB() {
  return wx.cloud.database()
}

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
    leftColumnTemplates: [], // 左列模板
    rightColumnTemplates: [], // 右列模板
    leftHeight: 0, // 左列高度
    rightHeight: 0, // 右列高度
    sortType: 'hot', // 排序类型: hot-热度, time-时间
    loading: false,
    searchKeyword: '', // 搜索关键词
    pageSize: 20, // 每页数量
    currentPage: 0, // 当前页码
    hasMore: true, // 是否还有更多数据
    featuredTemplate: null, // 创作模板展示的固定模板（热度第一名）
    // 旅拍相册弹窗
    albumDialogVisible: false,
    albumOrderId: '',
    albumPhotos: [],
    albumLoading: false,
    albumName: '', // 相册名称
    albumLocationName: '', // 地点名称
    albumPhotoTime: null, // 拍摄时间
    showSaveSuccess: false, // 保存成功提示
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('onLoad options:', JSON.stringify(options))
    console.log('options.scene:', options.scene)
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    });
    // 获取当前位置
    this.getCurrentLocation();
    // 加载热度第一名作为创作模板展示
    this.loadFeaturedTemplate();
    // 加载模板列表
    this.loadTemplates();
    // 处理扫码进入：解析 scene 参数
    if (options.scene) {
      console.log('检测到 scene 参数')
      const scene = decodeURIComponent(options.scene)
      console.log('解码后的 scene:', scene)
      const match = scene.match(/code=([^&]+)/)
      console.log('正则匹配结果:', match)
      if (match) {
        const albumId = match[1]
        console.log('提取到 albumId:', albumId)
        this.setData({ albumOrderId: albumId, albumDialogVisible: true, albumLoading: true })

        // 直接查询数据库
        const db = getDB()
        db.collection('albums')
          .where({
            albumId: albumId,
            status: 'active'
          })
          .get()
          .then(res => {
            console.log('数据库查询返回:', res)
            if (res.data.length > 0) {
              const album = res.data[0]
              this.setData({
                albumPhotos: album.photos || [],
                albumName: album.title || '',
                albumLocationName: album.locationName || '',
                albumPhotoTime: album.photoTime ? this.formatPhotoTime(album.photoTime) : '',
                albumLoading: false
              })
            } else {
              console.error('未找到相册')
              this.setData({ albumLoading: false })
              wx.showToast({ title: '相册不存在', icon: 'none' })
            }
          })
          .catch(err => {
            console.error('数据库查询失败:', err)
            this.setData({ albumLoading: false })
            wx.showToast({ title: '加载失败', icon: 'none' })
          })
      }
    } else {
      console.log('未检测到 scene 参数')
    }
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

    // 检查是否需要刷新列表
    const needRefresh = wx.getStorageSync('template_list_need_refresh');
    if (needRefresh) {
      console.log('检测到需要刷新模板列表');
      wx.removeStorageSync('template_list_need_refresh');
      this.loadTemplates();
    } else if (this.data.templates.length > 0) {
      // 如果已有模板数据，强制刷新状态（忽略缓存）
      console.log('[onShow] 强制刷新模板状态');
      this.batchCheckTemplateStatus(this.data.templates, true);
    }

    // 检查位置信息是否过期，自动弹出位置选择
    this.checkLocationExpired();
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
  onPullDownRefresh() {
    console.log('下拉刷新模板列表');

    // 重置分页和数据
    this.setData({
      currentPage: 0,
      templates: [],
      leftColumnTemplates: [],
      rightColumnTemplates: [],
      hasMore: true
    });

    // 重新加载模板列表
    this.loadTemplates();

    // 延迟停止下拉刷新动画
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 500);
  },

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
   * 检查位置信息是否过期
   */
  checkLocationExpired() {
    // 检查是否是刚完成用户信息设置
    const needChooseLocationAfterLogin = wx.getStorageSync('need_choose_location_after_login');
    if (needChooseLocationAfterLogin) {
      wx.removeStorageSync('need_choose_location_after_login');
      console.log('用户信息设置完成，引导选择位置');
      setTimeout(() => {
        this.onLocationTap();
      }, 500);
      return;
    }

    // 正常检查位置缓存
    const cacheKey = 'user_location_cache';
    const cachedData = wx.getStorageSync(cacheKey);
    const now = Date.now();
    const cacheExpire = 7 * 24 * 60 * 60 * 1000; // 缓存7天

    // 如果没有缓存或已过期，提示用户选择（但不自动弹出）
    if (!cachedData || !cachedData.timestamp || (now - cachedData.timestamp >= cacheExpire)) {
      console.log('位置信息缺失或已过期');
      this.setData({
        location: '选择位置'
      });
    }
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
    const { value } = e.currentTarget.dataset;
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

    const db = getDB();
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
    let needClientSort = false; // 是否需要前端排序

    if (sortType === 'hot') {
      // 热度排序需要在前端计算，先按照创建时间获取数据
      orderByField = 'createTime';
      orderByDirection = 'desc';
      needClientSort = true;
    } else if (sortType === 'time') {
      orderByField = 'createTime';
      orderByDirection = 'desc';
    }

    // 如果是热度排序，需要获取更多数据用于前端排序
    const fetchLimit = needClientSort ? pageSize * 3 : pageSize;
    const fetchSkip = needClientSort ? 0 : skip;

    db.collection('templates')
      .where(query)
      .orderBy(orderByField, orderByDirection)
      .skip(fetchSkip)
      .limit(fetchLimit)
      .get()
      .then(res => {
        console.log('模板列表:', res.data);

        // 计算热门标签和热度分数
        let templatesWithHot = this.calculateHotTemplates(res.data);

        // 为每个模板添加缩略图URL
        templatesWithHot = templatesWithHot.map(template => ({
          ...template,
          coverThumbnail: getThumbnailUrl(template.cover, 400)
        }));

        // 如果是热度排序，按热度分数排序
        if (needClientSort) {
          // 分离固定排序和动态排序的模板
          const pinnedTemplates = templatesWithHot.filter(t => (t.sortOrder || 0) > 0);
          const dynamicTemplates = templatesWithHot.filter(t => (t.sortOrder || 0) <= 0);

          // 固定排序的模板按 sortOrder 升序排列
          pinnedTemplates.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

          // 动态排序的模板按热度分数降序排列
          dynamicTemplates.sort((a, b) => b.hotScore - a.hotScore);

          // 合并：固定排序在前，动态排序在后
          templatesWithHot = [...pinnedTemplates, ...dynamicTemplates];

          // 分页处理
          const startIndex = skip;
          const endIndex = startIndex + pageSize;
          templatesWithHot = templatesWithHot.slice(startIndex, endIndex);
        } else {
          // 时间排序也需要支持置顶
          const pinnedTemplates = templatesWithHot.filter(t => (t.sortOrder || 0) > 0);
          const dynamicTemplates = templatesWithHot.filter(t => (t.sortOrder || 0) <= 0);

          // 固定排序的模板按 sortOrder 升序排列
          pinnedTemplates.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

          // 动态排序的模板按创建时间降序排列（已经从数据库排好序了）
          // 合并：固定排序在前，动态排序在后
          templatesWithHot = [...pinnedTemplates, ...dynamicTemplates];
        }

        const newTemplates = loadMore ? [...this.data.templates, ...templatesWithHot] : templatesWithHot;
        const hasMore = needClientSort ? (skip + pageSize < res.data.length) : (res.data.length === pageSize);

        // 智能瀑布流分列
        if (loadMore) {
          // 加载更多：在现有基础上继续分配
          this.buildWaterfall(templatesWithHot, () => {
            // 瀑布流构建完成后检查状态
            this.batchCheckTemplateStatus(newTemplates);
          });
        } else {
          // 首次加载：重置后分配
          this.setData({
            leftColumnTemplates: [],
            rightColumnTemplates: [],
            leftHeight: 0,
            rightHeight: 0
          }, () => {
            this.buildWaterfall(newTemplates, () => {
              // 瀑布流构建完成后检查状态
              this.batchCheckTemplateStatus(newTemplates);
            });
          });
        }

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
   * 加载上传用户头像
   */
  loadUploaderAvatars(templateId) {
    const db = getDB();

    // 查询该模板下的照片，获取上传用户头像
    db.collection('photos')
      .where({
        templateId: templateId,
        status: 'approved'
      })
      .field({
        userAvatar: true,
        userId: true
      })
      .limit(10) // 最多获取10个用户
      .get()
      .then(res => {
        // 去重并过滤空头像
        const avatars = [];
        const userIds = new Set();

        res.data.forEach(item => {
          if (item.userAvatar && item.userId && !userIds.has(item.userId)) {
            avatars.push(item.userAvatar);
            userIds.add(item.userId);
          }
        });

        // 更新 featuredTemplate 的头像数据
        if (this.data.featuredTemplate) {
          this.setData({
            featuredTemplate: {
              ...this.data.featuredTemplate,
              uploaderAvatars: avatars
            }
          });
        }
      })
      .catch(err => {
        console.error('加载上传用户头像失败:', err);
      });
  },

  /**
   * 加载热度第一名模板作为创作模板展示
   */
  loadFeaturedTemplate() {
    const db = getDB();
    const _ = db.command;

    db.collection('templates')
      .where({
        status: _.in(['active', 'approved'])
      })
      .orderBy('createTime', 'desc')
      .limit(100) // 获取足够多的数据用于热度计算
      .get()
      .then(res => {
        if (res.data.length === 0) return;

        // 计算热度分数
        let templatesWithHot = this.calculateHotTemplates(res.data);

        // 添加缩略图
        templatesWithHot = templatesWithHot.map(template => ({
          ...template,
          coverThumbnail: getThumbnailUrl(template.cover, 400)
        }));

        // 分离固定排序和动态排序的模板
        const pinnedTemplates = templatesWithHot.filter(t => (t.sortOrder || 0) > 0);
        const dynamicTemplates = templatesWithHot.filter(t => (t.sortOrder || 0) <= 0);

        // 固定排序的模板按 sortOrder 升序排列
        pinnedTemplates.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        // 动态排序的模板按热度分数降序排列
        dynamicTemplates.sort((a, b) => b.hotScore - a.hotScore);

        // 合并：固定排序在前，动态排序在后
        const sortedTemplates = [...pinnedTemplates, ...dynamicTemplates];

        // 取第一名
        const featuredTemplate = sortedTemplates[0];

        this.setData({ featuredTemplate });

        // 加载该模板的上传用户头像
        this.loadUploaderAvatars(featuredTemplate._id);
      })
      .catch(err => {
        console.error('加载热度第一名模板失败:', err);
      });
  },

  /**
   * 智能瀑布流分列
   * 根据图片比例预估卡片高度，动态分配到较短的列
   */
  buildWaterfall(templates, callback) {
    let {
      leftColumnTemplates,
      rightColumnTemplates,
      leftHeight,
      rightHeight
    } = this.data;

    templates.forEach((item) => {
      // 使用模板 ID 的哈希值生成稳定的高度
      const hash = this.simpleHash(item._id);
      const heightVariation = (hash % 300) - 150; // -150 到 +150 的变化
      const baseHeight = 500; // 基础高度
      const cardHeight = baseHeight + heightVariation + 200; // 图片 + 文本区域

      // 分配到较短的列
      if (leftHeight <= rightHeight) {
        leftColumnTemplates.push(item);
        leftHeight += cardHeight;
      } else {
        rightColumnTemplates.push(item);
        rightHeight += cardHeight;
      }
    });

    this.setData({
      leftColumnTemplates,
      rightColumnTemplates,
      leftHeight,
      rightHeight
    }, callback);
  },

  /**
   * 简单哈希函数
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  },

  /**
   * 计算热门模板
   * 热度算法：热度分数 = 浏览量 * 0.1 + 点赞数 * 2 + 收藏数 * 3 + 照片数量 * 5
   * 只有热度分数排名前30%的模板才显示"热门"标签
   */
  calculateHotTemplates(templates) {
    if (!templates || templates.length === 0) return templates;

    console.log('开始计算热门模板，总数:', templates.length);

    // 计算每个模板的热度分数
    const templatesWithScore = templates.map(template => {
      const viewCount = template.viewCount || 0;
      const likeCount = template.likeCount || 0;
      const favoriteCount = template.favoriteCount || 0;
      const photoCount = template.photoSetCount || 0; // 复用 photoSetCount 字段表示照片数量

      // 热度分数计算
      const hotScore = viewCount * 0.1 + likeCount * 2 + favoriteCount * 3 + photoCount * 5;

      console.log(`模板 ${template.name}: 浏览${viewCount}, 点赞${likeCount}, 收藏${favoriteCount}, 照片${photoCount}, 热度=${hotScore}`);

      return {
        ...template,
        hotScore
      };
    });

    // 按热度分数排序
    const sortedTemplates = [...templatesWithScore].sort((a, b) => b.hotScore - a.hotScore);

    // 计算热门阈值（前30%）
    const hotThreshold = Math.ceil(sortedTemplates.length * 0.3);
    const minHotScore = sortedTemplates[hotThreshold - 1]?.hotScore || 0;

    console.log(`热门阈值: 前${hotThreshold}个, 最低分数=${minHotScore}`);

    // 标记热门模板
    const result = templatesWithScore.map(template => ({
      ...template,
      isHot: template.hotScore >= minHotScore && template.hotScore > 0
    }));

    const hotCount = result.filter(t => t.isHot).length;
    console.log(`标记了 ${hotCount} 个热门模板`);

    return result;
  },

  /**
   * 批量检查模板的收藏和点赞状态
   */
  async batchCheckTemplateStatus(templates, forceRefresh = false) {
    if (!templates || templates.length === 0) {
      console.log('[状态检查] 模板列表为空，跳过检查');
      return;
    }

    console.log('[状态检查] 开始检查模板状态，数量:', templates.length, '强制刷新:', forceRefresh);
    console.log('[状态检查] 当前瀑布流列状态 - 左列:', this.data.leftColumnTemplates.length, '右列:', this.data.rightColumnTemplates.length);

    try {
      // 准备批量查询的目标列表
      const targets = templates.map(t => ({
        targetId: t._id,
        targetType: 'template'
      }));

      // 批量检查收藏状态
      const favoriteResults = await interaction.batchCheckStatus(targets, 'favorite', forceRefresh);
      console.log('[状态检查] 收藏状态结果:', favoriteResults);

      // 批量检查点赞状态
      const likeResults = await interaction.batchCheckStatus(targets, 'like', forceRefresh);
      console.log('[状态检查] 点赞状态结果:', likeResults);

      // 更新模板列表中的状态
      const updatedTemplates = this.data.templates.map(template => {
        const isFavorited = favoriteResults[template._id] || false;
        const isLiked = likeResults[template._id] || false;
        console.log(`[状态检查] 模板 ${template.name} (${template._id}): 收藏=${isFavorited}, 点赞=${isLiked}`);
        return {
          ...template,
          isFavorited,
          isLiked
        };
      });

      // 更新左右列的模板状态
      const updatedLeftColumn = this.data.leftColumnTemplates.map(template => {
        const isFavorited = favoriteResults[template._id] || false;
        const isLiked = likeResults[template._id] || false;
        return {
          ...template,
          isFavorited,
          isLiked
        };
      });

      const updatedRightColumn = this.data.rightColumnTemplates.map(template => {
        const isFavorited = favoriteResults[template._id] || false;
        const isLiked = likeResults[template._id] || false;
        return {
          ...template,
          isFavorited,
          isLiked
        };
      });

      this.setData({
        templates: updatedTemplates,
        leftColumnTemplates: updatedLeftColumn,
        rightColumnTemplates: updatedRightColumn
      });

      console.log('[状态检查] 批量状态检查完成，已更新页面数据');
    } catch (error) {
      console.error('[状态检查] 批量检查状态失败:', error);
    }
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
  },

  /**
   * 长按举报模板
   */
  onTemplateReport(e) {
    const { id, name } = e.currentTarget.dataset;

    wx.showActionSheet({
      itemList: ['举报该模板'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.showReportDialog(id, 'template', name);
        }
      }
    });
  },

  /**
   * 显示举报对话框
   */
  showReportDialog(targetId, targetType, targetName) {
    const reportReasons = [
      '色情低俗',
      '违法违规',
      '虚假信息',
      '侵权内容',
      '垃圾广告',
      '其他原因'
    ];

    wx.showActionSheet({
      itemList: reportReasons,
      success: async (res) => {
        const reason = reportReasons[res.tapIndex];
        await this.submitReport(targetId, targetType, targetName, reason);
      }
    });
  },

  /**
   * 格式化时间戳为日期字符串
   */
  formatPhotoTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  },

  /**
   * 关闭旅拍相册弹窗
   */
  onAlbumDialogClose() {
    this.setData({ albumDialogVisible: false })
  },

  /**
   * 保存相册到用户相册
   */
  async onSaveAlbum() {
    const { albumOrderId, albumPhotos, albumName, albumLocationName, albumPhotoTime } = this.data

    if (!albumPhotos || albumPhotos.length === 0) {
      wx.showToast({ title: '没有照片可保存', icon: 'none' })
      return
    }

    this.setData({ albumLoading: true })

    try {
      const db = wx.cloud.database()

      // 直接将 fileID 数组写入 user_albums
      await db.collection('user_albums').add({
        data: {
          albumId: albumOrderId,
          title: albumName || `旅拍相册 ${albumOrderId}`,
          photos: albumPhotos.map(fileID => ({ fileID })),
          coverPhoto: albumPhotos[0],
          totalCount: albumPhotos.length,
          locationName: albumLocationName || '',
          photoTime: albumPhotoTime || '',
          createTime: new Date()
        }
      })

      this.setData({
        albumDialogVisible: false,
        albumLoading: false,
        showSaveSuccess: true
      })

      setTimeout(() => {
        this.setData({ showSaveSuccess: false })
        wx.switchTab({ url: '/pages/album/album' })
      }, 2000)

    } catch (err) {
      this.setData({ albumLoading: false })
      console.error('保存相册失败:', err)
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    }
  },

  /**
   * 跳转到旅拍相册页面
   */
  onGoToAlbum() {
    const { albumOrderId } = this.data
    this.setData({ albumDialogVisible: false })
    wx.navigateTo({
      url: `/pages/album/album?orderId=${albumOrderId}`
    })
  },

  /**
   * 提交举报
   */
  async submitReport(targetId, targetType, targetName, reason) {
    try {
      wx.showLoading({ title: '提交中...' });

      const userInfo = await app.ensureUserInfo();
      const db = getDB();
      await db.collection('reports').add({
        data: {
          targetId,
          targetType,
          targetName,
          reason,
          reporterOpenId: userInfo?.openid || '',
          reporterName: userInfo?.nickName || '匿名用户',
          status: 'pending',
          createTime: new Date(),
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '举报成功',
        icon: 'success'
      });
    } catch (err) {
      console.error('举报失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '举报失败',
        icon: 'none'
      });
    }
  }
});
