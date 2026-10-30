const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// 数据库配置
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'diaodian',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(DB_CONFIG);

// 测试连接
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接成功');
    connection.release();
  } catch (err) {
    console.error('❌ 数据库连接失败：', err.message);
    process.exit(1);
  }
})();

// 批量导入接口（幂等：按 lat+lng 去重，错误立即回滚）
app.post('/api/import', async (req, res) => {
  const { list } = req.body;
  if (!Array.isArray(list) || list.length === 0) {
    return res.status(400).json({ msg: '参数错误：list必须是非空数组' });
  }

  // 1. 先做基础校验
  for (const [i, d] of list.entries()) {
    if (!d.name || d.latitude == null || d.longitude == null) {
      return res.status(400).json({ msg: `第 ${i + 1} 条数据缺少必填字段（名称/纬度/经度）` });
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 2. 检查已存在的坐标（幂等去重）
    const coords = list.map(d => [d.latitude, d.longitude]);
    const placeholders = coords.map(() => '(?, ?)').join(',');
    const [rows] = await conn.query(
      `SELECT CONCAT(CAST(latitude AS CHAR), ',', CAST(longitude AS CHAR)) AS coord FROM spots WHERE (latitude, longitude) IN (${placeholders})`,
      coords.flat()
    );
    const existingSet = new Set(rows.map(r => r.coord));
    const newItems = list.filter(d => !existingSet.has(`${d.latitude},${d.longitude}`));
    const skipped = list.length - newItems.length;

    // 3. 插入新数据（出错则回滚全部）
    for (const data of newItems) {
      await conn.query(
        `INSERT INTO spots (
          user_id, name, style, species, latitude, longitude,
          address, province, city, district, note,
          is_public, status, base_score, score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 70, 70)`,
        [
          1,
          data.name,
          data.style || '',
          data.species || '',
          data.latitude,
          data.longitude,
          data.address || '',
          data.province || '',
          data.city || '',
          data.district || '',
          data.note || '',
          2
        ]
      );
    }

    await conn.commit();

    res.json({
      msg: `✅ 导入完成：总计 ${list.length} 条 | 新增 ${newItems.length} 条 | 已存在 ${skipped} 条`,
      total: list.length,
      inserted: newItems.length,
      skipped
    });
  } catch (err) {
    await conn.rollback();
    console.error('导入失败，已回滚：', err.message);
    res.status(500).json({
      msg: '❌ 导入失败，已全部回滚：' + err.message
    });
  } finally {
    conn.release();
  }
});

// 代理接口：前端 -> 本地 -> 目标API（解决 CORS）
app.get('/api/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ msg: '缺少 url 参数' });
  }
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf254193e) XWEB/19841 miniProgram/',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Referer': 'https://diaoyu.comfyui.team/coordinate-editor.html?v=1780883129875&token=',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      },
      timeout: 30000
    });
    res.json(response.data);
  } catch (err) {
    const msg = err.response ? `HTTP ${err.response.status}` : err.message;
    console.error('代理请求失败：', msg);
    res.status(502).json({ msg: '代理请求失败：' + msg });
  }
});

app.use((req, res) => {
  res.status(404).json({ msg: `接口不存在：${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error('全局错误：', err.stack);
  res.status(500).json({ msg: '服务器内部错误' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 服务启动成功：http://localhost:${PORT}`);
  console.log(`✅ 小程序抓取数据自动标记 is_public = 2`);
});
