# 🎯 Bước tiếp theo sau khi tạo Payment

Bạn đã tạo payment thành công! Đây là các bước tiếp theo:

## ✅ Thông tin Payment của bạn

```json
{
    "paymentId": "1c4119b1-5859-4140-80b0-cd7f1b123385",
    "paymentUrl": "https://test-payment.momo.vn/v2/gateway/pay?t=...",
    "provider": "momo",
    "orderId": "7c8b8a6b-8db4-4040-861b-319c9b7737a1"
}
```

## 📝 Các bước tiếp theo

### Bước 1: Mở Payment URL

**Copy và mở URL này trong browser:**
```
https://test-payment.momo.vn/v2/gateway/pay?t=TU9NT3w3YzhiOGE2Yi04ZGI0LTQwNDAtODYxYi0zMTljOWI3NzM3YTE&s=94e8f4f54cb5606c775de7c2193ccdea11e1c093e4e608f5339f46d13eb9d032
```

Hoặc click trực tiếp vào `paymentUrl` trong response.

### Bước 2: Thanh toán với MoMo Sandbox (KHÔNG MẤT TIỀN THẬT)

⚠️ **QUAN TRỌNG:** Đây là môi trường **SANDBOX/TEST**, bạn sẽ **KHÔNG mất tiền thật** khi test!

Khi mở URL, bạn sẽ thấy trang thanh toán MoMo với QR code. Có 2 cách để test:

**Option 1: Scan QR Code với MoMo App (Test Mode)**

1. **Mở app MoMo trên điện thoại** (nếu chưa có thì tải về)
2. **Đảm bảo app ở chế độ Test/Sandbox:**
   - Vào Settings → Developer Mode (nếu có)
   - Hoặc dùng test account
3. **Scan QR code** trên màn hình
4. **Xác nhận thanh toán** - Sẽ không trừ tiền thật!

**Option 2: Thanh toán bằng số điện thoại (Test)**

Nếu có option nhập số điện thoại:
- Số điện thoại test: `0901234567`
- OTP test: `123456`
- Hoặc bất kỳ số nào (trong sandbox mode)

**Option 3: Simulate Payment (Không cần quét thật)**

Nếu bạn chỉ muốn test flow mà không cần quét QR thật, có thể:

1. **Bỏ qua bước thanh toán** và test webhook manually
2. **Hoặc đợi payment timeout** để test flow failed
3. **Hoặc dùng MoMo test account** (nếu có)

**Lưu ý về Sandbox:**
- ✅ Không mất tiền thật
- ✅ Có thể test nhiều lần
- ✅ Dùng để phát triển và test
- ⚠️ Chỉ hoạt động với test credentials
- ⚠️ Không dùng được với tài khoản MoMo thật

### Bước 3: Kiểm tra Payment Status

Sau khi thanh toán (hoặc hủy), bạn có thể kiểm tra status:

**Cách 1: Dùng Script Helper**
```bash
npm run test:payment check-status YOUR_TOKEN 7c8b8a6b-8db4-4040-861b-319c9b7737a1
```

**Cách 2: Dùng cURL**
```bash
curl -X GET http://localhost:4000/api/payments/status/7c8b8a6b-8db4-4040-861b-319c9b7737a1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Cách 3: Mở Payment Return Page**
```
http://localhost:4000/frontend/PurchaseUI/payment-return.html?orderId=7c8b8a6b-8db4-4040-861b-319c9b7737a1
```

### Bước 4: Xem kết quả

Sau khi thanh toán thành công, bạn sẽ thấy:

**Payment Status:**
- `status: "succeeded"` ✅
- `paidAt: "2024-01-01T00:00:00Z"`

**Order Status:**
- `orderStatus: "paid"` ✅

**Tickets:**
- Tickets đã được tạo và sẵn sàng sử dụng

## 🔍 Kiểm tra Webhook

Nếu thanh toán thành công, MoMo sẽ gọi webhook tự động. Kiểm tra:

1. **Xem logs của Events Service:**
   ```bash
   # Terminal chạy events service
   # Sẽ thấy log: [Payment] Webhook received from MoMo
   ```

2. **Kiểm tra Database:**
   ```bash
   npm run -w packages/db db
   # Prisma Studio sẽ mở
   # Check bảng Payment và Order
   ```

3. **Kiểm tra Payment record:**
   - Payment status = `succeeded`
   - Order status = `paid`
   - `paidAt` có giá trị

## 🐛 Nếu gặp vấn đề

### Webhook không được gọi

**Nguyên nhân:** Webhook URL không accessible từ internet (local dev)

**Giải pháp:**
1. Dùng **ngrok** để expose local server:
   ```bash
   ngrok http 4000
   ```
2. Copy HTTPS URL (ví dụ: `https://abc123.ngrok.io`)
3. Update trong MoMo dashboard:
   - IPN URL: `https://abc123.ngrok.io/api/payments/webhooks/momo`
4. Test lại payment

### Payment Status vẫn là "init"

**Nguyên nhân:** Webhook chưa được xử lý

**Giải pháp:**
1. Check webhook logs
2. Verify webhook signature
3. Manually trigger webhook (xem bên dưới)

### Test Webhook Manually

Nếu webhook không được gọi tự động, bạn có thể test manually:

```bash
# Lấy thông tin từ payment response
# Sau đó gọi webhook với data tương ứng

curl -X POST http://localhost:4000/api/payments/webhooks/momo \
  -H "Content-Type: application/json" \
  -d '{
    "partnerCode": "MOMO",
    "orderId": "7c8b8a6b-8db4-4040-861b-319c9b7737a1",
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
    "signature": "CALCULATE_SIGNATURE_HERE"
  }'
```

**Lưu ý:** Cần tính signature đúng. Xem code trong `momo.provider.js` để verify.

## ✅ Checklist

- [ ] Đã mở paymentUrl trong browser
- [ ] Đã thanh toán với sandbox credentials
- [ ] Đã kiểm tra payment status
- [ ] Webhook đã được gọi (check logs)
- [ ] Payment status = `succeeded`
- [ ] Order status = `paid`
- [ ] Tickets đã được tạo

## 🎉 Hoàn thành!

Nếu tất cả đều OK, bạn đã hoàn thành payment flow thành công! 

**Next steps:**
- Test với VNPay
- Test với frontend flow
- Deploy lên production (với production credentials)

---

## ⚠️ QUAN TRỌNG: Sandbox = Không mất tiền thật!

**Bạn đang test trong môi trường SANDBOX, nên sẽ KHÔNG mất tiền thật khi quét QR hoặc thanh toán!**

Xem chi tiết: [PAYMENT_SANDBOX_GUIDE.md](./PAYMENT_SANDBOX_GUIDE.md)

---

*Cần giúp đỡ? Xem [PAYMENT_TESTING.md](./PAYMENT_TESTING.md) để biết thêm chi tiết.*

