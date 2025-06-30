const express = require('express');
const router = express.Router();
const addressService = require('../services/addressService');

// 주소 통계 정보 (이 라우트를 먼저 정의)
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await addressService.getAddressStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('주소 통계 조회 오류:', error);
    res.status(500).json({
      error: '주소 통계 조회 중 오류가 발생했습니다.',
      success: false,
      message: error.message
    });
  }
});

// 건물 타입별 주소 조회 (특정 경로를 먼저 정의)
router.get('/by-building-type/:buildingType', async (req, res) => {
  try {
    const { buildingType } = req.params;
    const { page = 1, limit = 100 } = req.query;

    const result = await addressService.getAddressesByBuildingType(
      buildingType,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      building_type: buildingType,
      ...result
    });
  } catch (error) {
    console.error('건물 타입별 주소 조회 오류:', error);
    res.status(500).json({
      error: '건물 타입별 주소 조회 중 오류가 발생했습니다.',
      success: false,
      message: error.message
    });
  }
});

// 모든 주소 조회 (페이징 지원)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      building_type,
      is_user_input,
      geocoding_status
    } = req.query;

    const result = await addressService.getAddresses({
      page: parseInt(page),
      limit: parseInt(limit),
      building_type,
      is_user_input: is_user_input === 'true',
      geocoding_status
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('주소 조회 오류:', error);
    res.status(500).json({
      error: '주소 조회 중 오류가 발생했습니다.',
      success: false,
      message: error.message
    });
  }
});

// 특정 주소 조회 (이 라우트를 마지막에 정의)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const address = await addressService.getAddressById(id);

    if (!address) {
      return res.status(404).json({
        error: '주소를 찾을 수 없습니다.',
        success: false
      });
    }

    res.json({
      success: true,
      address
    });
  } catch (error) {
    console.error('주소 조회 오류:', error);
    res.status(500).json({
      error: '주소 조회 중 오류가 발생했습니다.',
      success: false,
      message: error.message
    });
  }
});

// 새 주소 추가
router.post('/', async (req, res) => {
  try {
    const addressData = req.body;
    const newAddress = await addressService.createAddress(addressData);

    res.status(201).json({
      success: true,
      address: newAddress
    });
  } catch (error) {
    console.error('주소 추가 오류:', error);
    res.status(500).json({
      error: '주소 추가 중 오류가 발생했습니다.',
      success: false,
      message: error.message
    });
  }
});

// 주소 업데이트
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedAddress = await addressService.updateAddress(id, updateData);
    
    if (!updatedAddress) {
      return res.status(404).json({
        error: '주소를 찾을 수 없습니다.',
        success: false
      });
    }

    res.json({
      success: true,
      address: updatedAddress
    });
  } catch (error) {
    console.error('주소 업데이트 오류:', error);
    res.status(500).json({
      error: '주소 업데이트 중 오류가 발생했습니다.',
      success: false,
      message: error.message
    });
  }
});

// 주소 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await addressService.deleteAddress(id);
    
    if (!deleted) {
      return res.status(404).json({
        error: '주소를 찾을 수 없습니다.',
        success: false
      });
    }

    res.json({
      success: true,
      message: '주소가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('주소 삭제 오류:', error);
    res.status(500).json({
      error: '주소 삭제 중 오류가 발생했습니다.',
      success: false,
      message: error.message
    });
  }
});

module.exports = router; 