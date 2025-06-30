import React, { useState, useCallback } from 'react';
import KakaoMap from './KakaoMap';
import ExcelUploader from './ExcelUploader';
import AddressInput from './AddressInput';
import './App.css';

function App() {
  const [markers, setMarkers] = useState([]);
  const [userMarkers, setUserMarkers] = useState([]);
  const [processedData, setProcessedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // 기본 중심 좌표 (군포시 청백리길6)
  const defaultCenter = { x: 127.0426, y: 37.3636 };

  // 엑셀 데이터 처리 완료 핸들러
  const handleDataProcessed = useCallback((data) => {
    console.log('📊 엑셀 데이터 처리 완료:', data);
    
    setMarkers(data.markers || []);
    setProcessedData(data);
    
    // 통계 출력
    if (data.stats) {
      console.log('📈 처리 통계:', data.stats);
    }
  }, []);

  // 사용자 주소 추가 핸들러
  const handleAddressSelect = useCallback((addressData) => {
    console.log('📍 사용자 주소 추가:', addressData);
    
    // 새 마커 데이터 생성
    const newMarker = {
      id: `user_${Date.now()}`,
      placeName: addressData.place_name,
      address: addressData.address,
      roadAddress: addressData.road_address,
      latitude: addressData.latitude,
      longitude: addressData.longitude,
      category: addressData.category || '사용자 입력',
      buildingType: '사용자 입력',
      distance: addressData.distance,
      phone: addressData.phone,
      place_url: addressData.place_url,
      isUserInput: true
    };

    // 사용자 마커 목록에 추가
    setUserMarkers(prev => [...prev, newMarker]);
    
    console.log('✅ 사용자 마커 추가됨:', newMarker);
  }, []);

  // 모든 마커 데이터 통합
  const allMarkers = [...markers, ...userMarkers];

  // 마커 제거 핸들러
  const handleRemoveMarker = useCallback((markerId) => {
    if (markerId.startsWith('user_')) {
      setUserMarkers(prev => prev.filter(marker => marker.id !== markerId));
      console.log('🗑️ 사용자 마커 제거:', markerId);
    } else {
      setMarkers(prev => prev.filter(marker => marker.id !== markerId));
      console.log('🗑️ 엑셀 마커 제거:', markerId);
    }
  }, []);

  // 새 파일 업로드 시 초기화
  const handleNewFileUpload = useCallback(() => {
    setMarkers([]);
    setProcessedData(null);
    console.log('🔄 데이터 초기화 완료');
  }, []);

  // 통계 계산
  const getMarkerStats = useCallback(() => {
    const excelMarkers = markers.length;
    const userInputMarkers = userMarkers.length;
    const total = allMarkers.length;
    
    // 건물 타입별 분포
    const typeDistribution = {};
    allMarkers.forEach(marker => {
      const type = marker.buildingType || marker.category || '기타';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });

    return {
      total,
      excelMarkers,
      userInputMarkers,
      typeDistribution,
      hasData: total > 0
    };
  }, [markers, userMarkers, allMarkers]);

  const stats = getMarkerStats();

  return (
    <div className="App">
      <header className="App-header">
        <h1>🗺️ 카카오맵 주소 핀 표시 시스템</h1>
        <p className="header-subtitle">
          엑셀 파일의 한글 주소를 지도에 마커로 표시하고 관리하는 웹 애플리케이션
        </p>
      </header>

      <main className="App-main">
        {/* 좌측 패널: 컨트롤 */}
        <div className="control-panel">
          {/* 엑셀 업로더 */}
          <ExcelUploader 
            onDataProcessed={handleDataProcessed}
            onNewUpload={handleNewFileUpload}
          />

          {/* 주소 검색 */}
          <AddressInput 
            onAddressSelect={handleAddressSelect}
            defaultCenter={defaultCenter}
          />

          {/* 현재 상태 표시 */}
          <div className="status-panel">
            <h3>📊 현재 상태</h3>
            <div className="status-grid">
              <div className="status-item">
                <span className="label">총 마커:</span>
                <span className="value">{stats.total}개</span>
              </div>
              <div className="status-item">
                <span className="label">엑셀 데이터:</span>
                <span className="value">{stats.excelMarkers}개</span>
              </div>
              <div className="status-item">
                <span className="label">사용자 입력:</span>
                <span className="value">{stats.userInputMarkers}개</span>
              </div>
            </div>

            {/* 처리 통계 (엑셀 업로드 후) */}
            {processedData?.stats && (
              <div className="processing-stats">
                <h4>🎯 지오코딩 결과</h4>
                <div className="stats-grid">
                  <div className="stat-item success">
                    <span className="stat-value">{processedData.stats.successful}</span>
                    <span className="stat-label">성공</span>
                  </div>
                  <div className="stat-item failed">
                    <span className="stat-value">{processedData.stats.failed}</span>
                    <span className="stat-label">실패</span>
                  </div>
                  <div className="stat-item rate">
                    <span className="stat-value">{processedData.stats.successRate}%</span>
                    <span className="stat-label">성공률</span>
                  </div>
                </div>

                {/* 실패한 주소 표시 */}
                {processedData.stats.failedAddresses && processedData.stats.failedAddresses.length > 0 && (
                  <details className="failed-addresses">
                    <summary>❌ 실패한 주소 ({processedData.stats.failedAddresses.length}개)</summary>
                    <div className="failed-list">
                      {processedData.stats.failedAddresses.slice(0, 10).map((item, index) => (
                        <div key={index} className="failed-item">
                          <div className="failed-address">
                            #{item.rowNumber}: {item.address}
                          </div>
                          <div className="failed-error">
                            {item.errorMessage}
                          </div>
                        </div>
                      ))}
                      {processedData.stats.failedAddresses.length > 10 && (
                        <div className="failed-more">
                          ...그 외 {processedData.stats.failedAddresses.length - 10}개
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* 타입별 분포 */}
            {stats.hasData && Object.keys(stats.typeDistribution).length > 0 && (
              <div className="type-distribution">
                <h4>🏢 건물 타입별 분포</h4>
                <div className="type-list">
                  {Object.entries(stats.typeDistribution)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8)
                    .map(([type, count]) => (
                    <div key={type} className="type-item">
                      <span className="type-name">{type}</span>
                      <span className="type-count">{count}개</span>
                    </div>
                  ))}
                  {Object.keys(stats.typeDistribution).length > 8 && (
                    <div className="type-item more">
                      <span className="type-name">기타</span>
                      <span className="type-count">
                        {Object.keys(stats.typeDistribution).length - 8}개 타입
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 도움말 */}
            {!stats.hasData && (
              <div className="help-section">
                <h4>💡 사용 방법</h4>
                <ol>
                  <li>엑셀 파일을 업로드하여 대량 주소를 처리하거나</li>
                  <li>주소 검색으로 개별 위치를 추가하세요</li>
                  <li>지도에서 마커를 클릭하면 상세 정보를 확인할 수 있습니다</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* 우측 패널: 지도 */}
        <div className="map-panel">
          <KakaoMap
            markers={allMarkers}
            center={defaultCenter}
            onMarkerRemove={handleRemoveMarker}
            isLoading={isLoading}
          />
        </div>
      </main>

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p>데이터를 처리하고 있습니다...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
