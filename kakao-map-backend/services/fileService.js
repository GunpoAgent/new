const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

class FileService {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
  }

  // 엑셀 파일 분석 (컬럼 구조 및 데이터 미리보기)
  async analyzeExcelFile(filePath) {
    try {
      console.log('📊 엑셀 파일 분석 시작:', filePath);
      
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      
      if (sheetNames.length === 0) {
        throw new Error('엑셀 파일에 시트가 없습니다.');
      }

      // 첫 번째 시트 분석
      const firstSheet = workbook.Sheets[sheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      if (jsonData.length === 0) {
        throw new Error('엑셀 파일에 데이터가 없습니다.');
      }

      // 헤더 행 (첫 번째 행)
      const headers = jsonData[0] || [];
      
      // 데이터 행들 (헤더 제외)
      const dataRows = jsonData.slice(1).filter(row => 
        row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
      );

      // 컬럼 분석
      const columnAnalysis = this.analyzeColumns(headers, dataRows);
      
      // 데이터 미리보기 (최대 5행)
      const preview = dataRows.slice(0, 5).map(row => {
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header || `컬럼${index + 1}`] = row[index] || '';
        });
        return rowData;
      });

      // 자동 필드 감지
      const suggestedFields = this.detectFields(columnAnalysis);

      const analysis = {
        fileName: path.basename(filePath),
        sheetNames: sheetNames,
        totalRows: dataRows.length,
        totalColumns: headers.length,
        headers: headers.map((header, index) => header || `컬럼${index + 1}`),
        columnAnalysis: columnAnalysis,
        preview: preview,
        suggestedFields: suggestedFields
      };

      console.log('✅ 엑셀 파일 분석 완료:', {
        rows: analysis.totalRows,
        columns: analysis.totalColumns,
        suggestedAddressField: suggestedFields.address,
        suggestedBuildingTypeField: suggestedFields.buildingType
      });

      return analysis;
    } catch (error) {
      console.error('엑셀 파일 분석 오류:', error);
      throw new Error(`엑셀 파일 분석 실패: ${error.message}`);
    }
  }

  // 컬럼 분석 (데이터 타입 및 샘플 추출)
  analyzeColumns(headers, dataRows) {
    const analysis = {};
    
    headers.forEach((header, columnIndex) => {
      const columnName = header || `컬럼${columnIndex + 1}`;
      const columnData = dataRows.map(row => row[columnIndex]).filter(val => 
        val !== null && val !== undefined && val !== ''
      );
      
      // 샘플 데이터 (최대 3개)
      const samples = [...new Set(columnData)].slice(0, 3);
      
      // 데이터 타입 추측
      const dataType = this.guessDataType(columnData);
      
      // 주소 필드 가능성 검사
      const isAddressLike = this.isAddressField(columnName, samples);
      
      // 건물 타입 필드 가능성 검사
      const isBuildingTypeLike = this.isBuildingTypeField(columnName, samples);

      analysis[columnName] = {
        index: columnIndex,
        dataCount: columnData.length,
        uniqueCount: new Set(columnData).size,
        dataType: dataType,
        samples: samples,
        isAddressLike: isAddressLike,
        isBuildingTypeLike: isBuildingTypeLike
      };
    });
    
    return analysis;
  }

  // 데이터 타입 추측
  guessDataType(columnData) {
    if (columnData.length === 0) return 'empty';
    
    const sample = columnData.slice(0, 10);
    let numberCount = 0;
    let dateCount = 0;
    
    sample.forEach(value => {
      if (typeof value === 'number' || (!isNaN(Number(value)) && !isNaN(parseFloat(value)))) {
        numberCount++;
      }
      if (this.isDateLike(value)) {
        dateCount++;
      }
    });
    
    const numberRatio = numberCount / sample.length;
    const dateRatio = dateCount / sample.length;
    
    if (dateRatio > 0.7) return 'date';
    if (numberRatio > 0.7) return 'number';
    return 'text';
  }

  // 날짜 형식인지 확인
  isDateLike(value) {
    if (!value) return false;
    const dateStr = String(value);
    return /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(dateStr) || 
           /\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(dateStr);
  }

  // 주소 필드인지 확인
  isAddressField(columnName, samples) {
    const addressKeywords = ['주소', '도로명', '지번', 'address', 'addr', '위치', '소재지'];
    const columnNameLower = columnName.toLowerCase();
    
    // 컬럼명 검사
    const nameMatch = addressKeywords.some(keyword => 
      columnNameLower.includes(keyword.toLowerCase())
    );
    
    // 샘플 데이터 검사 (한국 주소 패턴)
    const addressPatterns = [
      /[시군구]/,
      /[동면읍리]/,
      /[가로길]/,
      /\d+[번지호]/,
      /[도시군구].*[동면읍리]/
    ];
    
    const sampleMatch = samples.some(sample => {
      if (!sample || typeof sample !== 'string') return false;
      return addressPatterns.some(pattern => pattern.test(sample));
    });
    
    return nameMatch || sampleMatch;
  }

  // 건물 타입 필드인지 확인
  isBuildingTypeField(columnName, samples) {
    const typeKeywords = ['타입', 'type', '종류', '구분', '분류', '건물', '업종', '시설'];
    const columnNameLower = columnName.toLowerCase();
    
    // 컬럼명 검사
    const nameMatch = typeKeywords.some(keyword => 
      columnNameLower.includes(keyword.toLowerCase())
    );
    
    // 샘플 데이터 검사 (일반적인 건물 타입들)
    const buildingTypes = [
      '아파트', '빌라', '연립', '단독', '오피스텔', '상가', '점포', '매장',
      '학교', '병원', '은행', '마트', '편의점', '카페', '식당', '호텔'
    ];
    
    const sampleMatch = samples.some(sample => {
      if (!sample || typeof sample !== 'string') return false;
      return buildingTypes.some(type => sample.includes(type));
    });
    
    return nameMatch || sampleMatch;
  }

  // 필드 자동 감지
  detectFields(columnAnalysis) {
    const columns = Object.entries(columnAnalysis);
    
    // 주소 필드 감지 (가장 가능성 높은 것)
    const addressCandidates = columns
      .filter(([name, analysis]) => analysis.isAddressLike)
      .sort((a, b) => b[1].dataCount - a[1].dataCount);
    
    // 건물 타입 필드 감지
    const buildingTypeCandidates = columns
      .filter(([name, analysis]) => analysis.isBuildingTypeLike)
      .sort((a, b) => b[1].uniqueCount - a[1].uniqueCount);
    
    return {
      address: addressCandidates.length > 0 ? addressCandidates[0][0] : null,
      buildingType: buildingTypeCandidates.length > 0 ? buildingTypeCandidates[0][0] : null,
      availableFields: columns.map(([name]) => name)
    };
  }

  // 엑셀 데이터 처리 및 변환
  async processExcelData(filePath, selectedFields) {
    try {
      console.log('🔄 엑셀 데이터 처리 시작:', {
        file: path.basename(filePath),
        fields: selectedFields
      });
      
      const workbook = XLSX.readFile(filePath);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);
      
      if (jsonData.length === 0) {
        throw new Error('처리할 데이터가 없습니다.');
      }

      const processedData = jsonData
        .filter(row => row[selectedFields.address]) // 주소가 있는 행만
        .map((row, index) => ({
          address: String(row[selectedFields.address]).trim(),
          building_type: selectedFields.buildingType ? 
            String(row[selectedFields.buildingType] || '').trim() : null,
          is_user_input: false,
          geocoding_status: 'pending',
          original_row: index + 2 // 엑셀 행 번호 (헤더 제외)
        }))
        .filter(item => item.address); // 빈 주소 제외

      console.log(`✅ 엑셀 데이터 처리 완료: ${processedData.length}개 주소 추출`);
      return processedData;
    } catch (error) {
      console.error('엑셀 데이터 처리 오류:', error);
      throw new Error(`엑셀 데이터 처리 실패: ${error.message}`);
    }
  }

  // 업로드된 파일 목록 조회
  async getUploadedFiles() {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        return [];
      }

      const files = fs.readdirSync(this.uploadDir);
      const fileInfos = files
        .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'))
        .map(file => {
          const filePath = path.join(this.uploadDir, file);
          const stats = fs.statSync(filePath);
          
          return {
            filename: file,
            originalName: file.split('-').slice(1).join('-'), // 타임스탬프 제거
            size: stats.size,
            uploadDate: stats.birthtime,
            modifiedDate: stats.mtime
          };
        })
        .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

      return fileInfos;
    } catch (error) {
      console.error('파일 목록 조회 오류:', error);
      throw new Error(`파일 목록 조회 실패: ${error.message}`);
    }
  }

  // 파일 존재 확인
  fileExists(filePath) {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      return false;
    }
  }

  // 파일 정리 (삭제)
  cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️  파일 삭제:', path.basename(filePath));
        return true;
      }
      return false;
    } catch (error) {
      console.error('파일 삭제 오류:', error);
      return false;
    }
  }

  // 파일 크기 포맷팅
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 임시 파일 정리 (오래된 파일들)
  async cleanupOldFiles(maxAgeHours = 24) {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        return { cleaned: 0, errors: [] };
      }

      const files = fs.readdirSync(this.uploadDir);
      const now = new Date();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // 밀리초 변환
      
      let cleanedCount = 0;
      const errors = [];

      for (const file of files) {
        try {
          const filePath = path.join(this.uploadDir, file);
          const stats = fs.statSync(filePath);
          const fileAge = now - stats.birthtime;
          
          if (fileAge > maxAge) {
            fs.unlinkSync(filePath);
            cleanedCount++;
            console.log(`🗑️  오래된 파일 삭제: ${file}`);
          }
        } catch (error) {
          errors.push({ file, error: error.message });
        }
      }

      return { cleaned: cleanedCount, errors };
    } catch (error) {
      console.error('파일 정리 오류:', error);
      throw new Error(`파일 정리 실패: ${error.message}`);
    }
  }
}

module.exports = new FileService(); 