import { post } from '@/utils/request.js'

/**
 * 创建订单（优惠买单下单）
 * @param {Object} data
 * @param {number} data.shop_id - 所属商家id
 * @param {number} data.ticket_id - 会员自己的票根id
 * @param {string|number} data.coupon_id - 所属优惠券的id
 * @param {number} data.amount - 优惠订单支付金额
 * @param {number} [data.discount_amount] - 前端计算的优惠金额
 * @param {number} [data.payable_amount] - 前端计算的实付金额
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
