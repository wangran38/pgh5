import request from '@/utils/request.js'

/**
 * 优化后的票根上传与AI核验接口
 * @param {String} filePath - 本地图片路径 (例如 uni.chooseImage 返回的 tempFilePaths[0])
 * @param {Object} extraData - 其他需要一起提交的表单数据（如 city 等）
 */
export function uploadAndVerifyTicket(filePath, extraData = {}) {
  const token = uni.getStorageSync('pgtoken') || ''

  // 获取基础路径并去掉末尾的斜杠
  let baseUrl = import.meta.env?.VITE_BASE_URL || ''
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }

  // 拼接路径：如果 baseUrl 已经包含了 /api，则直接拼后面的；否则补全 /api
  let uploadPath = '/api/ticket/verify'
  if (baseUrl.endsWith('/api')) {
    uploadPath = '/ticket/verify'
  }

  const finalUrl = baseUrl + uploadPath
  console.log('【DEBUG】最终票根核验完整URL: ', finalUrl)

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: finalUrl,
      filePath: filePath,
      name: 'file', // 后端接收文件的字段名（对应 c.FormFile("file")）
      header: {
        'pgtoken': token // 传递鉴权 token
      },
      formData: extraData, // 额外表单参数，如 city 等
      success: (res) => {
        console.log('【DEBUG】后端票根核验原始响应: ', res.data)
        try {
          const data = JSON.parse(res.data)
          // 兼容常见的成功状态码
          if (data.code === 200 || data.code === 0 || data.error_code === 0) {
            resolve(data)
          } else {
            reject(data.msg || data.message || '票根核验失败')
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
