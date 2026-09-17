// utils/orderQR.js
// 订单动态核销二维码：生成与解析 { order_no, timestamp, sign }
//
// 约定（与后端一致）：
//   待签名串 message = `${orderNo}:${timestamp}`（timestamp 为秒级）
//   签名 sign = HMAC-SHA256(message, QR_SECRET) 的 hex 小写串
//   二维码内容 qrContent = JSON.stringify({ order_no, timestamp, sign })
//   后端校验结构：OrderNo(必填) / Timestamp(int64) / Sign(静态码或手动输入时可为空)
//
// 说明：项目由 HBuilderX 构建、无 package.json，装不了 crypto-js，
// 因此内置纯 JS 的 SHA-256/HMAC 实现，H5 / App / 小程序全端通用。

// 服务端约定的 Secret Key（前端只用于生成待扫二维码，不具备校验权）
const QR_SECRET = 'YourAppSecretKeyKey2026'

// ===== SHA-256 常量 =====
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]

function rotr(x, n) {
  return (x >>> n) | (x << (32 - n))
}

// UTF-8 字符串 → 字节数组（订单号/密钥均为 ASCII，兼容中文）
function utf8Bytes(str) {
  const out = []
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    if (c < 0x80) {
      out.push(c)
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
    }
  }
  return out
}

function hexToBytes(hex) {
  const out = []
  for (let i = 0; i < hex.length; i += 2) out.push(parseInt(hex.substr(i, 2), 16))
  return out
}

// SHA-256（输入字节数组，输出 hex 小写串）
function sha256(bytes) {
  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ]
  const bitLen = bytes.length * 8
  const buf = bytes.concat([0x80])
  while (buf.length % 64 !== 56) buf.push(0)
  // 64 位长度字段共 8 字节：高 32 位 + 低 32 位，大端
  const hi = Math.floor(bitLen / 0x100000000)
  const lo = bitLen >>> 0
  for (let i = 3; i >= 0; i--) buf.push((hi >>> (i * 8)) & 0xff)
  for (let i = 3; i >= 0; i--) buf.push((lo >>> (i * 8)) & 0xff)

  const w = new Array(64)
  for (let off = 0; off < buf.length; off += 64) {
    for (let t = 0; t < 16; t++) {
      const i = off + t * 4
      w[t] = (buf[i] << 24) | (buf[i + 1] << 16) | (buf[i + 2] << 8) | buf[i + 3]
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3)
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10)
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0
    }
    let a = H[0], b = H[1], c = H[2], d = H[3]
    let e = H[4], f = H[5], g = H[6], h = H[7]
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) >>> 0
      h = g; g = f; f = e; e = (d + t1) >>> 0
      d = c; c = b; b = a; a = (t1 + t2) >>> 0
    }
    H[0] = (H[0] + a) >>> 0
    H[1] = (H[1] + b) >>> 0
    H[2] = (H[2] + c) >>> 0
    H[3] = (H[3] + d) >>> 0
    H[4] = (H[4] + e) >>> 0
    H[5] = (H[5] + f) >>> 0
    H[6] = (H[6] + g) >>> 0
    H[7] = (H[7] + h) >>> 0
  }
  return H.map((x) => x.toString(16).padStart(8, '0')).join('')
}

// HMAC-SHA256 → hex 小写串
function hmacSha256Hex(message, secret) {
  const blockSize = 64
  let key = utf8Bytes(secret)
  if (key.length > blockSize) key = hexToBytes(sha256(key))
  while (key.length < blockSize) key.push(0)

  const oPad = key.map((b) => b ^ 0x5c)
  const iPad = key.map((b) => b ^ 0x36)
  const inner = sha256(iPad.concat(utf8Bytes(message)))
  return sha256(oPad.concat(hexToBytes(inner)))
}

/**
 * 生成动态核销二维码参数（同步，全端可用）
 * @param {string} orderNo 订单号
 * @returns {{ orderNo: string, timestamp: number, sign: string, qrContent: string }}
 */
export function generateOrderQRToken(orderNo) {
  const no = String(orderNo || '').trim()
  const timestamp = Math.floor(Date.now() / 1000)
  const sign = hmacSha256Hex(`${no}:${timestamp}`, QR_SECRET)
  return {
    orderNo: no,
    timestamp,
    sign,
    qrContent: JSON.stringify({ order_no: no, timestamp, sign })
  }
}

/**
 * 解析扫码 / 输入内容，统一成 { order_no, timestamp, sign }
 * 支持三种形态：
 *   1. 动态二维码 JSON：{"order_no":"ORD...","timestamp":123,"sign":"..."}
 *   2. 带参数的链接：xxx?order_no=ORD...&timestamp=123&sign=...
 *   3. 静态码 / 手动输入：纯订单号（timestamp、sign 为空，后端按免签处理）
 * @param {string} text 扫码或输入原文
 * @returns {{ order_no: string, timestamp: number|'', sign: string }}
 */
export function parseOrderQR(text) {
  const raw = String(text == null ? '' : text).trim()
  const empty = { order_no: '', timestamp: '', sign: '' }
  if (!raw) return empty

  // 1. JSON
  if (raw.charAt(0) === '{') {
    try {
      const obj = JSON.parse(raw)
      if (obj && obj.order_no) {
        return {
          order_no: String(obj.order_no),
          timestamp: Number(obj.timestamp) || '',
          sign: obj.sign ? String(obj.sign) : ''
        }
      }
    } catch (e) {
      // 非合法 JSON，继续按链接/纯文本解析
    }
  }

  // 2. 链接参数
  if (raw.indexOf('order_no=') > -1) {
    const query = raw.substring(raw.indexOf('?') + 1)
    const map = {}
    query.split('&').forEach((kv) => {
      const idx = kv.indexOf('=')
      if (idx > -1) {
        try {
          map[kv.slice(0, idx)] = decodeURIComponent(kv.slice(idx + 1))
        } catch (e) {
          map[kv.slice(0, idx)] = kv.slice(idx + 1)
        }
      }
    })
    if (map.order_no) {
      return {
        order_no: String(map.order_no),
        timestamp: Number(map.timestamp) || '',
        sign: map.sign ? String(map.sign) : ''
      }
    }
  }

  // 3. 纯订单号
  return { order_no: raw, timestamp: '', sign: '' }
}
