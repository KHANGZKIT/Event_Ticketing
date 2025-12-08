-- =====================================================
-- SEED DATA FOR DASHBOARD CHARTS
-- Tạo Orders và Payments để hiển thị biểu đồ đẹp
-- Giữ nguyên Events và Shows hiện có
-- =====================================================

-- Lấy random eventId và showId từ dữ liệu hiện có
DO $$
DECLARE
    v_event_id UUID;
    v_show_id UUID;
    v_user_id UUID;
    v_ticket_type_id UUID;
    v_order_id UUID;
    i INT;
    random_status TEXT;
    random_payment TEXT;
    random_amount DECIMAL;
    order_date TIMESTAMP;
BEGIN
    -- Lấy một user để tạo orders
    SELECT id INTO v_user_id FROM "User" LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Không tìm thấy user, tạo user test';
        INSERT INTO "User" (id, email, password, name, role, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'testuser@demo.com', 'hashed_password', 'Demo User', 'user', NOW(), NOW())
        RETURNING id INTO v_user_id;
    END IF;

    -- Tạo 50 orders trong 30 ngày qua
    FOR i IN 1..50 LOOP
        -- Random event và show
        SELECT e.id, s.id INTO v_event_id, v_show_id
        FROM "Event" e
        JOIN "Show" s ON s."eventId" = e.id
        ORDER BY RANDOM()
        LIMIT 1;

        -- Random ticket type
        SELECT id INTO v_ticket_type_id
        FROM "TicketType"
        WHERE "showId" = v_show_id
        ORDER BY RANDOM()
        LIMIT 1;

        IF v_ticket_type_id IS NULL THEN
            CONTINUE;
        END IF;

        -- Random order date trong 30 ngày
        order_date := NOW() - (random() * 30 || ' days')::interval;
        
        -- Random status
        random_status := (ARRAY['pending', 'confirmed', 'confirmed', 'confirmed', 'cancelled'])[floor(random() * 5 + 1)];
        
        -- Random amount
        random_amount := floor(random() * 4 + 1) * 150000 + floor(random() * 500000);

        -- Tạo Order
        INSERT INTO "Order" (
            id, "userId", "showId", status, "totalAmount", 
            "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(), v_user_id, v_show_id, random_status, random_amount,
            order_date, order_date
        ) RETURNING id INTO v_order_id;

        -- Tạo OrderItem
        INSERT INTO "OrderItem" (
            id, "orderId", "ticketTypeId", quantity, "unitPrice", "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(), v_order_id, v_ticket_type_id, 
            floor(random() * 3 + 1)::int, 
            random_amount / floor(random() * 3 + 1),
            order_date, order_date
        );

        -- Tạo Payment cho confirmed orders
        IF random_status = 'confirmed' THEN
            random_payment := (ARRAY['succeeded', 'succeeded', 'succeeded', 'succeeded', 'failed', 'refunded'])[floor(random() * 6 + 1)];
            
            INSERT INTO "Payment" (
                id, "orderId", amount, status, method, "createdAt", "updatedAt"
            ) VALUES (
                gen_random_uuid(), v_order_id, random_amount, random_payment, 
                (ARRAY['momo', 'vnpay', 'banking', 'card'])[floor(random() * 4 + 1)],
                order_date + interval '5 minutes', order_date + interval '5 minutes'
            );
        END IF;

    END LOOP;

    RAISE NOTICE 'Đã tạo 50 orders với payments cho Dashboard charts!';
END $$;

-- Thống kê kết quả
SELECT 
    'Orders' as "Table",
    COUNT(*) as "Total",
    COUNT(*) FILTER (WHERE status = 'confirmed') as "Confirmed",
    COUNT(*) FILTER (WHERE status = 'pending') as "Pending",
    COUNT(*) FILTER (WHERE status = 'cancelled') as "Cancelled"
FROM "Order";

SELECT 
    'Payments' as "Table",
    COUNT(*) as "Total",
    COUNT(*) FILTER (WHERE status = 'succeeded') as "Succeeded",
    COUNT(*) FILTER (WHERE status = 'failed') as "Failed",
    COUNT(*) FILTER (WHERE status = 'refunded') as "Refunded"
FROM "Payment";
