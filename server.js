const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 업로드 디렉토리 생성
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 한글 파일명 지원을 위해 원본 파일명 유지
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const timestamp = Date.now();
        const ext = path.extname(originalName);
        const name = path.basename(originalName, ext);
        cb(null, `${name}_${timestamp}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB 제한
    }
});

// 정적 파일 제공을 위해 public 디렉토리 생성
const publicDir = './public';
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

// 메인 페이지 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 파일 업로드 API
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '파일이 선택되지 않았습니다.' });
        }

        const fileInfo = {
            originalName: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
            filename: req.file.filename,
            size: req.file.size,
            uploadDate: new Date().toISOString()
        };

        res.json({
            message: '파일이 성공적으로 업로드되었습니다.',
            file: fileInfo
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: '파일 업로드 중 오류가 발생했습니다.' });
    }
});

// 파일 목록 조회 API
app.get('/api/files', (req, res) => {
    try {
        const files = fs.readdirSync(uploadDir);
        const fileList = files.map(filename => {
            const filePath = path.join(uploadDir, filename);
            const stats = fs.statSync(filePath);
            
            return {
                filename: filename,
                originalName: filename.replace(/_\d+(\.[^.]+)?$/, '$1'),
                size: stats.size,
                uploadDate: stats.mtime.toISOString(),
                downloadUrl: `/api/download/${encodeURIComponent(filename)}`
            };
        });

        res.json(fileList);
    } catch (error) {
        console.error('File list error:', error);
        res.status(500).json({ error: '파일 목록을 가져오는 중 오류가 발생했습니다.' });
    }
});

// 파일 다운로드 API
app.get('/api/download/:filename', (req, res) => {
    try {
        const filename = decodeURIComponent(req.params.filename);
        const filePath = path.join(uploadDir, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        }

        // 원본 파일명으로 다운로드
        const originalName = filename.replace(/_\d+(\.[^.]+)?$/, '$1');
        res.download(filePath, originalName);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: '파일 다운로드 중 오류가 발생했습니다.' });
    }
});

// 파일 삭제 API
app.delete('/api/files/:filename', (req, res) => {
    try {
        const filename = decodeURIComponent(req.params.filename);
        const filePath = path.join(uploadDir, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        }

        fs.unlinkSync(filePath);
        res.json({ message: '파일이 성공적으로 삭제되었습니다.' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: '파일 삭제 중 오류가 발생했습니다.' });
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`
🚀 test 파일 서버가 실행되었습니다!
📍 URL: http://localhost:${PORT}
📁 업로드 디렉토리: ${path.resolve(uploadDir)}
    `);
});

module.exports = app; 