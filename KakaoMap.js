import React, { useEffect, useRef, useState } from 'react';

const KakaoMap = ({ addresses = [], userAddresses = [], buildingTypes = [] }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [dynamicColors, setDynamicColors] = useState({});

  // 기본 색상 팔레트 (더 많은 색상 추가)
  const colorPalette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#AED6F1', '#F8BBD9',
    '#D7DBDD', '#FADBD8', '#D5F4E6', '#FCF3CF', '#EBDEF0',
    '#EBF5FB', '#E8F8F5', '#FEF9E7', '#FDEDEC', '#EAF2F8'
  ];

  // 건축물 타입별 동적 색상 할당
  useEffect(() => {
    if (buildingTypes.length > 0) {
      const newColors = {};
      buildingTypes.forEach((type, index) => {
        newColors[type] = colorPalette[index % colorPalette.length];
      });
      // 사용자 입력은 항상 핫핑크색으로 고정
      newColors['사용자 입력'] = '#FF1493';
      setDynamicColors(newColors);
    }
  }, [buildingTypes]);

  // 지도 초기화
  useEffect(() => {
    if (!window.kakao || !window.kakao.maps) {
      console.error('카카오맵 API가 로드되지 않았습니다.');
      return;
    }

    const container = mapRef.current;
    const options = {
      center: new window.kakao.maps.LatLng(37.3618, 126.9304), // 경기도 군포시 청백리길6 근처 좌표
      level: 5,
    };

    const kakaoMap = new window.kakao.maps.Map(container, options);
    setMap(kakaoMap);

    // 지오코더 초기화
    const geocoder = new window.kakao.maps.services.Geocoder();
    
    // 정확한 주소로 지도 중심 설정
    geocoder.addressSearch('경기도 군포시 청백리길6', (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
        kakaoMap.setCenter(coords);
      }
    });

  }, []);

  // 동적 마커 색상 가져오기
  const getMarkerColor = (buildingType) => {
    return dynamicColors[buildingType] || '#999999'; // 기본 회색
  };

  // 사용자 입력 주소용 마커 색상
  const getUserMarkerColor = () => dynamicColors['사용자 입력'] || '#FF1493';

  // 마커 생성 함수
  const createMarker = (position, buildingType, address, isUserInput = false) => {
    const markerColor = isUserInput ? getUserMarkerColor() : getMarkerColor(buildingType);
    
    // 커스텀 마커 이미지 생성
    const markerImage = new window.kakao.maps.MarkerImage(
      `data:image/svg+xml;base64,${btoa(`
        <svg width="24" height="35" viewBox="0 0 24 35" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 23 12 23s12-14 12-23c0-6.6-5.4-12-12-12z" fill="${markerColor}"/>
          <circle cx="12" cy="12" r="7" fill="white"/>
          <circle cx="12" cy="12" r="4" fill="${markerColor}"/>
        </svg>
      `)}`,
      new window.kakao.maps.Size(24, 35),
      { offset: new window.kakao.maps.Point(12, 35) }
    );

    const marker = new window.kakao.maps.Marker({
      position: position,
      image: markerImage,
      map: map,
    });

    // 정보창 생성
    const infoWindow = new window.kakao.maps.InfoWindow({
      content: `
        <div style="
          padding: 10px; 
          font-size: 12px; 
          max-width: 200px;
          background: white;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        ">
          <strong>${isUserInput ? '사용자 입력' : buildingType}</strong><br/>
          ${address}
        </div>
      `,
    });

    // 마커 클릭 이벤트
    window.kakao.maps.event.addListener(marker, 'click', () => {
      infoWindow.open(map, marker);
    });

    return marker;
  };

  // 주소 데이터를 마커로 표시
  useEffect(() => {
    if (!map || !window.kakao) return;

    // 기존 마커 제거
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    const geocoder = new window.kakao.maps.services.Geocoder();
    const newMarkers = [];

    // 엑셀 데이터 마커 생성
    addresses.forEach((item, index) => {
      if (item.address) {
        geocoder.addressSearch(item.address, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
            const marker = createMarker(coords, item.buildingType, item.address, false);
            newMarkers.push(marker);
            setMarkers(prev => [...prev, marker]);
          }
        });
      }
    });

    // 사용자 입력 주소 마커 생성
    userAddresses.forEach((address, index) => {
      geocoder.addressSearch(address, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
          const marker = createMarker(coords, '사용자 입력', address, true);
          newMarkers.push(marker);
          setMarkers(prev => [...prev, marker]);
        }
      });
    });

  }, [map, addresses, userAddresses]);

  return (
    <div>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '600px',
          border: '1px solid #ddd',
          borderRadius: '8px'
        }} 
      />
      
      {/* 동적 건축물 타입별 범례 */}
      {Object.keys(dynamicColors).length > 0 && (
        <div style={{ 
          marginTop: '10px', 
          padding: '15px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ marginBottom: '10px' }}>
            <strong style={{ fontSize: '14px', color: '#333' }}>📊 범례</strong>
            <span style={{ 
              marginLeft: '10px', 
              fontSize: '12px', 
              color: '#666',
              fontStyle: 'italic'
            }}>
              ({Object.keys(dynamicColors).length}개 타입)
            </span>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '8px'
          }}>
            {Object.entries(dynamicColors)
              .sort(([a], [b]) => {
                // '사용자 입력'을 맨 마지막으로 정렬
                if (a === '사용자 입력') return 1;
                if (b === '사용자 입력') return -1;
                return a.localeCompare(b, 'ko');
              })
              .map(([type, color]) => (
                <div key={type} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  padding: '4px 8px',
                  backgroundColor: type === '사용자 입력' ? '#fff5f5' : 'white',
                  borderRadius: '4px',
                  border: type === '사용자 입력' ? '1px solid #ffcccb' : '1px solid #f0f0f0'
                }}>
                  <div style={{ 
                    width: '14px', 
                    height: '14px', 
                    backgroundColor: color, 
                    borderRadius: '50%',
                    border: '2px solid white',
                    boxShadow: '0 0 0 1px #ccc',
                    flexShrink: 0
                  }}></div>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: type === '사용자 입력' ? 'bold' : 'normal',
                    color: type === '사용자 입력' ? '#d63384' : '#333'
                  }}>
                    {type}
                  </span>
                </div>
              ))}
          </div>
          
          {/* 통계 정보 */}
          <div style={{ 
            marginTop: '10px', 
            padding: '8px', 
            backgroundColor: '#f0f8ff', 
            borderRadius: '4px',
            fontSize: '11px',
            color: '#555'
          }}>
            💡 <strong>팁:</strong> 마커를 클릭하면 상세 정보를 확인할 수 있습니다.
          </div>
        </div>
      )}
    </div>
  );
};

export default KakaoMap; 