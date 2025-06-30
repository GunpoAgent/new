import React, { useState, useCallback } from 'react';
import geocodingService from './GeocodingService';

const AddressInput = ({ onAddressSelect, defaultCenter = { x: 127.0426, y: 37.3636 } }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 키워드 검색 실행 (백엔드를 통해)
  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setErrorMessage('검색어를 입력해주세요.');
      return;
    }

    setIsSearching(true);
    setIsLoading(true);
    setErrorMessage('');
    setSearchResults([]);

    try {
      console.log(`🔍 키워드 검색 시작: "${query}"`);

      // 백엔드 서버 상태 확인
      try {
        await geocodingService.checkServerStatus();
      } catch (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        setIsSearching(false);
        return;
      }

      // 키워드 검색 실행 (중심좌표 기반 반경 검색)
      const result = await geocodingService.searchKeyword(query, defaultCenter, 10000);

      if (result.success && result.results.length > 0) {
        setSearchResults(result.results);
        console.log(`✅ 검색 완료: ${result.results.length}개 결과`);
      } else {
        setErrorMessage(result.error || '검색 결과가 없습니다.');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('❌ 키워드 검색 오류:', error);
      setErrorMessage('검색 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
      setSearchResults([]);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [query, defaultCenter]);

  // 주소 직접 지오코딩 (백엔드를 통해)
  const handleDirectGeocode = useCallback(async () => {
    if (!query.trim()) {
      setErrorMessage('주소를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSearchResults([]);

    try {
      console.log(`📍 주소 지오코딩: "${query}"`);

      // 백엔드 서버 상태 확인
      try {
        await geocodingService.checkServerStatus();
      } catch (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      // 주소 지오코딩 실행
      const result = await geocodingService.geocodeAddress(query);

      if (result.success && result.data) {
        const addressData = {
          place_name: result.data.place_name,
          address: result.data.address,
          road_address: result.data.road_address,
          latitude: result.data.latitude,
          longitude: result.data.longitude,
          category: result.data.category,
          distance: null,
          phone: result.data.phone,
          place_url: result.data.place_url,
          isUserInput: true
        };

        // 부모 컴포넌트에 결과 전달
        onAddressSelect(addressData);
        
        // 검색어 초기화
        setQuery('');
        
        console.log('✅ 주소 지오코딩 성공:', addressData);
        
      } else {
        setErrorMessage(result.error || '주소를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('❌ 주소 지오코딩 오류:', error);
      setErrorMessage('주소 검색 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setIsLoading(false);
    }
  }, [query, onAddressSelect]);

  // 검색 결과 선택
  const handleResultSelect = useCallback((selectedResult) => {
    const addressData = {
      place_name: selectedResult.place_name,
      address: selectedResult.address,
      road_address: selectedResult.road_address,
      latitude: selectedResult.latitude,
      longitude: selectedResult.longitude,
      category: selectedResult.category,
      distance: selectedResult.distance,
      phone: selectedResult.phone,
      place_url: selectedResult.place_url,
      isUserInput: true
    };

    // 부모 컴포넌트에 결과 전달
    onAddressSelect(addressData);
    
    // 검색어와 결과 초기화
    setQuery('');
    setSearchResults([]);
    setErrorMessage('');
    
    console.log('✅ 검색 결과 선택:', addressData);
  }, [onAddressSelect]);

  // 검색어 입력 처리
  const handleInputChange = useCallback((e) => {
    setQuery(e.target.value);
    if (searchResults.length > 0) {
      setSearchResults([]);
    }
    if (errorMessage) {
      setErrorMessage('');
    }
  }, [searchResults.length, errorMessage]);

  // 엔터키 처리
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  // 검색 결과 초기화
  const handleClearResults = useCallback(() => {
    setSearchResults([]);
    setErrorMessage('');
  }, []);

  return (
    <div className="address-input-container">
      <h3>🔍 주소 검색</h3>
      
      {/* 검색 입력 섹션 */}
      <div className="search-section">
        <div className="search-input-group">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="주소나 장소명을 입력하세요 (예: 군포시 청백리길6)"
            disabled={isLoading}
            className="search-input"
          />
          <div className="search-buttons">
            <button
              onClick={handleSearch}
              disabled={isLoading || !query.trim()}
              className="btn-search"
              title="키워드로 검색 (주변 10km)"
            >
              {isSearching ? '🔄' : '🔍'} 검색
            </button>
            <button
              onClick={handleDirectGeocode}
              disabled={isLoading || !query.trim()}
              className="btn-geocode"
              title="주소로 직접 찾기"
            >
              {isLoading && !isSearching ? '🔄' : '📍'} 주소찾기
            </button>
          </div>
        </div>

        {/* 검색 안내 */}
        <div className="search-help">
          <p>💡 <strong>검색 방법:</strong></p>
          <ul>
            <li><strong>검색:</strong> 키워드로 주변 장소 찾기 (반경 10km)</li>
            <li><strong>주소찾기:</strong> 정확한 주소로 위치 찾기</li>
          </ul>
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>{isSearching ? '검색 중...' : '주소를 찾는 중...'}</span>
        </div>
      )}

      {/* 에러 메시지 */}
      {errorMessage && (
        <div className="error-message">
          <span>❌ {errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="error-close">×</button>
        </div>
      )}

      {/* 검색 결과 */}
      {searchResults.length > 0 && (
        <div className="search-results">
          <div className="results-header">
            <h4>🎯 검색 결과 ({searchResults.length}개)</h4>
            <button onClick={handleClearResults} className="clear-results">
              모두 지우기
            </button>
          </div>
          
          <div className="results-list">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="result-item"
                onClick={() => handleResultSelect(result)}
              >
                <div className="result-main">
                  <div className="result-name">{result.place_name}</div>
                  <div className="result-category">{result.category}</div>
                </div>
                
                <div className="result-details">
                  <div className="result-address">
                    📍 {result.road_address || result.address}
                  </div>
                  {result.distance && (
                    <div className="result-distance">
                      📏 {(result.distance / 1000).toFixed(1)}km
                    </div>
                  )}
                  {result.phone && (
                    <div className="result-phone">
                      📞 {result.phone}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .address-input-container {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .search-section {
          margin-bottom: 20px;
        }

        .search-input-group {
          display: flex;
          gap: 8px;
          margin-bottom: 15px;
        }

        .search-input {
          flex: 1;
          padding: 12px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #4ECDC4;
        }

        .search-input:disabled {
          background-color: #f5f5f5;
          color: #999;
        }

        .search-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-search, .btn-geocode {
          padding: 12px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-search {
          background-color: #4ECDC4;
          color: white;
        }

        .btn-search:hover:not(:disabled) {
          background-color: #45b7b8;
        }

        .btn-geocode {
          background-color: #f39c12;
          color: white;
        }

        .btn-geocode:hover:not(:disabled) {
          background-color: #e67e22;
        }

        .btn-search:disabled, .btn-geocode:disabled {
          background-color: #bdc3c7;
          cursor: not-allowed;
        }

        .search-help {
          background: #f8f9fa;
          border-radius: 6px;
          padding: 12px;
          font-size: 13px;
          color: #666;
        }

        .search-help ul {
          margin: 8px 0 0 0;
          padding-left: 20px;
        }

        .search-help li {
          margin-bottom: 4px;
        }

        .loading-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 15px;
          background: #e3f2fd;
          border-radius: 6px;
          color: #1976d2;
          font-size: 14px;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e3f2fd;
          border-top: 2px solid #1976d2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #ffebee;
          border: 1px solid #e57373;
          border-radius: 6px;
          color: #c62828;
          font-size: 14px;
        }

        .error-close {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #c62828;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .search-results {
          border: 2px solid #4ECDC4;
          border-radius: 8px;
          overflow: hidden;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #4ECDC4;
          color: white;
        }

        .results-header h4 {
          margin: 0;
          font-size: 16px;
        }

        .clear-results {
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .clear-results:hover {
          background: rgba(255,255,255,0.3);
        }

        .results-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .result-item {
          padding: 12px 16px;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .result-item:hover {
          background-color: #f8f9fa;
        }

        .result-item:last-child {
          border-bottom: none;
        }

        .result-main {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 8px;
        }

        .result-name {
          font-weight: bold;
          color: #2c3e50;
          font-size: 15px;
        }

        .result-category {
          background: #e8f5e8;
          color: #27ae60;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
        }

        .result-details {
          font-size: 13px;
          color: #666;
          line-height: 1.4;
        }

        .result-address {
          margin-bottom: 4px;
        }

        .result-distance, .result-phone {
          margin-bottom: 2px;
        }
      `}</style>
    </div>
  );
};

export default AddressInput; 