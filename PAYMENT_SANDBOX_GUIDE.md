# 🧪 Hướng dẫn Test Payment Sandbox (Không mất tiền)

## ⚠️ Quan trọng: Sandbox = Test Mode

**Môi trường Sandbox/Test của MoMo và VNPay là hoàn toàn MIỄN PHÍ và KHÔNG mất tiền thật!**

Bạn có thể test bao nhiêu lần cũng được mà không lo mất tiền.

---

## 💳 Test với MoMo Sandbox

### Cách 1: Scan QR Code (Khuyến nghị)

1. **Mở payment URL** trong browser
2. **Bạn sẽ thấy QR code** (như hình bạn đã gửi)
3. **Mở app MoMo trên điện thoại**
4. **Scan QR code**
5. **Xác nhận thanh toán** - Sẽ KHÔNG trừ tiền thật!

**Lưu ý:**
- Nếu app MoMo không nhận diện được QR (do sandbox), xem Cách 2
- Sandbox QR code có thể không hoạt động với app MoMo production

### Cách 2: Thanh toán bằng số điện thoại

Nếu có option nhập số điện thoại:

1. **Nhập số điện thoại test:** `0901234567`
2. **Nhập OTP test:** `123456`
3. **Xác nhận** - Sẽ không trừ tiền thật!

### Cách 3: Test Webhook Manually (Không cần quét)

Nếu bạn chỉ muốn test flow backend mà không cần quét QR:

1. **Bỏ qua bước thanh toán** trên browser
2. **Test webhook manually** để simulate payment thành công

```bash
# Simulate payment thành công
curl -X POST http://localhost:4000/api/payments/webhooks/momo \
  -H "Content-Type: application/json" \
  -d '{
    "partnerCode": "MOMO",
    "orderId": "7c8b8a6b-8db4-4040-861b-319c9b7737a1",
    "requestId": "MOMO'$(date +%s)'",
    "amount": 100000,
    "orderInfo": "Thanh toan don hang",
    "orderType": "momo_wallet",
    "transId": '$(date +%s)',
    "resultCode": 0,
    "message": "Success",
    "payType": "qr",
    "responseTime": '$(date +%s)000',
    "extraData": "",
    "signature": "NEED_TO_CALCULATE"
  }'
```

**Lưu ý:** Cần tính signature đúng. Xem code trong `momo.provider.js`.

### Cách 4: Dùng MoMo Test Account

Nếu bạn có MoMo test account từ developer dashboard:

1. Đăng nhập với test account
2. Scan QR code
3. Thanh toán sẽ được simulate

---

## 🏦 Test với VNPay Sandbox

### Test Card Information

Khi test với VNPay sandbox, dùng thông tin thẻ test:

- **Số thẻ:** `9704198526191432198`
- **Tên chủ thẻ:** `NGUYEN VAN A`
- **Ngày hết hạn:** `07/15` (hoặc bất kỳ ngày nào trong tương lai)
- **CVV:** `123` (hoặc bất kỳ)
- **OTP:** `123456`

**Lưu ý:** Đây là thẻ test, không trừ tiền thật!

---

## 🔍 Kiểm tra Payment Status

Sau khi test (hoặc simulate), kiểm tra status:

```bash
# Dùng script helper
npm run test:payment check-status YOUR_TOKEN 7c8b8a6b-8db4-4040-861b-319c9b7737a1

# Hoặc mở trong browser
http://localhost:4000/frontend/PurchaseUI/payment-return.html?orderId=7c8b8a6b-8db4-4040-861b-319c9b7737a1
```

---

## 🎯 Test Scenarios

### Scenario 1: Payment Success
1. Quét QR hoặc simulate payment thành công
2. Webhook được gọi
3. Payment status = `succeeded`
4. Order status = `paid`
5. Tickets available

### Scenario 2: Payment Failed
1. Simulate payment failed (resultCode != 0)
2. Payment status = `failed`
3. Order status = `failed`
4. Hold được release (nếu chưa hết hạn)

### Scenario 3: Payment Timeout
1. Không thanh toán trong 15 phút
2. Payment vẫn ở status `init`
3. Order vẫn ở status `pending`
4. Có thể tạo payment mới

---

## ⚠️ Lưu ý quan trọng

### Sandbox vs Production

**Sandbox (Test):**
- ✅ Không mất tiền thật
- ✅ Test bao nhiêu lần cũng được
- ✅ Dùng test credentials
- ⚠️ QR code có thể không hoạt động với app production

**Production:**
- ⚠️ Sẽ trừ tiền thật
- ⚠️ Cần credentials thật
- ⚠️ Chỉ dùng khi đã test kỹ

### Khi nào dùng Production?

Chỉ chuyển sang production khi:
- ✅ Đã test kỹ trong sandbox
- ✅ Code đã stable
- ✅ Sẵn sàng deploy
- ✅ Có production credentials từ MoMo/VNPay

---

## 🐛 Troubleshooting

### QR Code không scan được

**Nguyên nhân:** Sandbox QR có thể không tương thích với app MoMo production

**Giải pháp:**
1. Dùng test account trong app MoMo
2. Hoặc test webhook manually
3. Hoặc dùng option nhập số điện thoại

### Payment không update status

**Nguyên nhân:** Webhook không được gọi

**Giải pháp:**
1. Check webhook URL có accessible không (dùng ngrok)
2. Test webhook manually
3. Check logs của events service

### Lỗi "Invalid signature"

**Nguyên nhân:** Signature không đúng

**Giải pháp:**
1. Verify secret key trong `.env`
2. Check signature calculation trong code
3. Xem logs để debug

---

## ✅ Checklist Test Sandbox

- [ ] Đã hiểu sandbox = không mất tiền thật
- [ ] Đã test scan QR code (hoặc simulate)
- [ ] Đã kiểm tra payment status
- [ ] Đã verify webhook hoạt động
- [ ] Đã test payment success flow
- [ ] Đã test payment failed flow
- [ ] Đã check database (Payment & Order tables)

---

## 🎉 Kết luận

**Sandbox là môi trường test an toàn - bạn có thể test bao nhiêu lần cũng được mà không lo mất tiền!**

Sau khi test kỹ trong sandbox, bạn mới nên chuyển sang production.

---

*Cần giúp đỡ? Xem [PAYMENT_TESTING.md](./PAYMENT_TESTING.md) để biết thêm chi tiết.*

