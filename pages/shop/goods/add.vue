<template>
  <view class="page">
    <scroll-view class="form-scroll" scroll-y>
      <!-- ===== 基础信息 ===== -->
      <view class="card">
        <text class="card-title">基础信息</text>

        <view class="field">
          <text class="label required">产品标题</text>
          <input v-model="form.title" class="input" placeholder="如：觉海听涛双人餐" placeholder-class="ph" />
        </view>

        <view class="field">
          <text class="label">副标题 / 卖点</text>
          <input v-model="form.sub_title" class="input" placeholder="如：海景餐厅 · 双人海鲜盛宴" placeholder-class="ph" />
        </view>

        <view class="field">
          <text class="label required">产品主图</text>
          <view class="img-row">
            <view v-if="form.cover_image" class="thumb-wrap">
              <image class="thumb" :src="form.cover_image" mode="aspectFill" />
              <text class="thumb-del" @click="form.cover_image = ''">✕</text>
            </view>
            <view v-else class="upload-btn" @click="chooseCover">＋ 上传主图</view>
          </view>
        </view>

        <view class="field">
          <text class="label">轮播图（可多张）</text>
          <view class="img-row">
            <view v-for="(url, i) in imageList" :key="i" class="thumb-wrap">
              <image class="thumb" :src="url" mode="aspectFill" />
              <text class="thumb-del" @click="removeImage(i)">✕</text>
            </view>
            <view class="upload-btn" @click="chooseImages">＋ 添加</view>
          </view>
        </view>

        <view class="field">
          <text class="label required">业务类型</text>
          <picker mode="selector" :range="BIZ_TYPES" range-key="label" :value="bizIndex" @change="onBizChange">
            <view class="picker-value">{{ BIZ_TYPES[bizIndex].label }}</view>
          </picker>
        </view>

        <view class="field">
          <text class="label required">产品形态</text>
          <picker mode="selector" :range="PRODUCT_TYPES" range-key="label" :value="productIndex" @change="onProductChange">
            <view class="picker-value">{{ PRODUCT_TYPES[productIndex].label }}</view>
          </picker>
        </view>
      </view>

      <!-- ===== 价格库存 ===== -->
      <view class="card">
        <text class="card-title">价格与库存</text>

        <view class="field">
          <text class="label required">划线原价</text>
          <input v-model="form.original_price" class="input" type="digit" placeholder="如：688" placeholder-class="ph" />
        </view>

        <view class="field">
          <text class="label required">团购价</text>
          <input v-model="form.selling_price" class="input" type="digit" placeholder="如：468" placeholder-class="ph" />
        </view>

        <view class="field">
          <text class="label required">总库存</text>
          <input v-model="form.total_stock" class="input" type="number" placeholder="如：100" placeholder-class="ph" />
        </view>

        <view class="field">
          <text class="label">库存机制</text>
          <picker mode="selector" :range="STOCK_TYPES" range-key="label" :value="stockIndex" @change="onStockChange">
            <view class="picker-value">{{ STOCK_TYPES[stockIndex].label }}</view>
          </picker>
        </view>
      </view>

      <!-- ===== 有效期 ===== -->
      <view class="card">
        <text class="card-title">有效期</text>

        <view class="field">
          <text class="label">有效期类型</text>
          <picker mode="selector" :range="VALID_TYPES" range-key="label" :value="validIndex" @change="onValidChange">
            <view class="picker-value">{{ VALID_TYPES[validIndex].label }}</view>
          </picker>
        </view>

        <template v-if="form.valid_type === 1">
          <view class="field">
            <text class="label">开始时间</text>
            <picker mode="date" :value="startDate" @change="onStartChange">
              <view class="picker-value">{{ startDate || '请选择' }}</view>
            </picker>
          </view>
          <view class="field">
            <text class="label">结束时间</text>
            <picker mode="date" :value="endDate" @change="onEndChange">
              <view class="picker-value">{{ endDate || '请选择' }}</view>
            </picker>
          </view>
        </template>

        <view v-else class="field">
          <text class="label">购买后有效天数</text>
          <input v-model="form.valid_days" class="input" type="number" placeholder="如：30" placeholder-class="ph" />
        </view>
      </view>

      <!-- ===== SKU 规格 ===== -->
      <view class="card">
        <view class="card-head">
          <text class="card-title">规格 / SKU（选填）</text>
          <text class="card-add" @click="addSku">＋ 添加规格</text>
        </view>

        <view v-for="(sku, i) in skus" :key="i" class="sub-block">
          <view class="sub-head">
            <text class="sub-title">规格 {{ i + 1 }}</text>
            <text class="sub-del" @click="removeSku(i)">删除</text>
          </view>
          <view class="field">
            <text class="label">规格名称</text>
            <input v-model="sku.sku_name" class="input" placeholder="如：双人豪华餐" placeholder-class="ph" />
          </view>
          <view class="field-row">
            <view class="field flex1">
              <text class="label">划线原价</text>
              <input v-model="sku.original_price" class="input" type="digit" placeholder="688" placeholder-class="ph" />
            </view>
            <view class="field flex1">
              <text class="label">售卖价</text>
              <input v-model="sku.price" class="input" type="digit" placeholder="468" placeholder-class="ph" />
            </view>
          </view>
          <view class="field-row">
            <view class="field flex1">
              <text class="label">库存</text>
              <input v-model="sku.stock" class="input" type="number" placeholder="100" placeholder-class="ph" />
            </view>
            <view class="field flex1">
              <text class="label">SKU 编码</text>
              <input v-model="sku.sku_code" class="input" placeholder="MEAL-001" placeholder-class="ph" />
            </view>
          </view>
        </view>

        <text v-if="!skus.length" class="empty-tip">未添加规格，按主价格售卖</text>
      </view>

      <!-- ===== 明细清单 ===== -->
      <view class="card">
        <view class="card-head">
          <text class="card-title">明细清单（选填）</text>
          <text class="card-add" @click="addItem">＋ 添加明细</text>
        </view>

        <view v-for="(it, i) in items" :key="i" class="sub-block">
          <view class="sub-head">
            <text class="sub-title">明细 {{ i + 1 }}</text>
            <text class="sub-del" @click="removeItem(i)">删除</text>
          </view>
          <view class="field-row">
            <view class="field flex1">
              <text class="label">分组</text>
              <input v-model="it.group_name" class="input" placeholder="如：热菜" placeholder-class="ph" />
            </view>
            <view class="field flex1">
              <text class="label">名称</text>
              <input v-model="it.item_name" class="input" placeholder="如：清蒸石斑鱼" placeholder-class="ph" />
            </view>
          </view>
          <view class="field-row">
            <view class="field flex1">
              <text class="label">数量</text>
              <input v-model="it.quantity" class="input" type="number" placeholder="1" placeholder-class="ph" />
            </view>
            <view class="field flex1">
              <text class="label">单位</text>
              <input v-model="it.unit" class="input" placeholder="份" placeholder-class="ph" />
            </view>
            <view class="field flex1">
              <text class="label">参考价值</text>
              <input v-model="it.price" class="input" type="digit" placeholder="268" placeholder-class="ph" />
            </view>
          </view>
        </view>

        <text v-if="!items.length" class="empty-tip">未添加明细</text>
      </view>

      <!-- ===== 使用规则 ===== -->
      <view class="card">
        <text class="card-title">使用规则（选填）</text>

        <view class="field">
          <text class="label">预约规则</text>
          <picker mode="selector" :range="APPOINT_TYPES" range-key="label" :value="appointIndex" @change="onAppointChange">
            <view class="picker-value">{{ APPOINT_TYPES[appointIndex].label }}</view>
          </picker>
        </view>

        <view v-if="form.rule.need_appointment === 1" class="field">
          <text class="label">需提前预约（小时）</text>
          <input v-model="form.rule.appointment_advance_hours" class="input" type="number" placeholder="24 代表提前 1 天" placeholder-class="ph" />
        </view>

        <view class="field">
          <text class="label">出行人实名</text>
          <picker mode="selector" :range="YES_NO" range-key="label" :value="realNameIndex" @change="onRealNameChange">
            <view class="picker-value">{{ YES_NO[realNameIndex].label }}</view>
          </picker>
        </view>

        <view class="field">
          <text class="label">预约 / 咨询电话</text>
          <input v-model="form.rule.appointment_phone" class="input" placeholder="如：0571-88888888" placeholder-class="ph" />
        </view>

        <view class="field">
          <text class="label">单用户限购（0 不限）</text>
          <input v-model="form.rule.limit_per_user" class="input" type="number" placeholder="0" placeholder-class="ph" />
        </view>

        <view class="field">
          <text class="label">退改规则</text>
          <picker mode="selector" :range="REFUND_TYPES" range-key="label" :value="refundIndex" @change="onRefundChange">
            <view class="picker-value">{{ REFUND_TYPES[refundIndex].label }}</view>
          </picker>
        </view>
      </view>

      <!-- ===== 票根联运优惠 ===== -->
      <view class="card">
        <text class="card-title">票根联运优惠（选填）</text>

        <view class="field">
          <text class="label">是否开启</text>
          <picker mode="selector" :range="YES_NO" range-key="label" :value="ticketEnabledIndex" @change="onTicketEnabledChange">
            <view class="picker-value">{{ YES_NO[ticketEnabledIndex].label }}</view>
          </picker>
        </view>

        <template v-if="form.ticket_discount.is_enabled === 1">
          <view class="field">
            <text class="label">支持票种（逗号分隔）</text>
            <input v-model="form.ticket_discount.allow_ticket_categories" class="input" placeholder="火车票,飞机票,景区门票" placeholder-class="ph" />
          </view>
          <view class="field">
            <text class="label">限定到达城市</text>
            <input v-model="form.ticket_discount.match_destination_city" class="input" placeholder="如：杭州" placeholder-class="ph" />
          </view>
          <view class="field">
            <text class="label">优惠类型</text>
            <picker mode="selector" :range="DISCOUNT_TYPES" range-key="label" :value="discountTypeIndex" @change="onDiscountTypeChange">
              <view class="picker-value">{{ DISCOUNT_TYPES[discountTypeIndex].label }}</view>
            </picker>
          </view>
          <view class="field">
            <text class="label">{{ form.ticket_discount.discount_type === 2 ? '折扣率（0.85=85折）' : '立减金额（元）' }}</text>
            <input v-model="form.ticket_discount.discount_value" class="input" type="digit" placeholder-class="ph" />
          </view>
          <view class="field">
            <text class="label">票根时效（天）</text>
            <input v-model="form.ticket_discount.ticket_valid_days" class="input" type="number" placeholder="3" placeholder-class="ph" />
          </view>
        </template>
      </view>

      <view class="submit-wrap">
        <button class="submit-btn" :disabled="submitting" @click="onSubmit">
          {{ submitting ? '提交中...' : '提交' }}
        </button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { addShopGoods } from '@/api/shop.js'
import { getShopApplyStatus } from '@/api/shop.js'
import { uploadImage } from '@/api/upload.js'
import { compressImage } from '@/utils/compressImage.js'

// ===== 选项字典（value 与后端枚举一致）=====
const BIZ_TYPES = [
  { value: 'EAT', label: '吃' },
  { value: 'HOTEL', label: '住' },
  { value: 'TRAVEL', label: '行' },
  { value: 'TOUR', label: '游' },
  { value: 'SHOP', label: '购' },
  { value: 'FUN', label: '娱' }
]
const PRODUCT_TYPES = [
  { value: 'SET_MEAL', label: '套餐' },
  { value: 'VOUCHER', label: '代金券' },
  { value: 'ROOM_NIGHT', label: '房晚' },
  { value: 'TICKET', label: '门票' },
  { value: 'TRANSFER', label: '接送机' },
  { value: 'RENTAL', label: '租车' }
]
const STOCK_TYPES = [
  { value: 1, label: '总库存机制' },
  { value: 2, label: '每日/场次动态库存' }
]
const VALID_TYPES = [
  { value: 1, label: '指定时间段' },
  { value: 2, label: '购买后 X 天内有效' }
]
const APPOINT_TYPES = [
  { value: 0, label: '免预约' },
  { value: 1, label: '需提前预约' },
  { value: 2, label: '指定场次/日期使用' }
]
const REFUND_TYPES = [
  { value: 1, label: '随时退 / 过期自动退' },
  { value: 2, label: '条件退' },
  { value: 3, label: '不可退' }
]
const DISCOUNT_TYPES = [
  { value: 1, label: '凭票立减固定金额' },
  { value: 2, label: '凭票打折' }
]
const YES_NO = [
  { value: 0, label: '否' },
  { value: 1, label: '是' }
]

const shopId = ref(null)
const submitting = ref(false)
const imageList = ref([])

const form = reactive({
  title: '',
  sub_title: '',
  cover_image: '',
  biz_type: 'EAT',
  product_type: 'SET_MEAL',
  original_price: '',
  selling_price: '',
  total_stock: '',
  stock_type: 1,
  valid_type: 1,
  valid_days: '',
  valid_start: '',
  valid_end: '',
  rule: {
    need_appointment: 0,
    appointment_advance_hours: '',
    need_real_name: 0,
    appointment_phone: '',
    limit_per_user: '',
    limit_per_order: '',
    refund_rule: 1
  },
  ticket_discount: {
    is_enabled: 0,
    allow_ticket_categories: '',
    match_destination_city: '',
    discount_type: 1,
    discount_value: '',
    ticket_valid_days: 3
  }
})

const skus = ref([])
const items = ref([])

// picker 选中下标（与 form 值双向同步）
const bizIndex = computed(() => indexOf(BIZ_TYPES, form.biz_type))
const productIndex = computed(() => indexOf(PRODUCT_TYPES, form.product_type))
const stockIndex = computed(() => indexOf(STOCK_TYPES, form.stock_type))
const validIndex = computed(() => indexOf(VALID_TYPES, form.valid_type))
const appointIndex = computed(() => indexOf(APPOINT_TYPES, form.rule.need_appointment))
const refundIndex = computed(() => indexOf(REFUND_TYPES, form.rule.refund_rule))
const realNameIndex = computed(() => indexOf(YES_NO, form.rule.need_real_name))
const ticketEnabledIndex = computed(() => indexOf(YES_NO, form.ticket_discount.is_enabled))
const discountTypeIndex = computed(() => indexOf(DISCOUNT_TYPES, form.ticket_discount.discount_type))

// 日期 picker 只到天，展示用；提交时补成 YYYY-MM-DD HH:mm:ss
const startDate = computed(() => String(form.valid_start || '').slice(0, 10))
const endDate = computed(() => String(form.valid_end || '').slice(0, 10))

function indexOf(list, value) {
  const i = list.findIndex((x) => x.value === value)
  return i > -1 ? i : 0
}

function onBizChange(e) {
  form.biz_type = BIZ_TYPES[e.detail.value].value
}
function onProductChange(e) {
  form.product_type = PRODUCT_TYPES[e.detail.value].value
}
function onStockChange(e) {
  form.stock_type = STOCK_TYPES[e.detail.value].value
}
function onValidChange(e) {
  form.valid_type = VALID_TYPES[e.detail.value].value
}
function onAppointChange(e) {
  form.rule.need_appointment = APPOINT_TYPES[e.detail.value].value
}
function onRefundChange(e) {
  form.rule.refund_rule = REFUND_TYPES[e.detail.value].value
}
function onRealNameChange(e) {
  form.rule.need_real_name = YES_NO[e.detail.value].value
}
function onTicketEnabledChange(e) {
  form.ticket_discount.is_enabled = YES_NO[e.detail.value].value
}
function onDiscountTypeChange(e) {
  form.ticket_discount.discount_type = DISCOUNT_TYPES[e.detail.value].value
}
function onStartChange(e) {
  form.valid_start = `${e.detail.value} 00:00:00`
}
function onEndChange(e) {
  form.valid_end = `${e.detail.value} 23:59:59`
}

// ===== 图片上传 =====
function pickUrl(res) {
  return res?.data?.url || res?.data?.urls?.[0] || res?.url || ''
}

async function chooseCover() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (r) => {
      uni.showLoading({ title: '上传中...', mask: true })
      try {
        const file = await compressImage(r.tempFilePaths[0])
        const res = await uploadImage(file)
        const url = pickUrl(res)
        if (url) form.cover_image = url
        else uni.showToast({ title: '获取图片链接失败', icon: 'none' })
      } catch (err) {
        uni.showToast({ title: '上传失败，请重试', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}

async function chooseImages() {
  uni.chooseImage({
    count: 9,
    sizeType: ['compressed'],
    success: async (r) => {
      uni.showLoading({ title: '上传中...', mask: true })
      try {
        const list = await Promise.all(
          r.tempFilePaths.map(async (p) => pickUrl(await uploadImage(await compressImage(p))))
        )
        imageList.value.push(...list.filter(Boolean))
      } catch (err) {
        uni.showToast({ title: '上传失败，请重试', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}

function removeImage(i) {
  imageList.value.splice(i, 1)
}

// ===== SKU / 明细增删 =====
function addSku() {
  skus.value.push({ sku_name: '', original_price: '', price: '', stock: '', sku_code: '' })
}
function removeSku(i) {
  skus.value.splice(i, 1)
}
function addItem() {
  items.value.push({ group_name: '', item_name: '', quantity: 1, unit: '份', price: '' })
}
function removeItem(i) {
  items.value.splice(i, 1)
}

// ===== 提交 =====
async function onSubmit() {
  if (submitting.value) return
  if (!form.title.trim()) return toast('请输入产品标题')
  if (!form.cover_image) return toast('请上传产品主图')
  if (!(Number(form.original_price) > 0)) return toast('请输入划线原价')
  if (!(Number(form.selling_price) > 0)) return toast('请输入团购价')
  if (!(Number(form.total_stock) > 0)) return toast('请输入总库存')
  if (form.valid_type === 1 && (!form.valid_start || !form.valid_end)) return toast('请选择有效期起止时间')
  if (form.valid_type === 2 && !(Number(form.valid_days) > 0)) return toast('请输入购买后有效天数')

  submitting.value = true
  const payload = {
    shop_id: Number(shopId.value),
    title: form.title.trim(),
    sub_title: form.sub_title.trim(),
    cover_image: form.cover_image,
    // 后端要求轮播图为 JSON 字符串
    images: imageList.value.length ? JSON.stringify(imageList.value) : '',
    biz_type: form.biz_type,
    product_type: form.product_type,
    original_price: Number(form.original_price),
    selling_price: Number(form.selling_price),
    total_stock: Number(form.total_stock),
    stock_type: Number(form.stock_type),
    valid_type: Number(form.valid_type)
  }

  if (form.valid_type === 1) {
    payload.valid_start = form.valid_start
    payload.valid_end = form.valid_end
  } else {
    payload.valid_days = Number(form.valid_days)
  }

  // 只提交填写完整的 SKU
  const skuList = skus.value
    .filter((s) => s.sku_name && Number(s.price) > 0)
    .map((s) => ({
      sku_name: s.sku_name,
      original_price: Number(s.original_price || 0),
      price: Number(s.price),
      stock: Number(s.stock || 0),
      sku_code: s.sku_code || ''
    }))
  if (skuList.length) payload.skus = skuList

  const itemList = items.value
    .filter((it) => it.group_name && it.item_name)
    .map((it) => ({
      group_name: it.group_name,
      item_name: it.item_name,
      quantity: Number(it.quantity || 1),
      unit: it.unit || '份',
      price: Number(it.price || 0),
      is_choice: 0
    }))
  if (itemList.length) payload.items = itemList

  payload.rule = {
    need_appointment: Number(form.rule.need_appointment),
    appointment_advance_hours: Number(form.rule.appointment_advance_hours || 0),
    need_real_name: Number(form.rule.need_real_name),
    appointment_phone: form.rule.appointment_phone || '',
    limit_per_user: Number(form.rule.limit_per_user || 0),
    limit_per_order: Number(form.rule.limit_per_order || 0),
    refund_rule: Number(form.rule.refund_rule)
  }

  // 关闭时不传该对象（后端约定 is_enabled=0 不保存）
  if (form.ticket_discount.is_enabled === 1) {
    payload.ticket_discount = {
      is_enabled: 1,
      allow_ticket_categories: form.ticket_discount.allow_ticket_categories || '',
      match_destination_city: form.ticket_discount.match_destination_city || '',
      discount_type: Number(form.ticket_discount.discount_type),
      discount_value: Number(form.ticket_discount.discount_value || 0),
      ticket_valid_days: Number(form.ticket_discount.ticket_valid_days || 3)
    }
  }

  const res = await addShopGoods(payload)
  submitting.value = false
  if (res) {
    uni.showToast({ title: '添加成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1200)
  }
}

function toast(title) {
  uni.showToast({ title, icon: 'none' })
}

onLoad(async (query) => {
  shopId.value = Number(query && query.shop_id) || null
  // 未传 shop_id 时，用当前登录商家归属的店铺
  if (!shopId.value) {
    const res = await getShopApplyStatus()
    if (res && res.data) shopId.value = res.data.shop_id || res.data.id || null
  }
  if (!shopId.value) toast('未获取到店铺信息，请返回重试')
})
</script>

<style lang="scss" scoped>
.page {
  position: fixed;
  top: var(--window-top, 44px);
  right: 0;
  bottom: 0;
  left: 0;
  background-color: #f8fafc;
}

.form-scroll {
  height: 100%;
  box-sizing: border-box;
  padding: 24rpx 24rpx 60rpx;
}

.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 28rpx 20rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  .card-title {
    display: block;
    font-size: 30rpx;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 20rpx;
  }
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;

  .card-title {
    margin-bottom: 0;
  }

  .card-add {
    font-size: 26rpx;
    font-weight: 700;
    color: #2563eb;
  }
}

.field {
  margin-bottom: 24rpx;

  .label {
    display: block;
    font-size: 24rpx;
    color: #475569;
    margin-bottom: 12rpx;
    font-weight: 600;
  }

  .required::after {
    content: ' *';
    color: #dc2626;
  }

  .input {
    height: 80rpx;
    box-sizing: border-box;
    padding: 0 20rpx;
    background: #f8fafc;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #0f172a;
  }

  .ph {
    color: #94a3b8;
  }

  .picker-value {
    height: 80rpx;
    line-height: 80rpx;
    box-sizing: border-box;
    padding: 0 20rpx;
    background: #f8fafc;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #0f172a;
  }
}

.field-row {
  display: flex;

  .flex1 {
    flex: 1;
    min-width: 0;
  }

  .flex1 + .flex1 {
    margin-left: 16rpx;
  }
}

/* 图片上传 */
.img-row {
  display: flex;
  flex-wrap: wrap;
}

.thumb-wrap {
  position: relative;
  margin: 0 16rpx 16rpx 0;

  .thumb {
    width: 140rpx;
    height: 140rpx;
    border-radius: 12rpx;
    background: #e2e8f0;
    display: block;
  }

  .thumb-del {
    position: absolute;
    top: -8rpx;
    right: -8rpx;
    width: 40rpx;
    height: 40rpx;
    line-height: 36rpx;
    text-align: center;
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.7);
    color: #fff;
    font-size: 24rpx;
  }
}

.upload-btn {
  width: 140rpx;
  height: 140rpx;
  line-height: 140rpx;
  text-align: center;
  border: 2rpx dashed #cbd5e1;
  border-radius: 12rpx;
  color: #94a3b8;
  font-size: 24rpx;
  background: #f8fafc;
}

/* SKU / 明细子块 */
.sub-block {
  background: #f8fafc;
  border-radius: 16rpx;
  padding: 20rpx 20rpx 4rpx;
  margin-bottom: 20rpx;

  .sub-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12rpx;

    .sub-title {
      font-size: 26rpx;
      font-weight: 700;
      color: #0f172a;
    }

    .sub-del {
      font-size: 24rpx;
      color: #dc2626;
    }
  }
}

.empty-tip {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  padding: 8rpx 0 16rpx;
}

.submit-wrap {
  margin-top: 8rpx;

  .submit-btn {
    height: 92rpx;
    line-height: 92rpx;
    border-radius: 18rpx;
    background: #2563eb;
    color: #fff;
    font-size: 32rpx;
    font-weight: 800;
    border: none;

    &::after {
      border: none;
    }
  }
}
</style>
