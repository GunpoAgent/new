const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  console.log('환경변수를 확인해주세요: SUPABASE_URL, SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 데이터베이스 연결 테스트
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.log('⚠️  Supabase 테이블이 아직 생성되지 않았습니다.');
      return false;
    }
    
    console.log('✅ Supabase 데이터베이스 연결 성공');
    return true;
  } catch (error) {
    console.error('❌ Supabase 연결 실패:', error.message);
    return false;
  }
};

// 주소 테이블 스키마 (참고용)
const ADDRESSES_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL,
    building_type VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    road_address TEXT,
    place_name TEXT,
    category VARCHAR(50),
    distance INTEGER,
    is_user_input BOOLEAN DEFAULT FALSE,
    geocoding_status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  CREATE INDEX IF NOT EXISTS idx_addresses_building_type ON addresses(building_type);
  CREATE INDEX IF NOT EXISTS idx_addresses_geocoding_status ON addresses(geocoding_status);
  CREATE INDEX IF NOT EXISTS idx_addresses_is_user_input ON addresses(is_user_input);
  CREATE INDEX IF NOT EXISTS idx_addresses_created_at ON addresses(created_at);
`;

module.exports = {
  supabase,
  testConnection,
  ADDRESSES_TABLE_SCHEMA
}; 