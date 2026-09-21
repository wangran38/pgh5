<template>
  <view class="page">
    <!-- 顶部门头多图轮播 -->
    <swiper
      v-if="covers.length"
      class="cover"
      circular
      indicator-dots
      :indicator-color="'rgba(255,255,255,0.4)'"
      :indicator-active-color="'#ffffff'"
    >
      <swiper-item v-for="(url, i) in covers" :key="i" @click="previewCover(i)">
        <image class="cover-slide" :src="url" mode="	aspectFit" />
      </swiper-item>
    </swiper>
    <view v-else class="cover cover-empty"></view>

    <!-- 商家信息卡片 -->
    <view class="info-card">
      <text class="shop-name">{{ shopInfo.name || shopName || '商家' }}</text>

      <view v-if="phone" class="info-row" @click="callPhone">
        <text class="row-icon">📞</text>
        <text class="row-text">{{ phone }}</text>
      </view>

      <view v-if="address" class="info-row" @click="openMap">
        <text class="row-icon">📍</text>
        <text class="row-text">{{ address }}</text>
        <text v-if="hasPosition" class="nav-link">导航 ›</text>
      </view>

      <view v-if="openingHours" class="info-row">
        <text class="row-icon">🕐</text>
        <text class="row-text">营业时间 {{ openingHours }}</text>
      </view>

      <!-- 商户简介 + 专享优惠：有团购时整块默认收起（给团购让位），点「查看全部」展开 -->
      <view v-if="description || discounts" class="more-block">
        <view v-if="moreExpanded" class="more-body">
          <view v-if="description" class="desc-block">
            <view class="desc-head">
              <text class="row-icon">🏷</text>
              <text class="desc-head-text">商户简介</text>
            </view>
            <view ref="descTextRef" class="desc-text" :class="{ collapsed: !descExpanded }" :style="descStyle">{{ description }}</view>
            <!-- 无团购时保留简介自身的折叠；有团购时由外层统一折叠，避免两个「查看全部」 -->
            <view v-if="!hasGroupon && (descOverflow || descExpanded)" class="desc-toggle" @click="descExpanded = !descExpanded">
              <text>{{ descExpanded ? '收起' : '查看全部' }}</text>
            </view>
          </view>

          <!-- 专享优惠 -->
          <view v-if="discounts" class="benefit-box">
            <view class="benefit-tag">✨ 专享优惠</view>
            <scroll-view class="benefit-scroll" scroll-y :style="benefitStyle">
              <text class="benefit-text">{{ discounts }}</text>
            </scroll-view>
          </view>
        </view>

        <view v-if="hasGroupon" class="more-toggle" @click="moreExpanded = !moreExpanded">
          <text>{{ moreExpanded ? '收起' : '查看全部' }}</text>
        </view>
      </view>

      <!-- 有团购时隐藏「优惠买单」，团购卡片作为主要下单入口 -->
      <button v-if="!hasGroupon" class="buy-btn" @click="goCoupons">优惠买单</button>
    </view>

    <!-- 团购（专属票价券）：有团购时上方信息卡自动收窄 -->
    <view v-if="grouponList.length" class="groupon-section">
      <view class="section-head">
        <text class="section-title">团购</text>
        <text class="section-sub">到店出示核销码使用</text>
      </view>

      <view v-for="g in grouponList" :key="g.id" class="groupon-card" @click="buyGroupon(g)">
        <view class="g-main">
          <text class="g-title">{{ g.title || '团购套餐' }}</text>
          <view class="g-tags">
            <text class="g-tag warn">不可退款</text>
            <text class="g-tag link" @click.stop="showNotice">购票须知</text>
          </view>
        </view>
        <view class="g-right">
          <view class="g-price">
            <text class="g-symbol">¥</text>
            <text class="g-num">{{ grouponPrice(g) }}</text>
            <text class="g-qi">起</text>
          </view>
          <button class="g-buy" @click.stop="buyGroupon(g)">购买</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getShopCoupons } from '@/api/shop.js'
import { createOrder } from '@/api/order.js'

const shopId = ref(null)
const shopName = ref('')
const shopLogo = ref('')
// 接口 data.shop 回显的商家详情
const shopInfo = ref({})
const descExpanded = ref(false)
// 实测简介是否超出折叠高度，超出才显示"查看全部"
const descOverflow = ref(false)
// 简介元素引用（H5 下 $el 即 uni-view DOM 节点），用于精确测量
const descTextRef = ref(null)

// cover_images 为逗号分隔多图，逐张拆分去空白；无图时回退链接传入的 shopLogo
const covers = computed(() => {
  const arr = String(shopInfo.value.cover_images || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (arr.length) return arr
  return shopLogo.value ? [shopLogo.value] : []
})
const phone = computed(() => shopInfo.value.contact_phone || shopInfo.value.service_phone || '')
const address = computed(() => shopInfo.value.address || '')
const description = computed(() => shopInfo.value.description || '')
const discounts = computed(() => shopInfo.value.discounts || '')
const openingHours = computed(() => shopInfo.value.opening_hours || '')
const latitude = computed(() => Number(shopInfo.value.latitude) || 0)
const longitude = computed(() => Number(shopInfo.value.longitude) || 0)
const hasPosition = computed(() => !!latitude.value && !!longitude.value)

// ===== 团购 =====
// ⚠️ 当前为本地演示数据（后端团购接口尚未提供），禁止用于真实下单。
// 接入真实接口后：把 grouponList 换成接口返回数组（每项含 id / title / price）
// 即可，下方价格读取与购买下单逻辑无需改动。
const MOCK_GROUPON = [
  { id: 900001, title: '沂蒙山龟蒙景区成人票 + 往返观光车沂蒙山龟蒙景区成人票 + 往返观光车沂蒙山龟蒙景区成人票 + 往返观光车沂蒙山龟蒙景区成人票 + 往返观光车', price: 690 },
  { id: 900002, title: '沂蒙山龟蒙景区亲子套票（2 大 1 小）', price: 1280 },
  { id: 900003, title: '景区全程讲解服务（约 3 小时）', price: 199 }
]
// __mock 标记：演示数据点击购买只提示，不会调用下单接口
const grouponList = ref(MOCK_GROUPON.map((i) => ({ ...i, __mock: true })))
// 有团购时上方信息卡收窄（简介/专享优惠整块收起），让团购尽快露出
const hasGroupon = computed(() => grouponList.value.length > 0)
// 简介 + 专享优惠的整块展开态：有团购默认收起，无团购默认展开
const moreExpanded = ref(!hasGroupon.value)
// 折叠高度：仅在无团购时生效（有团购时由外层 more-block 整块收起）
const descStyle = computed(() => {
  if (hasGroupon.value) return {}
  return descExpanded.value ? {} : { maxHeight: '252rpx' }
})
const benefitStyle = computed(() => (hasGroupon.value ? {} : { maxHeight: '252rpx' }))

// 价格：真实数据取 price（或券面额 discount_amount / amount），演示数据取 price
function grouponPrice(c) {
  const v = c.price != null ? c.price : c.discount_amount ?? c.amount
  return Number(Number(v || 0).toFixed(2))
}

// 购买团购：确认后创建订单（带 coupon_id 供商家核销），进入收银台完成支付
function buyGroupon(g) {
  // 演示数据：不发请求，避免生成无效订单
  if (g.__mock) {
    uni.showToast({ title: '团购接口待接入，当前为演示数据', icon: 'none' })
    return
  }
  const price = grouponPrice(g)
  if (!(price > 0)) {
    uni.showToast({ title: '该团购价格异常，请联系商家', icon: 'none' })
    return
  }
  uni.showModal({
    title: '确认购买',
    content: `${g.title || '团购套餐'}  ¥${price}`,
    success: async (r) => {
      if (!r.confirm) return
      uni.showLoading({ title: '下单中...', mask: true })
      const res = await createOrder({
        shop_id: Number(shopId.value),
        coupon_id: Number(g.id),
        amount: price,
        discount_amount: 0,
        payable_amount: price
      })
      uni.hideLoading()
      if (!res) return // 失败已由 request.js 统一提示
      const data = res.data || {}
      const order = data.order || data
      const oid = order.id ?? order.order_id
      const ono = order.order_no || order.orderNo || ''
      if (!oid) {
        uni.showToast({ title: '下单失败，请重试', icon: 'none' })
        return
      }
      uni.redirectTo({
        url:
          '/pages/users/pay/pay?order_id=' + oid +
          '&order_no=' + encodeURIComponent(ono) +
          '&amount=' + price +
          '&total=' + price +
          '&discount=0' +
          '&shop_name=' + encodeURIComponent(shopInfo.value.name || shopName.value || '')
      })
    }
  })
}

// 购票须知
function showNotice() {
  uni.showModal({
    title: '购票须知',
    content: '1. 团购票一经售出不可退款；\n2. 请在有效期内到店使用；\n3. 到店出示核销码，由商家扫码核销。',
    showCancel: false
  })
}

// cover_images/logo 为逗号分隔字符串，取第一张
function firstImage(str) {
  return String(str || '').split(',')[0].trim()
}

// 点击封面轮播图 → 预览大图（支持多图左右滑看）
function previewCover(i) {
  const urls = covers.value
  if (!urls.length) return
  uni.previewImage({ current: urls[i] || urls[0], urls })
}

function safeDecode(s) {
  if (!s) return ''
  try {
    return decodeURIComponent(s)
  } catch (e) {
    return s
  }
}

// 复用 /shop/coupons：limit=1 只为拿 data.shop 回显（团购目前用本地演示数据）
async function loadShop() {
  const res = await getShopCoupons({ shop_id: shopId.value, page: 1, limit: 1 })
  if (res && res.data && res.data.shop) {
    shopInfo.value = res.data.shop
    if (shopInfo.value.name) uni.setNavigationBarTitle({ title: shopInfo.value.name })
    checkDescOverflow()
  }
}

// 判断简介是否超出折叠高度（max-height 裁切），超出才显示"查看全部"。
// 固定高度裁切下 scrollHeight(完整) > clientHeight(可见) 即可靠判定。
// 注意：必须用组件自身 ref 测量，不能用 document.querySelector——其他页面
// （如 shop/center）也有 .desc-text，H5 下多页面共存于同一 DOM 会取错元素
async function checkDescOverflow() {
  await nextTick()
  setTimeout(() => {
    const inst = descTextRef.value
    const el = inst && (inst.$el || inst)
    if (!el || typeof el.scrollHeight !== 'number') {
      descOverflow.value = description.value.length > 78
      return
    }
    descOverflow.value = el.scrollHeight > el.clientHeight + 2
  }, 50)
}

function callPhone() {
  if (!phone.value) return
  uni.makePhoneCall({ phoneNumber: String(phone.value) })
}

// 地址/导航点击：H5 用高德网页看位置（商家坐标为 chooseLocation 的 gcj02），
// 小程序/App 用 uni.openLocation 拉起系统地图
function openMap() {
  const lat = latitude.value
  const lng = longitude.value
  if (!lat || !lng) {
    uni.showToast({ title: '该商家暂无位置信息', icon: 'none' })
    return
  }
  const name = shopInfo.value.name || shopName.value || '商家位置'
  // #ifdef H5
  window.open(
    `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(name)}&src=pgh5&coordinate=gaode`,
    '_blank'
  )
  // #endif
  // #ifndef H5
  uni.openLocation({
    latitude: lat,
    longitude: lng,
    name,
    address: address.value
  })
  // #endif
}

// 优惠买单 → 该商家优惠券列表页
function goCoupons() {
  const name = encodeURIComponent(shopInfo.value.name || shopName.value || '')
  const logo = encodeURIComponent(firstImage(shopInfo.value.logo) || shopLogo.value || '')
  uni.navigateTo({
    url: `/pages/shop/coupons/coupons?shop_id=${shopId.value}&name=${name}&logo=${logo}`
  })
}

onLoad((query) => {
  shopId.value = Number(query && query.shop_id)
  shopName.value = query && query.name ? safeDecode(query.name) : ''
  shopLogo.value = query && query.logo ? safeDecode(query.logo) : ''
  if (shopName.value) uni.setNavigationBarTitle({ title: shopName.value })
  if (shopId.value) loadShop()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: #ffffff;
  padding-bottom: 60rpx;
  box-sizing: border-box;
}

.cover {
  width: 100%;
  height: 460rpx;
  display: block;
  background: #e2e8f0;

  &.cover-empty {
    background: linear-gradient(135deg, #1e3a8a, #3b82f6);
  }
}

/* 轮播内每张封面占满整页，aspectFill 裁切 */
.cover-slide {
  width: 100%;
  height: 100%;
  display: block;
}

.info-card {
  position: relative;
  margin: -36rpx 24rpx 0;
  background: #fff;
  border-radius: 28rpx;
  padding: 40rpx 36rpx 44rpx;
  box-shadow: 0 8rpx 30rpx rgba(15, 23, 42, 0.08);
}

.shop-name {
  display: block;
  font-size: 40rpx;
  font-weight: 900;
  color: #0f172a;
  line-height: 1.35;
  // padding-bottom: 28rpx;
  border-bottom: 1rpx solid #f1f5f9;
}

.info-row {
  display: flex;
  align-items: center;
  padding: 10rpx 0;
  border-bottom: 1rpx solid #f1f5f9;

  .row-icon {
    font-size: 30rpx;
    margin-right: 20rpx;
    flex-shrink: 0;
  }

  .row-text {
    flex: 1;
    min-width: 0;
    font-size: 30rpx;
    color: #0f172a;
    line-height: 1.5;
  }
}

.desc-block {
  padding: 30rpx 0 8rpx;

  .desc-head {
    display: flex;
    align-items: center;

    .row-icon {
      font-size: 28rpx;
      margin-right: 16rpx;
    }

    .desc-head-text {
      font-size: 32rpx;
      font-weight: 800;
      color: #0f172a;
    }
  }

  .desc-text {
    display: block;
    margin-top: 18rpx;
    font-size: 28rpx;
    color: #475569;
    line-height: 1.8;
    text-indent: 2em;
    white-space: pre-wrap;
    word-break: break-all;

    &.collapsed {
      /* 折叠：固定 5 行高度裁切（行高 28rpx*1.8=50.4rpx → 5 行 252rpx）。
         用 max-height 而非 -webkit-line-clamp：line-clamp 下 scrollHeight 等于裁切后高度，
         无法靠 scrollHeight > clientHeight 判断是否溢出，查看全部按钮会失效 */
      max-height: 252rpx;
      overflow: hidden;
    }
  }

  .desc-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 12rpx;
    font-size: 28rpx;
    color: #2563eb;

  }
}

/* 有团购时的整块展开/收起开关 */
.more-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 28rpx;
  padding: 12rpx 0;
  font-size: 28rpx;
  font-weight: 700;
  color: #2563eb;

  .more-arrow {
    margin-left: 8rpx;
    font-size: 24rpx;
  }
}

/* 专享优惠：红色描边票框 */
.benefit-box {
  position: relative;
  margin-top: 44rpx;
  border: 3rpx solid #ff2d55;
  border-radius: 20rpx;
  padding: 56rpx 30rpx 34rpx;
}

.benefit-tag {
  position: absolute;
  top: -26rpx;
  left: -3rpx;
  background: linear-gradient(90deg, #ff9500, #ff2d55);
  color: #fff;
  font-size: 26rpx;
  font-weight: 800;
  padding: 8rpx 28rpx;
  border-radius: 20rpx 0 20rpx 0;
}

.benefit-text {
  display: block;
  font-size: 28rpx;
  color: #334155;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 内容过多时票框内部滚动（约 5 行高，与简介折叠一致） */
.benefit-scroll {
  max-height: 252rpx;
}

.buy-btn {
  margin: 52rpx auto 0;
  width: 380rpx;
  height: 92rpx;
  line-height: 92rpx;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #ff5c7c, #ff2d55);
  color: #fff;
  font-size: 34rpx;
  font-weight: 800;
  border: none;

  &::after {
    border: none;
  }
}

/* ===== 团购区块 ===== */
.groupon-section {
  margin: 28rpx 24rpx 0;

  .section-head {
    display: flex;
    align-items: baseline;
    padding: 8rpx 4rpx 20rpx;

    .section-title {
      font-size: 34rpx;
      font-weight: 900;
      color: #0f172a;
      margin-right: 16rpx;
    }

    .section-sub {
      font-size: 22rpx;
      color: #94a3b8;
    }
  }
}

.groupon-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 26rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(15, 23, 42, 0.05);

  .g-main {
    flex: 1;
    min-width: 0;
    margin-right: 20rpx;

    .g-title {
      /* 最多两行，超出省略：line-clamp 为标准属性，-webkit- 前缀供 webkit 内核使用 */
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-all;
      font-size: 30rpx;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.5;
    }

    .g-tags {
      display: flex;
      align-items: center;
      margin-top: 14rpx;

      .g-tag {
        font-size: 20rpx;
        padding: 4rpx 14rpx;
        border-radius: 6rpx;
        margin-right: 16rpx;
      }

      .warn {
        color: #ff2d55;
        border: 1rpx solid #ffc9d4;
        background: #fff5f7;
      }

      .link {
        color: #2563eb;
      }
    }
  }

  .g-right {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    .g-price {
      display: flex;
      align-items: baseline;
      color: #ff6a00;

      .g-symbol {
        font-size: 24rpx;
        font-weight: 800;
      }

      .g-num {
        font-size: 44rpx;
        font-weight: 900;
        line-height: 1.1;
      }

      .g-qi {
        font-size: 22rpx;
        margin-left: 4rpx;
      }
    }

    .g-buy {
      margin: 16rpx 0 0;
      width: 150rpx;
      height: 64rpx;
      line-height: 64rpx;
      border-radius: 12rpx;
      padding: 0;
      background: linear-gradient(90deg, #ff9500, #ff6a00);
      color: #fff;
      font-size: 28rpx;
      font-weight: 800;
      border: none;

      &::after {
        border: none;
      }
    }
  }
}
</style>
