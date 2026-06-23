import React, { useState, useEffect } from 'react';

// Đổi tên prop thành timeLimit để đồng bộ 100% với App.jsx và QuestionBank.js
function Timer({ timeLimit = 900, onTimeUp }) {
  // Khởi tạo số giây lấy trực tiếp từ kho đề bài đang chọn
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  // Tự động cập nhật lại thời gian mới mỗi khi người dùng chuyển câu hỏi/đổi đề
  useEffect(() => {
    setTimeLeft(timeLimit);
  }, [timeLimit]);

  // Vòng lặp đếm ngược thời gian mỗi 1 giây
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLimit]);

  // Kiểm tra an toàn (Safe Check): Chỉ gọi onTimeUp nếu hàm này có tồn tại, tránh sập web
  useEffect(() => {
    if (timeLeft === 0 && typeof onTimeUp === 'function') {
      onTimeUp();
    }
  }, [timeLeft, onTimeUp]);

  // Hàm chuyển đổi số giây thành định dạng mm:ss để hiển thị
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ 
      fontSize: '16px', 
      fontWeight: 'bold', 
      backgroundColor: timeLeft < 120 ? '#ef4444' : '#10b981', // Màu đỏ khi dưới 2 phút, còn lại màu xanh lá chuẩn xịn
      color: '#fff', // Thêm màu chữ trắng để hiển thị rõ ràng trên nền màu
      padding: '6px 14px', 
      borderRadius: '6px',
      display: 'inline-block',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      ⏱️ Thời gian còn lại: {formatTime(timeLeft)}
    </div>
  );
}

export default Timer;