import request from '@/utils/request' // 请根据你实际的项目路径调整

/**
 * 1. 用户短信发送接口
 * @param {Object} data
 * @param {string} data.mobile 用户手机号码 (必选)
 */
export function sendSms(data) {
  return request({
    url: '/send-sms',
    method: 'POST',
    data
  })
}

/**
 * 2. 会员短信验证码注册/登录接口
 * @param {Object} data
 * @param {string} data.mobile 用户手机号码 (必选)
 * @param {string} data.code 手机验证码 (必选，未成功可填 888888)
 */
export function quickLogin(data) {
  return request({
    url: '/quick-login',
    method: 'POST',
    data
  })
}

export function getUserProfile() {
  const pgtoken = uni.getStorageSync('pgtoken') || ''
  console.log('【前端调试】准备发送的 token:', pgtoken)

  return request({
    url: '/user/profile',
    method: 'GET',
    header: {
      // 换成标准 Authorization 头部，并加上 Bearer 前缀
      'Authorization': `Bearer ${pgtoken}`
    }
  })
}
