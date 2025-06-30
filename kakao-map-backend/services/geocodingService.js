const axios = require('axios');

class GeocodingService {
  constructor() {
    this.apiKey = process.env.KAKAO_REST_API_KEY;
    this.baseURL = 'https://dapi.kakao.com/v2/local';
    this.delay = 100; // API 호출 간격 (밀리초)
  }

  // 단일 주소 지오코딩
  async geocodeAddress(address) {
    try {
      const response = await axios.get(`${this.baseURL}/search/address.json`, {
        headers: {
          'Authorization': `KakaoAK ${this.apiKey}`
        },
        params: {
          query: address,
          page: 1,
          size: 1
        }
      });

      const { documents, meta } = response.data;
      
      if (documents && documents.length > 0) {
        const result = documents[0];
        return {
          success: true,
          data: {
            address: result.address_name,
            road_address: result.road_address?.address_name || null,
            latitude: parseFloat(result.y),
            longitude: parseFloat(result.x),
            place_name: result.address_name,
            category: 'address'
          }
        };
      } else {
        return {
          success: false,
          error: '주소를 찾을 수 없습니다.',
          data: null
        };
      }
    } catch (error) {
      console.error('지오코딩 API 오류:', error.message);
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message,
        data: null
      };
    }
  }

  // 키워드 검색
  async searchKeyword({ query, x, y, radius = 10000, page = 1, size = 15 }) {
    try {
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

      const response = await axios.get(`${this.baseURL}/search/keyword.json`, {
        headers: {
          'Authorization': `KakaoAK ${this.apiKey}`
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

      return {
        results,
        meta: {
          total_count: meta.total_count,
          pageable_count: meta.pageable_count,
          is_end: meta.is_end,
          current_page: page,
          page_size: size
        }
      };
    } catch (error) {
      console.error('키워드 검색 API 오류:', error.message);
      throw new Error(error.response?.data?.errorMessage || error.message);
    }
  }

  // 배치 지오코딩 (API 제한 고려)
  async batchGeocode(addresses) {
    const results = [];
    const total = addresses.length;
    
    console.log(`🔄 배치 지오코딩 시작: ${total}개 주소`);
    
    for (let i = 0; i < addresses.length; i++) {
      try {
        const address = addresses[i];
        console.log(`📍 처리 중 (${i + 1}/${total}): ${address}`);
        
        const result = await this.geocodeAddress(address);
        results.push({
          index: i,
          address: address,
          ...result
        });
        
        // API 호출 제한을 위한 지연
        if (i < addresses.length - 1) {
          await this.sleep(this.delay);
        }
      } catch (error) {
        console.error(`주소 처리 실패 (${i + 1}/${total}):`, error.message);
        results.push({
          index: i,
          address: addresses[i],
          success: false,
          error: error.message,
          data: null
        });
      }
    }
    
    console.log(`✅ 배치 지오코딩 완료: ${results.length}개 처리`);
    return results;
  }

  // 좌표를 주소로 변환 (역지오코딩)
  async reverseGeocode(latitude, longitude) {
    try {
      const response = await axios.get(`${this.baseURL}/geo/coord2address.json`, {
        headers: {
          'Authorization': `KakaoAK ${this.apiKey}`
        },
        params: {
          x: longitude,
          y: latitude,
          input_coord: 'WGS84'
        }
      });

      const { documents } = response.data;
      
      if (documents && documents.length > 0) {
        const result = documents[0];
        return {
          success: true,
          data: {
            address: result.address?.address_name || null,
            road_address: result.road_address?.address_name || null,
            region_1depth: result.address?.region_1depth_name || null,
            region_2depth: result.address?.region_2depth_name || null,
            region_3depth: result.address?.region_3depth_name || null
          }
        };
      } else {
        return {
          success: false,
          error: '좌표에 해당하는 주소를 찾을 수 없습니다.',
          data: null
        };
      }
    } catch (error) {
      console.error('역지오코딩 API 오류:', error.message);
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message,
        data: null
      };
    }
  }

  // 지연 함수
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // API 상태 확인
  async checkApiStatus() {
    try {
      const testAddress = '서울특별시 강남구 테헤란로 152';
      const result = await this.geocodeAddress(testAddress);
      return {
        status: 'OK',
        apiKey: this.apiKey ? '설정됨' : '미설정',
        testResult: result.success
      };
    } catch (error) {
      return {
        status: 'ERROR',
        apiKey: this.apiKey ? '설정됨' : '미설정',
        error: error.message
      };
    }
  }
}

module.exports = new GeocodingService(); 