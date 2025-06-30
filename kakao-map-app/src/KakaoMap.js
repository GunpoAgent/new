import React, { useEffect, useRef, useState, useCallback } from 'react';
import MapControls from './MapControls';

const KakaoMap = ({ markers = [], center = { x: 127.0426, y: 37.3636 }, onMarkerRemove, isLoading = false }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [kakaoMarkers, setKakaoMarkers] = useState([]);
  const [dynamicColors, setDynamicColors] = useState({});
  const [filteredTypes, setFilteredTypes] = useState([]);
  const [mapStyle, setMapStyle] = useState('normal');

  // 기본 색상 팔레트
  const colorPalette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#AED6F1', '#F8BBD9',
    '#D7DBDD', '#FADBD8', '#D5F4E6', '#FCF3CF', '#EBDEF0',
    '#EBF5FB', '#E8F8F5', '#FEF9E7', '#FDEDEC', '#EAF2F8'
  ];

  // 건물 타입 추출 및 색상 할당
  const buildingTypes = [...new Set(markers.map(marker => marker.buildingType || marker.category || '기타'))];

  useEffect(() => {
    const newColors = {};
    buildingTypes.forEach((type, index) => {
      if (type === '사용자 입력') {
        newColors[type] = '#FF1493'; // 사용자 입력은 핫핑크
      } else {
        newColors[type] = colorPalette[index % colorPalette.length];
      }
    });
    setDynamicColors(newColors);
    setFilteredTypes(buildingTypes);
  }, [markers, buildingTypes]);

  // 지도 초기화
  useEffect(() => {
    if (!window.kakao || !window.kakao.maps) {
      console.error('카카오맵 API가 로드되지 않았습니다.');
      return;
    }

    const container = mapRef.current;
    const options = {
      center: new window.kakao.maps.LatLng(center.y, center.x),
      level: 6,
    };

    const kakaoMap = new window.kakao.maps.Map(container, options);
    setMap(kakaoMap);

    console.log('🗺️ 카카오맵 초기화 완료:', center);
  }, [center]);

  // 마커 색상 가져오기
  const getMarkerColor = useCallback((buildingType) => {
    return dynamicColors[buildingType] || '#999999';
  }, [dynamicColors]);

  // 마커 생성 함수
  const createKakaoMarker = useCallback((markerData) => {
    if (!map) return null;

    const position = new window.kakao.maps.LatLng(markerData.latitude, markerData.longitude);
    const buildingType = markerData.buildingType || markerData.category || '기타';
    const isUserInput = markerData.isUserInput || false;
    const markerColor = getMarkerColor(buildingType);

    // SVG 마커 이미지 생성
    const markerImage = new window.kakao.maps.MarkerImage(
      `data:image/svg+xml;base64,${btoa(`
        <svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
            </filter>
          </defs>
          <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26c0-7.732-6.268-14-14-14z" 
                fill="${markerColor}" filter="url(#shadow)"/>
          <circle cx="14" cy="14" r="8" fill="white"/>
          <circle cx="14" cy="14" r="5" fill="${markerColor}"/>
          ${isUserInput ? `<text x="14" y="18" text-anchor="middle" fill="white" font-size="8" font-weight="bold">★</text>` : ''}
        </svg>
      `)}`,
      new window.kakao.maps.Size(28, 40),
      { offset: new window.kakao.maps.Point(14, 40) }
    );

    const marker = new window.kakao.maps.Marker({
      position: position,
      image: markerImage,
      map: map,
      zIndex: isUserInput ? 10 : 1,
    });

    // 정보창 생성
    const infoWindow = new window.kakao.maps.InfoWindow({
      content: `
        <div style="
          padding: 12px; 
          font-size: 12px; 
          max-width: 220px;
          background: white;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          border: 2px solid ${markerColor};
          font-family: 'Malgun Gothic', sans-serif;
        ">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center;">
              <div style="
                width: 10px; 
                height: 10px; 
                background: ${markerColor}; 
                border-radius: 50%; 
                margin-right: 6px;
              "></div>
              <strong style="color: #333; font-size: 12px;">
                ${isUserInput ? '★ 사용자 입력' : buildingType}
              </strong>
            </div>
            ${onMarkerRemove ? `
              <button 
                onclick="window.removeMarker && window.removeMarker('${markerData.id}')"
                style="
                  background: #e74c3c; 
                  color: white; 
                  border: none; 
                  border-radius: 3px; 
                  padding: 2px 6px; 
                  font-size: 10px; 
                  cursor: pointer;
                "
                title="마커 제거"
              >✕</button>
            ` : ''}
          </div>
          
          <div style="margin-bottom: 4px; color: #444; line-height: 1.3;">
            📍 <strong>${markerData.placeName || markerData.address}</strong>
          </div>
          
          ${markerData.address && markerData.address !== markerData.placeName ? `
            <div style="margin-bottom: 3px; color: #666; font-size: 10px;">
              🏠 ${markerData.address}
            </div>
          ` : ''}
          
          ${markerData.roadAddress ? `
            <div style="margin-bottom: 3px; color: #666; font-size: 10px;">
              🛣️ ${markerData.roadAddress}
            </div>
          ` : ''}
          
          ${markerData.category && markerData.category !== buildingType ? `
            <div style="margin-bottom: 3px; color: #666; font-size: 10px;">
              🏷️ ${markerData.category}
            </div>
          ` : ''}
          
          ${markerData.distance ? `
            <div style="margin-bottom: 3px; color: #999; font-size: 9px;">
              📏 거리: ${markerData.distance >= 1000 ? 
                (markerData.distance / 1000).toFixed(1) + 'km' : 
                Math.round(markerData.distance) + 'm'}
            </div>
          ` : ''}
          
          ${markerData.phone ? `
            <div style="margin-bottom: 3px; color: #666; font-size: 10px;">
              📞 ${markerData.phone}
            </div>
          ` : ''}
        </div>
      `,
    });

    // 마우스 호버 이벤트
    window.kakao.maps.event.addListener(marker, 'mouseover', () => {
      // 다른 정보창 닫기
      kakaoMarkers.forEach(m => {
        if (m.infoWindow && m.infoWindow !== infoWindow) {
          m.infoWindow.close();
        }
      });
      infoWindow.open(map, marker);
      marker.setZIndex(100);
    });

    window.kakao.maps.event.addListener(marker, 'mouseout', () => {
      infoWindow.close();
      marker.setZIndex(isUserInput ? 10 : 1);
    });

    // 마커에 추가 정보 저장
    marker.infoWindow = infoWindow;
    marker.buildingType = buildingType;
    marker.markerData = markerData;
    marker.isUserInput = isUserInput;

    return marker;
  }, [map, getMarkerColor, onMarkerRemove, kakaoMarkers]);

  // 마커 제거 함수를 전역에 등록
  useEffect(() => {
    if (onMarkerRemove) {
      window.removeMarker = (markerId) => {
        onMarkerRemove(markerId);
      };
    }
    
    return () => {
      delete window.removeMarker;
    };
  }, [onMarkerRemove]);

  // 마커 업데이트
  useEffect(() => {
    if (!map) return;

    console.log('🔄 마커 업데이트:', markers.length, '개');

    // 기존 마커 제거
    kakaoMarkers.forEach(marker => {
      marker.setMap(null);
      if (marker.infoWindow) {
        marker.infoWindow.close();
      }
    });

    // 새 마커 생성
    const newMarkers = markers
      .filter(marker => marker.latitude && marker.longitude)
      .map(markerData => createKakaoMarker(markerData))
      .filter(marker => marker !== null);

    setKakaoMarkers(newMarkers);

    // 마커가 있으면 지도 영역을 마커에 맞게 조정 (약간의 지연 후)
    if (newMarkers.length > 0) {
      setTimeout(() => {
        try {
          const bounds = new window.kakao.maps.LatLngBounds();
          newMarkers.forEach(marker => {
            bounds.extend(marker.getPosition());
          });
          map.setBounds(bounds);
          console.log('🎯 지도 영역 조정 완료');
        } catch (error) {
          console.warn('지도 영역 조정 실패:', error);
        }
      }, 100);
    }
  }, [map, markers, createKakaoMarker]);

  // 지도 스타일 변경
  const handleMapStyleChange = useCallback((style) => {
    if (!map) return;
    
    setMapStyle(style);
    
    switch(style) {
      case 'satellite':
        map.setMapTypeId(window.kakao.maps.MapTypeId.SKYVIEW);
        break;
      case 'hybrid':
        map.setMapTypeId(window.kakao.maps.MapTypeId.HYBRID);
        break;
      default:
        map.setMapTypeId(window.kakao.maps.MapTypeId.ROADMAP);
    }
  }, [map]);

  // 모든 마커 보기
  const zoomToFitMarkers = useCallback(() => {
    if (!map || kakaoMarkers.length === 0) return;

    try {
      const bounds = new window.kakao.maps.LatLngBounds();
      kakaoMarkers.forEach(marker => {
        if (marker.getMap()) {
          bounds.extend(marker.getPosition());
        }
      });
      map.setBounds(bounds);
      console.log('🔍 모든 마커 보기 실행');
    } catch (error) {
      console.error('모든 마커 보기 실패:', error);
    }
  }, [map, kakaoMarkers]);

  // 필터링 처리
  const handleFilterChange = useCallback((activeTypes) => {
    setFilteredTypes(activeTypes);
    
    kakaoMarkers.forEach(marker => {
      const shouldShow = activeTypes.includes(marker.buildingType);
      marker.setMap(shouldShow ? map : null);
    });

    console.log('🔽 마커 필터링:', activeTypes.length, '개 타입 활성화');
  }, [kakaoMarkers, map]);

  // 마커 통계 계산
  const getMarkerStats = useCallback(() => {
    const visibleMarkers = kakaoMarkers.filter(marker => marker.getMap());
    const typeStats = {};
    
    visibleMarkers.forEach(marker => {
      const type = marker.buildingType;
      typeStats[type] = (typeStats[type] || 0) + 1;
    });

    return {
      total: markers.length,
      visible: visibleMarkers.length,
      hidden: markers.length - visibleMarkers.length,
      typeStats
    };
  }, [kakaoMarkers, markers]);

  const stats = getMarkerStats();

  return (
    <div className="kakao-map-container">
      {/* 지도 */}
      <div 
        ref={mapRef} 
        className="kakao-map"
        style={{ 
          width: '100%', 
          height: '600px',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative'
        }}
      />

      {/* 맵 컨트롤 */}
      {map && (
        <MapControls
          buildingTypes={buildingTypes}
          dynamicColors={dynamicColors}
          filteredTypes={filteredTypes}
          mapStyle={mapStyle}
          stats={stats}
          onFilterChange={handleFilterChange}
          onMapStyleChange={handleMapStyleChange}
          onZoomToFit={zoomToFitMarkers}
        />
      )}

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255,255,255,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          zIndex: 1000
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #4ECDC4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              지도를 업데이트하고 있습니다...
            </p>
          </div>
        </div>
      )}

      {/* CSS 애니메이션 */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .kakao-map-container {
          position: relative;
          width: 100%;
          height: 600px;
        }
        
        .kakao-map {
          border: 2px solid #e1e5e9;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default KakaoMap; 