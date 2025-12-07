# Hướng dẫn Test API với Postman

Tài liệu này hướng dẫn cách sử dụng bộ test case Postman để kiểm thử các tính năng: Tạo sự kiện, Tạo Hold, và Release Hold.

## 1. Chuẩn bị

1.  **Cài đặt Postman**: Tải và cài đặt Postman từ [postman.com](https://www.postman.com/downloads/).
2.  **Import Collection**:
    *   Mở Postman.
    *   Chọn **Import** (nút Import ở góc trên bên trái).
    *   Kéo thả file `postman_collection.json` vào hoặc chọn file từ máy tính.

## 2. Cấu hình Môi trường (Environment)

Để chạy các test case, bạn cần thiết lập biến môi trường `baseUrl` trong Postman.

1.  Tạo một Environment mới (ví dụ: "Event Ticketing Local").
2.  Thêm biến `baseUrl` với giá trị là URL của Gateway service (mặc định là `http://localhost:4000`).
3.  Chọn Environment vừa tạo để sử dụng.

*Lưu ý: Các biến `token`, `eventId`, `showId`, `holdId` sẽ được tự động tạo và cập nhật bởi các script trong test case.*

## 3. Danh sách Test Case

Bộ collection bao gồm 5 request được sắp xếp theo trình tự logic:

### 1. Login (Get Token)
*   **Mục đích**: Đăng nhập để lấy Access Token.
*   **Method**: `POST`
*   **URL**: `/api/auth/login`
*   **Body**:
    ```json
    {
        "email": "admin@example.com",
        "password": "password"
    }
    ```
*   **Kết quả**: Token sẽ được lưu vào biến môi trường `token`.

### 2. Create Event (Tạo sự kiện)
*   **Mục đích**: Tạo một sự kiện mới.
*   **Method**: `POST`
*   **URL**: `/api/events`
*   **Auth**: Bearer Token (tự động lấy từ bước 1).
*   **Body**:
    ```json
    {
        "name": "Postman Test Event",
        "city": "Hanoi",
        "startsAt": "2025-12-01T20:00:00Z"
    }
    ```
*   **Kết quả**: ID sự kiện sẽ được lưu vào biến `eventId`.

### 3. Create Show (Tạo suất diễn)
*   **Mục đích**: Tạo một suất diễn cho sự kiện vừa tạo (cần thiết để tạo Hold).
*   **Method**: `POST`
*   **URL**: `/api/shows`
*   **Auth**: Bearer Token.
*   **Body**: Sử dụng `{{eventId}}` từ bước trước và `seatMapId` là `map_cinema_standard`.
    ```json
    {
        "eventId": "{{eventId}}",
        "startsAt": "2025-12-01T20:00:00Z",
        "venue": "My Hall",
        "seatMapId": "map_cinema_standard"
    }
    ```
*   **Kết quả**: ID suất diễn sẽ được lưu vào biến `showId`.

### 4. Create Hold (Giữ ghế)
*   **Mục đích**: Giữ chỗ (Hold) cho các ghế cụ thể.
*   **Method**: `POST`
*   **URL**: `/api/holds`
*   **Auth**: Bearer Token.
*   **Body**:
    ```json
    {
        "showId": "{{showId}}",
        "seats": ["A1", "A2"]
    }
    ```
*   **Kết quả**: ID của Hold sẽ được lưu vào biến `holdId`.

### 5. Release Hold (Hủy giữ ghế)
*   **Mục đích**: Hủy bỏ lệnh giữ chỗ vừa tạo.
*   **Method**: `DELETE`
*   **URL**: `/api/holds/{{holdId}}`
*   **Auth**: Bearer Token.
*   **Kết quả**: Trả về status 200 OK.

## 4. Cách chạy Test

Bạn có thể chạy từng request theo thứ tự từ 1 đến 5, hoặc chạy toàn bộ collection bằng tính năng **Collection Runner**:

1.  Nhấn vào tên collection "Event Ticketing API".
2.  Chọn nút **Run**.
3.  Đảm bảo tất cả request được chọn.
4.  Nhấn **Run Event Ticketing API**.
5.  Kiểm tra kết quả (tất cả test case nên hiển thị màu xanh lá cây "Pass").
