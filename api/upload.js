import { baseURL } from '@/utils/request.js'

/**
 * 统一图片上传接口
 * @param {String} filePath - 本地图片路径 (例如 uni.chooseImage 返回的 tempFilePaths[0])
 */
export function uploadImage(filePath) {
  const token = uni.getStorageSync('pgtoken') || ''

  // 获取基础路径并去掉末尾的斜杠（统一使用 request.js 的后端地址）
  let baseUrl = baseURL || ''
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }

  // 拼接路径：如果 baseUrl 已经包含了 /api，则直接拼后面的；否则补全 /api
  let uploadPath = '/api/user/common/upload'
  if (baseUrl.endsWith('/api')) {
    uploadPath = '/user/common/upload'
  }

  const finalUrl = baseUrl + uploadPath
  console.log('【DEBUG】最终上传完整URL: ', finalUrl) // 可以在控制台看看拼出来对不对

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: finalUrl,
      filePath: filePath,
      name: 'files', // 后端接收字段名
      header: {
        'pgtoken': token
      },
      success: (res) => {
        console.log('【DEBUG】后端原始响应: ', res.data)
        try {
          const data = JSON.parse(res.data)
          // 兼容 Go 常用的 code === 0 或 200
          if (data.code === 200 || data.code === 0 || data.error_code === 0) {
            resolve(data)
          } else {
            reject(data.msg || data.message || '上传失败')
          }
        } catch (e) {
          reject('解析响应数据失败')
        }
      },
      fail: (err) => {
        reject(err.errMsg || '网络请求失败')
      }
    })
  })
}
