<template>
  <view class="promo-container">
    <view class="page-header">
      <text class="page-title">{{ pageTitle }}</text>
      <text class="page-subtitle">{{ pageSubtitle }}</text>
    </view>

    <view class="form-card">
      <!-- 优惠券名称 -->
      <view class="form-item column-item">
        <text class="label"><text class="required">*</text>优惠券名称</text>
        <input class="input" v-model="form.title" placeholder="如：满200减30 景区专享" maxlength="30" />
      </view>

      <!-- 业态分类（多选） -->
      <view class="form-item column-item">
        <text class="label"><text class="required">*</text>适用业态（可多选）</text>
        <view class="tag-grid">
          <view
            v-for="item in categoryOptions"
            :key="item.id"
            class="tag-chip"
            :class="{ active: selectedCategories.includes(item.id) }"
            @click="toggleCategory(item.id)"
          >
            {{ item.name }}
          </view>
        </view>
      </view>

      <!-- 优惠券形式 -->
      <view class="form-item column-item">
        <text class="label">优惠券形式</text>
        <view class="tag-grid">
          <view
            v-for="item in couponTypeOptions"
            :key="item.value"
            class="tag-chip"
            :class="{ active: form.coupon_type === item.value }"
            @click="form.coupon_type = item.value"
          >
            {{ item.label }}
          </view>
        </view>
      </view>

      <!-- 优惠面额 / 折扣率 -->
      <view class="form-item">
        <text class="label">{{ discountLabel }}</text>
        <input
          class="input"
          type="digit"
          v-model="form.discount_amount"
          :placeholder="discountPlaceholder"
        />
      </view>

      <!-- 使用门槛 -->
      <view class="form-item">
        <text class="label">使用门槛（满）</text>
        <input class="input" type="digit" v-model="form.min_point" placeholder="最低 200 元" />
        <text class="sub-tip">满减券需填写，最低 200</text>
      </view>

      <!-- 库存数量 -->
      <view class="form-item">
        <text class="label">库存数量</text>
        <input class="input" type="digit" v-model="form.total_count" placeholder="发放总张数" />
      </view>

      <!-- 生效时间 -->
      <view class="form-item">
        <text class="label">生效时间</text>
        <picker mode="date" :value="startDate" :start="today" @change="e => form.start_time = e.detail.value + ' 00:00:00'" class="picker-value">
          <view class="picker-inner">
            <text :class="form.start_time ? 'val-text' : 'placeholder-text'">
              {{ form.start_time || '请选择生效日期' }}
            </text>
            <text class="chevron">▾</text>
          </view>
        </picker>
      </view>

      <!-- 过期时间 -->
      <view class="form-item">
        <text class="label">过期时间</text>
        <picker mode="date" :value="endDate" :start="endDateMin" @change="e => form.end_time = e.detail.value + ' 23:59:59'" class="picker-value">
          <view class="picker-inner">
            <text :class="form.end_time ? 'val-text' : 'placeholder-text'">
              {{ form.end_time || '请选择过期日期' }}
            </text>
            <text class="chevron">▾</text>
          </view>
        </picker>
      </view>
    </view>

    <button class="submit-btn" :loading="submitting" @click="handleSubmit">{{ submitText }}</button>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { addCoupon, editCoupon } from '@/api/shop.js'

const categoryOptions = [
  { id: 1, name: '景区' },
  { id: 2, name: '住宿' },
  { id: 3, name: '餐饮' },
  { id: 4, name: '文创零售' },
  { id: 5, name: '交通服务' },
  { id: 6, name: '演出展览' }
]

const couponTypeOptions = [
  { value: 1, label: '满减券' },
  { value: 2, label: '折扣券' },
  { value: 3, label: '首道门票折扣' },
  { value: 4, label: '专属票价' }
]

// 页面模式：默认新增；列表页携带 mode=edit&data=... 进入时为编辑
const isEdit = ref(false)
const editId = ref(null)

const form = ref({
  title: '',
  coupon_type: 1,
  discount_amount: '',
  min_point: '',
  total_count: '',
  start_time: '',
  end_time: ''
})

const selectedCategories = ref([])
const submitting = ref(false)

const pageTitle = computed(() => (isEdit.value ? '编辑优惠券' : '新增优惠券'))
const pageSubtitle = computed(() =>
  isEdit.value ? '修改券面信息，保存后生效' : '填写优惠券信息，提交后进入平台审核'
)
const submitText = computed(() => (isEdit.value ? '保存修改' : '提交审核'))

const today = new Date().toISOString().split('T')[0]
const startDate = computed(() => (form.value.start_time || '').split(' ')[0])
const endDate = computed(() => (form.value.end_time || '').split(' ')[0])
const endDateMin = computed(() => form.value.start_time ? startDate.value : today)

const discountLabel = computed(() => {
  switch (form.value.coupon_type) {
    case 1: return '优惠金额（元）'
    case 2: return '折扣率（如 0.8 = 8折）'
    case 3: return '门票折扣率（如 0.85 = 8.5折）'
    case 4: return '专属票价（元）'
    default: return '优惠面额 / 折扣率'
  }
})

const discountPlaceholder = computed(() => {
  switch (form.value.coupon_type) {
    case 1: return '如 30'
    case 2: return '如 0.8'
    case 3: return '如 0.85'
    case 4: return '如 99'
    default: return '请输入'
  }
})

// 后端时间 "2026-09-08T00:00:00+08:00" → "2026-09-08 00:00:00"
function fmtApiTime(s) {
  if (!s) return ''
  return String(s).replace('T', ' ').slice(0, 19)
}

// categories 兼容 字符串/数组/对象 → 分类 id 数组
function parseCatIds(v) {
  if (v == null || v === '') return []
  if (Array.isArray(v)) return v.map(Number).filter((n) => n >= 1 && n <= 6)
  if (typeof v === 'object') {
    return Object.keys(v)
      .map(Number)
      .filter((n) => n >= 1 && n <= 6)
  }
  return String(v)
    .split(',')
    .map(Number)
    .filter((n) => n >= 1 && n <= 6)
}

// 编辑模式：回填列表页传入的券数据
function prefill(item) {
  editId.value = item.id != null ? item.id : null
  form.value.title = item.title || ''
  form.value.coupon_type = Number(item.coupon_type) || 1
  selectedCategories.value = parseCatIds(item.categories)
  form.value.discount_amount = item.discount_amount != null ? String(item.discount_amount) : ''
  form.value.min_point = item.min_point != null ? String(item.min_point) : ''
  form.value.total_count = item.total_count != null ? String(item.total_count) : ''
  form.value.start_time = fmtApiTime(item.starttime || item.start_time)
  form.value.end_time = fmtApiTime(item.endtime || item.end_time)
}

onLoad((query) => {
  if (query && query.mode === 'edit' && query.data) {
    try {
      prefill(JSON.parse(decodeURIComponent(query.data)))
      isEdit.value = true
      uni.setNavigationBarTitle({ title: '编辑优惠券' })
    } catch (e) {
      console.error('编辑数据解析失败', e)
    }
  }
})

function toggleCategory(id) {
  const idx = selectedCategories.value.indexOf(id)
  if (idx > -1) {
    selectedCategories.value.splice(idx, 1)
  } else {
    selectedCategories.value.push(id)
  }
}

function validate() {
  if (!form.value.title.trim()) {
    uni.showToast({ title: '请填写优惠券名称', icon: 'none' })
    return false
  }
  if (selectedCategories.value.length === 0) {
    uni.showToast({ title: '请至少选择一个业态', icon: 'none' })
    return false
  }
  if (form.value.coupon_type === 1) {
    const min = parseFloat(form.value.min_point)
    if (isNaN(min) || min < 200) {
      uni.showToast({ title: '满减券门槛需 ≥ 200', icon: 'none' })
      return false
    }
    if (!form.value.discount_amount) {
      uni.showToast({ title: '请填写优惠金额', icon: 'none' })
      return false
    }
  }
  if (form.value.start_time && form.value.end_time) {
    if (form.value.end_time < form.value.start_time) {
      uni.showToast({ title: '过期时间不能早于生效时间', icon: 'none' })
      return false
    }
  }
  return true
}

async function handleSubmit() {
  if (!validate()) return
  submitting.value = true

  const payload = {
    title: form.value.title.trim(),
    categories: [...selectedCategories.value].sort((a, b) => a - b),
    coupon_type: form.value.coupon_type
  }
  if (isEdit.value && editId.value != null) payload.id = Number(editId.value)
  if (form.value.discount_amount !== '') payload.discount_amount = parseFloat(form.value.discount_amount)
  if (form.value.min_point !== '') payload.min_point = parseFloat(form.value.min_point)
  if (form.value.total_count !== '') payload.total_count = parseFloat(form.value.total_count)
  if (form.value.start_time) payload.start_time = form.value.start_time
  if (form.value.end_time) payload.end_time = form.value.end_time

  const res = isEdit.value ? await editCoupon(payload) : await addCoupon(payload)
  submitting.value = false
  if (!res) return // 失败已由 request.js 统一提示

  uni.showToast({ title: isEdit.value ? '保存成功' : '提交成功', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 1000)
}
</script>

<style lang="scss" scoped>
.promo-container {
  flex: 1;
  background-color: #f8fafc;
  padding: 30rpx;
  box-sizing: border-box;
}

.page-header {
  margin-bottom: 24rpx;
  .page-title { font-size: 36rpx; font-weight: 900; color: #0f172a; display: block; }
  .page-subtitle { font-size: 24rpx; color: #64748b; margin-top: 8rpx; display: block; }
}

.form-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 10rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  margin-bottom: 40rpx;

  .form-item {
    padding: 28rpx 0;
    border-bottom: 1rpx solid #f1f5f9;
    display: flex;
    align-items: center;

    &.column-item { flex-direction: column; align-items: stretch; }

    &:last-child { border-bottom: none; }

    .label {
      font-size: 26rpx;
      color: #475569;
      font-weight: 600;
      width: 220rpx;
      flex-shrink: 0;

      .required { color: #dc2626; margin-right: 4rpx; }
    }

    .input {
      flex: 1;
      font-size: 28rpx;
      color: #0f172a;
    }

    .sub-tip {
      font-size: 20rpx;
      color: #94a3b8;
      margin-left: 16rpx;
      flex-shrink: 0;
    }

    .picker-value {
      flex: 1;
      display: flex;
      align-items: center;

      .picker-inner {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .val-text { font-size: 28rpx; color: #0f172a; }
      .placeholder-text { font-size: 28rpx; color: #94a3b8; }
      .chevron { font-size: 24rpx; color: #cbd5e1; margin-left: 12rpx; }
    }
  }
}

.column-item {
  .label { width: auto !important; margin-bottom: 20rpx; }
}

.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;

  .tag-chip {
    padding: 14rpx 28rpx;
    border-radius: 40rpx;
    border: 1rpx solid #e2e8f0;
    background: #f8fafc;
    color: #475569;
    font-size: 24rpx;
    transition: all 0.2s;

    &.active {
      background: #2563eb;
      border-color: #2563eb;
      color: #fff;
      font-weight: 700;
    }
  }
}

.submit-btn {
  width: 100%;
  background: #2563eb;
  color: #fff;
  font-weight: 800;
  font-size: 30rpx;
  height: 92rpx;
  line-height: 92rpx;
  border-radius: 18rpx;
  border: none;
  &::after { border: none; }
}
</style>
