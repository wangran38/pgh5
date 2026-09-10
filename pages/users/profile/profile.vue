<template>
  <view class="profile-container">
    <view class="avatar-section">
      <image class="avatar" :src="form.avatar || '/static/default-avatar.png'" mode="aspectFill" />
      <text class="tip">点击可更换头像（预留）</text>
    </view>

    <view class="form-card">
      <view class="form-item">
        <text class="label">会员昵称</text>
        <input class="input" v-model="form.nickname" placeholder="请输入您的昵称" />
      </view>

      <view class="form-item">
        <text class="label">手机号码</text>
        <input class="input disabled" disabled v-model="form.mobile" />
        <text class="sub-tip">手机号不可直接修改</text>
      </view>

      <view class="form-item">
        <text class="label">会员等级</text>
        <text class="value-text">Lv.{{ form.level || 0 }}</text>
      </view>
    </view>

    <button class="save-btn" :loading="loading" @click="handleSave">保存修改</button>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getUserProfile } from '@/api/user.js' // 确保你的 api 路径正确

const form = ref({
  nickname: '',
  mobile: '',
  level: 0,
  avatar: ''
})

const loading = ref(false)

// 页面加载时获取真实用户信息
onMounted(async () => {
  const res = await getUserProfile()
  if (res && res.data) {
    form.value = {
      nickname: res.data.nickname || res.data.name || '',
      mobile: res.data.mobile || '',
      level: res.data.level || 0,
      avatar: res.data.avatar || ''
    }
  } else {
    uni.showToast({ title: '加载个人资料失败', icon: 'none' })
  }
})

// 保存修改
async function handleSave() {
  if (!form.value.nickname.trim()) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' })
    return
  }

  loading.value = true
  try {
    // 模拟提交保存（如果你有对应的更新接口，可以在这里调用）
    // const res = await updateUserProfile({ nickname: form.value.nickname })

    setTimeout(() => {
      loading.value = false
      uni.showToast({ title: '修改成功', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 1000)
    }, 600)
  } catch (error) {
    loading.value = false
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.profile-container {
  min-height: 100vh;
  background-color: #f8fafc;
  padding: 30rpx;
  box-sizing: border-box;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 30rpx 0 40rpx;

  .avatar {
    width: 140rpx;
    height: 140rpx;
    border-radius: 50%;
    background: #cbd5e1;
    border: 4rpx solid #fff;
    box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
  }

  .tip {
    font-size: 20rpx;
    color: #94a3b8;
    margin-top: 12rpx;
  }
}

.form-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 0 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02);
  margin-bottom: 40rpx;

  .form-item {
    padding: 30rpx 0;
    border-bottom: 1rpx solid #f1f5f9;
    display: flex;
    flex-direction: column;

    &:last-child {
      border-bottom: none;
    }

    .label {
      font-size: 24rpx;
      color: #64748b;
      margin-bottom: 12rpx;
      font-weight: 600;
    }

    .input {
      font-size: 28rpx;
      color: #0f172a;
      width: 100%;

      &.disabled {
        color: #94a3b8;
      }
    }

    .sub-tip {
      font-size: 18rpx;
      color: #cbd5e1;
      margin-top: 6rpx;
    }

    .value-text {
      font-size: 28rpx;
      color: #2563eb;
      font-weight: 700;
    }
  }
}

.save-btn {
  width: 100%;
  background: #2563eb;
  color: #fff;
  font-weight: 800;
  font-size: 28rpx;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 16rpx;
  border: none;
  &::after { border: none; }
}
</style>
