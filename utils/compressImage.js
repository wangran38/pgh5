// utils/compressImage.js
// 图片压缩工具：canvas 缩放 + quality 压缩，减小上传体积
// 适用于 H5 / 小程序（App 端可用 plus.zip，此处不涉及）

/**
 * 压缩图片
 * @param {String} filePath - uni.chooseImage 返回的临时路径
 * @param {Object} options
 * @param {Number} options.maxSize - 最大边长（px），默认 1600，超出按比例缩小
 * @param {Number} options.quality - JPEG 质量 0~1，默认 0.8
 * @returns {Promise<String>} 压缩后的临时文件路径
 */
export function compressImage(filePath, options = {}) {
  const maxSize = options.maxSize || 1600
  const quality = options.quality != null ? options.quality : 0.8

  return new Promise((resolve) => {
    // #ifdef H5
    const img = new Image()
    img.onload = () => {
      // 按最大边长等比缩放
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height)
        width = Math.floor(width * scale)
        height = Math.floor(height * scale)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      // 转 JPEG（质量参数对 PNG 也能起到压缩作用，统一转 jpeg 体积最小）
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(dataUrl)
    }
    img.onerror = () => resolve(filePath) // 压缩失败退回原图
    img.src = filePath
    // #endif

    // #ifndef H5
    // 非 H5 端（小程序等）：用 uni 自带压缩 API
    uni.compressImage({
      src: filePath,
      quality: Math.round(quality * 100),
      success: (res) => resolve(res.tempFilePath),
      fail: () => resolve(filePath) // 压缩失败退回原图
    })
    // #endif
  })
}

/**
 * 获取文件体积（KB），用于对比压缩效果/调试
 */
export function getImageSize(filePath) {
  return new Promise((resolve) => {
    // #ifdef H5
    // H5 端 filePath 是 blob url，需 fetch 后才知道大小
    fetch(filePath)
      .then(r => r.blob())
      .then(b => resolve(Math.round(b.size / 1024)))
      .catch(() => resolve(-1))
    // #endif

    // #ifndef H5
    uni.getFileInfo({
      filePath,
      success: (res) => resolve(Math.round(res.size / 1024)),
      fail: () => resolve(-1)
    })
    // #endif
  })
}
