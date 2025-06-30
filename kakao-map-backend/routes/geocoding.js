const express = require('express');
const router = express.Router();
const geocodingService = require('../services/geocodingService');

// 단일 주소 지오코딩
router.post('/single', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({
        error: '주소가 제공되지 않았습니다.',
        success: false
      });
    }

    const result = await geocodingService.geocodeAddress(address);
    
    res.json({
      success: true,
      address: address,
      result: result
    });
  } catch (error) {
    console.error('단일 지오코딩 오류:', error);
    res.status(500).json({
      error: '지오코딩 처리 중 오류가 발생했습니다.',
      success: false,
      message: error.message
    });
  }
});

// 배치 지오코딩
router.post('/batch', async (req, res) => {
  try {
    const { addresses } = req.body;
    
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({
        error: '주소 배열이 제공되지 않았거나 비어있습니다.',
        success: false
      });
    }

    if (addresses.length > 1000) {
      return res.status(400).json({
        error: '한 번에 처리할 수 있는 주소는 최대 1000개입니다.',
        success: false
      });
    }

    const results = await geocodingService.batchGeocode(addresses);
    
    res.json({
      success: true,
      total: addresses.length,
      processed: results.length,
      results: results
    });
  } catch (error) {
    console.error('배치 지오코딩 오류:', error);
    res.status(500).json({
      error: '배치 지오코딩 처리 중 오류가 발생했습니다.',
      success: false,
      message: error.message
    });
  }
});

// 키워드 검색
router.get('/search', async (req, res) => {
  try {
    const { 
      query, 
      x, 
      y, 
      radius = 10000, 
      page = 1, 
      size = 15 
    } = req.query;
    
    if (!query) {
      return res.status(400).json({
        error: '검색 키워드가 제공되지 않았습니다.',
        success: false
      });
    }

    const result = await geocodingService.searchKeyword({
      query,
      x,
      y,
      radius,
      page,
      size
    });
    
    res.json({
      success: true,
      query: query,
      ...result
    });
  } catch (error) {
    console.error('키워드 검색 오류:', error);
    res.status(500).json({
      error: '키워드 검색 처리 중 오류가 발생했습니다.',
      success: false,
      message: error.message
    });
  }
});

module.exports = router; 