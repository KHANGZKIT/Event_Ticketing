# 💳 Hướng dẫn Setup Payment Integration

## 📋 Tổng quan

Payment Integration đã được triển khai với hỗ trợ 2 payment gateway:
- **MoMo** (MoMo Wallet)
- **VNPay** (VNPay Gateway)

## 🔧 Cấu hình Environment Variables

### 1. Services/Events/.env

Thêm các biến môi trường sau vào file `services/events/.env`:

```env
# Payment Configuration
API_BASE_URL=http://localhost:4000
FRONTEND_URL=http://localhost:4000

# MoMo Configuration
MOMO_PARTNER_CODE=your_momo_partner_code
MOMO_ACCESS_KEY=your_momo_access_key
MOMO_SECRET_KEY=your_momo_secret_key
MOMO_ENVIRONMENT=sandbox  # hoặc 'production'
MOMO_PARTNER_NAME=Event Ticketing  # Tên đối tác (optional)
MOMO_STORE_ID=EventTicketingStore  # Store ID (optional)

# VNPay Configuration
VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_SECRET_KEY=your_vnpay_secret_key
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html  # hoặc production URL
VNPAY_RETURN_URL=http://localhost:4000/frontend/PurchaseUI/payment-return.html
```

### 2. Services/Gateway/.env

Đảm bảo có các biến sau:

```env
PORT=4000
EVENT_SVC_URL=http://localhost:4102
AUTH_SVC_URL=http://localhost:4101
```

## 🔑 Lấy Credentials

### MoMo

1. Đăng ký tài khoản tại: https://developers.momo.vn/
2. Tạo app và lấy:
   - `partnerCode`
   - `accessKey`
   - `secretKey`
3. Chọn môi trường: `sandbox` (test) hoặc `production`

### VNPay

1. Đăng ký tài khoản tại: https://sandbox.vnpayment.vn/
2. Lấy thông tin:
   - `tmnCode` (Terminal Code)
   - `secretKey`
3. Cấu hình IPN URL: `http://your-domain/api/payments/webhooks/vnpay`

## 🧪 Test Payment Flow

> 📋 **Xem hướng dẫn test chi tiết**: [PAYMENT_TESTING.md](./PAYMENT_TESTING.md)

### 1. Test với MoMo Sandbox

MoMo sandbox cung cấp test accounts:
- Số điện thoại: `0901234567`
- OTP: `123456`

### 2. Test với VNPay Sandbox

VNPay sandbox có thể test với:
- Thẻ test: `9704198526191432198`
- Tên chủ thẻ: `NGUYEN VAN A`
- Ngày hết hạn: `07/15`
- OTP: `123456`

## 📝 Flow Thanh toán

### Backend Flow

1. **User chọn ghế** → Tạo Hold (15 phút)
2. **User điền form** → Click "Next"
3. **Checkout** → Tạo Order với status `pending`
4. **Create Payment** → Tạo Payment record với status `init`
5. **Redirect** → User được redirect đến payment gateway
6. **Payment Gateway** → User thanh toán
7. **Webhook** → Gateway gọi webhook để update payment status
8. **Update Order** → Order status chuyển thành `paid` nếu payment thành công

### Frontend Flow

1. User ở `PurchaseUI` → Điền form
2. Click "Next" → Gọi `/api/orders/checkout`
3. Nhận `orderId` → Gọi `/api/payments/create`
4. Nhận `paymentUrl` → Redirect đến gateway
5. Thanh toán xong → Gateway redirect về `payment-return.html`
6. `payment-return.html` → Poll `/api/payments/status/:orderId` để check status

## 🔗 API Endpoints

### Create Payment
```
POST /api/payments/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "uuid",
  "provider": "momo" | "vnpay",
  "returnUrl": "http://...",
  "cancelUrl": "http://..."
}

Response:
{
  "paymentId": "uuid",
  "paymentUrl": "https://payment-gateway.com/...",
  "qrCode": "base64..." (optional, MoMo only),
  "provider": "momo",
  "orderId": "uuid"
}
```

### Get Payment Status
```
GET /api/payments/status/:orderId
Authorization: Bearer <token>

Response:
{
  "orderId": "uuid",
  "orderStatus": "pending" | "paid" | "failed",
  "payment": {
    "id": "uuid",
    "provider": "momo",
    "status": "init" | "succeeded" | "failed",
    "amount": 1000000,
    "currency": "VND",
    "paidAt": "2024-01-01T00:00:00Z"
  }
}
```

### Webhook Handlers
```
POST /api/payments/webhooks/momo
POST /api/payments/webhooks/vnpay

(No authentication required, but signature is verified)
```

## 🐛 Troubleshooting

### Lỗi: "Invalid webhook signature"
- Kiểm tra `secretKey` đã đúng chưa
- Đảm bảo signature được generate đúng format
- Check logs để xem raw webhook data

### Lỗi: "Payment URL not received"
- Kiểm tra payment gateway credentials
- Check network connection
- Xem logs của payment provider

### Lỗi: "Order not found" khi webhook
- Đảm bảo `orderId` trong webhook match với order trong DB
- Check payment record đã được tạo chưa

### Payment không update status
- Kiểm tra webhook URL có accessible từ internet không (dùng ngrok cho local dev)
- Check webhook logs trong payment gateway dashboard
- Verify webhook signature

## 🔒 Security Notes

1. **Webhook Signature**: Luôn verify signature từ payment gateway
2. **HTTPS**: Sử dụng HTTPS trong production
3. **Secrets**: Không commit credentials vào git
4. **Idempotency**: Webhook handlers đã xử lý idempotency

## 📚 Tài liệu tham khảo

- [MoMo API Documentation](https://developers.momo.vn/)
- [VNPay API Documentation](https://sandbox.vnpayment.vn/apis/)
- [Payment Flow Diagram](./docs/payment-flow.png) (nếu có)

## ✅ Checklist Setup

- [ ] Đăng ký tài khoản MoMo/VNPay
- [ ] Lấy credentials và thêm vào `.env`
- [ ] Cấu hình webhook URL trong payment gateway dashboard
- [ ] Test payment flow với sandbox
- [ ] Verify webhook nhận được và xử lý đúng
- [ ] Test frontend flow end-to-end
- [ ] Setup production credentials (khi deploy)

---

*Cập nhật: $(date)*

