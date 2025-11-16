# 🧪 Hướng dẫn Test Payment Integration

## 📋 Mục lục

1. [Chuẩn bị môi trường test](#chuẩn-bị-môi-trường-test)
2. [Test MoMo Payment](#test-momo-payment)
3. [Test VNPay Payment](#test-vnpay-payment)
4. [Test End-to-End Flow](#test-end-to-end-flow)
5. [Test Webhook](#test-webhook)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Chuẩn bị môi trường test

### Bước 1: Setup Environment Variables

Tạo/update file `services/events/.env`:

```env
# Database
DATABASE_URL="postgresql://admin:secret@localhost:5432/eventdb?schema=public"

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_jwt_key_256bits_minimum_length_required

# API URLs
API_BASE_URL=http://localhost:4000
FRONTEND_URL=http://localhost:4000

# MoMo Sandbox (Test credentials)
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz
MOMO_ENVIRONMENT=sandbox
MOMO_PARTNER_NAME=Event Ticketing Test
MOMO_STORE_ID=EventTicketingStore

# VNPay Sandbox (Cần đăng ký để lấy credentials)
VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_SECRET_KEY=your_vnpay_secret_key
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:4000/frontend/PurchaseUI/payment-return.html
```

### Bước 2: Khởi động Services

```bash
# Terminal 1: PostgreSQL & Redis
docker-compose up -d

# Terminal 2: Auth Service
npm run -w services/auth dev

# Terminal 3: Events Service
npm run -w services/events dev

# Terminal 4: Gateway
npm run -w services/gateway dev
```

### Bước 3: Setup Test Data

```bash
# Seed database (nếu chưa có)
npm run -w packages/db db:seed
npm run seed:auto
```

### Bước 4: Setup Webhook Testing (cho local dev)

Vì webhook cần accessible từ internet, dùng **ngrok** hoặc **webhook.site**:

#### Option 1: Dùng ngrok
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 4000

# Copy HTTPS URL (ví dụ: https://abc123.ngrok.io)
# Update API_BASE_URL trong .env:
API_BASE_URL=https://abc123.ngrok.io
```

#### Option 2: Dùng webhook.site
1. Truy cập: https://webhook.site
2. Copy unique URL
3. Update trong MoMo/VNPay dashboard:
   - IPN URL: `https://webhook.site/your-unique-id`
   - Return URL: `http://localhost:4000/frontend/PurchaseUI/payment-return.html`

---

## 💳 Test MoMo Payment

### Test 1: Tạo Payment Request

**Endpoint:** `POST /api/payments/create`

**Request:**
```bash
curl -X POST http://localhost:4000/api/payments/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "orderId": "YOUR_ORDER_ID",
    "provider": "momo",
    "returnUrl": "http://localhost:4000/frontend/PurchaseUI/payment-return.html?orderId=YOUR_ORDER_ID",
    "cancelUrl": "http://localhost:4000/frontend/PurchaseUI/thanhToan.html"
  }'
```

**Expected Response:**
```json
{
  "paymentId": "uuid",
  "paymentUrl": "https://test-payment.momo.vn/...",
  "qrCode": "base64...",
  "provider": "momo",
  "orderId": "uuid"
}
```

### Test 2: Test Payment Flow với MoMo Sandbox

1. **Tạo order trước:**
   ```bash
   # Tạo hold
   curl -X POST http://localhost:4000/api/holds \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "showId": "SHOW_ID",
       "seats": ["A1", "A2"],
       "ttlSec": 900
     }'
   
   # Checkout
   curl -X POST http://localhost:4000/api/orders/checkout \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "holdId": "HOLD_ID"
     }'
   ```

2. **Tạo payment:**
   ```bash
   curl -X POST http://localhost:4000/api/payments/create \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "orderId": "ORDER_ID_FROM_CHECKOUT",
       "provider": "momo"
     }'
   ```

3. **Mở `paymentUrl` trong browser**

4. **Thanh toán với MoMo Sandbox:**
   - Số điện thoại: `0901234567`
   - OTP: `123456`
   - Hoặc scan QR code

5. **Kiểm tra kết quả:**
   - Redirect về `payment-return.html`
   - Check payment status: `GET /api/payments/status/:orderId`

### Test 3: Test Webhook MoMo

**Simulate webhook (dùng Postman hoặc curl):**

```bash
curl -X POST http://localhost:4000/api/payments/webhooks/momo \
  -H "Content-Type: application/json" \
  -d '{
    "partnerCode": "MOMO",
    "orderId": "YOUR_ORDER_ID",
    "requestId": "MOMO1234567890",
    "amount": 100000,
    "orderInfo": "Thanh toan don hang",
    "orderType": "momo_wallet",
    "transId": 1234567890,
    "resultCode": 0,
    "message": "Success",
    "payType": "qr",
    "responseTime": 1234567890123,
    "extraData": "",
    "signature": "CALCULATED_SIGNATURE"
  }'
```

**Lưu ý:** Cần tính signature đúng. Xem code trong `momo.provider.js` để verify.

---

## 🏦 Test VNPay Payment

### Test 1: Tạo Payment Request

```bash
curl -X POST http://localhost:4000/api/payments/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "orderId": "YOUR_ORDER_ID",
    "provider": "vnpay"
  }'
```

### Test 2: Test với VNPay Sandbox

1. **Tạo order** (giống MoMo)

2. **Tạo payment với VNPay**

3. **Thanh toán với test card:**
   - Số thẻ: `9704198526191432198`
   - Tên chủ thẻ: `NGUYEN VAN A`
   - Ngày hết hạn: `07/15`
   - OTP: `123456`

### Test 3: Test Webhook VNPay

```bash
curl -X POST http://localhost:4000/api/payments/webhooks/vnpay \
  -H "Content-Type: application/json" \
  -d '{
    "vnp_TmnCode": "YOUR_TMN_CODE",
    "vnp_Amount": "10000000",
    "vnp_BankCode": "NCB",
    "vnp_TransactionNo": "12345678",
    "vnp_TransactionStatus": "00",
    "vnp_TxnRef": "YOUR_ORDER_ID",
    "vnp_ResponseCode": "00",
    "vnp_SecureHash": "CALCULATED_SIGNATURE"
  }'
```

---

## 🚀 Quick Test với Script Helper

Dự án có script helper để test nhanh payment flow:

### Test Full Flow (Tự động)

```bash
# Test toàn bộ flow: login → hold → checkout → payment
npm run test:payment full-flow user1@gmail.com Password@123 SHOW_ID "A1,A2" momo
```

### Test từng bước

```bash
# 1. Login
npm run test:payment login user1@gmail.com Password@123

# 2. Tạo hold (copy token từ bước 1)
npm run test:payment create-hold YOUR_TOKEN SHOW_ID "A1,A2"

# 3. Checkout (copy holdId từ bước 2)
npm run test:payment checkout YOUR_TOKEN HOLD_ID

# 4. Tạo payment (copy orderId từ bước 3)
npm run test:payment create-payment YOUR_TOKEN ORDER_ID momo

# 5. Check status
npm run test:payment check-status YOUR_TOKEN ORDER_ID
```

**Lưu ý:** Thay `SHOW_ID` bằng ID của show thực tế từ database.

---

## 🔄 Test End-to-End Flow

### Scenario 1: Successful Payment

1. **User chọn ghế** → Tạo hold
2. **User điền form** → Click "Next"
3. **Checkout** → Tạo order (status: `pending`)
4. **Create payment** → Redirect đến gateway
5. **Thanh toán thành công** → Webhook update order (status: `paid`)
6. **User xem vé** → Tickets available

**Test script:**
```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@gmail.com","password":"Password@123"}' \
  | jq -r '.token')

# 2. Tạo hold
HOLD_RESPONSE=$(curl -X POST http://localhost:4000/api/holds \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "showId": "SHOW_ID",
    "seats": ["A1"],
    "ttlSec": 900
  }')
HOLD_ID=$(echo $HOLD_RESPONSE | jq -r '.holdId')

# 3. Checkout
ORDER_RESPONSE=$(curl -X POST http://localhost:4000/api/orders/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"holdId\":\"$HOLD_ID\"}")
ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.order.id')

# 4. Create payment
PAYMENT_RESPONSE=$(curl -X POST http://localhost:4000/api/payments/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\":\"$ORDER_ID\",
    \"provider\":\"momo\"
  }")
PAYMENT_URL=$(echo $PAYMENT_RESPONSE | jq -r '.paymentUrl')

echo "Payment URL: $PAYMENT_URL"
echo "Mở URL này trong browser để thanh toán"
```

### Scenario 2: Payment Failed

1. **User thanh toán thất bại** → Webhook update order (status: `failed`)
2. **Hold được release** (nếu chưa hết hạn)
3. **User có thể thử lại**

### Scenario 3: Payment Timeout

1. **User không thanh toán trong 15 phút**
2. **Hold hết hạn**
3. **Order vẫn ở status `pending`**
4. **User cần tạo order mới**

---

## 🔍 Test Webhook

### Test với ngrok

1. **Start ngrok:**
   ```bash
   ngrok http 4000
   ```

2. **Update webhook URL trong payment gateway dashboard:**
   - MoMo: `https://your-ngrok-url.ngrok.io/api/payments/webhooks/momo`
   - VNPay: `https://your-ngrok-url.ngrok.io/api/payments/webhooks/vnpay`

3. **Test payment flow** → Webhook sẽ được gọi tự động

### Test với webhook.site

1. **Tạo webhook URL:** https://webhook.site
2. **Tạm thời update trong code** để log webhook data
3. **Copy webhook data** và test manually

### Manual Webhook Test

```bash
# MoMo webhook
curl -X POST http://localhost:4000/api/payments/webhooks/momo \
  -H "Content-Type: application/json" \
  -d @test-webhook-momo.json

# VNPay webhook
curl -X POST http://localhost:4000/api/payments/webhooks/vnpay \
  -H "Content-Type: application/json" \
  -d @test-webhook-vnpay.json
```

**Test files:**

`test-webhook-momo.json`:
```json
{
  "partnerCode": "MOMO",
  "orderId": "ORDER_ID",
  "requestId": "MOMO1234567890",
  "amount": 100000,
  "orderInfo": "Thanh toan don hang",
  "orderType": "momo_wallet",
  "transId": 1234567890,
  "resultCode": 0,
  "message": "Success",
  "payType": "qr",
  "responseTime": 1234567890123,
  "extraData": "",
  "signature": "CALCULATE_THIS"
}
```

---

## 🐛 Troubleshooting

### Lỗi: "Invalid signature"

**Nguyên nhân:**
- Signature không đúng format
- Secret key sai
- Thứ tự parameters sai

**Giải pháp:**
1. Check secret key trong `.env`
2. Verify signature format trong code
3. Log raw signature để debug

### Lỗi: "Payment URL not received"

**Nguyên nhân:**
- MoMo/VNPay API error
- Credentials sai
- Network issue

**Giải pháp:**
1. Check credentials
2. Check API response logs
3. Verify environment (sandbox vs production)

### Lỗi: "Webhook not received"

**Nguyên nhân:**
- Webhook URL không accessible từ internet
- Firewall block
- Payment gateway chưa config webhook URL

**Giải pháp:**
1. Dùng ngrok cho local dev
2. Check webhook URL trong gateway dashboard
3. Verify webhook endpoint đang chạy

### Lỗi: "Order status not updated"

**Nguyên nhân:**
- Webhook không được process
- Transaction failed
- Database issue

**Giải pháp:**
1. Check webhook logs
2. Verify database connection
3. Check transaction logs

### Debug Tips

1. **Enable verbose logging:**
   ```javascript
   // Trong payments.service.js
   console.log('[Payment] Request:', JSON.stringify(requestData, null, 2));
   console.log('[Payment] Response:', JSON.stringify(result, null, 2));
   ```

2. **Check database:**
   ```bash
   npm run -w packages/db db
   # Prisma Studio sẽ mở, check Payment và Order tables
   ```

3. **Check Redis (cho holds):**
   ```bash
   redis-cli
   KEYS hold:*
   GET hold:HOLD_ID
   ```

4. **Test API endpoints riêng lẻ:**
   ```bash
   # Test health
   curl http://localhost:4000/health
   
   # Test auth
   curl http://localhost:4000/api/auth/me \
     -H "Authorization: Bearer TOKEN"
   ```

---

## ✅ Checklist Test

### MoMo Payment
- [ ] Tạo payment request thành công
- [ ] Nhận được paymentUrl
- [ ] Redirect đến MoMo gateway
- [ ] Thanh toán thành công với sandbox
- [ ] Webhook được gọi và update order
- [ ] Payment status = `succeeded`
- [ ] Order status = `paid`
- [ ] Tickets available

### VNPay Payment
- [ ] Tạo payment request thành công
- [ ] Redirect đến VNPay gateway
- [ ] Thanh toán với test card
- [ ] Webhook update order
- [ ] Payment và order status đúng

### Error Handling
- [ ] Payment failed → Order status = `failed`
- [ ] Invalid signature → Error 400
- [ ] Order not found → Error 404
- [ ] Unauthorized → Error 401

### Edge Cases
- [ ] Payment timeout
- [ ] Duplicate payment request
- [ ] Webhook retry
- [ ] Network failure

---

## 📝 Test Results Template

```
Test Date: [DATE]
Tester: [NAME]

MoMo Payment:
- [ ] Create payment: PASS/FAIL
- [ ] Payment URL: [URL]
- [ ] Webhook received: YES/NO
- [ ] Order updated: YES/NO
- Notes: [NOTES]

VNPay Payment:
- [ ] Create payment: PASS/FAIL
- [ ] Payment URL: [URL]
- [ ] Webhook received: YES/NO
- [ ] Order updated: YES/NO
- Notes: [NOTES]

Issues Found:
1. [ISSUE]
2. [ISSUE]
```

---

*Cập nhật: $(date)*

