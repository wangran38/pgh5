<template>
  <view class="shop-info-container">
    <!-- 顶部进度与 Tab 导航头部 -->
    <view class="header-card">
      <view class="progress-box">
        <view class="progress-info">
          <text class="progress-title">资料完善度</text>
          <text class="progress-num">{{ completionRate }}%</text>
        </view>
        <view class="progress-bar-bg">
          <view class="progress-bar-fill" :style="{ width: completionRate + '%' }"></view>
        </view>
      </view>

      <!-- Tab 切换按钮 -->
      <view class="tab-nav">
        <view class="tab-item" :class="{ active: currentTab === 0 }" @click="currentTab = 0">
          <text>基本信息</text>
          <text class="tab-badge" :class="{ complete: isTab1Complete }">{{ isTab1Complete ? '已完善' : '待完善' }}</text>
        </view>
        <view class="tab-item" :class="{ active: currentTab === 1 }" @click="currentTab = 1">
          <text>门店图文</text>
          <text class="tab-badge" :class="{ complete: isTab2Complete }">{{ isTab2Complete ? '已完善' : '待完善' }}</text>
        </view>
        <view class="tab-item" :class="{ active: currentTab === 2 }" @click="currentTab = 2">
          <text>运营配送</text>
          <text class="tab-badge" :class="{ complete: isTab3Complete }">{{ isTab3Complete ? '已完善' : '待完善' }}</text>
        </view>
        <view class="tab-item" :class="{ active: currentTab === 3 }" @click="currentTab = 3">
          <text>经营详情</text>
          <text class="tab-badge" :class="{ complete: isTab4Complete }">{{ isTab4Complete ? '已完善' : '待完善' }}</text>
        </view>
      </view>
    </view>

    <!-- Tab 0: 基本信息 -->
    <view v-show="currentTab === 0" class="form-group">
      <view class="form-item">
        <text class="label"><text class="required">*</text>门店名称</text>
        <input class="input" v-model="form.name" placeholder="请输入门店名称" />
      </view>

      <view class="form-item">
        <text class="label"><text class="required">*</text>负责人姓名</text>
        <input class="input" v-model="form.contact_name" placeholder="请输入负责人姓名" />
      </view>

      <view class="form-item">
        <text class="label"><text class="required">*</text>联系电话</text>
        <input class="input" type="number" maxlength="11" v-model="form.contact_phone" placeholder="负责人手机号" />
      </view>

      <view class="form-item">
        <text class="label">客服/订座电话</text>
        <input class="input" v-model="form.service_phone" placeholder="对外展示的座机或手机" />
      </view>

      <view class="form-item column-item">
        <text class="label"><text class="required">*</text>详细经营地址</text>
        <textarea class="textarea-small" v-model="form.address" placeholder="街道门牌号" />
      </view>

      <view class="form-item map-picker-item" @click="chooseLocationOnMap">
        <text class="label"><text class="required">*</text>地图标注定位</text>
        <view class="map-right">
          <text class="map-val">{{ form.longitude && form.latitude ? '已选择经纬度' : '点击选择定位' }}</text>
          <text class="chevron">›</text>
        </view>
      </view>
      <view v-if="form.longitude && form.latitude" class="coord-tip">
        经度: {{ form.longitude }}，纬度: {{ form.latitude }}
      </view>
    </view>

    <!-- Tab 1: 门店图文 -->
    <view v-show="currentTab === 1" class="form-group">
      <view class="form-item column-item">
        <text class="label"><text class="required">*</text>商家 LOGO</text>
        <view class="upload-box">
          <view v-if="form.logo" class="preview-item">
            <image :src="form.logo" mode="aspectFill" class="preview-img" @click="previewImage(form.logo)" />
            <text class="delete-badge" @click.stop="form.logo = ''">✕</text>
          </view>
          <view v-else class="upload-btn" @click="uploadLogo">
            <text class="upload-icon">+</text>
            <text class="upload-text">上传LOGO</text>
          </view>
        </view>
      </view>

      <view class="form-item column-item">
        <text class="label">环境门头照 (多图)</text>
        <view class="upload-grid">
          <view v-for="(imgUrl, index) in coverImageList" :key="index" class="preview-item">
            <image :src="imgUrl" mode="aspectFill" class="preview-img" @click="previewImage(imgUrl)" />
            <text class="delete-badge" @click.stop="removeCoverImage(index)">✕</text>
          </view>
          <view v-if="coverImageList.length < 5" class="upload-btn" @click="uploadCoverImages">
            <text class="upload-icon">+</text>
            <text class="upload-text">添加图片</text>
          </view>
        </view>
        <text class="tip-text">最多可上传 5 张照片</text>
      </view>
    </view>

    <!-- Tab 2: 运营配送 -->
    <view v-show="currentTab === 2" class="form-group">
      <view class="form-item">
        <text class="label">营业时间段</text>
        <input class="input" v-model="form.opening_hours" placeholder="例如: 09:00-22:00" />
      </view>

      <view class="form-item">
        <text class="label">人均消费(元)</text>
        <input class="input" type="digit" v-model.number="form.avg_cost" placeholder="0.00" />
      </view>

      <view class="form-item">
        <text class="label">配送半径(公里)</text>
        <input class="input" type="digit" v-model.number="form.delivery_radius" placeholder="3.00" />
      </view>

      <view class="form-item">
        <text class="label">起送金额(元)</text>
        <input class="input" type="digit" v-model.number="form.min_order_amount" placeholder="0.00" />
      </view>
    </view>

    <!-- Tab 3: 经营详情 -->
    <view v-show="currentTab === 3" class="form-group">
      <view class="form-item textarea-item">
        <text class="label">商家简介</text>
        <textarea class="textarea" v-model="form.description" placeholder="请输入商家简介，吸引顾客" />
      </view>

      <view class="form-item textarea-item">
        <text class="label">优惠内容</text>
        <textarea class="textarea" v-model="form.discounts" placeholder="请输入优惠内容/专属促销活动" />
      </view>
    </view>

    <!-- 底部操作按钮 -->
    <view class="footer-actions">
      <button v-if="currentTab > 0" class="sub-btn prev-btn" @click="currentTab--">上一步</button>
      <button v-if="currentTab < 3" class="submit-btn next-btn" @click="currentTab++">下一步</button>
      <button v-if="currentTab === 3" class="submit-btn save-btn" :disabled="saving" :loading="saving" @click="handleSubmit">保存全部修改</button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getShopInfo, editShop } from '@/api/shop.js'
import { uploadImage } from '@/api/upload.js' // 正确引入封装好的上传接口
import { compressImage } from '@/utils/compressImage.js' // 上传前图片压缩
import { useSubmit } from '@/utils/submitGuard.js' // 统一防重复提交

const currentTab = ref(0)

// 完整映射你后端 Xorm 实体字段的响应式表单
const form = reactive({
  id: null,
  name: '',
  logo: '',
  cover_images: '',
  contact_name: '',
  contact_phone: '',
  service_phone: '',
  description: '',
  discounts: '',
  province_code: '',
  city_code: '',
  district_code: '',
  address: '',
  longitude: '',
  latitude: '',
  opening_hours: '',
  delivery_type: 1,
  delivery_radius: 3.00,
  min_order_amount: 0.00,
  avg_cost: 0.00
})

// 多图数组计算属性 (兼容后端返回的逗号分隔字符串、JSON 字符串或数组格式并支持回显)
const coverImageList = computed({
  get() {
    if (!form.cover_images) return []
    if (Array.isArray(form.cover_images)) return form.cover_images
    try {
      if (form.cover_images.startsWith('[')) {
        return JSON.parse(form.cover_images)
      }
    } catch(e) {}
    return String(form.cover_images).split(',').filter(Boolean)
  },
  set(val) {
    // 自动转换为逗号拼接的字符串存回后端
    form.cover_images = val.join(',')
  }
})

// --- 各板块完成度判定 ---
const isTab1Complete = computed(() => !!(form.name && form.contact_name && form.contact_phone && form.address && form.longitude && form.latitude))
const isTab2Complete = computed(() => !!form.logo)
const isTab3Complete = computed(() => !!(form.opening_hours && form.avg_cost >= 0))
const isTab4Complete = computed(() => !!(form.description || form.discounts))

// 整体完成度百分比计算
const completionRate = computed(() => {
  let score = 0
  if (isTab1Complete.value) score += 40
  if (isTab2Complete.value) score += 20
  if (isTab3Complete.value) score += 20
  if (isTab4Complete.value) score += 20
  return score
})

onLoad((options) => {
  if (options && options.shop_id) {
    form.id = Number(options.shop_id)
    loadShopDetail(form.id)
  } else {
    uni.showToast({ title: '参数错误：未找到店铺ID', icon: 'none' })
  }
})

const loadShopDetail = async (shopId) => {
  uni.showLoading({ title: '加载中...' })
  const res = await getShopInfo({ shop_id: shopId })
  uni.hideLoading()

  if (res && res.data) {
    Object.assign(form, res.data)
  }
}

const chooseLocationOnMap = () => {
  uni.chooseLocation({
    success: (res) => {
      form.address = res.address + res.name
      form.longitude = res.longitude
      form.latitude = res.latitude
    }
  })
}

// 选图并返回临时路径（Promise 化），使「选图 + 上传」整体处于提交锁内
function pickImagePaths(count) {
  return new Promise((resolve) => {
    uni.chooseImage({
      count,
      sizeType: ['compressed'],
      success: (res) => resolve(res.tempFilePaths || []),
      fail: () => resolve([])
    })
  })
}

// 单个上传 Logo（真正调用接口，由 useSubmit 加锁防重复）
const doUploadLogo = async () => {
  const paths = await pickImagePaths(1)
  if (!paths.length) return
  try {
    uni.showLoading({ title: 'LOGO上传中...' })
    // 上传前压缩，减小体积
    const filePath = await compressImage(paths[0])
    const uploadRes = await uploadImage(filePath)
    uni.hideLoading()

    // 适配后端返回的 URL 路径结构
    const imgUrl = uploadRes.data?.url || uploadRes.data?.urls?.[0] || uploadRes.url
    if (imgUrl) {
      form.logo = imgUrl
    } else {
      uni.showToast({ title: '获取图片链接失败', icon: 'none' })
    }
  } catch (err) {
    uni.hideLoading()
    uni.showToast({ title: typeof err === 'string' ? err : '上传失败', icon: 'none' })
  }
}

// 多图环境照上传（支持并发批量上传并回显，真正调用接口，由 useSubmit 加锁防重复）
const doUploadCoverImages = async () => {
  const remainCount = 5 - coverImageList.value.length
  if (remainCount <= 0) return

  const paths = await pickImagePaths(remainCount)
  if (!paths.length) return

  uni.showLoading({ title: '图片上传中...' })
  try {
    // 逐张压缩后并发上传
    const uploadPromises = paths.map(async (filePath) => {
      const compressed = await compressImage(filePath)
      return uploadImage(compressed)
    })
    const results = await Promise.all(uploadPromises)

    uni.hideLoading()

    const newUrls = results.map(item => item.data?.url || item.data?.urls?.[0] || item.url).filter(Boolean)
    coverImageList.value = [...coverImageList.value, ...newUrls]
  } catch (err) {
    uni.hideLoading()
    uni.showToast({ title: '部分图片上传失败', icon: 'none' })
  }
}

// 统一防重复提交：避免连点弹出多个选择器 / 重复上传
const { submit: uploadLogo } = useSubmit(doUploadLogo, { cooldown: 800 })
const { submit: uploadCoverImages } = useSubmit(doUploadCoverImages, { cooldown: 800 })

const removeCoverImage = (index) => {
  const list = [...coverImageList.value]
  list.splice(index, 1)
  coverImageList.value = list
}

const previewImage = (current) => {
  uni.previewImage({ current, urls: [current] })
}

// 保存接口调用（不含校验）：由 useSubmit 统一加锁防重复
async function saveShop() {
  uni.showLoading({ title: '保存中...' })
  const res = await editShop(form)
  uni.hideLoading()
  if (!res) return // 失败已由 request.js 统一提示

  uni.showToast({ title: '修改成功', icon: 'success' })
  // 成功后延迟 1.5s 跳转，冷却期需覆盖该窗口
  setTimeout(() => { uni.navigateBack() }, 1500)
}

// 统一防重复提交：saving 绑定到按钮 :disabled / :loading
const { loading: saving, submit: submitSave } = useSubmit(saveShop, { cooldown: 1600 })

// 校验置于提交锁之外：校验不通过不占用锁与冷却期，用户可立即修正重试
function handleSubmit() {
  if (!form.name) return uni.showToast({ title: '请填写门店名称', icon: 'none' })
  if (!form.contact_phone) return uni.showToast({ title: '请填写联系电话', icon: 'none' })
  if (!form.address) return uni.showToast({ title: '请完善详细地址与定位', icon: 'none' })
  submitSave()
}
</script>

<style scoped>
.shop-info-container {
  padding: 24rpx;
  background-color: #f8fafc;
  min-height: 100vh;
  box-sizing: border-box;
  padding-bottom: 140rpx;
}

.header-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.02);

  .progress-box {
    margin-bottom: 24rpx;
    .progress-info {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx;
      .progress-title { font-size: 26rpx; font-weight: 700; color: #334155; }
      .progress-num { font-size: 30rpx; font-weight: 900; color: #2563eb; }
    }
    .progress-bar-bg {
      width: 100%; height: 12rpx; background: #f1f5f9; border-radius: 6rpx; overflow: hidden;
      .progress-bar-fill {
        height: 100%; background: linear-gradient(90deg, #3b82f6, #2563eb); border-radius: 6rpx; transition: width 0.3s ease;
      }
    }
  }

  .tab-nav {
    display: flex; background: #f1f5f9; padding: 6rpx; border-radius: 12rpx; gap: 4rpx;
    .tab-item {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 14rpx 0; font-size: 24rpx; font-weight: 600; color: #64748b; border-radius: 8rpx; transition: all 0.2s;
      .tab-badge {
        font-size: 16rpx; margin-top: 4rpx; padding: 2rpx 8rpx; transform: scale(0.9); border-radius: 6rpx; background: #fee2e2; color: #991b1b;
        &.complete { background: #dcfce7; color: #166534; }
      }
      &.active { background: #ffffff; color: #2563eb; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04); }
    }
  }
}

.form-group {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 0 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.02);
}

.form-item {
  display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 24rpx 0;
}
.form-item:last-child { border-bottom: none; }
.column-item { flex-direction: column; align-items: flex-start; }

.label {
  font-size: 28rpx; font-weight: 700; color: #334155; width: 210rpx; flex-shrink: 0;
  .required { color: #dc2626; margin-right: 4rpx; }
}
.column-item .label { margin-bottom: 16rpx; width: 100%; }

.input { flex: 1; text-align: right; font-size: 28rpx; color: #0f172a; }
.textarea-small { width: 100%; height: 100rpx; background-color: #f8fafc; border: 1rpx solid #e2e8f0; border-radius: 8rpx; padding: 16rpx; font-size: 28rpx; box-sizing: border-box; color: #0f172a; }
.textarea-item .label { margin-bottom: 16rpx; }
.textarea { width: 100%; height: 160rpx; background-color: #f8fafc; border: 1rpx solid #e2e8f0; border-radius: 8rpx; padding: 16rpx; font-size: 28rpx; box-sizing: border-box; color: #0f172a; }

.map-picker-item { cursor: pointer; }
.map-right {
  display: flex; align-items: center; flex: 1; justify-content: flex-end;
  .map-val { font-size: 28rpx; font-weight: 600; color: #2563eb; }
  .chevron { font-size: 32rpx; color: #94a3b8; margin-left: 8rpx; }
}
.coord-tip { font-size: 22rpx; color: #64748b; margin-top: -12rpx; margin-bottom: 20rpx; padding-left: 4rpx; }

.upload-box, .upload-grid { display: flex; flex-wrap: wrap; gap: 20rpx; width: 100%; }
.upload-btn {
  width: 160rpx; height: 160rpx; background: #f8fafc; border: 2rpx dashed #cbd5e1;
  border-radius: 12rpx; display: flex; flex-direction: column; align-items: center; justify-content: center;
  .upload-icon { font-size: 48rpx; color: #94a3b8; line-height: 1; }
  .upload-text { font-size: 22rpx; color: #64748b; margin-top: 8rpx; }
}
.preview-item {
  position: relative; width: 160rpx; height: 160rpx; border-radius: 12rpx; overflow: hidden; border: 1rpx solid #e2e8f0;
  .preview-img { width: 100%; height: 100%; }
  .delete-badge {
    position: absolute; top: 4rpx; right: 4rpx; background: rgba(0, 0, 0, 0.6); color: #fff;
    font-size: 20rpx; width: 36rpx; height: 36rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  }
}
.tip-text { font-size: 22rpx; color: #94a3b8; margin-top: 12rpx; display: block; }

.footer-actions {
  position: fixed; left: 0; right: 0; bottom: 0; background: #ffffff;
  padding: 20rpx 30rpx; display: flex; gap: 20rpx; box-shadow: 0 -4rpx 16rpx rgba(0,0,0,0.05); z-index: 99;
  .sub-btn, .submit-btn {
    flex: 1; border-radius: 16rpx; font-size: 30rpx; font-weight: 800; height: 88rpx; line-height: 88rpx; border: none;
    &::after { border: none; }
  }
  .prev-btn { background: #f1f5f9; color: #475569; }
  .next-btn, .save-btn { background: #2563eb; color: #ffffff; box-shadow: 0 6rpx 16rpx rgba(37, 99, 235, 0.25); }
}
</style>
