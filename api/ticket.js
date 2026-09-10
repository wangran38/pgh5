import { baseURL } from '@/utils/request.js'

/**
 * 优化后的票根上传与AI核验接口
 * @param {String} filePath - 本地图片路径 (例如 uni.chooseImage 返回的 tempFilePaths[0])
 * @param {Object} extraData - 其他需要一起提交的表单数据（如 city 等）
 */
export function uploadAndVerifyTicket(filePath, extraData = {}) {
  const token = uni.getStorageSync('pgtoken') || ''

  // 获取基础路径并去掉末尾的斜杠（统一使用 request.js 的后端地址）
  let baseUrl = baseURL || ''
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
        try {
          const data = JSON.parse(res.data)
          // 核验成功(200)与核验未通过(400)都 resolve 完整响应：
          // 页面需根据 is_valid / reject_reason 做结构化回显，只有网络/解析异常才 reject
          if (data.code === 200 || data.code === 400 || data.code === 0 || data.error_code === 0) {
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
