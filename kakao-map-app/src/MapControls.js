import React, { useState, useEffect } from 'react';

const MapControls = ({ 
  buildingTypes, 
  onFilterChange, 
  onMapStyleChange, 
  onZoomToFit, 
  totalMarkers,
  visibleMarkers 
}) => {
  const [activeFilters, setActiveFilters] = useState(new Set(buildingTypes));
  const [mapStyle, setMapStyle] = useState('normal');
  const [isExpanded, setIsExpanded] = useState(true);

  // buildingTypes가 변경될 때 activeFilters 업데이트
  useEffect(() => {
    setActiveFilters(new Set(buildingTypes));
  }, [buildingTypes]);

  // 필터 토글 함수
  const toggleFilter = (type) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(type)) {
      newFilters.delete(type);
    } else {
      newFilters.add(type);
    }
    setActiveFilters(newFilters);
    onFilterChange(Array.from(newFilters));
  };

  // 전체 선택/해제
  const toggleAll = () => {
    if (activeFilters.size === buildingTypes.length) {
      setActiveFilters(new Set());
      onFilterChange([]);
    } else {
      setActiveFilters(new Set(buildingTypes));
      onFilterChange(buildingTypes);
    }
  };

  // 지도 스타일 변경
  const handleMapStyleChange = (style) => {
    setMapStyle(style);
    onMapStyleChange(style);
  };

  const getFilterColor = (type) => {
    const colors = {
      '주거': '#FF6B6B',
      '상업': '#4ECDC4', 
      '공공': '#45B7D1',
      '관광': '#96CEB4',
      '연구': '#FFEAA7',
      '사용자 입력': '#FF1493'
    };
    return colors[type] || '#999999';
  };

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      border: '1px solid #e0e0e0',
      zIndex: 1000,
      minWidth: isExpanded ? '280px' : '50px',
      transition: 'all 0.3s ease'
    }}>
      
      {/* 헤더 */}
      <div style={{
        padding: '12px 15px',
        borderBottom: isExpanded ? '1px solid #f0f0f0' : 'none',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px 8px 0 0'
      }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 'bold', 
          color: '#333',
          display: isExpanded ? 'block' : 'none'
        }}>
          🎛️ 지도 컨트롤
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '2px'
          }}
        >
          {isExpanded ? '➖' : '⚙️'}
        </button>
      </div>

      {isExpanded && (
        <div style={{ padding: '15px' }}>
          
          {/* 마커 통계 */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '8px 12px',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '12px',
            color: '#666'
          }}>
            📊 마커: {visibleMarkers}/{totalMarkers}개 표시 중
          </div>

          {/* 마커 필터링 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              fontSize: '13px', 
              fontWeight: 'bold', 
              color: '#333',
              marginBottom: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>🏷️ 마커 필터</span>
              <button
                onClick={toggleAll}
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  backgroundColor: '#e9ecef',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                {activeFilters.size === buildingTypes.length ? '전체해제' : '전체선택'}
              </button>
            </div>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '6px',
              maxHeight: '150px',
              overflowY: 'auto'
            }}>
              {buildingTypes.map(type => (
                <label key={type} style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: activeFilters.has(type) ? '#f0f8ff' : 'transparent',
                  border: `1px solid ${activeFilters.has(type) ? getFilterColor(type) : '#e0e0e0'}`,
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={activeFilters.has(type)}
                    onChange={() => toggleFilter(type)}
                    style={{ marginRight: '8px' }}
                  />
                  <div style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: getFilterColor(type),
                    borderRadius: '50%',
                    marginRight: '8px'
                  }} />
                  <span style={{ 
                    fontSize: '11px',
                    fontWeight: type === '사용자 입력' ? 'bold' : 'normal',
                    color: activeFilters.has(type) ? '#333' : '#999'
                  }}>
                    {type} {type === '사용자 입력' ? '★' : ''}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 지도 스타일 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              fontSize: '13px', 
              fontWeight: 'bold', 
              color: '#333',
              marginBottom: '8px' 
            }}>
              🗺️ 지도 스타일
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { value: 'normal', label: '일반' },
                { value: 'satellite', label: '위성' },
                { value: 'hybrid', label: '하이브리드' }
              ].map(style => (
                <button
                  key={style.value}
                  onClick={() => handleMapStyleChange(style.value)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: '10px',
                    border: `1px solid ${mapStyle === style.value ? '#4ECDC4' : '#ddd'}`,
                    backgroundColor: mapStyle === style.value ? '#4ECDC4' : 'white',
                    color: mapStyle === style.value ? 'white' : '#333',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* 지도 액션 */}
          <div>
            <div style={{ 
              fontSize: '13px', 
              fontWeight: 'bold', 
              color: '#333',
              marginBottom: '8px' 
            }}>
              🎯 지도 액션
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                onClick={onZoomToFit}
                style={{
                  padding: '8px 12px',
                  fontSize: '11px',
                  backgroundColor: '#45B7D1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#3a9bc1'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#45B7D1'}
              >
                📍 모든 마커 보기
              </button>
              
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '6px 12px',
                  fontSize: '10px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
              >
                🔄 새로고침
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapControls; 