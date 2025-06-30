# 카카오맵 주소 핀 표시 웹 애플리케이션 - 백엔드

## 프로젝트 개요
React 프론트엔드와 연동하여 카카오맵에 주소 핀을 표시하는 웹 애플리케이션의 백엔드 서버입니다.

## 주요 기능
- 📊 엑셀 파일 업로드 및 분석
- 🗄️ Supabase 데이터베이스 연동
- 🔍 카카오맵 REST API 지오코딩
- 📍 주소 데이터 CRUD 작업
- 📈 통계 및 분석 기능

## 기술 스택
- **런타임**: Node.js
- **프레임워크**: Express.js
- **데이터베이스**: Supabase (PostgreSQL)
- **파일 처리**: XLSX, Multer
- **API**: 카카오맵 REST API
- **기타**: CORS, dotenv

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
`.env` 파일을 생성하고 다음 내용을 입력하세요:

```env
# 서버 설정
PORT=5000
NODE_ENV=development

# 카카오 API 키
KAKAO_REST_API_KEY=f4ca9d9fc9096a0f4f26a636e9d0ee29

# Supabase 설정 (본인의 Supabase 정보로 교체)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# CORS 설정
FRONTEND_URL=http://localhost:3000

# 파일 업로드 설정
UPLOAD_MAX_SIZE=10485760
UPLOAD_DIR=uploads
```

### 3. Supabase 데이터베이스 설정
Supabase 프로젝트에서 다음 SQL을 실행하여 테이블을 생성하세요:

```sql
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_addresses_building_type ON addresses(building_type);
CREATE INDEX IF NOT EXISTS idx_addresses_geocoding_status ON addresses(geocoding_status);
CREATE INDEX IF NOT EXISTS idx_addresses_is_user_input ON addresses(is_user_input);
CREATE INDEX IF NOT EXISTS idx_addresses_created_at ON addresses(created_at);
```

### 4. 서버 실행
```bash
# 개발 모드 (nodemon)
npm run dev

# 프로덕션 모드
npm start
```

서버가 성공적으로 실행되면 `http://localhost:5000`에서 접근할 수 있습니다.

## API 엔드포인트

### 기본 정보
- `GET /` - 서버 상태 확인
- `GET /health` - 헬스 체크

### 지오코딩 API (`/api/geocoding`)
- `POST /single` - 단일 주소 지오코딩
- `POST /batch` - 배치 지오코딩
- `GET /search` - 키워드 검색

### 주소 관리 API (`/api/addresses`)
- `GET /` - 주소 목록 조회 (페이징 지원)
- `GET /:id` - 특정 주소 조회
- `POST /` - 새 주소 추가
- `PUT /:id` - 주소 수정
- `DELETE /:id` - 주소 삭제
- `GET /stats/summary` - 주소 통계
- `GET /by-building-type/:buildingType` - 건물 타입별 조회

### 파일 업로드 API (`/api/upload`)
- `POST /excel` - 엑셀 파일 업로드 및 분석
- `POST /process` - 엑셀 데이터 처리 및 DB 저장
- `GET /files` - 업로드된 파일 목록
- `DELETE /files/:filename` - 파일 삭제

## 프로젝트 구조
```
kakao-map-backend/
├── config/
│   └── database.js         # Supabase 연결 설정
├── routes/
│   ├── geocoding.js        # 지오코딩 API 라우터
│   ├── addresses.js        # 주소 관리 API 라우터
│   └── upload.js          # 파일 업로드 API 라우터
├── services/
│   ├── geocodingService.js # 카카오 API 서비스
│   ├── addressService.js   # 주소 데이터 서비스
│   └── fileService.js      # 파일 처리 서비스
├── uploads/               # 업로드된 파일 저장소
├── .env                   # 환경변수 (gitignore)
├── .gitignore
├── package.json
├── server.js              # 메인 서버 파일
└── README.md
```

## 환경변수 설명
- `PORT`: 서버 포트 (기본값: 5000)
- `NODE_ENV`: 실행 환경 (development/production)
- `KAKAO_REST_API_KEY`: 카카오맵 REST API 키
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY`: Supabase 익명 키
- `FRONTEND_URL`: 프론트엔드 URL (CORS 설정용)
- `UPLOAD_MAX_SIZE`: 최대 업로드 파일 크기 (바이트)
- `UPLOAD_DIR`: 업로드 파일 저장 디렉토리

## 개발 참고사항
- API 응답은 모두 JSON 형태입니다
- 모든 API는 `success` 필드로 성공/실패를 나타냅니다
- 오류 시 `error` 필드에 오류 메시지가 포함됩니다
- 파일 업로드는 최대 10MB까지 지원합니다
- 지오코딩 API는 카카오 API 제한을 고려하여 100ms 지연을 적용합니다

## 라이선스
 