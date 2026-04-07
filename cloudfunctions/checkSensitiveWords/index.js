// 云函数：检测敏感词
const cloud = require('wx-server-sdk');
const tencentcloud = require('tencentcloud-sdk-nodejs');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 导入天御内容安全客户端
const TmsClient = tencentcloud.tms.v20201229.Client;

exports.main = async (event, context) => {
  const { content } = event;

  if (!content) {
    return {
      success: false,
      message: '内容不能为空'
    };
  }

  try {
    // 初始化客户端
    const client = new TmsClient({
      credential: {
        secretId: process.env.TENCENT_SECRET_ID,  // 从环境变量读取
        secretKey: process.env.TENCENT_SECRET_KEY
      },
      region: 'ap-guangzhou',
      profile: {
        httpProfile: {
          endpoint: 'tms.tencentcloudapi.com'
        }
      }
    });

    // 调用文本内容检测接口
    const params = {
      Content: Buffer.from(content).toString('base64'),  // Base64 编码
      Device: {
     eType: 5  // 5 表示小程序
      }
    };

    const response = await client.TextModeration(params);

    // 解析结果
    const { Suggestion, Label, Keywords } = response;

    return {
      success: true,
      data: {
        suggestion: Suggestion,  // Pass=正常, Review=疑似, Block=违规
        label: Label,            // 命中的标签
        keywords: Keywords,      // 命中的关键词
        isSafe: Suggestion === 'Pass'
      }
    };

  } catch (error) {
    console.error('敏感词检测失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
};
