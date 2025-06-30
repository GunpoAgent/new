const express = require('express');
const cors = require('cors');
const path = require('path');

// 환경변수 로드 (실패해도 계속 진행)
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (error) {
  console.log('⚠️ .env 파일을 찾을 수 없습니다. 기본값을 사용합니다.');
}

// 하드코딩된 환경변수 (개발용)
const PORT = process.env.PORT || 5000;
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || 'f4ca9d9fc9096a0f4f26a636e9d0ee29';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

console.log('🔧 서버 설정:');
console.log('- PORT:', PORT);
console.log('- KAKAO_REST_API_KEY:', KAKAO_REST_API_KEY ? '설정됨' : '설정안됨');
console.log('- FRONTEND_URL:', FRONTEND_URL);

// Express 앱 초기화
const app = express();

// 미들웨어 설정
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 정적 파일 제공 (업로드된 파일들)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: '카카오맵 백엔드 서버가 실행 중입니다.',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: {
      port: PORT,
      kakao_api: KAKAO_REST_API_KEY ? 'configured' : 'not configured',
      frontend_url: FRONTEND_URL
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

// 간단한 API 라우트들
const axios = require('axios');

// 지오코딩 API
app.post('/api/geocoding/single', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({
        error: '주소가 제공되지 않았습니다.',
        success: false
      });
    }

    console.log(`🔍 지오코딩 요청: ${address}`);

    const response = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
      headers: {
        'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`
      },
      params: {
        query: address,
        page: 1,
        size: 1
      }
    });

    const { documents } = response.data;
    
    if (documents && documents.length > 0) {
      const result = documents[0];
      console.log(`✅ 지오코딩 성공: ${address}`);
      
      res.json({
        success: true,
        address: address,
        result: {
          success: true,
          data: {
            address: result.address_name,
            road_address: result.road_address?.address_name || null,
            latitude: parseFloat(result.y),
            longitude: parseFloat(result.x),
            place_name: result.address_name,
            category: 'address'
          }
        }
      });
    } else {
      console.log(`❌ 지오코딩 실패: ${address} - 주소를 찾을 수 없음`);
      
      res.json({
        success: false,
        address: address,
        result: {
          success: false,
          error: '주소를 찾을 수 없습니다.',
          data: null
        }
      });
    }
  } catch (error) {
    console.error('❌ 지오코딩 API 오류:', error.message);
    res.status(500).json({
      error: '지오코딩 처리 중 오류가 발생했습니다.',
      success: false,
      message: error.message
    });
  }
});

// 키워드 검색 API
app.get('/api/geocoding/search', async (req, res) => {
  try {
    const { 
      query, 
      x, 
      y, 
      radius = 10000, 
      page = 1, 
      size = 15 
    } = req.query;
    
    if (!query) {
      return res.status(400).json({
        error: '검색 키워드가 제공되지 않았습니다.',
        success: false
      });
    }

    console.log(`🔍 키워드 검색: ${query}`);

    const params = {
      query,
      page,
      size
    };

    // 중심 좌표가 제공된 경우 반경 검색
    if (x && y) {
      params.x = x;
      params.y = y;
      params.radius = Math.min(radius, 20000); // 최대 20km
    }

    const response = await axios.get('https://dapi.kakao.com/v2/local/search/keyword.json', {
      headers: {
        'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`
      },
      params
    });

    const { documents, meta } = response.data;
    
    const results = documents.map(place => ({
      place_name: place.place_name,
      address: place.address_name,
      road_address: place.road_address_name,
      latitude: parseFloat(place.y),
      longitude: parseFloat(place.x),
      category: place.category_group_name || place.category_name,
      distance: place.distance ? parseInt(place.distance) : null,
      phone: place.phone || null,
      place_url: place.place_url || null
    }));

    console.log(`✅ 키워드 검색 성공: ${query} - ${results.length}개 결과`);

    res.json({
      success: true,
      query: query,
      results,
      meta: {
        total_count: meta.total_count,
        pageable_count: meta.pageable_count,
        is_end: meta.is_end,
        current_page: page,
        page_size: size
      }
    });
  } catch (error) {
    console.error('❌ 키워드 검색 API 오류:', error.message);
    res.status(500).json({
      error: '키워드 검색 처리 중 오류가 발생했습니다.',
      success: false,
      message: error.message
    });
  }
});

// 테스트 API
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API 테스트 성공',
    timestamp: new Date().toISOString(),
    kakao_api: KAKAO_REST_API_KEY ? 'configured' : 'not configured'
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
  console.error('❌ 서버 에러:', err);
  res.status(500).json({
    error: '서버 내부 오류가 발생했습니다.',
    message: process.env.NODE_ENV === 'development' ? err.message : '내부 서버 오류'
  });
});

// 업로드 디렉토리 생성
const fs = require('fs');
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`📁 업로드 디렉토리 생성: ${uploadDir}`);
}

// 서버 시작
app.listen(PORT, () => {
  console.log('🚀========================================🚀');
  console.log(`🚀 백엔드 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📍 프론트엔드 URL: ${FRONTEND_URL}`);
  console.log(`🌐 서버 URL: http://localhost:${PORT}`);
  console.log(`✅ Phase 5 백엔드 서버 준비 완료`);
  console.log('🚀========================================🚀');
});

module.exports = app; 