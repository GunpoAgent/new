const express = require('express');
const cors = require('cors');
const path = require('path');

// 환경변수 로드
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔧 환경변수 로드 확인:');
console.log('- PORT:', process.env.PORT || '설정안됨');
console.log('- KAKAO_REST_API_KEY:', process.env.KAKAO_REST_API_KEY ? '설정됨' : '설정안됨');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '설정됨' : '설정안됨');

// Express 앱 초기화
const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어 설정
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: '카카오맵 백엔드 서버가 실행 중입니다.',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: {
      node_env: process.env.NODE_ENV,
      port: PORT,
      kakao_api: process.env.KAKAO_REST_API_KEY ? 'configured' : 'not configured',
      supabase: process.env.SUPABASE_URL ? 'configured' : 'not configured'
    }
  });
});

// 헬스 체크 라우트
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 간단한 테스트 API
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API 테스트 성공',
    timestamp: new Date().toISOString()
  });
});

// 404 에러 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'API 엔드포인트를 찾을 수 없습니다.',
    path: req.originalUrl,
    method: req.method
  });
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('서버 에러:', err);
  res.status(500).json({
    error: '서버 내부 오류가 발생했습니다.',
    message: process.env.NODE_ENV === 'development' ? err.message : '내부 서버 오류'
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 백엔드 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📍 프론트엔드 URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🌐 서버 URL: http://localhost:${PORT}`);
  console.log(`✅ 서버 정상 시작 완료`);
});

module.exports = app; 