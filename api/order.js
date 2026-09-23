import { post } from '@/utils/request.js'

// 订单支付方式（随 pay_type 传给后端，两种方式的差别只在「是否需要线上付款」）：
//   1 ONLINE 线上/在线支付：提交订单 → 在线付款成功 → 商家核销票根与优惠券
//   2 CASH   线下/到店付现：提交订单 → 到店现金结算 → 商家核销订单/票根与优惠券
// 取值与商家订单列表接口文档一致（1:在线支付 2:当面核销付）
export const PAY_TYPE = {
  ONLINE: 1,
  CASH: 2
}

export const PAY_TYPE_MAP = {
  1: '在线支付',
  2: '到店付现'
}

// 是否为线下付（到店付现）：这类订单不需要线上付款，直接出示核销码到店核销
export function isOfflinePay(v) {
  return Number(v) === PAY_TYPE.CASH
}

export function payTypeText(v) {
  return PAY_TYPE_MAP[Number(v)] || ''
}

/**
 * 创建订单（优惠买单 / 团购商品下单共用）
 * @param {Object} data
 * @param {number} data.shop_id - 所属商家id（必传）
 * @param {number} [data.ticket_id] - 会员自己的票根id（优惠买单必传；团购流程无票根，不传）
 * @param {string|number} data.coupon_id - 所属优惠券的id；不使用优惠券时必须传 0
 * @param {string} [data.product_id] - 所选团购商品id
 * @param {string} [data.product_name] - 所选商品/套餐名称
 * @param {number} data.amount - 优惠订单支付金额（不使用券时 = 实付金额）
 * @param {number} data.discount_amount - 前端计算的优惠金额（不使用券时必须传 0，接口按全额支付落库）
 * @param {number} data.payable_amount - 前端计算的实付金额
 * @param {number} [data.pay_type] - 1在线支付 2当面核销付（可选，收银台内再更新）
 */
export function createOrder(data = {}) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/order/create', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 我的订单列表（分页）
 * @param {Object} data
 * @param {string} [data.order_no] - 订单号模糊搜索
 * @param {number} [data.status] - 1待支付 2已支付 3已取消
 * @param {number} [data.page] - 页码
 * @param {number} [data.limit] - 每页条数
 */
export function getOrderList(data = {}) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/order/list', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 商家订单列表（B 端，分页）
 * @param {Object} data
 * @param {number} data.page - 页码
 * @param {number} data.limit - 每页条数
 * @param {number} [data.status] - 1待支付 2待核销 3已核销 4已取消；不传为全部
 * @param {number|string} [data.order_no] - 订单号搜索
 * 返回 data：{ shop_id, list, total, page, limit }
 */
export function getShopOrderList(data = {}) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop/order/list', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 获取订单核销二维码内容（C 端出示核销码）
 * 优先由后端出签并返回 qrContent，密钥不落前端。
 * ⚠️ 该接口后端尚未实现，页面默认不调用（见 qrcode.vue 的 USE_SERVER_QR = false）；
 *    后端就绪后把开关打开即可，失败也不会弹提示（silent），会自动回退本地出签。
 * @param {Object} data
 * @param {string} data.order_no - 订单号
 * 返回 data 约定：{ qr_content }（或 { qrContent }）
 */
export function getOrderQRCode(data = {}) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/order/qrcode', data, {
    silent: true,
    // 后端未实现该接口时快速失败（默认 20s 太久），由页面回退本地出签
    timeout: 3000,
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 商家核销订单（B 端扫码/输入订单号）
 * @param {Object} data
 * @param {string} data.order_no - 订单号（必填）
 * @param {number} data.timestamp - 二维码生成时间戳；手动输入静态码时传 0
 * @param {string} data.sign - 二维码签名；手动输入静态码时传空串（后端按免签处理）
 * 扫码内容解析见 utils/orderQR.js 的 parseOrderQR
 */
export function verifyOrder(data = {}) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop/order/verify', data, {
    // 核销失败的原因由页面结果卡展示后端 message，避免 toast 与结果卡重复提示
    silent: true,
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 设置订单支付方式（收银台选定后调用；下单时不传 pay_type，以这里的选择为准）
 * @param {Object} data
 * @param {string} data.order_no - 订单号（必填，后端按订单号记账）
 * @param {number} data.pay_type - 支付模式（必填）：1 在线支付 2 当面核销付（见 PAY_TYPE）
 */
export function updateOrderPayType(data = {}) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/order/update-pay-type', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 获取支付参数（下单后调起支付前调用）
 * @param {Object} data
 * @param {number} data.order_id - 订单id
 * @param {string} [data.order_no] - 订单号
 * @param {string} data.channel - 支付渠道：wechat | alipay
 * 返回 data 的字段约定见 utils/payment.js 顶部说明
 */
export function payOrder(data = {}) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/order/pay', data, {
    header: {
      'pgtoken': token
    }
  })
}
