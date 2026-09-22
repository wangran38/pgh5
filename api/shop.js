import { get, post } from '@/utils/request.js'

/**
 * 获取商家分类列表
 * @param {Object} params - 请求参数
 */
export function getShopCategories(params = { parent_id: -1 }) {
  return get('/shop-categories', params)
}

/**
 * 获取当前会员绑定的商家状态（含 shop_id，用于商家中心展示）
 */
export function getShopApplyStatus() {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop-apply/status', {}, {
    // 探测入驻态用，失败（未登录/无申请记录）不弹全局提示，由页面自行处理
    silent: true,
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 提交商家入驻申请
 * @param {Object} data - 入驻表单数据
 */
export function applyShop(data) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop-apply', data, {
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
  return post('/user/shop/info', data, {
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
  return post('/user/shop/edit', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 获取店铺优惠活动列表
 * @param {Object} data - 查询参数，例如 { shop_id: 1 }
 */
export function getPromoList(data = {}) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop/promo/list', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 新建优惠活动（提交后进入平台审核）
 * @param {Object} data - 优惠活动表单数据
 */
export function createPromo(data) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop/promo/create', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 更新优惠活动（编辑草稿、重新提交审核等）
 * @param {Object} data - 必须包含活动 id
 */
export function updatePromo(data) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop/promo/update', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 删除优惠活动（仅草稿/被驳回状态可删除）
 * @param {Object} data - 包含活动 id，例如 { id: 1 }
 */
export function deletePromo(data) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop/promo/delete', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 新增优惠券
 * @param {Object} data
 */
export function addCoupon(data) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop/coupon/add', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 编辑优惠券
 * @param {Object} data - 必须包含 id
 */
export function editCoupon(data) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop/coupon/edit', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 团购商品详情（B 端编辑回显）
 * 与公开详情 /shop/goods/detail 的区别：需登录 + 归属校验，返回全部状态商品，
 * 子表原样返回（含禁用的 SKU、已关闭的票根优惠），不附带商家摘要。
 * @param {Object} data
 * @param {number} data.id - 商品 ID（必填）
 * 返回 data：{ product, skus, items, rule, ticket_discount }
 *   skus / items 无数据时为 []；rule / ticket_discount 未配置时为 null
 */
export function getShopGoodsDetail(data = {}) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop/goods/detail', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 公开的团购商品详情（C 端，无需登录）
 * 仅返回已上架（status=2）商品；SKU 仅启用规格；票根优惠仅已开启；附带商家摘要 shop。
 * @param {Object} data
 * @param {number} data.id - 商品 ID（必填）
 * 返回 data：{ product, skus, items, rule, ticket_discount, shop }
 *   rule / ticket_discount / shop 未配置或不可见时为 null；skus / items 无数据为 []
 */
export function getGoodsDetail(data = {}) {
  return post('/shop/goods/detail', data)
}

/**
 * 公开的商家团购商品列表（C 端，无需登录）
 * GET/POST /api/shop/goods —— 指定商家的已上架商品。
 * @param {Object} data
 * @param {number} [data.shop_id] - 指定店铺 ID；不传则查该商户名下全部店铺
 * @param {number} [data.status] - 0全部(默认) 1待审核 2已上架 3已下架
 * @param {string} [data.title] - 标题关键词，模糊匹配
 * @param {number} [data.page] - 页码，默认 1
 * @param {number} [data.limit] - 每页条数，默认 10
 * @param {string} [data.order] - id DESC(默认) / sales_count DESC / selling_price ASC|DESC
 * 返回 data：{ list, total }
 *   list[].id / shop_id / title / sub_title / cover_image / images(JSON 字符串) /
 *           biz_type / product_type / original_price / selling_price / status /
 *           stock_type / total_stock / sales_count / valid_type / valid_start / valid_end
 */
export function getShopGoodsPublic(data = {}) {
  // silent：接口未就绪时静默失败（不弹错误），由页面按空列表降级
  return post('/shop/goods', data, { silent: true })
}

/**
 * 编辑团购商品（B 端）
 * 事务化更新主表，并全量重建传入的子表数据。
 * ⚠️ 子表语义（关键）：
 *   不传 / 传 null → 保留原数据不动
 *   传 []          → 清空该子表
 *   传值           → 全量重建（先删后插），前端需传完整的最终列表
 * @param {Object} data
 * @param {number} data.id - 商品 ID（必填）
 * @param {number} data.shop_id - 店铺 ID（必填，须与商品归属一致）
 * @param {string} data.title - 产品标题（必填）
 * @param {string} data.cover_image - 主图 URL（必填）
 * @param {string} data.biz_type - EAT吃 HOTEL住 TRAVEL行 TOUR游 SHOP购 FUN娱（必填）
 * @param {string} data.product_type - SET_MEAL套餐 VOUCHER代金券 ROOM_NIGHT房晚 TICKET门票 TRANSFER接送机 RENTAL租车（必填）
 * @param {number} data.original_price - 划线原价（必填）
 * @param {number} data.selling_price - 团购价（必填）
 * @param {number} data.total_stock - 总库存（必填）
 * @param {number} [data.status] - 0草稿 1待审核 2已上架 3已下架，不传默认 0
 * @param {Array} [data.skus] - 见上方子表语义
 * @param {Array} [data.items] - 见上方子表语义
 * @param {Object} [data.rule] - 见上方子表语义
 * @param {Object} [data.ticket_discount] - is_enabled != 1 时清空不重建
 * 返回 data：{ id, updated }
 */
export function editShopGoods(data = {}) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop/goods/edit', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 商家团购商品列表（B 端，分页 + 筛选）
 * 后端强制按当前登录商户过滤，无法查看他人商品。
 * @param {Object} data
 * @param {number} [data.shop_id] - 店铺 ID，不传则查该商户名下全部店铺
 * @param {number} [data.status] - 0全部（默认）1待审核 2已上架 3已下架
 * @param {string} [data.title] - 标题关键词，模糊匹配
 * @param {number} [data.page] - 页码，默认 1
 * @param {number} [data.limit] - 每页条数，默认 10
 * @param {string} [data.order] - 排序，默认 id DESC（最新在前）
 * 返回 data：{ list, total }
 *   list[].status：0草稿 1待审核 2已上架 3已下架
 *   list[].images：JSON 字符串，需 JSON.parse
 */
export function getShopGoodsList(data = {}) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop/goods/list', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 新增团购商品（B 端）
 * 事务内保存产品主表 + SKU 规格 + 明细清单 + 核销规则 + 票根联运优惠。
 * @param {Object} data
 * @param {number} data.shop_id - 所属店铺 ID（必填）
 * @param {string} data.title - 产品标题（必填）
 * @param {string} [data.sub_title] - 副标题
 * @param {string} data.cover_image - 产品主图 URL（必填）
 * @param {string} [data.images] - 轮播图 URL 数组，JSON 字符串
 * @param {string} data.biz_type - 业务类型：EAT吃 HOTEL住 TRAVEL行 TOUR游 SHOP购 FUN娱（必填）
 * @param {string} data.product_type - 产品形态：SET_MEAL套餐 VOUCHER代金券 ROOM_NIGHT房晚 TICKET门票 TRANSFER接送机 RENTAL租车（必填）
 * @param {number} data.original_price - 划线原价（必填）
 * @param {number} data.selling_price - 团购价（必填）
 * @param {number} data.total_stock - 总库存（必填）
 * @param {number} [data.stock_type] - 1总库存（默认）2每日/场次动态库存
 * @param {number} [data.valid_type] - 1指定时间段（默认）2购买后X天内有效
 * @param {number} [data.valid_days] - valid_type=2 时生效
 * @param {string} [data.valid_start] - YYYY-MM-DD HH:mm:ss
 * @param {string} [data.valid_end] - YYYY-MM-DD HH:mm:ss
 * @param {Array} [data.skus] - SKU 规格列表
 * @param {Array} [data.items] - 产品明细清单
 * @param {Object} [data.rule] - 核销/使用规则
 * @param {Object} [data.ticket_discount] - 票根识别联动优惠配置
 * 返回 data：{ product_id }
 */
export function addShopGoods(data = {}) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop/goods/add', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 获取商家列表
 * @param {Object} data
 */
export function getShopList(data = {}) {
  return post('/shops', data)
}

/**
 * 获取商家优惠券列表（分页）
 * @param {Object} data
 */
export function getCouponList(data = {}) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop/coupon/list', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 获取某商家的优惠券列表（C 端公开）
 * @param {Object} data
 */
export function getShopCoupons(data = {}) {
  return post('/shop/coupons', data)
}

/**
 * 券码核销（B 端扫码/输码）
 * @param {Object} data
 * 返回 data 约定：{ coupon_id, title, discount_amount, verified_at, ... }
 */
export function verifyCoupon(data = {}) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop/coupon/verify', data, {
    header: {
      'pgtoken': token
    }
  })
}

/**
 * 核销记录列表（分页）
 * @param {Object} data
 */
export function getVerifyRecordList(data = {}) {
  const token = uni.getStorageSync('pgtoken') || ''
  return post('/user/shop/coupon/verify-list', data, {
    header: {
      'pgtoken': token
    }
  })
}
