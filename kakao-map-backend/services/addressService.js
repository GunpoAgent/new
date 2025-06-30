const { supabase } = require('../config/database');

class AddressService {
  constructor() {
    this.tableName = 'addresses';
  }

  // 모든 주소 조회 (페이징 및 필터링 지원)
  async getAddresses({ page = 1, limit = 100, building_type, is_user_input, geocoding_status }) {
    try {
      let query = supabase
        .from(this.tableName)
        .select('*', { count: 'exact' });

      // 필터 적용
      if (building_type) {
        query = query.eq('building_type', building_type);
      }
      if (is_user_input !== undefined) {
        query = query.eq('is_user_input', is_user_input);
      }
      if (geocoding_status) {
        query = query.eq('geocoding_status', geocoding_status);
      }

      // 페이징 적용
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      query = query
        .range(from, to)
        .order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return {
        addresses: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNext: page * limit < (count || 0),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('주소 조회 오류:', error);
      throw error;
    }
  }

  // ID로 특정 주소 조회
  async getAddressById(id) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('주소 조회 오류:', error);
      throw error;
    }
  }

  // 새 주소 추가
  async createAddress(addressData) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert([{
          address: addressData.address,
          building_type: addressData.building_type || null,
          latitude: addressData.latitude || null,
          longitude: addressData.longitude || null,
          road_address: addressData.road_address || null,
          place_name: addressData.place_name || null,
          category: addressData.category || null,
          distance: addressData.distance || null,
          is_user_input: addressData.is_user_input || false,
          geocoding_status: addressData.geocoding_status || 'pending',
          error_message: addressData.error_message || null
        }])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('주소 추가 오류:', error);
      throw error;
    }
  }

  // 주소 업데이트
  async updateAddress(id, updateData) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('주소 업데이트 오류:', error);
      throw error;
    }
  }

  // 주소 삭제
  async deleteAddress(id) {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      return true;
    } catch (error) {
      console.error('주소 삭제 오류:', error);
      throw error;
    }
  }

  // 대량 주소 추가
  async bulkCreateAddresses(addressesData) {
    try {
      const results = {
        created: 0,
        skipped: 0,
        errors: []
      };

      // 배치 크기 (Supabase는 한 번에 1000개까지 처리 가능)
      const batchSize = 100;
      const batches = [];
      
      for (let i = 0; i < addressesData.length; i += batchSize) {
        batches.push(addressesData.slice(i, i + batchSize));
      }

      console.log(`📦 ${batches.length}개 배치로 ${addressesData.length}개 주소 처리 시작`);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        try {
          const batch = batches[batchIndex];
          const formattedBatch = batch.map(addr => ({
            address: addr.address,
            building_type: addr.building_type || null,
            latitude: addr.latitude || null,
            longitude: addr.longitude || null,
            road_address: addr.road_address || null,
            place_name: addr.place_name || null,
            category: addr.category || null,
            distance: addr.distance || null,
            is_user_input: addr.is_user_input || false,
            geocoding_status: addr.geocoding_status || 'pending',
            error_message: addr.error_message || null
          }));

          const { data, error } = await supabase
            .from(this.tableName)
            .insert(formattedBatch)
            .select('id');

          if (error) {
            console.error(`배치 ${batchIndex + 1} 처리 오류:`, error.message);
            results.errors.push({
              batch: batchIndex + 1,
              error: error.message,
              addresses: batch.map(addr => addr.address)
            });
            results.skipped += batch.length;
          } else {
            results.created += data.length;
            console.log(`✅ 배치 ${batchIndex + 1}/${batches.length} 완료: ${data.length}개 추가`);
          }
        } catch (batchError) {
          console.error(`배치 ${batchIndex + 1} 처리 중 예외:`, batchError.message);
          results.errors.push({
            batch: batchIndex + 1,
            error: batchError.message,
            addresses: batches[batchIndex].map(addr => addr.address)
          });
          results.skipped += batches[batchIndex].length;
        }
      }

      console.log(`📊 대량 추가 완료: 성공 ${results.created}개, 실패 ${results.skipped}개`);
      return results;
    } catch (error) {
      console.error('대량 주소 추가 오류:', error);
      throw error;
    }
  }

  // 모든 주소 삭제
  async clearAllAddresses() {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .neq('id', 0); // 모든 레코드 삭제

      if (error) {
        throw new Error(error.message);
      }

      console.log('🗑️  모든 주소 데이터 삭제 완료');
      return true;
    } catch (error) {
      console.error('주소 전체 삭제 오류:', error);
      throw error;
    }
  }

  // 주소 통계 정보
  async getAddressStats() {
    try {
      // 전체 주소 수
      const { count: totalCount } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      // 지오코딩 상태별 통계
      const { data: statusStats } = await supabase
        .from(this.tableName)
        .select('geocoding_status')
        .then(async ({ data }) => {
          const stats = {};
          data.forEach(item => {
            stats[item.geocoding_status] = (stats[item.geocoding_status] || 0) + 1;
          });
          return { data: stats };
        });

      // 건물 타입별 통계
      const { data: buildingTypeStats } = await supabase
        .from(this.tableName)
        .select('building_type')
        .then(async ({ data }) => {
          const stats = {};
          data.forEach(item => {
            const type = item.building_type || '미분류';
            stats[type] = (stats[type] || 0) + 1;
          });
          return { data: stats };
        });

      // 사용자 입력 주소 수
      const { count: userInputCount } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('is_user_input', true);

      return {
        total: totalCount || 0,
        geocodingStatus: statusStats || {},
        buildingTypes: buildingTypeStats || {},
        userInputCount: userInputCount || 0,
        excelDataCount: (totalCount || 0) - (userInputCount || 0)
      };
    } catch (error) {
      console.error('주소 통계 조회 오류:', error);
      throw error;
    }
  }

  // 건물 타입별 주소 조회
  async getAddressesByBuildingType(buildingType, page = 1, limit = 100) {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      const { data, error, count } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .eq('building_type', buildingType)
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return {
        addresses: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNext: page * limit < (count || 0),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('건물 타입별 주소 조회 오류:', error);
      throw error;
    }
  }

  // 주소 중복 확인
  async checkDuplicateAddress(address) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('id, address')
        .eq('address', address)
        .limit(1);

      if (error) {
        throw new Error(error.message);
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('주소 중복 확인 오류:', error);
      throw error;
    }
  }
}

module.exports = new AddressService(); 