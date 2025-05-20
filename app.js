const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 80;

// 中间件配置
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务
app.use('/reports', express.static(path.join(__dirname, 'reports')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// 文件上传配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const reportDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    cb(null, reportDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'report-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // 只允许上传HTML文件
    if (file.mimetype === 'text/html') {
      cb(null, true);
    } else {
      cb(new Error('只允许上传HTML文件'));
    }
  }
});

// 模拟数据库
let reports = [
  {
    id: '1',
    title: '京东2025年第一季度财报分析',
    publishDate: '2025-02-08',
    displayDate: '2025.02.08',
    filePath: '/reports/jd_report_2025q1.html',
    createTime: '2025-05-20 10:30:00',
    updateTime: '2025-05-20 10:30:00'
  },
  {
    id: '2',
    title: '阿里巴巴2025年第一季度财报分析',
    publishDate: '2025-02-15',
    displayDate: '2025.02.15',
    filePath: '/reports/alibaba_report_2025q1.html',
    createTime: '2025-05-20 11:15:00',
    updateTime: '2025-05-20 11:15:00'
  },
  {
    id: '3',
    title: '腾讯2025年第一季度财报分析',
    publishDate: '2025-02-22',
    displayDate: '2025.02.22',
    filePath: '/reports/tencent_report_2025q1.html',
    createTime: '2025-05-20 14:45:00',
    updateTime: '2025-05-20 14:45:00'
  }
];

// 格式化日期为显示格式 (YYYY.MM.DD)
function formatDisplayDate(dateString) {
  return dateString.replace(/-/g, '.');
}

// 获取当前时间
function getCurrentTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// API路由

// 获取所有财报
app.get('/api/reports', (req, res) => {
  res.json({
    code: 200,
    message: 'success',
    data: reports
  });
});

// 获取单个财报详情
app.get('/api/reports/:id', (req, res) => {
  const report = reports.find(r => r.id === req.params.id);
  
  if (!report) {
    return res.status(404).json({
      code: 404,
      message: '财报不存在',
      data: null
    });
  }
  
  res.json({
    code: 200,
    message: 'success',
    data: report
  });
});

// 上传新财报
app.post('/api/reports', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 400,
        message: '请上传HTML文件',
        data: null
      });
    }
    
    const { title, publishDate } = req.body;
    
    if (!title || !publishDate) {
      return res.status(400).json({
        code: 400,
        message: '标题和发布日期不能为空',
        data: null
      });
    }
    
    const newId = (parseInt(reports[reports.length - 1].id) + 1).toString();
    const filePath = '/reports/' + req.file.filename;
    const currentTime = getCurrentTime();
    const displayDate = formatDisplayDate(publishDate);
    
    const newReport = {
      id: newId,
      title,
      publishDate,
      displayDate,
      filePath,
      createTime: currentTime,
      updateTime: currentTime
    };
    
    reports.push(newReport);
    
    res.status(201).json({
      code: 200,
      message: '上传成功',
      data: newReport
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '服务器错误: ' + error.message,
      data: null
    });
  }
});

// 更新财报信息
app.put('/api/reports/:id', (req, res) => {
  const { title, publishDate } = req.body;
  const reportIndex = reports.findIndex(r => r.id === req.params.id);
  
  if (reportIndex === -1) {
    return res.status(404).json({
      code: 404,
      message: '财报不存在',
      data: null
    });
  }
  
  const report = reports[reportIndex];
  
  if (title) report.title = title;
  if (publishDate) {
    report.publishDate = publishDate;
    report.displayDate = formatDisplayDate(publishDate);
  }
  
  report.updateTime = getCurrentTime();
  
  reports[reportIndex] = report;
  
  res.json({
    code: 200,
    message: '更新成功',
    data: null
  });
});

// 删除财报
app.delete('/api/reports/:id', (req, res) => {
  const reportIndex = reports.findIndex(r => r.id === req.params.id);
  
  if (reportIndex === -1) {
    return res.status(404).json({
      code: 404,
      message: '财报不存在',
      data: null
    });
  }
  
  const report = reports[reportIndex];
  
  // 删除文件
  const filePath = path.join(__dirname, report.filePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  
  // 从数组中移除
  reports.splice(reportIndex, 1);
  
  res.json({
    code: 200,
    message: '删除成功',
    data: null
  });
});

// 首页路由
app.get('/', (req, res) => {
  res.send('财报管理系统API服务正在运行');
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});

module.exports = app;
