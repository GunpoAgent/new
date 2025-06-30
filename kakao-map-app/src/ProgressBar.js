import React from 'react';

const ProgressBar = ({ progress, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 1000,
      minWidth: '400px',
      textAlign: 'center',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>
        🗺️ 주소 좌표 변환 중...
      </h3>
      
      {/* 진행률 바 */}
      <div style={{
        width: '100%',
        height: '20px',
        backgroundColor: '#f0f0f0',
        borderRadius: '10px',
        overflow: 'hidden',
        marginBottom: '15px',
        border: '1px solid #ddd'
      }}>
        <div style={{
          width: `${progress.percentage}%`,
          height: '100%',
          backgroundColor: '#4ECDC4',
          transition: 'width 0.3s ease',
          borderRadius: '10px 0 0 10px'
        }} />
      </div>

      {/* 진행률 텍스트 */}
      <div style={{ marginBottom: '15px' }}>
        <strong style={{ fontSize: '18px', color: '#333' }}>
          {progress.percentage}%
        </strong>
        <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
          {progress.current} / {progress.total} 완료
        </div>
      </div>

      {/* 현재 처리 중인 주소 */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '10px',
        borderRadius: '6px',
        border: '1px solid #e9ecef',
        fontSize: '12px',
        color: '#666',
        wordBreak: 'break-all'
      }}>
        <strong>현재 처리:</strong><br/>
        {progress.currentAddress}
      </div>

      {/* 로딩 애니메이션 */}
      <div style={{ marginTop: '20px' }}>
        <div style={{
          display: 'inline-block',
          width: '30px',
          height: '30px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #4ECDC4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default ProgressBar; 