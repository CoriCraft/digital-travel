// 云函数：检测内容安全
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { content } = event;

  if (!content || content.trim() === '') {
    return {
      success: false,
      message: '内容不能为空'
    };
  }

  try {
    let result;
    let apiVersion = 'v2';

    // 如果没有有效的 openid，直接使用 v1 版本
    if (!context.OPENID) {
      console.log('未获取到 openid，使用 v1 版本');
      apiVersion = 'v1';
      result = await cloud.openapi.security.msgSecCheck({
        content: content
      });
    } else {
      try {
        // 有 openid 时，优先尝试 v2 版本的内容安全接口
        result = await cloud.openapi.security.msgSecCheck({
          openid: context.OPENID,
          scene: 2, // 场景值：1-资料；2-评论；3-论坛；4-社交日志
          version: 2,
          content: content
        });
      } catch (v2Error) {
        console.log('v2 API调用失败，尝试使用 v1 版本:', v2Error.errCode);

        // 如果 v2 失败（权限问题或 openid 问题），降级使用 v1 版本
        if (v2Error.errCode === -604101 || v2Error.errCode === 47001 || v2Error.errCode === 40003) {
          apiVersion = 'v1';
          result = await cloud.openapi.security.msgSecCheck({
            content: content
          });
        } else {
          throw v2Error;
        }
      }
    }

    console.log(`内容安全检测结果 (${apiVersion}):`, result);

    // 判断检测结果
    let isSafe = true;
    if (apiVersion === 'v2') {
      // v2 版本返回格式：result.result.suggest
      // pass-通过，review-需人工审核，risky-违规
      const suggest = result.result?.suggest || 'pass';
      isSafe = suggest === 'pass';
    } else {
      // v1 版本：如果没有抛出异常，说明内容安全
      isSafe = true;
    }

    return {
      success: true,
      isSafe: isSafe,
      message: isSafe ? '内容安全' : '内容包含敏感信息，请修改后重试'
    };

  } catch (err) {
    console.error('内容安全检测失败:', err);

    // errCode === 87014 表示内容违规
    if (err.errCode === 87014) {
      return {
        success: true,
        isSafe: false,
        message: '内容包含敏感信息，请修改后重试'
      };
    }

    // 权限错误，返回友好提示
    if (err.errCode === -604101 || err.errCode === 47001) {
      return {
        success: false,
        message: '内容安全检测服务暂不可用，请联系管理员配置API权限'
      };
    }

    // openid 错误
    if (err.errCode === 40003) {
      return {
        success: false,
        message: '用户身份验证失败，请重新登录'
      };
    }

    // 其他错误
    return {
      success: false,
      message: err.errMsg || '检测失败，请重试'
    };
  }
};
