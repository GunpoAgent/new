const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const fileService = require('../services/fileService');
const addressService = require('../services/addressService');

// Multer 설정 (파일 업로드)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.xlsx', '.xls'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('엑셀 파일만 업로드 가능합니다. (.xlsx, .xls)'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024 // 10MB
  }
});

// 엑셀 파일 업로드 및 분석
router.post('/excel', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: '파일이 업로드되지 않았습니다.',
        success: false
      });
    }

    console.log('📁 파일 업로드 완료:', req.file.filename);

    // 엑셀 파일 분석
    const analysisResult = await fileService.analyzeExcelFile(req.file.path);
    
    res.json({
      success: true,
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        uploadPath: req.file.path
      },
      analysis: analysisResult
    });
  } catch (error) {
    console.error('파일 업로드 오류:', error);
    
    // 업로드된 파일 정리
    if (req.file) {
      fileService.cleanupFile(req.file.path);
    }
    
    res.status(500).json({
      error: '파일 업로드 및 분석 중 오류가 발생했습니다.',
      success: false,
      message: error.message
    });
  }
});

// 엑셀 데이터 처리 및 데이터베이스 저장
router.post('/process', async (req, res) => {
  try {
    const { 
      filename,
      selectedFields,
      replaceExisting = false 
    } = req.body;
    
    if (!filename || !selectedFields) {
      return res.status(400).json({
        error: '파일명과 선택된 필드 정보가 필요합니다.',
        success: false
      });
    }

    const filePath = path.join(process.env.UPLOAD_DIR || 'uploads', filename);
    
    // 파일 존재 확인
    if (!fileService.fileExists(filePath)) {
      return res.status(404).json({
        error: '업로드된 파일을 찾을 수 없습니다.',
        success: false
      });
    }

    // 엑셀 데이터 읽기 및 변환
    const excelData = await fileService.processExcelData(filePath, selectedFields);
    
    // 기존 데이터 처리
    if (replaceExisting) {
      await addressService.clearAllAddresses();
      console.log('🗑️  기존 주소 데이터 모두 삭제');
    }

    // 새 데이터 저장
    const saveResult = await addressService.bulkCreateAddresses(excelData);
    
    // 임시 파일 정리
    fileService.cleanupFile(filePath);
    
    res.json({
      success: true,
      message: '데이터 처리가 완료되었습니다.',
      result: {
        totalProcessed: excelData.length,
        savedToDatabase: saveResult.created,
        skipped: saveResult.skipped,
        errors: saveResult.errors
      }
    });
  } catch (error) {
    console.error('데이터 처리 오류:', error);
    res.status(500).json({
      error: '데이터 처리 중 오류가 발생했습니다.',
      success: false,
      message: error.message
    });
  }
});

// 업로드된 파일 목록 조회
router.get('/files', async (req, res) => {
  try {
    const files = await fileService.getUploadedFiles();
    
    res.json({
      success: true,
      files: files
    });
  } catch (error) {
    console.error('파일 목록 조회 오류:', error);
    res.status(500).json({
      error: '파일 목록 조회 중 오류가 발생했습니다.',
      success: false,
      message: error.message
    });
  }
});

// 특정 파일 삭제
router.delete('/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.env.UPLOAD_DIR || 'uploads', filename);
    
    const deleted = fileService.cleanupFile(filePath);
    
    if (deleted) {
      res.json({
        success: true,
        message: '파일이 성공적으로 삭제되었습니다.'
      });
    } else {
      res.status(404).json({
        error: '파일을 찾을 수 없습니다.',
        success: false
      });
    }
  } catch (error) {
    console.error('파일 삭제 오류:', error);
    res.status(500).json({
      error: '파일 삭제 중 오류가 발생했습니다.',
      success: false,
      message: error.message
    });
  }
});

// 에러 핸들러
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: '파일 크기가 너무 큽니다. 최대 10MB까지 업로드 가능합니다.',
        success: false
      });
    }
  }
  
  res.status(500).json({
    error: error.message || '파일 업로드 중 오류가 발생했습니다.',
    success: false
  });
});

module.exports = router; 