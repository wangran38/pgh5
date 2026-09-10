import { get, post } from '@/utils/request' // 请根据你实际的项目路径调整

/**
 * 1. 用户短信发送接口
 * @param {Object} data
 * @param {string} data.mobile 用户手机号码 (必选)
 */
export function sendSms(data) {
  return post('/send-sms', data)
}

/**
 * 2. 会员短信验证码注册/登录接口
 * @param {Object} data
 * @param {string} data.mobile 用户手机号码 (必选)
 * @param {string} data.code 手机验证码 (必选，未成功可填 888888)
 */
export function quickLogin(data) {
  return post('/quick-login', data)
}

export function getUserProfile() {
  const pgtoken = uni.getStorageSync('pgtoken') || ''

  return get('/user/profile', {}, {
    // 探测登录态用，失败（未登录/token过期）不弹全局提示，由页面自行处理
    silent: true,
    header: {
      // 换成标准 Authorization 头部，并加上 Bearer 前缀
      'Authorization': `Bearer ${pgtoken}`
    }
  })
}

/**
 * 获取我的票根列表（分页）
 * @param {Object} data
 */
export function getUserTicketList(data = {}) {
  const pgtoken = uni.getStorageSync('pgtoken') || ''
  return post('/user/ticket/list', data, {
    header: {
      'pgtoken': pgtoken
    }
  })
}
