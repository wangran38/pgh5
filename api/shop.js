import request from '@/utils/request.js'

/**
 * 获取商家分类列表
 * @param {Object} params - 请求参数
 */
export function getShopCategories(params = { parent_id: -1 }) {
  return request({
    url: '/shop-categories',
    method: 'GET',
    data: params
  })
}

/**
 * 提交商家入驻申请
 * @param {Object} data - 表单数据
 */
export function applyShop(data) {
  const token = uni.getStorageSync('pgtoken') || ''
  return request({
    url: '/user/shop-apply',
    method: 'POST',
    data: data,
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 获取会员申请商家状态接口
 */
export function getShopApplyStatus() {
  const token = uni.getStorageSync('pgtoken') || ''
  return request({
    url: '/user/shop-apply/status',
    method: 'POST',
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 根据店铺ID获取商家详细信息（用于编辑前回显）
 * @param {Object} data - 包含 shop_id 的对象，例如 { shop_id: 1 }
 */
export function getShopInfo(data) {
  const token = uni.getStorageSync('pgtoken') || ''
  return request({
    url: '/user/shop/info',
    method: 'POST',
    data: data,
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 提交/保存编辑、补充的店铺资料
 * @param {Object} data - 店铺完整或修改后的表单数据（必须包含 id）
 */
export function editShop(data) {
  const token = uni.getStorageSync('pgtoken') || ''
  return request({
    url: '/user/shop/edit',
    method: 'POST',
    data: data,
    header: {
      'pgtoken': token
    }
  })
}
