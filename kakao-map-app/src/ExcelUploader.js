import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import geocodingService from './GeocodingService';
import ProgressBar from './ProgressBar';
import './App.css';

const ExcelUploader = ({ onDataProcessed }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isUploaded, setIsUploaded] = useState(false);

  // 건물 타입 키워드 매핑
  const buildingTypeKeywords = {
    '대형마트': ['마트', '대형마트', '이마트', '롯데마트', '홈플러스'],
    '편의점': ['편의점', 'CU', 'GS25', '세븐일레븐', '미니스톱'],
    '어린이집': ['어린이집', '유치원', '놀이방', '키즈'],
    '학교': ['학교', '초등학교', '중학교', '고등학교', '대학교', '대학'],
    '학원': ['학원', '교습소', '과외'],
    '주차장': ['주차장', '주차', '파킹'],
    '주유소': ['주유소', 'GS칼텍스', 'SK에너지', 'S-OIL'],
    '지하철역': ['역', '지하철', '전철', '메트로'],
    '은행': ['은행', '농협', '신한', '우리', '하나', '국민', 'KB'],
    '문화시설': ['도서관', '박물관', '미술관', '전시관', '공연장'],
    '중개업소': ['부동산', '공인중개사'],
    '공공기관': ['주민센터', '구청', '시청', '동사무소', '우체국'],
    '관광명소': ['관광', '명소', '공원', '테마파크'],
    '숙박': ['호텔', '모텔', '펜션', '게스트하우스', '리조트'],
    '음식점': ['음식점', '식당', '레스토랑', '맛집'],
    '카페': ['카페', '커피', '스타벅스', '투썸플레이스'],
    '병원': ['병원', '의원', '클리닉', '한의원'],
    '약국': ['약국', '온누리']
  };

  // 파일 분석 함수
  const analyzeExcelFile = useCallback((data) => {
    if (!data || data.length === 0) {
      return { addressField: null, buildingTypeField: null, sampleData: [], totalRows: 0 };
    }

    const headers = Object.keys(data[0] || {});
    const sampleSize = Math.min(5, data.length);
    const sampleData = data.slice(0, sampleSize);

    // 주소 필드 감지
    const addressKeywords = ['주소', 'address', '위치', 'location', '도로명'];
    const addressField = headers.find(header => 
      addressKeywords.some(keyword => 
        header.toLowerCase().includes(keyword.toLowerCase())
      )
    ) || headers[0];

    // 건물타입 필드 감지
    const typeKeywords = ['타입', 'type', '종류', 'category', '분류', '업종', '건물', 'building'];
    const buildingTypeField = headers.find(header => 
      typeKeywords.some(keyword => 
        header.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    // 건물 타입별 분포 분석
    const typeDistribution = {};
    data.forEach(row => {
      const typeValue = row[buildingTypeField] || '기타';
      typeDistribution[typeValue] = (typeDistribution[typeValue] || 0) + 1;
    });

    return {
      addressField,
      buildingTypeField,
      sampleData,
      totalRows: data.length,
      headers,
      typeDistribution,
      detectedTypes: Object.keys(typeDistribution).length
    };
  }, []);

  // 건물타입 자동 분류
  const classifyBuildingType = useCallback((address, originalType) => {
    // 원래 타입이 있으면 우선 사용
    if (originalType && originalType !== '기타') {
      return originalType;
    }

    // 주소에서 키워드 검색
    const addressLower = address.toLowerCase();
    for (const [type, keywords] of Object.entries(buildingTypeKeywords)) {
      if (keywords.some(keyword => addressLower.includes(keyword.toLowerCase()))) {
        return type;
      }
    }

    return originalType || '기타';
  }, [buildingTypeKeywords]);

  // 파일 업로드 처리
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      console.log('📄 파일 업로드 시작:', file.name);
      
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
      });

      console.log('✅ 엑셀 파일 읽기 완료:', data.length, '행');

      // 파일 분석
      const analysis = analyzeExcelFile(data);
      setAnalysisResult(analysis);
      setFileData(data);
      setIsUploaded(true);

      console.log('📊 파일 분석 결과:', analysis);

    } catch (error) {
      console.error('❌ 파일 업로드 오류:', error);
      alert('파일을 읽는 중 오류가 발생했습니다: ' + error.message);
    }
  }, [analyzeExcelFile]);

  // 지오코딩 처리 시작
  const handleProcessData = useCallback(async () => {
    if (!fileData || !analysisResult) {
      alert('먼저 파일을 업로드해주세요.');
      return;
    }

    try {
      console.log('🔄 지오코딩 처리 시작');
      setIsProcessing(true);
      setProgressData({ processed: 0, total: fileData.length, percentage: 0 });

      // 백엔드 서버 상태 확인
      try {
        await geocodingService.checkServerStatus();
      } catch (error) {
        alert(error.message);
        setIsProcessing(false);
        return;
      }

      // 주소 데이터 준비
      const addresses = fileData.map((row, index) => ({
        id: index + 1,
        address: row[analysisResult.addressField] || '',
        buildingType: classifyBuildingType(
          row[analysisResult.addressField] || '',
          row[analysisResult.buildingTypeField]
        ),
        originalData: row
      })).filter(item => item.address.trim() !== '');

      console.log(`📍 처리할 주소 개수: ${addresses.length}개`);

      // 배치 지오코딩 실행
      const result = await geocodingService.geocodeBatch(
        addresses,
        (progress) => {
          setProgressData({
            ...progress,
            currentAddress: `처리 중... (${progress.processed}/${progress.total})`
          });
        },
        5, // 배치 크기
        150 // 딜레이
      );

      console.log('✅ 지오코딩 처리 완료:', result.stats);

      // 성공한 결과만 필터링하여 지도에 전달
      const validResults = result.results
        .filter(item => item.geocoding.success && item.geocoding.data)
        .map(item => ({
          id: item.id,
          address: item.geocoding.data.address,
          roadAddress: item.geocoding.data.road_address,
          latitude: item.geocoding.data.latitude,
          longitude: item.geocoding.data.longitude,
          placeName: item.geocoding.data.place_name,
          buildingType: item.buildingType,
          category: item.geocoding.data.category,
          distance: item.geocoding.data.distance,
          isUserInput: false,
          originalData: item.originalData
        }));

      // 최종 통계 계산
      const finalStats = {
        total: result.results.length,
        successful: result.stats.successful,
        failed: result.stats.failed,
        successRate: result.stats.successRate,
        typeDistribution: analysisResult.typeDistribution,
        detectedTypes: analysisResult.detectedTypes,
        failedAddresses: result.stats.errors.map(error => ({
          rowNumber: error.rowIndex,
          address: error.address,
          errorMessage: error.error
        }))
      };

      // 부모 컴포넌트에 결과 전달
      onDataProcessed({
        markers: validResults,
        stats: finalStats,
        fileName: '업로드된 파일'
      });

      console.log(`🎯 지도에 표시할 마커: ${validResults.length}개`);
      
      // 성공 메시지
      alert(`지오코딩 완료!\n성공: ${finalStats.successful}개\n실패: ${finalStats.failed}개\n성공률: ${finalStats.successRate}%`);

    } catch (error) {
      console.error('❌ 지오코딩 처리 오류:', error);
      alert('지오코딩 처리 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProgressData(null);
    }
  }, [fileData, analysisResult, classifyBuildingType, onDataProcessed]);

  // 새 파일 업로드
  const handleNewUpload = useCallback(() => {
    setFileData(null);
    setAnalysisResult(null);
    setIsUploaded(false);
    setProgressData(null);
    // 파일 입력 초기화
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  return (
    <div className="excel-uploader">
      <h3>📊 엑셀 파일 업로드</h3>
      
      {!isUploaded ? (
        <div className="upload-section">
          <div className="upload-info">
            <p>• 한글 주소가 포함된 엑셀 파일을 업로드하세요.</p>
            <p>• 주소와 건물타입 필드를 자동으로 감지합니다.</p>
            <p>• 지원 형식: .xlsx, .xls</p>
          </div>
          
          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isProcessing}
              id="excel-file-input"
            />
            <label htmlFor="excel-file-input" className="file-input-label">
              📁 파일 선택
            </label>
          </div>
        </div>
      ) : (
        <div className="analysis-section">
          <div className="file-analysis">
            <h4>📋 파일 분석 결과</h4>
            <div className="analysis-grid">
              <div className="analysis-item">
                <span className="label">총 데이터:</span>
                <span className="value">{analysisResult.totalRows}행</span>
              </div>
              <div className="analysis-item">
                <span className="label">주소 필드:</span>
                <span className="value">{analysisResult.addressField}</span>
              </div>
              <div className="analysis-item">
                <span className="label">건물타입 필드:</span>
                <span className="value">{analysisResult.buildingTypeField || '자동분류 예정'}</span>
              </div>
              <div className="analysis-item">
                <span className="label">건물타입 종류:</span>
                <span className="value">{analysisResult.detectedTypes}개</span>
              </div>
            </div>

            {analysisResult.sampleData.length > 0 && (
              <div className="sample-data">
                <h5>📄 샘플 데이터 (처음 5행)</h5>
                <div className="sample-table">
                  <table>
                    <thead>
                      <tr>
                        {analysisResult.headers.map(header => (
                          <th key={header}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.sampleData.map((row, index) => (
                        <tr key={index}>
                          {analysisResult.headers.map(header => (
                            <td key={header}>
                              {String(row[header] || '').substring(0, 30)}
                              {String(row[header] || '').length > 30 ? '...' : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="action-buttons">
            <button
              onClick={handleProcessData}
              disabled={isProcessing}
              className="btn-primary"
            >
              {isProcessing ? '🔄 처리 중...' : '🎯 지오코딩 시작'}
            </button>
            
            <button
              onClick={handleNewUpload}
              disabled={isProcessing}
              className="btn-secondary"
            >
              📁 새 파일 업로드
            </button>
          </div>
        </div>
      )}

      {/* 진행률 표시 */}
      {isProcessing && progressData && (
        <ProgressBar
          progress={progressData.percentage}
          message={progressData.currentAddress}
          stats={progressData.stats}
        />
      )}
    </div>
  );
};

export default ExcelUploader; 