# Báo cáo Phân tích và Kế hoạch Phát triển (Câu 2)

## 1. Phân tích Dashboard (Cấp độ 2+)

Dựa trên yêu cầu chức năng cấp độ 2 và mã nguồn hiện tại, hệ thống Dashboard đã đáp ứng phần lớn các yêu cầu:

### Các chức năng đã có:
-   **Quản lý sản phẩm cơ bản (Product Management)**:
    -   Đã có trang **Sự kiện (Events)**: Xem danh sách, trạng thái, số suất diễn.
    -   Đã có trang **Giữ ghế (Holds)**: Giám sát thời gian thực các ghế đang được giữ.
-   **Quản lý Khách hàng (Customer Management)**:
    -   Đã có trang **Khách hàng (Users)**: Xem danh sách người dùng, email, số lượng đơn hàng.
-   **Quản lý Hóa đơn (Invoice Management)**:
    -   Đã có trang **Đơn hàng (Tickets/Orders)**: Xem danh sách vé/đơn hàng, trạng thái thanh toán, check-in.
-   **Biểu đồ hóa (Charting)**:
    -   Sử dụng **Chart.js** để hiển thị:
        -   Biểu đồ đường: Doanh thu theo thời gian.
        -   Biểu đồ cột: Xu hướng bán vé.
        -   Biểu đồ tròn (Doughnut): Tỷ lệ trạng thái thanh toán.
    -   Các thẻ KPI tổng quan (Doanh thu, Số vé, Đơn hàng).

### Các chức năng còn thiếu (Gap Analysis):
-   **Quản lý Tin tức (News Management)**: Hiện tại chưa có module để quản lý bài viết, tin tức hoặc thông báo trên hệ thống. Đây là yêu cầu của Cấp độ 2 chưa được đáp ứng.
-   **Quản lý Phản hồi/Liên hệ**: Chưa có chức năng xem và phản hồi ý kiến khách hàng (Level 1/2).

### Đánh giá chung:
Dashboard hiện tại đạt khoảng **80% yêu cầu Cấp độ 2**. Cần bổ sung thêm module "Quản lý Tin tức" để hoàn thiện.

---
## 2. Mô tả Kỹ thuật Tích hợp Dịch vụ

Hệ thống được xây dựng theo kiến trúc Microservices, tích hợp các thành phần như sau:

### Kiến trúc tổng quan:
1.  **API Gateway (Port 4000)**:
    -   Đóng vai trò là điểm vào duy nhất (Single Entry Point).
    -   Sử dụng `http-proxy` để forward request đến các service con (Auth, Events).
    -   Tích hợp **Socket.IO** server để đẩy thông báo thời gian thực (Real-time) xuống Client (Dashboard/Browser).

2.  **Auth Service (Port 4101)**:
    -   Quản lý đăng ký, đăng nhập, cấp phát JWT Token.
    -   Gateway sẽ xác thực Token (Auth Guard) trước khi cho phép truy cập vào các API bảo mật.

3.  **Events Service (Port 4102)**:
    -   Chứa logic nghiệp vụ chính: Quản lý sự kiện, vé, đơn hàng.
    -   **Dashboard Module**: Cung cấp các API tổng hợp dữ liệu (Aggregation) cho Dashboard.
    -   **Redis Integration**: Sử dụng Redis để quản lý trạng thái "Giữ ghế" (Hold) với TTL (Time-To-Live), đảm bảo hiệu năng cao và tránh xung đột (Race condition).

### Cơ chế giao tiếp:
-   **Client -> Gateway**: REST API (HTTP/JSON).
-   **Gateway -> Services**: HTTP Forwarding.
-   **Service -> Gateway (Internal)**: Events Service gọi API nội bộ của Gateway để kích hoạt sự kiện Socket.IO (ví dụ: khi có ghế mới được giữ/hủy).
-   **Gateway -> Client (Real-time)**: Socket.IO emit sự kiện `seat-updated` để cập nhật giao diện Dashboard và sơ đồ ghế ngay lập tức.

---

## 3. Kế hoạch Kiểm thử Hiệu năng (Performance Test Plan)

### Mục tiêu:
Đảm bảo hệ thống hoạt động ổn định dưới tải cao, đặc biệt là tính năng "Giữ ghế" và "Dashboard Real-time".

### Công cụ:
-   **JMeter** hoặc **K6**: Để giả lập lượng người dùng truy cập đồng thời.
-   **Postman Monitor**: Để kiểm tra tính sẵn sàng của API.

### Kịch bản kiểm thử (Test Scenarios):

#### Kịch bản 1: Đặt vé cao điểm (Browser Side)
-   **Mô tả**: 500 người dùng cùng lúc truy cập xem sơ đồ ghế và thực hiện giữ ghế (Create Hold).
-   **Mục tiêu**:
    -   Response time của API `POST /holds` < 200ms.
    -   Không xảy ra lỗi Overselling (bán quá số ghế).
    -   Redis chịu tải tốt, không bị timeout.

#### Kịch bản 2: Dashboard Real-time Monitoring
-   **Mô tả**: 1 Admin đang mở Dashboard theo dõi, trong khi 1000 request giữ ghế được gửi đến hệ thống.
-   **Mục tiêu**:
    -   Dashboard cập nhật trạng thái ghế (Socket.IO) với độ trễ < 1s.
    -   API `GET /dashboard/active-holds` phản hồi < 500ms dù lượng key trong Redis lớn.

### Các chỉ số đánh giá (Metrics):
1.  **Throughput (RPS)**: Số request xử lý thành công trên giây.
2.  **Response Time (Latency)**: Thời gian phản hồi trung bình và P95.
3.  **Error Rate**: Tỷ lệ lỗi (5xx, 4xx không mong muốn) phải < 1%.
4.  **Resource Usage**: CPU/RAM của Gateway và Events Service không vượt quá 80%.

---

## Kết luận & Đề xuất
-   **Nên làm ngay**: Bổ sung module "Quản lý Tin tức" (CRUD đơn giản) để đạt trọn vẹn điểm Cấp độ 2.
-   **Cải thiện**: Tối ưu query cho Dashboard (hiện tại đang dùng nhiều `count` và `aggregate` trực tiếp vào DB, có thể cân nhắc caching kết quả thống kê).
