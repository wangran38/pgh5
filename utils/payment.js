// utils/payment.js
// 统一支付封装：按「渠道 + 运行端」分发调起支付，业务页面只调 pay()。
//
// 后端约定接口：POST /user/order/pay  { order_id, order_no, channel }
//   channel: 'wechat' | 'alipay'
// 返回 data 字段约定（后端按渠道/端返回其一）：
//   微信（H5 微信内 JSAPI / App / 小程序）：{ appId, timeStamp, nonceStr, package, signType, paySign }
//   微信（H5 普通浏览器）：{ mweb_url }（跳转支付）
//   支付宝（H5）：{ pay_url } 或 { form }（自动提交表单）
//   支付宝（App）：{ orderInfo }
//   支付宝（小程序）：{ tradeNO }
//
// 新增渠道：在 PAY_CHANNELS 加一项，并在 invokeByChannel 中补该渠道分发即可。
//
// pay() 返回值：
//   'paid'    明确支付成功（渠道已回调成功）
//   'pending' 已跳转/已发起，最终结果以后端回调与订单状态为准

import { payOrder } from '@/api/order.js'

// 可配置的支付渠道（顺序即弹层展示顺序）
export const PAY_CHANNELS = [
  { value: 'wechat', label: '微信支付' },
  { value: 'alipay', label: '支付宝' }
]

// 调起支付
// @param {Object} params
// @param {number|string} params.orderId - 订单id
// @param {string} [params.orderNo] - 订单号
// @param {string} params.channel - 渠道：wechat | alipay
export async function pay({ orderId, orderNo, channel }) {
  const res = await payOrder({
    order_id: orderId,
    order_no: orderNo,
    channel
  })
  // 失败已由 request.js 统一提示，此处静默返回，避免重复 toast
  if (!res || !res.data) {
    const err = new Error('获取支付参数失败')
    err.silent = true
    throw err
  }
  return invokeByChannel(channel, res.data)
}

function invokeByChannel(channel, p) {
  if (channel === 'wechat') return invokeWechat(p)
  if (channel === 'alipay') return invokeAlipay(p)
  throw new Error('不支持的支付渠道')
}

// 微信支付参数归一化（兼容后端不同命名）
function wechatJsapiParams(p) {
  return {
    appId: p.appId || p.appid || '',
    timeStamp: String(p.timeStamp || p.timestamp || ''),
    nonceStr: p.nonceStr || p.noncestr || '',
    package: p.package || p.packageValue || '',
    signType: p.signType || 'RSA',
    paySign: p.paySign || p.sign || ''
  }
}

function isWechatBrowser() {
  return typeof navigator !== 'undefined' && /micromessenger/i.test(navigator.userAgent || '')
}

// ===== 微信 =====
function invokeWechat(p) {
  // #ifdef H5
  // 非微信浏览器：走 H5 跳转支付
  if (!isWechatBrowser()) {
    const url = p.mweb_url || p.h5_url || p.pay_url
    if (!url) return Promise.reject(new Error('请在微信中打开后完成支付'))
    window.location.href = url
    return Promise.resolve('pending')
  }
  // 微信内：JSAPI 调起
  return new Promise((resolve, reject) => {
    const run = () => {
      window.WeixinJSBridge.invoke('getBrandWCPayRequest', wechatJsapiParams(p), (r) => {
        const msg = (r && r.err_msg) || ''
        if (msg === 'get_brand_wcpay_request:ok') resolve('paid')
        else if (msg === 'get_brand_wcpay_request:cancel') reject(new Error('cancel'))
        else reject(new Error('微信支付失败'))
      })
    }
    if (typeof window.WeixinJSBridge === 'undefined') {
      document.addEventListener('WeixinJSBridgeReady', run, false)
      // 微信未注入桥时兜底超时，避免 Promise 悬空
      setTimeout(() => {
        if (typeof window.WeixinJSBridge === 'undefined') reject(new Error('微信支付未就绪，请重试'))
      }, 3000)
    } else {
      run()
    }
  })
  // #endif

  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay',
      ...wechatJsapiParams(p),
      success: () => resolve('paid'),
      fail: (err) => reject(normalizeFail(err, '微信支付失败'))
    })
  })
  // #endif

  // #ifdef APP-PLUS
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay',
      orderInfo: p.orderInfo || p,
      success: () => resolve('paid'),
      fail: (err) => reject(normalizeFail(err, '微信支付失败'))
    })
  })
  // #endif

  // #ifndef H5 || MP-WEIXIN || APP-PLUS
  return Promise.reject(new Error('当前端暂不支持微信支付'))
  // #endif
}

// ===== 支付宝 =====
function invokeAlipay(p) {
  // #ifdef H5
  // 表单形式：注入并自动提交
  if (p.form) {
    const div = document.createElement('div')
    div.innerHTML = p.form
    document.body.appendChild(div)
    return Promise.resolve('pending')
  }
  if (p.pay_url || p.url) {
    window.location.href = p.pay_url || p.url
    return Promise.resolve('pending')
  }
  return Promise.reject(new Error('支付宝支付参数缺失'))
  // #endif

  // #ifdef MP-ALIPAY
  return new Promise((resolve, reject) => {
    my.tradePay({
      tradeNO: p.tradeNO || p.trade_no,
      success: (r) => {
        // 9000 支付成功；8000/6001 为处理中/用户取消
        if (Number(r && r.resultCode) === 9000) resolve('paid')
        else if (String(r && r.resultCode) === '6001') reject(new Error('cancel'))
        else resolve('pending')
      },
      fail: (err) => reject(normalizeFail(err, '支付宝支付失败'))
    })
  })
  // #endif

  // #ifdef APP-PLUS
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      provider: 'alipay',
      orderInfo: p.orderInfo || p.order_info,
      success: () => resolve('paid'),
      fail: (err) => reject(normalizeFail(err, '支付宝支付失败'))
    })
  })
  // #endif

  // #ifndef H5 || MP-ALIPAY || APP-PLUS
  return Promise.reject(new Error('当前端暂不支持支付宝支付'))
  // #endif
}

// 统一的失败信息归一化：用户取消统一抛 'cancel'
function normalizeFail(err, fallback) {
  const msg = (err && (err.errMsg || err.errmsg || err.message)) || ''
  if (/cancel/i.test(msg)) return new Error('cancel')
  return new Error(msg || fallback)
}
