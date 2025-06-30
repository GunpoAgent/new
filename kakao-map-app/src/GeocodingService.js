import axios from 'axios';

// 백엔드 API 기본 URL
const API_BASE_URL = 'http://localhost:5000/api';

// API 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 요청 인터셉터 (로깅)
api.interceptors.request.use(
  config => {
    console.log(`🌐 API 요청: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  error => {
    console.error('❌ API 요청 오류:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (오류 처리)
api.interceptors.response.use(
  response => {
    console.log(`✅ API 응답: ${response.config.url} - ${response.status}`);
    return response;
  },
  error => {
    console.error('❌ API 응답 오류:', error);
    return Promise.reject(error);
  }
);

class GeocodingService {
  constructor() {
    this.BASE_URL = API_BASE_URL;
    this.stats = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };
  }

  // 지오코딩 통계 초기화
  resetStats() {
    this.stats = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };
  }

  // 통계 조회
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.processed > 0 ? 
        Math.round((this.stats.successful / this.stats.processed) * 100) : 0
    };
  }

  // 백엔드 서버 상태 확인
  async checkServerStatus() {
    try {
      const response = await api.get('/test');
      console.log('✅ 백엔드 서버 연결 성공:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ 백엔드 서버 연결 실패:', error.message);
      throw new Error('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
  }

  // 단일 주소 지오코딩 (백엔드를 통해)
  async geocodeAddress(address, rowIndex = null) {
    try {
      const response = await api.post('/geocoding/single', { address });
      
      if (response.data.success && response.data.result.success) {
        const data = response.data.result.data;
        this.stats.successful++;
        return {
          success: true,
          data: {
            address: data.address,
            road_address: data.road_address,
            latitude: data.latitude,
            longitude: data.longitude,
            place_name: data.place_name,
            category: data.category || '주소',
            distance: null
          }
        };
      } else {
        this.stats.failed++;
        const errorMsg = response.data.result?.error || '주소를 찾을 수 없습니다.';
        this.stats.errors.push({
          rowIndex,
          address,
          error: errorMsg
        });
        
        return {
          success: false,
          error: errorMsg,
          data: null
        };
      }
    } catch (error) {
      this.stats.failed++;
      const errorMsg = error.response?.data?.error || error.message || '지오코딩 처리 중 오류가 발생했습니다.';
      
      this.stats.errors.push({
        rowIndex,
        address,
        error: errorMsg
      });

      console.error(`❌ 지오코딩 실패 (${address}):`, errorMsg);
      
      return {
        success: false,
        error: errorMsg,
        data: null
      };
    } finally {
      this.stats.processed++;
    }
  }

  // 키워드 검색 (백엔드를 통해)
  async searchKeyword(query, centerCoords = null, radius = 10000) {
    try {
      console.log(`🔍 키워드 검색: "${query}" ${centerCoords ? `(중심: ${centerCoords.x}, ${centerCoords.y})` : ''}`);
      
      const params = {
        query,
        page: 1,
        size: 15
      };

      // 중심 좌표가 있으면 반경 검색
      if (centerCoords) {
        params.x = centerCoords.x;
        params.y = centerCoords.y;
        params.radius = Math.min(radius, 20000); // 최대 20km
      }

      const response = await api.get('/geocoding/search', { params });
      
      if (response.data.success) {
        const results = response.data.results.map(place => ({
          place_name: place.place_name,
          address: place.address,
          road_address: place.road_address,
          latitude: place.latitude,
          longitude: place.longitude,
          category: place.category || '기타',
          distance: place.distance,
          phone: place.phone,
          place_url: place.place_url
        }));

        console.log(`✅ 키워드 검색 완료: ${results.length}개 결과`);
        
        return {
          success: true,
          results,
          meta: response.data.meta
        };
      } else {
        throw new Error('검색 결과가 없습니다.');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || '키워드 검색 중 오류가 발생했습니다.';
      console.error('❌ 키워드 검색 실패:', errorMsg);
      
      return {
        success: false,
        error: errorMsg,
        results: [],
        meta: null
      };
    }
  }

  // 배치 지오코딩 (백엔드를 통해)
  async geocodeBatch(addresses, onProgress = null, batchSize = 5, delay = 150) {
    console.log(`🔄 배치 지오코딩 시작: ${addresses.length}개 주소 처리`);
    
    this.resetStats();
    const results = [];
    const total = addresses.length;

    // 배치 처리
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      
      // 배치 내 병렬 처리
      const batchPromises = batch.map((addressItem, batchIndex) => {
        const globalIndex = i + batchIndex;
        return this.geocodeAddress(addressItem.address, globalIndex + 1);
      });

      try {
        const batchResults = await Promise.all(batchPromises);
        
        // 결과 저장
        batch.forEach((addressItem, batchIndex) => {
          const result = batchResults[batchIndex];
          results.push({
            ...addressItem,
            geocoding: result,
            rowIndex: i + batchIndex + 1
          });
        });

        // 진행률 업데이트
        if (onProgress) {
          const processed = Math.min(i + batchSize, total);
          const progressData = {
            processed,
            total,
            percentage: Math.round((processed / total) * 100),
            stats: this.getStats()
          };
          onProgress(progressData);
        }

        // 다음 배치까지 대기 (API 제한 고려)
        if (i + batchSize < addresses.length) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error('❌ 배치 처리 오류:', error);
        
        // 실패한 배치의 주소들을 빈 결과로 추가
        batch.forEach((addressItem, batchIndex) => {
          results.push({
            ...addressItem,
            geocoding: {
              success: false,
              error: '배치 처리 중 오류 발생',
              data: null
            },
            rowIndex: i + batchIndex + 1
          });
        });
      }
    }

    const finalStats = this.getStats();
    console.log(`✅ 배치 지오코딩 완료:`, finalStats);

    return {
      success: true,
      results,
      stats: finalStats
    };
  }

  // 거리 계산 (하버사인 공식)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 지구 반지름 (km)
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // km
    
    return Math.round(distance * 1000); // 미터로 변환
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }
}

export default new GeocodingService(); 