// components/search-bar/search-bar.js
Component({
  properties: {
    // 搜索框占位符
    placeholder: {
      type: String,
      value: '请输入搜索内容'
    },
    // 搜索关键词
    value: {
      type: String,
      value: ''
    }
  },

  data: {
    inputValue: ''
  },

  lifetimes: {
    attached() {
      this.setData({
        inputValue: this.properties.value
      });
    }
  },

  observers: {
    'value': function(newVal) {
      this.setData({
        inputValue: newVal
      });
    }
  },

  methods: {
    // 输入框输入事件
    onInput(e) {
      const value = e.detail.value;
      this.setData({
        inputValue: value
      });
      this.triggerEvent('input', { value });
    },

    // 输入框确认事件（键盘搜索按钮）
    onConfirm(e) {
      const value = e.detail.value;
      this.triggerEvent('search', { value });
    },

    // 搜索按钮点击事件
    onSearch() {
      this.triggerEvent('search', { value: this.data.inputValue });
    }
  }
})
