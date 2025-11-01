--
-- PostgreSQL database dump
--

\restrict DiSPDL8jUAkh7SCBucZTjNycW53JakSeFh7OycRkmcIDqL5Un05umBGEmIRnsbC

-- Dumped from database version 16.10 (Debian 16.10-1.pgdg13+1)
-- Dumped by pg_dump version 16.10 (Debian 16.10-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'pending',
    'paid',
    'failed',
    'cancelled'
);


ALTER TYPE public."OrderStatus" OWNER TO admin;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'init',
    'succeeded',
    'failed',
    'refunded'
);


ALTER TYPE public."PaymentStatus" OWNER TO admin;

--
-- Name: ShowStatus; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."ShowStatus" AS ENUM (
    'scheduled',
    'cancelled',
    'completed'
);


ALTER TYPE public."ShowStatus" OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Event; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Event" (
    id text NOT NULL,
    name text NOT NULL,
    city text,
    "startsAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    cover text,
    "venueId" text
);


ALTER TABLE public."Event" OWNER TO admin;

--
-- Name: IdempotencyKey; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."IdempotencyKey" (
    key text NOT NULL,
    "userId" text,
    "requestHash" text NOT NULL,
    "orderId" text,
    status text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone
);


ALTER TABLE public."IdempotencyKey" OWNER TO admin;

--
-- Name: Order; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "showId" text NOT NULL,
    amount integer NOT NULL,
    status public."OrderStatus" DEFAULT 'pending'::public."OrderStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    currency text DEFAULT 'VND'::text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Order" OWNER TO admin;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    provider text NOT NULL,
    "providerRef" text,
    amount integer NOT NULL,
    currency text DEFAULT 'VND'::text NOT NULL,
    status public."PaymentStatus" DEFAULT 'init'::public."PaymentStatus" NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Payment" OWNER TO admin;

--
-- Name: Role; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Role" (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Role" OWNER TO admin;

--
-- Name: Role_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."Role_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Role_id_seq" OWNER TO admin;

--
-- Name: Role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."Role_id_seq" OWNED BY public."Role".id;


--
-- Name: SeatMap; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."SeatMap" (
    id text NOT NULL,
    name text NOT NULL,
    schema jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SeatMap" OWNER TO admin;

--
-- Name: Show; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Show" (
    id text NOT NULL,
    "eventId" text NOT NULL,
    venue text,
    "seatMapId" text,
    "startsAt" timestamp(3) without time zone NOT NULL,
    status public."ShowStatus" DEFAULT 'scheduled'::public."ShowStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "seatMapDbId" text,
    "venueDbId" text
);


ALTER TABLE public."Show" OWNER TO admin;

--
-- Name: ShowTicketType; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."ShowTicketType" (
    id text NOT NULL,
    "showId" text NOT NULL,
    name text NOT NULL,
    price integer NOT NULL,
    capacity integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ShowTicketType" OWNER TO admin;

--
-- Name: Ticket; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Ticket" (
    id text NOT NULL,
    "showId" text NOT NULL,
    "seatId" text NOT NULL,
    "orderId" text,
    "checkedInAt" timestamp(3) without time zone,
    code text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Ticket" OWNER TO admin;

--
-- Name: User; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    "fullName" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."User" OWNER TO admin;

--
-- Name: UserRole; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."UserRole" (
    "userId" text NOT NULL,
    "roleId" integer NOT NULL
);


ALTER TABLE public."UserRole" OWNER TO admin;

--
-- Name: Venue; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Venue" (
    id text NOT NULL,
    name text NOT NULL,
    city text,
    address text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Venue" OWNER TO admin;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO admin;

--
-- Name: Role id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Role" ALTER COLUMN id SET DEFAULT nextval('public."Role_id_seq"'::regclass);


--
-- Data for Name: Event; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Event" (id, name, city, "startsAt", "createdAt", "deletedAt", "updatedAt", cover, "venueId") FROM stdin;
2b0bdaf4-54f8-4063-85d8-1a846a4f18c0	Live Concert Saigon	Hồ Chí Minh	2025-11-12 12:00:00	2025-10-29 04:15:56.431	\N	2025-10-29 04:15:56.431	https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=1600	\N
337ae49c-9453-4e19-aa70-44b6b1a09f05	Stand-up Saigon	Hồ Chí Minh	2025-11-11 12:30:00	2025-10-29 04:15:56.658	\N	2025-10-29 04:15:56.658	https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1600	\N
\.


--
-- Data for Name: IdempotencyKey; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."IdempotencyKey" (key, "userId", "requestHash", "orderId", status, "createdAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Order" (id, "userId", "showId", amount, status, "createdAt", currency, "updatedAt") FROM stdin;
e5530aa4-e449-4f59-ab08-792b21304dc5	3e111396-1701-4ad3-90fc-5f21aec19ecb	0e212500-bcfc-4114-9493-4c39178be1b3	900000	paid	2025-10-29 04:15:56.514	VND	2025-10-29 04:15:56.514
ec47e530-941e-4744-a004-863abc9c5f49	3e111396-1701-4ad3-90fc-5f21aec19ecb	d6a63010-d8ae-41ea-9a8a-761d14f9817d	5125000	paid	2025-10-29 04:15:56.649	VND	2025-10-29 04:15:56.649
d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	3e111396-1701-4ad3-90fc-5f21aec19ecb	5236380c-7df5-4c18-9802-de1bb3a855ff	10500000	paid	2025-10-29 04:15:56.813	VND	2025-10-29 04:15:56.813
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Payment" (id, "orderId", provider, "providerRef", amount, currency, status, "paidAt", "createdAt", "updatedAt") FROM stdin;
25b7fb20-4779-47aa-965e-2fc396633d48	e5530aa4-e449-4f59-ab08-792b21304dc5	seed	\N	900000	VND	succeeded	2025-10-29 04:15:56.521	2025-10-29 04:15:56.522	2025-10-29 04:15:56.522
8776af36-96cf-4f46-bb99-f630695d8cbc	ec47e530-941e-4744-a004-863abc9c5f49	seed	\N	5125000	VND	succeeded	2025-10-29 04:15:56.655	2025-10-29 04:15:56.656	2025-10-29 04:15:56.656
49569f17-b5b2-4d8d-8a8c-7d5d338f1a79	d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	seed	\N	10500000	VND	succeeded	2025-10-29 04:15:56.818	2025-10-29 04:15:56.82	2025-10-29 04:15:56.82
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Role" (id, name) FROM stdin;
1	user
\.


--
-- Data for Name: SeatMap; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."SeatMap" (id, name, schema, "createdAt") FROM stdin;
map_arena_oval	Multi-purpose Arena – Oval	{"id": "map_arena_oval", "name": "Multi-purpose Arena – Oval", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 18, "from": 1}]}, {"id": "A", "rows": [{"id": "B", "to": 20, "from": 1}, {"id": "C", "to": 20, "from": 1}]}, {"id": "B", "rows": [{"id": "D", "to": 22, "from": 1}, {"id": "E", "to": 22, "from": 1}]}, {"id": "C", "rows": [{"id": "F", "to": 24, "from": 1}, {"id": "G", "to": 24, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 600000, "B": 350000, "C": 200000, "VIP": 900000}}	2025-10-29 04:15:56.405
map_beach_open	Beach Open Air – Split	{"id": "map_beach_open", "name": "Beach Open Air – Split", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 16, "from": 1}]}, {"id": "A", "rows": [{"id": "B", "to": 18, "from": 1}, {"id": "C", "to": 18, "from": 1}, {"id": "D", "to": 18, "from": 1}]}, {"id": "B", "rows": [{"id": "E", "to": 20, "from": 1}, {"id": "F", "to": 20, "from": 1}, {"id": "G", "to": 20, "from": 1}, {"id": "H", "to": 20, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 350000, "B": 200000, "VIP": 600000}}	2025-10-29 04:15:56.405
map_bowl_wide	Stadium Bowl – Wide	{"id": "map_bowl_wide", "name": "Stadium Bowl – Wide", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 24, "from": 1}, {"id": "B", "to": 24, "from": 1}]}, {"id": "A", "rows": [{"id": "C", "to": 26, "from": 1}, {"id": "D", "to": 26, "from": 1}, {"id": "E", "to": 26, "from": 1}, {"id": "F", "to": 26, "from": 1}]}, {"id": "B", "rows": [{"id": "G", "to": 28, "from": 1}, {"id": "H", "to": 28, "from": 1}, {"id": "I", "to": 28, "from": 1}, {"id": "J", "to": 28, "from": 1}, {"id": "K", "to": 28, "from": 1}, {"id": "L", "to": 28, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 700000, "B": 450000, "VIP": 1000000}}	2025-10-29 04:15:56.405
map_cityhall_compact	City Hall – Compact Split	{"id": "map_cityhall_compact", "name": "City Hall – Compact Split", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 10, "from": 1}]}, {"id": "A", "rows": [{"id": "B", "to": 12, "from": 1}, {"id": "C", "to": 12, "from": 1}, {"id": "D", "to": 12, "from": 1}]}, {"id": "B", "rows": [{"id": "E", "to": 12, "from": 1}, {"id": "F", "to": 12, "from": 1}, {"id": "G", "to": 12, "from": 1}, {"id": "H", "to": 12, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 150000, "B": 100000, "VIP": 200000}}	2025-10-29 04:15:56.405
map_convention_flat	Convention Hall – Flat	{"id": "map_convention_flat", "name": "Convention Hall – Flat", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 20, "from": 1}]}, {"id": "A", "rows": [{"id": "B", "to": 22, "from": 1}, {"id": "C", "to": 22, "from": 1}, {"id": "D", "to": 22, "from": 1}]}, {"id": "B", "rows": [{"id": "E", "to": 22, "from": 1}, {"id": "F", "to": 22, "from": 1}, {"id": "G", "to": 22, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 300000, "B": 180000, "VIP": 500000}}	2025-10-29 04:15:56.405
map_festival_field	Festival Field – Deep	{"id": "map_festival_field", "name": "Festival Field – Deep", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 22, "from": 1}]}, {"id": "A", "rows": [{"id": "B", "to": 24, "from": 1}, {"id": "C", "to": 24, "from": 1}]}, {"id": "B", "rows": [{"id": "D", "to": 26, "from": 1}, {"id": "E", "to": 26, "from": 1}]}, {"id": "C", "rows": [{"id": "F", "to": 26, "from": 1}, {"id": "G", "to": 26, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 400000, "B": 250000, "C": 150000, "VIP": 700000}}	2025-10-29 04:15:56.405
map_horseshoe_md	Mỹ Đình – Horseshoe	{"id": "map_horseshoe_md", "meta": {"stagePosition": "north"}, "name": "Mỹ Đình – Horseshoe", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 20, "from": 1}, {"id": "B", "to": 20, "from": 1}]}, {"id": "A", "rows": [{"id": "C", "to": 22, "from": 1}, {"id": "D", "to": 22, "from": 1}]}, {"id": "B", "rows": [{"id": "E", "to": 24, "from": 1}, {"id": "F", "to": 24, "from": 1}, {"id": "G", "to": 24, "from": 1}, {"id": "H", "to": 24, "from": 1}]}, {"id": "C", "rows": [{"id": "I", "to": 18, "from": 1}, {"id": "J", "to": 18, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 800000, "B": 500000, "C": 300000, "VIP": 1200000}}	2025-10-29 04:15:56.405
map_indoor_classic	Indoor Theater – Classic	{"id": "map_indoor_classic", "meta": {"balcony": false}, "name": "Indoor Theater – Classic", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 12, "from": 1}]}, {"id": "A", "rows": [{"id": "B", "to": 14, "from": 1}, {"id": "C", "to": 14, "from": 1}]}, {"id": "B", "rows": [{"id": "D", "to": 14, "from": 1}, {"id": "E", "to": 14, "from": 1}, {"id": "F", "to": 14, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 200000, "B": 120000, "VIP": 300000}}	2025-10-29 04:15:56.405
map_qk7_split	Quận 7 – Split Blocks	{"id": "map_qk7_split", "meta": {"splitBlocks": true, "stagePosition": "north"}, "name": "Quận 7 – Split Blocks", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 14, "from": 1}, {"id": "B", "to": 14, "from": 1}]}, {"id": "A", "rows": [{"id": "C", "to": 14, "from": 1}, {"id": "D", "to": 14, "from": 1}]}, {"id": "B", "rows": [{"id": "E", "to": 14, "from": 1}, {"id": "F", "to": 14, "from": 1}, {"id": "G", "to": 14, "from": 1}, {"id": "H", "to": 14, "from": 1}, {"id": "I", "to": 14, "from": 1}, {"id": "J", "to": 14, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 120000, "B": 90000, "VIP": 150000}}	2025-10-29 04:15:56.405
map_square_compact	Square – Compact	{"id": "map_square_compact", "name": "Square – Compact", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 12, "from": 1}]}, {"id": "A", "rows": [{"id": "B", "to": 12, "from": 1}, {"id": "C", "to": 12, "from": 1}]}, {"id": "B", "rows": [{"id": "D", "to": 12, "from": 1}, {"id": "E", "to": 12, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 220000, "B": 140000, "VIP": 350000}}	2025-10-29 04:15:56.405
map_theater_balcony	Indoor Theater – Balcony	{"id": "map_theater_balcony", "meta": {"balcony": true}, "name": "Indoor Theater – Balcony", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 10, "from": 1}]}, {"id": "A", "rows": [{"id": "B", "to": 12, "from": 1}, {"id": "C", "to": 12, "from": 1}]}, {"id": "B", "rows": [{"id": "D", "to": 14, "from": 1}, {"id": "E", "to": 14, "from": 1}]}, {"id": "C", "rows": [{"id": "F", "to": 12, "from": 1}, {"id": "G", "to": 12, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 260000, "B": 160000, "C": 120000, "VIP": 400000}}	2025-10-29 04:15:56.405
seatmaps_pack	seatmaps_pack	[{"id": "map_qk7_split", "meta": {"splitBlocks": true, "stagePosition": "north"}, "name": "Quận 7 – Split Blocks", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 14, "from": 1}, {"id": "B", "to": 14, "from": 1}]}, {"id": "A", "rows": [{"id": "C", "to": 14, "from": 1}, {"id": "D", "to": 14, "from": 1}]}, {"id": "B", "rows": [{"id": "E", "to": 14, "from": 1}, {"id": "F", "to": 14, "from": 1}, {"id": "G", "to": 14, "from": 1}, {"id": "H", "to": 14, "from": 1}, {"id": "I", "to": 14, "from": 1}, {"id": "J", "to": 14, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 120000, "B": 90000, "VIP": 150000}}, {"id": "map_horseshoe_md", "meta": {"stagePosition": "north"}, "name": "Mỹ Đình – Horseshoe", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 20, "from": 1}, {"id": "B", "to": 20, "from": 1}]}, {"id": "A", "rows": [{"id": "C", "to": 22, "from": 1}, {"id": "D", "to": 22, "from": 1}]}, {"id": "B", "rows": [{"id": "E", "to": 24, "from": 1}, {"id": "F", "to": 24, "from": 1}, {"id": "G", "to": 24, "from": 1}, {"id": "H", "to": 24, "from": 1}]}, {"id": "C", "rows": [{"id": "I", "to": 18, "from": 1}, {"id": "J", "to": 18, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 800000, "B": 500000, "C": 300000, "VIP": 1200000}}, {"id": "map_indoor_classic", "meta": {"balcony": false}, "name": "Indoor Theater – Classic", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 12, "from": 1}]}, {"id": "A", "rows": [{"id": "B", "to": 14, "from": 1}, {"id": "C", "to": 14, "from": 1}]}, {"id": "B", "rows": [{"id": "D", "to": 14, "from": 1}, {"id": "E", "to": 14, "from": 1}, {"id": "F", "to": 14, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 200000, "B": 120000, "VIP": 300000}}, {"id": "map_bowl_wide", "name": "Stadium Bowl – Wide", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 24, "from": 1}, {"id": "B", "to": 24, "from": 1}]}, {"id": "A", "rows": [{"id": "C", "to": 26, "from": 1}, {"id": "D", "to": 26, "from": 1}, {"id": "E", "to": 26, "from": 1}, {"id": "F", "to": 26, "from": 1}]}, {"id": "B", "rows": [{"id": "G", "to": 28, "from": 1}, {"id": "H", "to": 28, "from": 1}, {"id": "I", "to": 28, "from": 1}, {"id": "J", "to": 28, "from": 1}, {"id": "K", "to": 28, "from": 1}, {"id": "L", "to": 28, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 700000, "B": 450000, "VIP": 1000000}}, {"id": "map_cityhall_compact", "name": "City Hall – Compact Split", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 10, "from": 1}]}, {"id": "A", "rows": [{"id": "B", "to": 12, "from": 1}, {"id": "C", "to": 12, "from": 1}, {"id": "D", "to": 12, "from": 1}]}, {"id": "B", "rows": [{"id": "E", "to": 12, "from": 1}, {"id": "F", "to": 12, "from": 1}, {"id": "G", "to": 12, "from": 1}, {"id": "H", "to": 12, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 150000, "B": 100000, "VIP": 200000}}, {"id": "map_beach_open", "name": "Beach Open Air – Split", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 16, "from": 1}]}, {"id": "A", "rows": [{"id": "B", "to": 18, "from": 1}, {"id": "C", "to": 18, "from": 1}, {"id": "D", "to": 18, "from": 1}]}, {"id": "B", "rows": [{"id": "E", "to": 20, "from": 1}, {"id": "F", "to": 20, "from": 1}, {"id": "G", "to": 20, "from": 1}, {"id": "H", "to": 20, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 350000, "B": 200000, "VIP": 600000}}, {"id": "map_theater_balcony", "meta": {"balcony": true}, "name": "Indoor Theater – Balcony", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 10, "from": 1}]}, {"id": "A", "rows": [{"id": "B", "to": 12, "from": 1}, {"id": "C", "to": 12, "from": 1}]}, {"id": "B", "rows": [{"id": "D", "to": 14, "from": 1}, {"id": "E", "to": 14, "from": 1}]}, {"id": "C", "rows": [{"id": "F", "to": 12, "from": 1}, {"id": "G", "to": 12, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 260000, "B": 160000, "C": 120000, "VIP": 400000}}, {"id": "map_arena_oval", "name": "Multi-purpose Arena – Oval", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 18, "from": 1}]}, {"id": "A", "rows": [{"id": "B", "to": 20, "from": 1}, {"id": "C", "to": 20, "from": 1}]}, {"id": "B", "rows": [{"id": "D", "to": 22, "from": 1}, {"id": "E", "to": 22, "from": 1}]}, {"id": "C", "rows": [{"id": "F", "to": 24, "from": 1}, {"id": "G", "to": 24, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 600000, "B": 350000, "C": 200000, "VIP": 900000}}, {"id": "map_convention_flat", "name": "Convention Hall – Flat", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 20, "from": 1}]}, {"id": "A", "rows": [{"id": "B", "to": 22, "from": 1}, {"id": "C", "to": 22, "from": 1}, {"id": "D", "to": 22, "from": 1}]}, {"id": "B", "rows": [{"id": "E", "to": 22, "from": 1}, {"id": "F", "to": 22, "from": 1}, {"id": "G", "to": 22, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 300000, "B": 180000, "VIP": 500000}}, {"id": "map_square_compact", "name": "Square – Compact", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 12, "from": 1}]}, {"id": "A", "rows": [{"id": "B", "to": 12, "from": 1}, {"id": "C", "to": 12, "from": 1}]}, {"id": "B", "rows": [{"id": "D", "to": 12, "from": 1}, {"id": "E", "to": 12, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 220000, "B": 140000, "VIP": 350000}}, {"id": "map_festival_field", "name": "Festival Field – Deep", "zones": [{"id": "VIP", "rows": [{"id": "A", "to": 22, "from": 1}]}, {"id": "A", "rows": [{"id": "B", "to": 24, "from": 1}, {"id": "C", "to": 24, "from": 1}]}, {"id": "B", "rows": [{"id": "D", "to": 26, "from": 1}, {"id": "E", "to": 26, "from": 1}]}, {"id": "C", "rows": [{"id": "F", "to": 26, "from": 1}, {"id": "G", "to": 26, "from": 1}]}], "format": "ROW_NUM", "priceTiers": {"A": 400000, "B": 250000, "C": 150000, "VIP": 700000}}]	2025-10-29 04:15:56.405
\.


--
-- Data for Name: Show; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Show" (id, "eventId", venue, "seatMapId", "startsAt", status, "createdAt", "deletedAt", "updatedAt", "seatMapDbId", "venueDbId") FROM stdin;
0e212500-bcfc-4114-9493-4c39178be1b3	2b0bdaf4-54f8-4063-85d8-1a846a4f18c0	Nhà thi đấu Quận 7	map_cityhall_compact	2025-11-12 12:00:00	scheduled	2025-10-29 04:15:56.435	\N	2025-10-29 04:15:56.435	\N	\N
d6a63010-d8ae-41ea-9a8a-761d14f9817d	2b0bdaf4-54f8-4063-85d8-1a846a4f18c0	Nhà Văn hoá Thanh Niên	map_arena_oval	2025-11-15 12:00:00	scheduled	2025-10-29 04:15:56.526	\N	2025-10-29 04:15:56.526	\N	\N
5236380c-7df5-4c18-9802-de1bb3a855ff	337ae49c-9453-4e19-aa70-44b6b1a09f05	Saigon Music Hall	map_horseshoe_md	2025-11-11 12:30:00	scheduled	2025-10-29 04:15:56.661	\N	2025-10-29 04:15:56.661	\N	\N
fa287570-f3d1-4003-8a71-198759a32f2e	337ae49c-9453-4e19-aa70-44b6b1a09f05	Nhà hát Bến Thành	seatmaps_pack	2025-11-14 12:30:00	scheduled	2025-10-29 04:15:56.822	\N	2025-10-29 04:15:56.822	\N	\N
\.


--
-- Data for Name: ShowTicketType; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."ShowTicketType" (id, "showId", name, price, capacity, "createdAt") FROM stdin;
34f2cde6-8559-4f24-b0d3-5774fb3fbb9f	0e212500-bcfc-4114-9493-4c39178be1b3	VIP	200000	10	2025-10-29 04:15:56.442
24198905-8456-47d0-9db8-690c4da78887	0e212500-bcfc-4114-9493-4c39178be1b3	A	150000	36	2025-10-29 04:15:56.442
cd95c53e-0e7a-47ac-b200-31877f2786da	0e212500-bcfc-4114-9493-4c39178be1b3	B	100000	48	2025-10-29 04:15:56.442
3af9c39d-3a92-4d35-98f8-2db774b11a25	d6a63010-d8ae-41ea-9a8a-761d14f9817d	VIP	900000	18	2025-10-29 04:15:56.528
0125baa2-bdfd-41c3-abc5-1d754a98b5e2	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A	600000	40	2025-10-29 04:15:56.528
69d8b571-952d-47a2-923e-4918afcbeedf	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B	350000	44	2025-10-29 04:15:56.528
1c939979-b539-4e1e-8728-cea1fa2dee14	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C	200000	48	2025-10-29 04:15:56.528
f4c430b6-8c73-4b6f-9fd7-574940b3f960	5236380c-7df5-4c18-9802-de1bb3a855ff	VIP	1200000	40	2025-10-29 04:15:56.663
499cf227-6a0f-41e6-a62c-344cce5d7596	5236380c-7df5-4c18-9802-de1bb3a855ff	A	800000	44	2025-10-29 04:15:56.663
2cc6c383-6dd2-4287-a55b-969bc38aa248	5236380c-7df5-4c18-9802-de1bb3a855ff	B	500000	96	2025-10-29 04:15:56.663
13af01eb-8d61-462c-b068-f04677a9e6cb	5236380c-7df5-4c18-9802-de1bb3a855ff	C	300000	36	2025-10-29 04:15:56.663
\.


--
-- Data for Name: Ticket; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Ticket" (id, "showId", "seatId", "orderId", "checkedInAt", code, "createdAt", "updatedAt") FROM stdin;
5a13dc88-e2ac-4502-b7e9-2bb960b76865	0e212500-bcfc-4114-9493-4c39178be1b3	A2	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
003bb095-81ea-4ed2-a229-56d7c86c082e	0e212500-bcfc-4114-9493-4c39178be1b3	A3	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
e7ac0fce-f4b0-49bf-bfde-66aebd9c4a81	0e212500-bcfc-4114-9493-4c39178be1b3	A4	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
8c819ea9-6a03-46a6-a55d-4a20bb45b71a	0e212500-bcfc-4114-9493-4c39178be1b3	A5	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
029172a3-8dd9-41f1-b9ac-5df444da10a4	0e212500-bcfc-4114-9493-4c39178be1b3	A6	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
86dee3b0-8415-46bb-8f3c-ddab1eb9b0e6	0e212500-bcfc-4114-9493-4c39178be1b3	A7	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
8c93ce94-f9d9-4568-b459-f7fdd8720941	0e212500-bcfc-4114-9493-4c39178be1b3	A8	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
b8fa08cd-5af4-4f54-947e-6b4f01ab502f	0e212500-bcfc-4114-9493-4c39178be1b3	A9	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
b2f16923-e6fa-44d9-9000-cc3d6c959509	0e212500-bcfc-4114-9493-4c39178be1b3	A10	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
5ec9bad3-3a92-4e46-af69-a5678f584de8	0e212500-bcfc-4114-9493-4c39178be1b3	B1	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
f0ee15d5-a175-4841-899d-b8230748a17d	0e212500-bcfc-4114-9493-4c39178be1b3	B2	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
24c1ee38-5513-4644-86cf-4fd56cf0f2d4	0e212500-bcfc-4114-9493-4c39178be1b3	B3	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
8d535df8-3289-4211-88bb-39585f5c4416	0e212500-bcfc-4114-9493-4c39178be1b3	B4	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
967bc9c8-4f00-426b-84c8-8b7fac8208ec	0e212500-bcfc-4114-9493-4c39178be1b3	B6	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
84eb2384-1b76-437a-ba31-a0c28a952d0a	0e212500-bcfc-4114-9493-4c39178be1b3	B7	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
cfef5d4b-0443-4d55-a10f-fa013acfe1c9	0e212500-bcfc-4114-9493-4c39178be1b3	B8	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
6f6517da-4e68-42b5-8672-c52063b438df	0e212500-bcfc-4114-9493-4c39178be1b3	B9	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
585277c6-391e-4282-b56b-8e018ec388eb	0e212500-bcfc-4114-9493-4c39178be1b3	B10	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
3521677d-e757-4e64-838f-477948972f2d	0e212500-bcfc-4114-9493-4c39178be1b3	B12	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
5b1a3195-f131-48d2-a27d-4044ec29e0df	0e212500-bcfc-4114-9493-4c39178be1b3	C1	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
7cc9cfe2-14f6-45c0-82d3-8974eb25410a	0e212500-bcfc-4114-9493-4c39178be1b3	C2	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
29a1b782-d963-445a-b0a4-4fe9aa58c7f6	0e212500-bcfc-4114-9493-4c39178be1b3	C3	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
810d047a-33dc-48e2-8105-fb912ca13c34	0e212500-bcfc-4114-9493-4c39178be1b3	C4	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
07260f9a-92b6-452b-8215-0b42fc6c8728	0e212500-bcfc-4114-9493-4c39178be1b3	C5	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
b18abf9f-4ffb-4894-b198-4bdb12a43b3c	0e212500-bcfc-4114-9493-4c39178be1b3	C7	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
73d62060-eff4-4cf7-9d93-2a127f3094a5	0e212500-bcfc-4114-9493-4c39178be1b3	C8	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
c2d9d3de-3730-453a-bc48-6235a40ec4cd	0e212500-bcfc-4114-9493-4c39178be1b3	C9	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
3ce36d19-96ce-4a8a-a704-c15e9bab1f60	0e212500-bcfc-4114-9493-4c39178be1b3	C10	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
e4c5de16-162d-4197-9596-b9e1b8937d25	0e212500-bcfc-4114-9493-4c39178be1b3	C11	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
63eb7436-487a-483c-b152-dbd5ab66c287	0e212500-bcfc-4114-9493-4c39178be1b3	C12	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
d5651405-2b6a-4422-b87a-e1d54b9ba16e	0e212500-bcfc-4114-9493-4c39178be1b3	D1	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
2d44f936-c236-42ac-beeb-973e6073e6b1	0e212500-bcfc-4114-9493-4c39178be1b3	D2	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
efe231ce-ae94-4640-bd13-e11fd2ce0277	0e212500-bcfc-4114-9493-4c39178be1b3	D3	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
cf6fa52d-c8b1-4e52-8b3e-34e534ed5b65	0e212500-bcfc-4114-9493-4c39178be1b3	D4	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
a1fb334e-b54e-475a-a979-c81c74b34b3c	0e212500-bcfc-4114-9493-4c39178be1b3	D5	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
3302f3fa-d63e-4231-b0fc-da079126f8cf	0e212500-bcfc-4114-9493-4c39178be1b3	D6	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
e2db647b-def8-4931-8fbc-981619e545bf	0e212500-bcfc-4114-9493-4c39178be1b3	D7	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
7ed30871-4b0f-4ca8-9403-5e79019f925f	0e212500-bcfc-4114-9493-4c39178be1b3	D8	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
802579e5-54f0-4f63-b20d-bd75baede28e	0e212500-bcfc-4114-9493-4c39178be1b3	D9	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
b3811770-7131-4341-9ea7-5484e28f4963	0e212500-bcfc-4114-9493-4c39178be1b3	D10	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
0071b554-2c7a-41e9-93da-d840cf018a5a	0e212500-bcfc-4114-9493-4c39178be1b3	D11	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
f4ae11a9-8f21-4bea-9098-e59b2d537baf	0e212500-bcfc-4114-9493-4c39178be1b3	D12	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
793606f4-d584-4911-ba75-9278c121809b	0e212500-bcfc-4114-9493-4c39178be1b3	E1	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
2ba3311b-bdeb-4f2d-a648-6d5e3be768bc	0e212500-bcfc-4114-9493-4c39178be1b3	E2	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
04afe4d2-a4dd-4923-8e3f-678e5f92ef22	0e212500-bcfc-4114-9493-4c39178be1b3	E3	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
f5b29262-9323-4bfa-8302-621c2a0709c8	0e212500-bcfc-4114-9493-4c39178be1b3	E4	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
2e54b6ff-539f-4a45-b607-e4aa6e4a5ee9	0e212500-bcfc-4114-9493-4c39178be1b3	E5	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
50e96e2f-f97f-48b3-aebc-cd7604686eec	0e212500-bcfc-4114-9493-4c39178be1b3	E6	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
a1844691-37fe-4738-b7f7-682a7a868a4d	0e212500-bcfc-4114-9493-4c39178be1b3	E8	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
08e4d63c-0a94-451e-bbbb-7b3dc649b6f2	0e212500-bcfc-4114-9493-4c39178be1b3	E9	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
e8788229-b791-486c-8d07-432d583d6350	0e212500-bcfc-4114-9493-4c39178be1b3	E10	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
35aff9c7-d763-4b60-8529-36012be444ad	0e212500-bcfc-4114-9493-4c39178be1b3	E11	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
e1066201-f9ed-4f01-9c1c-80b4fd319844	0e212500-bcfc-4114-9493-4c39178be1b3	E12	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
1cab15ee-9df7-45a7-82be-7c359ace5be5	0e212500-bcfc-4114-9493-4c39178be1b3	F1	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
d2327665-7519-4e90-90e7-2385fbe33ea8	0e212500-bcfc-4114-9493-4c39178be1b3	F2	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
c8c8d970-f340-4fbc-b056-9c5019aa9cc6	0e212500-bcfc-4114-9493-4c39178be1b3	F3	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
e19428fe-4329-4d6d-849a-e76ebf8a22f7	0e212500-bcfc-4114-9493-4c39178be1b3	F4	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
03b8ca1c-f7a2-45c6-a086-347e1a67658e	0e212500-bcfc-4114-9493-4c39178be1b3	F5	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
1ae7954a-c8dc-467f-b87b-c133b44d6374	0e212500-bcfc-4114-9493-4c39178be1b3	F7	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
d8a1e8b3-e5f9-4e9c-899d-b55cc8a9ae02	0e212500-bcfc-4114-9493-4c39178be1b3	F8	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
7dca0b2e-3844-41b3-806a-b6db0cbfea20	0e212500-bcfc-4114-9493-4c39178be1b3	F9	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
3eb71082-7155-492f-a4b7-f69a7659e3a9	0e212500-bcfc-4114-9493-4c39178be1b3	F10	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
2e139958-74a7-45cf-a168-98e45f8cc298	0e212500-bcfc-4114-9493-4c39178be1b3	F11	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
94adb960-573c-48dc-aff1-0e2faaf17249	0e212500-bcfc-4114-9493-4c39178be1b3	F12	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
5bc4c0b0-0b9e-4b85-b1da-ed368090e57b	0e212500-bcfc-4114-9493-4c39178be1b3	G1	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
4b303353-ea8f-4411-9d26-a7cca013d41a	0e212500-bcfc-4114-9493-4c39178be1b3	G2	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
fd518ea5-34e6-4a49-87bf-53c5f08625eb	0e212500-bcfc-4114-9493-4c39178be1b3	G3	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
96a201cb-4aeb-41c3-a76d-f5cfba148850	0e212500-bcfc-4114-9493-4c39178be1b3	G4	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
ab201245-7f93-4114-b3f4-4071e49a434f	0e212500-bcfc-4114-9493-4c39178be1b3	G5	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
c7e788dd-f4d1-4280-8648-703dc5814594	0e212500-bcfc-4114-9493-4c39178be1b3	G6	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
04fc616c-1b38-42ba-aeed-5c02efb36e90	0e212500-bcfc-4114-9493-4c39178be1b3	G7	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
ba92534e-6a92-405b-b5e0-d930db09682f	0e212500-bcfc-4114-9493-4c39178be1b3	G8	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
58a39e1a-b514-4995-a506-22d537e52ad1	0e212500-bcfc-4114-9493-4c39178be1b3	G9	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
a2e06d47-b51c-4cc0-8cb5-b0a3be2ee2d9	0e212500-bcfc-4114-9493-4c39178be1b3	G10	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
ab3cda32-b2df-43a8-b8a4-c5886258b613	0e212500-bcfc-4114-9493-4c39178be1b3	G11	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
45a75b95-4e6d-4d04-aeac-417275b9a53e	0e212500-bcfc-4114-9493-4c39178be1b3	G12	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
b3953bc3-bd22-4758-b038-43a0c4b42d71	0e212500-bcfc-4114-9493-4c39178be1b3	H1	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
8c4d91a3-66eb-40e6-a736-8caa441d3e87	0e212500-bcfc-4114-9493-4c39178be1b3	H2	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
aa21efb8-d76c-4813-980c-153aadaa0450	0e212500-bcfc-4114-9493-4c39178be1b3	H3	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
84f8ef2d-9827-42a4-819f-52d51ad3d59b	0e212500-bcfc-4114-9493-4c39178be1b3	H4	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
a59371bb-cdb1-40f9-a161-460b35bb53fa	0e212500-bcfc-4114-9493-4c39178be1b3	H5	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
cfcfb121-f93d-4a82-8959-3a11be805c37	0e212500-bcfc-4114-9493-4c39178be1b3	H6	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
a4752f3a-9ca6-4448-9a19-f5d87ceffb1c	0e212500-bcfc-4114-9493-4c39178be1b3	H7	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
9751eb78-daa6-441d-a86a-5177236336af	0e212500-bcfc-4114-9493-4c39178be1b3	H8	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
4e3ec55b-d4a9-4316-9a8a-f0a7de7f154b	0e212500-bcfc-4114-9493-4c39178be1b3	H9	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
cda060db-f095-4cca-bc8a-bb72622597e7	0e212500-bcfc-4114-9493-4c39178be1b3	H10	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
84ff43c8-d21b-4244-a38c-cf3d7c31cea3	0e212500-bcfc-4114-9493-4c39178be1b3	H11	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
032106ee-6738-4163-bcc3-87dd86c76b8d	0e212500-bcfc-4114-9493-4c39178be1b3	H12	\N	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.453
6b906760-142a-4044-ba8b-9d95583909ee	0e212500-bcfc-4114-9493-4c39178be1b3	A1	e5530aa4-e449-4f59-ab08-792b21304dc5	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.517
e6955070-8214-43b7-99c1-1a6e911ffc79	0e212500-bcfc-4114-9493-4c39178be1b3	B5	e5530aa4-e449-4f59-ab08-792b21304dc5	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.517
70064b04-929b-4977-8569-f56204c700ba	0e212500-bcfc-4114-9493-4c39178be1b3	B11	e5530aa4-e449-4f59-ab08-792b21304dc5	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.517
169bfd93-220c-4688-8deb-ec11a22d5663	0e212500-bcfc-4114-9493-4c39178be1b3	C6	e5530aa4-e449-4f59-ab08-792b21304dc5	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.517
9401490a-5736-473c-b9c0-de98f6019b57	0e212500-bcfc-4114-9493-4c39178be1b3	E7	e5530aa4-e449-4f59-ab08-792b21304dc5	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.517
d62c2438-5ffa-4041-ac7f-67970266eafa	0e212500-bcfc-4114-9493-4c39178be1b3	F6	e5530aa4-e449-4f59-ab08-792b21304dc5	\N	\N	2025-10-29 04:15:56.453	2025-10-29 04:15:56.517
36231ab1-cb52-4e45-893c-b0e95fda0a42	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A1	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
808bacb8-730d-43eb-b49a-7e87d4947633	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A2	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
5c33cb42-eaa6-4b46-be04-bf44b2f277fa	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A3	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
36d82f6a-83e7-4b07-920e-15bac35e3a35	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A4	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
cd1aeb45-8080-45fc-bcd8-6182609a93c9	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A5	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
d54ffd26-6c8d-446d-9365-c1a9572b4863	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A6	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
526ab9c0-e426-41e4-ac48-b23c7656687b	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A7	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
0b1fdf1e-0e92-40aa-949e-810589f66a3e	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A9	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
b4a1cd63-424d-48e0-9bc2-f932d7b95e42	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A10	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
4a6e313b-6662-4245-b7f5-d2faa328a734	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A11	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
b24f545b-0aee-40e8-afd9-9f6a6cb7d5c8	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A12	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
0910f37d-f274-45b4-8fa2-7bec615e8503	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A13	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
358fd739-f1fb-43d9-9bd7-aa8a382d22f5	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A14	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
301f3d91-f120-401c-b656-93209069bd6a	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A15	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
5828dcb6-f1c5-4ec3-941d-c418884f4b52	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A16	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
34c5ed9b-31ef-468b-a655-7334e0c55b40	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A17	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
24aaa674-1cb8-44e8-9699-2edc2998d8c2	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A18	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
5d6b06c7-1e29-4219-a17f-6dfd46d22a44	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B1	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
250f4159-d49d-422a-994f-7764ea156d20	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B2	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
10b9e287-377f-4549-8d0b-54333272c7a3	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B3	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
fd37d0e2-89b8-47a3-bf7a-12f1e59f4586	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B4	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
74bf941f-38bb-46b0-8e5d-2c6d7c193f86	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B5	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
fdf6f280-ae7f-42dc-b548-622632f9738e	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B6	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
eb7f84e5-4b02-41dd-896f-649eed891f2c	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B7	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
3937395e-6121-4678-860a-725bb872e301	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B8	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
1c1388ca-8966-4285-bf42-07b9aac49825	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B9	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
64b0cfc9-749e-4bc9-966d-3032cb6fcf5b	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B10	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
4fb5276c-49ac-436e-b1f0-1feee099cfbe	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B12	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
66e515f4-2027-4053-bdfe-81f536dfa213	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B13	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
38faf6fe-9e9f-41ef-88be-cdb27703847e	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B14	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
68624ba6-85d5-45d2-afea-621158e82bf8	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B15	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
35aaa300-da60-40bf-89bf-4db00039498e	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B16	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
8e7f7b78-85dc-481f-965e-e2cfc90cc895	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B17	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
eb46ed15-9a67-4ab3-a174-50f3b840511e	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B18	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
c7a5155c-594b-4b68-a9db-aa3f46613803	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B19	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
584b58f5-a6dc-4fcb-bd44-458f541bb7ed	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B20	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
7938e21b-e927-42f9-b173-38768d78d941	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C1	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
4cc65c5f-0aa7-4d8f-a381-9c7251828044	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C2	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
b55cad4e-a00f-4341-a6ea-c382289aa724	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C3	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
373b8473-fe43-44a1-a634-e14b326392dc	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C4	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
c9ae8928-6181-4873-8db9-3d4fdeefb4d4	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C5	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
30d79eec-19e3-45cc-9d06-346f8df579cc	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C6	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
474e653e-289f-408b-a66f-4544bc3b1fac	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C7	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
57f7856e-de44-49c4-93cb-ddd1427f5674	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C8	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
c0ae50d9-8d47-402a-8a41-b747de1c7883	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C9	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
912436c8-24c9-42c8-814a-10beecd3f50d	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C10	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
d9fbbd68-bf56-4e6c-8279-cf7628112519	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C11	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
0dd25253-c00a-405f-a198-d6d32c58f572	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C12	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
bee44e45-6d07-4a30-bf8f-c4ff88758f31	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C13	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
bff6b330-0a89-49e2-a923-93f5d73aafeb	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C14	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
86659fe2-40d3-4007-b815-e71c660e380f	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C15	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
13f525b8-4e74-423e-915b-8016ccb905ec	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C16	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
70367926-35f1-4ae6-be98-b8176730b586	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C17	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
af7125e2-d469-4ca4-96ba-5376f2dfc166	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C18	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
e6e51a4c-9e80-4fd6-8de5-7cfbdc17e235	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C19	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
99454096-f239-425b-841c-1734c7b37b6a	d6a63010-d8ae-41ea-9a8a-761d14f9817d	C20	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
1430daa4-2082-47f9-9a7f-3ce5c514457a	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D1	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
11a2fdad-1814-4ebc-bc31-31b741b03b3d	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D2	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
871c46d4-7e0f-49e2-a286-e00b80865c3b	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D3	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
1f75d806-468c-47e3-941d-8d6e13932a0b	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D4	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
32f56a21-72ea-44d2-99ec-18df73549a95	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D5	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
48ea0087-c249-48c7-aab6-c7490e36b395	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D6	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
4e63f93d-20e5-4cf1-925e-6e04438197a8	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D7	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
ce778084-c8ed-49d6-86ef-8c6dd46d2182	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D8	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
34e4656b-fb77-48aa-ac0c-43ea8cfe9081	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D9	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
c923fb12-a55e-4881-9ebe-6af640aea9fe	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D10	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
d3cc7f62-f98f-4ea1-b8c9-c78dd55dcdb6	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D11	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
15e71778-2799-436b-a242-2ad5050c10e3	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D12	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
e3e73841-7909-4697-8b31-872850951ebe	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D13	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
232f1ee9-bf69-40d3-97db-f6c031751970	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D14	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
ed354628-2751-4ad8-aac5-59afa30e9f48	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D15	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
11d8a105-b8ac-4128-95be-0fb7684caf25	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D16	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
4c0f726f-9f17-46d0-8f9f-f22a30b52ee6	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D17	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
8c448539-e7c4-4074-8c86-6a8c8b0783bb	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D18	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
d13aa121-a340-4ace-8e48-5886c94cd8ee	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D19	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
c40c8d25-7ab9-4e5e-90f6-3370b8a02c34	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D21	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
26d20b86-2504-4306-b6a1-da7dc4d495df	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E1	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
ae052a58-eb00-4607-bd69-3e47685ad0f0	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E2	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
169ff66c-0ca0-4121-b983-68809d5718fc	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E3	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
89256fdc-d2f9-459c-b450-9394412f6227	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E4	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
8f372a8b-07bb-4c55-baf2-2012df1a29f0	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E5	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
93f95dba-4682-41a7-849a-f2105af7ca1a	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E6	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
36094a54-52b5-47a2-9ce5-d25a7762df54	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E7	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
d96180f7-57fd-43c8-96d7-22c6017686b3	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E8	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
acb9e2f2-b56f-4f6c-8415-b8e0acb6f957	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E9	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
b0ee768f-7638-46b7-aa33-318bdd784e7e	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E10	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
1a2a1146-4b20-4496-a72f-2c88af2f6727	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E11	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
89c964d3-5b70-4e37-b76a-5015a03b75af	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E12	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
03ae4f8d-d022-4603-afa9-96fc9f4e017a	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E14	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
4c8cade0-824a-4729-8b73-60a395dced6a	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E16	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
51f80983-5b62-446f-b525-a3f488bf7e82	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E17	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
52c71392-66b0-4c00-932f-937eaa3e0f81	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E18	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
93755053-0e4c-434a-a9c8-3793d89ca109	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E19	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
076dd8ff-aee6-4da0-b447-13536b6e13c0	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E20	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
1fb74c4a-2a47-4184-b3ea-4ef7eab0b511	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E21	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
7392e4e4-1857-4423-8d75-31bda66f328c	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E22	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
fdb29360-b6f2-4579-816d-fc98c33fea9b	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F1	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
e6a1f923-bbc6-4525-9f0e-b985621cf11f	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F2	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
a872fcbe-31d5-41d5-9dee-35f2ec05fa32	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F5	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
9cd055ac-35a9-404a-a5b6-4a1ccff16992	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F6	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
cd7dd2bf-baed-43d2-8eaa-a934dccb68b2	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F8	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
5e2584cf-1a08-4c74-abb1-4d500cd0d50a	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F9	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
7a1a2aeb-cbd2-41ab-9c11-9f9e4d7cfca3	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F10	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
ee68b9a1-8a48-432b-9868-f2a9ed300a7f	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F11	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
98a3c07d-9355-48a7-80cf-f1e224ab3deb	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F12	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
242bdb40-0e76-4bc5-8e46-4b0f69c243e8	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F13	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
e2643ce4-ace9-44bf-9d11-095d0ff40e77	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F14	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
8c58d3f3-9e6e-48fb-89b1-acc5e6887424	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F15	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
768074d2-8cf9-481d-a666-fb9b451ab268	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F16	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
b9922699-be9d-4132-8a22-51d15963c03e	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F17	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
c32f3b82-5eaf-4b57-ac1b-d9c9a1f542b1	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F18	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
1a257268-732f-4a58-81a8-4138decb7ad8	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F19	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
a2b188c3-788a-4a59-8678-6f5f33bc1fbd	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F20	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
1b0adf74-da30-43d5-8b11-1f4ac4075bb3	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F21	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
4fc3ef20-bab1-4598-866a-06155b46e67a	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F22	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
e8f26cec-fd28-44b1-ae13-6f464a904aa6	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F23	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
fa0677a0-e5ae-470e-bdfe-211d2ae82abc	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F24	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
6d16d3e1-39c2-48b0-8407-94e94d4500c8	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G1	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
ea8dbcf5-2cc9-4591-83f7-d278507b7c1b	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G2	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
0692d184-578c-4e1b-993c-83d9563c6ebe	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G3	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
c3858f82-2f76-49a9-bbf4-bce6d3998a1d	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G4	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
599978e8-1b07-40d0-97b9-73d94186481d	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G6	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
248e2b55-7d60-47bf-a73a-f446e775edf4	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G7	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
a6a79eb1-329c-4e8d-920e-9feb94bab215	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G8	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
9b7b288c-75ae-4f3c-9ed3-6b705682fb07	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G9	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
d53d9fa0-c1b7-4f42-8f1b-21d4996599e5	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G10	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
e0ab29d5-fbb7-498d-9f2d-0a112fb149a4	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G11	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
65624c07-9bdb-4a89-8e46-0d3dd5b20c00	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G12	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
34a49c1c-8f71-4006-abe8-4b73d849e331	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G13	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
c592e64f-a51a-4ffb-aa13-a25ee788bc6a	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G14	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
1ca749c7-d425-44ca-937c-b476759d5e47	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G15	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
18170c25-d09e-4088-943c-c5f8d74af4d5	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G16	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
a591dd75-18bb-449c-ba8b-25a928ae09c7	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G17	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
3e69d753-1df5-4ee6-9d58-342d5de912c0	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G18	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
81b1f6e6-e407-4135-964c-be8bca404e94	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G19	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
fcc14bb1-f992-4535-8e77-e5505f941d21	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G20	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
41d4268a-ab65-4225-8fcb-584f1b7c089c	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G21	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
1414bab0-fdb1-4d71-9917-3aa303b82e3d	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G22	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
d76fae4b-4728-4f08-a42b-776311370e4b	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G23	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
b55ef3d9-b1be-4489-baf1-fe3a4139caa7	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G24	\N	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.537
d69708c0-d391-45a3-8b0c-19bf18c3df62	d6a63010-d8ae-41ea-9a8a-761d14f9817d	A8	ec47e530-941e-4744-a004-863abc9c5f49	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.652
02e121a6-79d9-46fd-b250-90c927a453c8	d6a63010-d8ae-41ea-9a8a-761d14f9817d	B11	ec47e530-941e-4744-a004-863abc9c5f49	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.652
1ea7642e-6e23-4fea-b1cd-5ce7f7f85be1	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D20	ec47e530-941e-4744-a004-863abc9c5f49	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.652
bdef25ad-d60d-4c39-b451-617137ed7a85	d6a63010-d8ae-41ea-9a8a-761d14f9817d	D22	ec47e530-941e-4744-a004-863abc9c5f49	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.652
76defec0-e1e6-42f2-b4f5-8545a507109b	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E13	ec47e530-941e-4744-a004-863abc9c5f49	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.652
bc4ef359-b437-412a-9b1c-a16ca91d0268	d6a63010-d8ae-41ea-9a8a-761d14f9817d	E15	ec47e530-941e-4744-a004-863abc9c5f49	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.652
ebca477b-8e78-4de9-9dbe-fa2276aad2f5	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F3	ec47e530-941e-4744-a004-863abc9c5f49	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.652
ced67a78-de18-4db0-b540-5840fba02cf1	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F4	ec47e530-941e-4744-a004-863abc9c5f49	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.652
f8fa04ee-285b-471f-a1ac-0bfd6f724630	d6a63010-d8ae-41ea-9a8a-761d14f9817d	F7	ec47e530-941e-4744-a004-863abc9c5f49	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.652
2b5eac88-8e90-4d42-aad4-6ca08872dca9	d6a63010-d8ae-41ea-9a8a-761d14f9817d	G5	ec47e530-941e-4744-a004-863abc9c5f49	\N	\N	2025-10-29 04:15:56.537	2025-10-29 04:15:56.652
25b0d0be-0cf6-4777-b774-f0f622db3db9	5236380c-7df5-4c18-9802-de1bb3a855ff	A1	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
f12dd4f0-56de-4eb6-b9d3-ce27b8caa46f	5236380c-7df5-4c18-9802-de1bb3a855ff	A2	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
ce5d7325-ef87-4948-b3f5-8a92a1c74e44	5236380c-7df5-4c18-9802-de1bb3a855ff	A3	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
a566a3ae-0e50-4f2a-b01a-89e0d14ffe99	5236380c-7df5-4c18-9802-de1bb3a855ff	A5	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
cf3110f2-1669-447f-afba-cd6a135fe7b5	5236380c-7df5-4c18-9802-de1bb3a855ff	A6	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
ea53c1be-1726-47aa-9e5f-eb0af1405d48	5236380c-7df5-4c18-9802-de1bb3a855ff	A7	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
859d69e8-8361-48f0-b4f3-04ea061d11ac	5236380c-7df5-4c18-9802-de1bb3a855ff	A8	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
7fe82190-92c4-4bb4-83ff-398ac0d6487a	5236380c-7df5-4c18-9802-de1bb3a855ff	A9	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
300d8fae-fb91-4686-8dc3-c97610021fbd	5236380c-7df5-4c18-9802-de1bb3a855ff	A10	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
0d0a967d-ad6d-4599-bd84-228fee232924	5236380c-7df5-4c18-9802-de1bb3a855ff	A11	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
4268abc2-fce2-45da-bb5d-e495d9c99f89	5236380c-7df5-4c18-9802-de1bb3a855ff	A12	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
bb46d173-1f26-487e-85ee-b45dab5b2003	5236380c-7df5-4c18-9802-de1bb3a855ff	A13	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
bc37f4e6-575d-4e8e-ba5d-4fd7161cf7b5	5236380c-7df5-4c18-9802-de1bb3a855ff	A14	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
c0840387-a42f-49b6-827f-024e6f84efe6	5236380c-7df5-4c18-9802-de1bb3a855ff	A15	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
136a077a-7be8-486f-accc-3bb25b5daf9e	5236380c-7df5-4c18-9802-de1bb3a855ff	A17	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
89c24991-ef59-492c-883d-3be6c8d372a7	5236380c-7df5-4c18-9802-de1bb3a855ff	A18	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
b272609f-c8b5-44a7-88ad-042bfb64d39f	5236380c-7df5-4c18-9802-de1bb3a855ff	A19	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
177bd12b-2437-48cc-8043-4fb34d49aca3	5236380c-7df5-4c18-9802-de1bb3a855ff	A20	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
1340e03c-10e8-4907-8820-ea846557d075	5236380c-7df5-4c18-9802-de1bb3a855ff	B1	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
31a3ad71-2d57-485e-a66c-7ab7b10faea1	5236380c-7df5-4c18-9802-de1bb3a855ff	B2	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
59fb72b2-1e15-43ba-a4b0-d14b412efebd	5236380c-7df5-4c18-9802-de1bb3a855ff	B3	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
f91ecd15-3c12-4fb5-a865-2823c9a52511	5236380c-7df5-4c18-9802-de1bb3a855ff	B4	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
daf5fa58-d238-4876-b367-d270027742b6	5236380c-7df5-4c18-9802-de1bb3a855ff	B5	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
d8ee5ed9-fb62-47ed-b5b6-59739105e510	5236380c-7df5-4c18-9802-de1bb3a855ff	B6	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
880a75d3-073d-46eb-b925-86da67a6a069	5236380c-7df5-4c18-9802-de1bb3a855ff	B8	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
74ad420e-3e86-43e4-b7f7-75bbce6410fd	5236380c-7df5-4c18-9802-de1bb3a855ff	B9	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
2994872d-9982-4ef2-978e-ec84d9eaad6c	5236380c-7df5-4c18-9802-de1bb3a855ff	B10	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
86c44979-8a94-4f36-b864-755c0fc56241	5236380c-7df5-4c18-9802-de1bb3a855ff	B11	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
704e30ed-5002-41ef-9255-395779dce111	5236380c-7df5-4c18-9802-de1bb3a855ff	B12	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
f6700bcf-1cb4-4876-8a34-8dfadfc6d3a3	5236380c-7df5-4c18-9802-de1bb3a855ff	B13	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
51d34dff-cdd6-4793-b7a4-3fb2ac5d3428	5236380c-7df5-4c18-9802-de1bb3a855ff	B14	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
bb525b85-90e9-417d-ba51-cc5cdff0d3a2	5236380c-7df5-4c18-9802-de1bb3a855ff	B15	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
94cc1dae-9f5d-40fe-8fe5-f59e3b518026	5236380c-7df5-4c18-9802-de1bb3a855ff	B16	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
1e447086-6d5f-4c67-a701-22c8e4dd6113	5236380c-7df5-4c18-9802-de1bb3a855ff	B17	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
5a0bc656-77f6-41ca-a8c3-736f58cfcd57	5236380c-7df5-4c18-9802-de1bb3a855ff	B18	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
846e61cf-5eb8-4598-8dc8-e37dcf301bc1	5236380c-7df5-4c18-9802-de1bb3a855ff	B19	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
b0629f09-58a3-49a9-888a-1e39559ce86f	5236380c-7df5-4c18-9802-de1bb3a855ff	B20	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
6a5b71f2-221b-45f1-bd0c-0d240e41d073	5236380c-7df5-4c18-9802-de1bb3a855ff	C1	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
384e90b0-3666-44e1-9db1-4c69f7bbc3bd	5236380c-7df5-4c18-9802-de1bb3a855ff	C2	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
6d9a76a3-7459-4fba-ab0a-f9c71a5b2caa	5236380c-7df5-4c18-9802-de1bb3a855ff	C3	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
0df61226-2e0f-4657-83f1-be0eb490db27	5236380c-7df5-4c18-9802-de1bb3a855ff	C4	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
a036e1bb-29f5-44d9-b507-877018be9ba2	5236380c-7df5-4c18-9802-de1bb3a855ff	C5	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
c2f92b45-691e-4b01-86c5-3badf7f023a5	5236380c-7df5-4c18-9802-de1bb3a855ff	C6	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
40a0c13a-17b5-42ca-a4e4-7a073ebd8b01	5236380c-7df5-4c18-9802-de1bb3a855ff	C7	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
e0567c91-b92c-4f7c-9b59-fa051cc93ab3	5236380c-7df5-4c18-9802-de1bb3a855ff	C8	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
d446b5db-90a1-4071-a25c-e4b0f501cc16	5236380c-7df5-4c18-9802-de1bb3a855ff	C9	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
c511bd49-e27d-42cb-816c-6e62c889033d	5236380c-7df5-4c18-9802-de1bb3a855ff	C10	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
dd262040-a51c-420a-bfed-b316ea9c593c	5236380c-7df5-4c18-9802-de1bb3a855ff	C14	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
d97a67b6-f204-43f1-808b-91674a831e22	5236380c-7df5-4c18-9802-de1bb3a855ff	C15	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
ee6ac2a7-d591-4b70-b431-5852179d6337	5236380c-7df5-4c18-9802-de1bb3a855ff	C16	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
d2bd105c-15bf-42cb-a42b-5bde22234143	5236380c-7df5-4c18-9802-de1bb3a855ff	C17	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
9f5f64a5-a21c-45ff-b3a0-6d4076110867	5236380c-7df5-4c18-9802-de1bb3a855ff	C18	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
458d309d-0e8f-4732-b45c-8e2bb664703f	5236380c-7df5-4c18-9802-de1bb3a855ff	C19	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
2afdd19b-281c-47da-a092-6021fc4b9c44	5236380c-7df5-4c18-9802-de1bb3a855ff	C21	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
02549e3d-8265-4f56-838e-11cac76833ef	5236380c-7df5-4c18-9802-de1bb3a855ff	C22	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
0f9f9f78-a558-4d18-8566-e7c200cd13d1	5236380c-7df5-4c18-9802-de1bb3a855ff	D1	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
f764253a-6d63-48e8-bdc3-a6030fe9f1fd	5236380c-7df5-4c18-9802-de1bb3a855ff	D2	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
1a31b6ea-619a-4938-a08c-5a62a173ba2d	5236380c-7df5-4c18-9802-de1bb3a855ff	D3	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
9041dfd2-f721-4dcd-86d1-db8d608d143d	5236380c-7df5-4c18-9802-de1bb3a855ff	D4	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
a89ada10-36ff-4e94-8c69-c448ea3159bc	5236380c-7df5-4c18-9802-de1bb3a855ff	D5	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
b72f94cf-dd07-43a4-8fab-089816113c71	5236380c-7df5-4c18-9802-de1bb3a855ff	D6	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
c49f9d39-5ef1-4f01-ac00-bc48f3c68c5d	5236380c-7df5-4c18-9802-de1bb3a855ff	D7	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
3ab51f73-00b3-4f97-a3cd-ff2eff67b096	5236380c-7df5-4c18-9802-de1bb3a855ff	D8	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
47e30015-fd83-4c57-a4ff-65704517cacb	5236380c-7df5-4c18-9802-de1bb3a855ff	D9	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
d9632399-4f19-401c-a8f7-dfca66288d41	5236380c-7df5-4c18-9802-de1bb3a855ff	D10	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
f4f751ed-12c9-4df8-93ee-6d75ea5446aa	5236380c-7df5-4c18-9802-de1bb3a855ff	D11	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
36a8f200-8fc9-4c56-a5cb-6b19f414e160	5236380c-7df5-4c18-9802-de1bb3a855ff	D12	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
4931be87-d638-43be-b900-c8ec21b05a52	5236380c-7df5-4c18-9802-de1bb3a855ff	D13	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
1fa030b0-6749-4937-86d1-89f3e8036e03	5236380c-7df5-4c18-9802-de1bb3a855ff	D14	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
c624a04f-f134-410d-9430-75aeba71e3a8	5236380c-7df5-4c18-9802-de1bb3a855ff	D15	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
89177200-bd1e-4d50-a7ef-f31dcd9c8bf2	5236380c-7df5-4c18-9802-de1bb3a855ff	D16	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
5c9c9518-4dcd-4345-85a0-85ce477ee3d8	5236380c-7df5-4c18-9802-de1bb3a855ff	D17	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
eeb8309f-ad6e-4207-96ab-c690a0a158ca	5236380c-7df5-4c18-9802-de1bb3a855ff	D18	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
ae34e9bd-f598-4802-adec-e15671e352ae	5236380c-7df5-4c18-9802-de1bb3a855ff	D19	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
f6ea37ed-c367-4f88-aeef-269e6aa62005	5236380c-7df5-4c18-9802-de1bb3a855ff	D21	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
84669e0a-9621-4471-8fa6-53e3e0103f2c	5236380c-7df5-4c18-9802-de1bb3a855ff	D22	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
5bf25817-ee62-4ccd-ae0e-9e88922bfd0b	5236380c-7df5-4c18-9802-de1bb3a855ff	E1	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
43fff29d-72a3-4a8f-952e-9ea2e16b5ee8	5236380c-7df5-4c18-9802-de1bb3a855ff	E2	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
37ab9b60-2484-4e33-81d1-36a21864db66	5236380c-7df5-4c18-9802-de1bb3a855ff	E3	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
648dca14-2fc5-48ac-b031-9aef756121bd	5236380c-7df5-4c18-9802-de1bb3a855ff	E5	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
694e38ae-6e00-4c73-999a-6429763c21f5	5236380c-7df5-4c18-9802-de1bb3a855ff	E6	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
cbb32f84-7925-4988-8226-52b8967bccc3	5236380c-7df5-4c18-9802-de1bb3a855ff	E7	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
478ccf54-b884-4e6a-a8fe-3325654032be	5236380c-7df5-4c18-9802-de1bb3a855ff	E8	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
f05d3001-c551-43ec-8bef-a58fe90aa371	5236380c-7df5-4c18-9802-de1bb3a855ff	E9	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
b6d9d6d5-7934-42a8-85f4-bd8da90c873e	5236380c-7df5-4c18-9802-de1bb3a855ff	E10	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
26b99173-d1c3-4579-9564-019a6eff86c7	5236380c-7df5-4c18-9802-de1bb3a855ff	E11	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
44f660b6-61cf-4fd4-91f3-3cca95d754b3	5236380c-7df5-4c18-9802-de1bb3a855ff	E12	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
56aeb1bd-ecce-4e88-9af8-6dc82e58674d	5236380c-7df5-4c18-9802-de1bb3a855ff	E14	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
f323b910-853e-4e17-83ce-4a9fe8cee50e	5236380c-7df5-4c18-9802-de1bb3a855ff	E15	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
8e2dc23a-9c6c-438e-8845-ae44902fe243	5236380c-7df5-4c18-9802-de1bb3a855ff	E16	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
4b42baba-0379-41a1-9c0b-0db85e2586e3	5236380c-7df5-4c18-9802-de1bb3a855ff	E17	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
84a5e749-50b0-415e-ad38-a24d7544ed13	5236380c-7df5-4c18-9802-de1bb3a855ff	E18	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
a0cafc26-ef81-4c48-8682-b1bdbb2f9b7e	5236380c-7df5-4c18-9802-de1bb3a855ff	E20	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
02f0b8a5-14d2-4e49-a1e3-1f13c08b7532	5236380c-7df5-4c18-9802-de1bb3a855ff	E21	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
b4052016-08e8-40b5-979d-229b94743d24	5236380c-7df5-4c18-9802-de1bb3a855ff	E22	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
14d4be93-9943-4eea-ad24-d2aba0b4e5a2	5236380c-7df5-4c18-9802-de1bb3a855ff	E23	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
bd372570-942c-4732-91aa-3822fac10c34	5236380c-7df5-4c18-9802-de1bb3a855ff	E24	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
7ed7eb8e-43b9-46ca-a6ec-3ccd689b91ed	5236380c-7df5-4c18-9802-de1bb3a855ff	F2	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
6535b664-fd47-4cc8-83ca-ed31a3a52a71	5236380c-7df5-4c18-9802-de1bb3a855ff	F3	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
43060282-ef90-4dbf-b08b-7978c06004d7	5236380c-7df5-4c18-9802-de1bb3a855ff	F4	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
0052826e-44ca-4207-a4a2-1a98abf099e2	5236380c-7df5-4c18-9802-de1bb3a855ff	F5	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
a6992fb9-1dc5-480a-bf73-4cb45eba43bd	5236380c-7df5-4c18-9802-de1bb3a855ff	F6	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
a4689cc4-e08d-4deb-b37d-b85a9731740e	5236380c-7df5-4c18-9802-de1bb3a855ff	F7	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
3fc5a99b-0087-4e7e-b9c1-82dc5bd90654	5236380c-7df5-4c18-9802-de1bb3a855ff	F8	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
36c08907-103c-4493-bb2c-4beb3883b46f	5236380c-7df5-4c18-9802-de1bb3a855ff	F9	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
584adce5-c6e4-485f-8bc0-370019e6ad5b	5236380c-7df5-4c18-9802-de1bb3a855ff	F10	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
30f922ab-fa20-47e9-9a5e-2e5e044b089d	5236380c-7df5-4c18-9802-de1bb3a855ff	F11	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
e93aaec9-0902-423d-be6c-c7fc6b4bb422	5236380c-7df5-4c18-9802-de1bb3a855ff	F13	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
301af139-8216-4b77-9ab9-e9f081a3cdf6	5236380c-7df5-4c18-9802-de1bb3a855ff	F14	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
76dc9009-211c-421e-b4eb-e4e14a2ce42d	5236380c-7df5-4c18-9802-de1bb3a855ff	F15	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
157c30fa-1298-455a-9d7f-344df8db1996	5236380c-7df5-4c18-9802-de1bb3a855ff	F16	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
0b454b6c-7829-442e-8acc-a7c7606b5a59	5236380c-7df5-4c18-9802-de1bb3a855ff	F17	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
b162cf58-4ba3-43b8-a283-40bd8125ab43	5236380c-7df5-4c18-9802-de1bb3a855ff	F18	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
4ae1f393-f27d-4891-abe3-cd70675c9930	5236380c-7df5-4c18-9802-de1bb3a855ff	F19	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
381d58de-9abd-42ef-a5d5-3b4214bed642	5236380c-7df5-4c18-9802-de1bb3a855ff	F20	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
b7e916ab-7658-440b-8207-460c26289138	5236380c-7df5-4c18-9802-de1bb3a855ff	F21	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
57aef03a-80cb-4603-a32a-3e8f1914754d	5236380c-7df5-4c18-9802-de1bb3a855ff	F22	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
4d0b1e6f-786d-4968-9a6c-f565d6cc298f	5236380c-7df5-4c18-9802-de1bb3a855ff	F23	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
63a58b9f-3dc0-4dfb-9771-188da2dbc460	5236380c-7df5-4c18-9802-de1bb3a855ff	F24	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
b7db95cb-1a3b-4e46-99c0-b5d298e77808	5236380c-7df5-4c18-9802-de1bb3a855ff	G1	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
c1fdbfe1-df59-4554-8429-cf53e3fb487d	5236380c-7df5-4c18-9802-de1bb3a855ff	G2	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
9091e0db-7ccb-4f36-b4ba-e3f0e5f74e36	5236380c-7df5-4c18-9802-de1bb3a855ff	G3	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
63dbc8fa-a71a-44c9-b44f-82ccf49086d7	5236380c-7df5-4c18-9802-de1bb3a855ff	G4	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
52a26c71-f5c9-4f56-86fb-3bc3aabff1f6	5236380c-7df5-4c18-9802-de1bb3a855ff	G5	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
0fce4454-a8b1-439e-94c9-46eb7c7eeddf	5236380c-7df5-4c18-9802-de1bb3a855ff	G6	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
f962969a-e43c-4bd1-b4a2-853fae1bd1ba	5236380c-7df5-4c18-9802-de1bb3a855ff	G7	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
9664efcc-3a0f-4a15-af16-8df6b31cda95	5236380c-7df5-4c18-9802-de1bb3a855ff	G8	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
22d20e3b-08d6-456a-95c3-afd596c1b52c	5236380c-7df5-4c18-9802-de1bb3a855ff	G9	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
36ab695d-53cd-4e86-a1f9-445e5050bd29	5236380c-7df5-4c18-9802-de1bb3a855ff	G10	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
b850ef8c-51b1-4cbb-9c67-ed9182437242	5236380c-7df5-4c18-9802-de1bb3a855ff	G11	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
e76b89fb-2527-4193-8979-f0f61f161eff	5236380c-7df5-4c18-9802-de1bb3a855ff	G12	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
b1b736e0-565b-45f8-b168-15d8599a04f3	5236380c-7df5-4c18-9802-de1bb3a855ff	G13	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
186809aa-e14a-4e4d-9175-290b7ae0b352	5236380c-7df5-4c18-9802-de1bb3a855ff	G14	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
44bd8ad3-470e-4ef4-97e8-2e1d8ed07bc7	5236380c-7df5-4c18-9802-de1bb3a855ff	G15	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
0ab829be-6c83-43a3-892c-6e7c29e4821e	5236380c-7df5-4c18-9802-de1bb3a855ff	G16	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
1e022dc1-5c74-4284-95ff-40acca564e12	5236380c-7df5-4c18-9802-de1bb3a855ff	G17	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
5c6655c2-8978-40c3-a847-e62bbfb68398	5236380c-7df5-4c18-9802-de1bb3a855ff	G19	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
6f2ea9fd-6a4d-43c7-8172-db7fb4e5c1a7	5236380c-7df5-4c18-9802-de1bb3a855ff	G20	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
9adbbb7d-1514-42fa-93ff-44db40a19622	5236380c-7df5-4c18-9802-de1bb3a855ff	G21	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
be5a70b5-b5de-4a88-aeb4-3e186f77d4e8	5236380c-7df5-4c18-9802-de1bb3a855ff	G22	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
2917ed3f-cb91-4077-8f33-db9f4e824ffa	5236380c-7df5-4c18-9802-de1bb3a855ff	G23	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
94e39cb4-b285-45ff-b5a7-0b7a897c3355	5236380c-7df5-4c18-9802-de1bb3a855ff	H1	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
f06e9de6-8970-45e0-bace-b8172c6249ce	5236380c-7df5-4c18-9802-de1bb3a855ff	H2	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
1ffb21a9-9c14-4d18-98f1-036ba4bfc2d6	5236380c-7df5-4c18-9802-de1bb3a855ff	H3	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
3901a32a-3937-49a7-91ad-48c5bceb4714	5236380c-7df5-4c18-9802-de1bb3a855ff	H4	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
2206dbbb-10a9-46a0-bc31-faffbb69a741	5236380c-7df5-4c18-9802-de1bb3a855ff	H5	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
18b6c2f5-7a22-4825-a21f-14f410104414	5236380c-7df5-4c18-9802-de1bb3a855ff	H6	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
02c3826e-9371-4f8d-ac5b-ddeb1b682c2f	5236380c-7df5-4c18-9802-de1bb3a855ff	H7	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
bfb221b0-22b6-49c6-a5c4-2a9077983998	5236380c-7df5-4c18-9802-de1bb3a855ff	H8	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
c20e403a-de50-4226-90f9-870e418b962b	5236380c-7df5-4c18-9802-de1bb3a855ff	H9	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
51013739-606a-41cd-8059-3f5d1bb20e0b	5236380c-7df5-4c18-9802-de1bb3a855ff	H10	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
41a64a33-7948-468d-aea1-66b2e3cb6d29	5236380c-7df5-4c18-9802-de1bb3a855ff	H11	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
f40a342b-dbee-4935-bb49-99488a30802c	5236380c-7df5-4c18-9802-de1bb3a855ff	H12	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
08e2a5be-d239-45e1-aa2d-139164fd16cb	5236380c-7df5-4c18-9802-de1bb3a855ff	H13	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
dbc1a305-4b4e-40f4-9c57-33646db219c5	5236380c-7df5-4c18-9802-de1bb3a855ff	H14	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
70c7da77-7c2a-42b0-804a-deea00f53fca	5236380c-7df5-4c18-9802-de1bb3a855ff	H15	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
7571f0cd-b5d3-4891-ab25-54fa0ad53b37	5236380c-7df5-4c18-9802-de1bb3a855ff	H16	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
64a02693-6247-4247-a1d3-265f6608c045	5236380c-7df5-4c18-9802-de1bb3a855ff	H17	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
9979802d-20e4-4075-85ed-d967397811dc	5236380c-7df5-4c18-9802-de1bb3a855ff	H18	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
0d86a518-ad38-4562-b5d8-4d9429bb10a3	5236380c-7df5-4c18-9802-de1bb3a855ff	H19	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
7bdb4e73-f1ee-4a9c-9e4a-abe4ab34f409	5236380c-7df5-4c18-9802-de1bb3a855ff	H20	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
acefec3a-47fc-4fba-87f5-07e7998a9d4f	5236380c-7df5-4c18-9802-de1bb3a855ff	H21	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
0ede13d9-c02a-44b5-a8da-98a6cc004a78	5236380c-7df5-4c18-9802-de1bb3a855ff	H22	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
1f960dab-f76a-4bdd-aaf6-cac104bf3a0f	5236380c-7df5-4c18-9802-de1bb3a855ff	H23	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
74efea25-9bea-447a-966c-fd25696a0e82	5236380c-7df5-4c18-9802-de1bb3a855ff	H24	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
c2adc299-ab61-47ce-acf9-1295e4bcc749	5236380c-7df5-4c18-9802-de1bb3a855ff	I1	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
b3b57043-af36-4b85-87e0-f00c07cf1043	5236380c-7df5-4c18-9802-de1bb3a855ff	I2	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
be23e141-b98e-4ce3-aaef-eafcde6fa822	5236380c-7df5-4c18-9802-de1bb3a855ff	I3	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
8c33fb45-7ee0-473f-afbf-01020c7b18d8	5236380c-7df5-4c18-9802-de1bb3a855ff	I4	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
07b52347-6399-4468-970a-c88e04378806	5236380c-7df5-4c18-9802-de1bb3a855ff	I5	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
d9273ba8-c5dc-4b4c-a1c3-15b498c28ff2	5236380c-7df5-4c18-9802-de1bb3a855ff	I6	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
cd09c47d-3f34-445d-8cde-d97ab1999515	5236380c-7df5-4c18-9802-de1bb3a855ff	I7	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
bb002b63-68dc-4f9e-875e-8d1f1cd7a595	5236380c-7df5-4c18-9802-de1bb3a855ff	I8	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
3c80c348-7509-4be3-a6cd-ae2c2c3f4e23	5236380c-7df5-4c18-9802-de1bb3a855ff	I9	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
58438456-982a-4a09-8141-bfe2b5b11da5	5236380c-7df5-4c18-9802-de1bb3a855ff	I10	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
86a42a58-e5eb-411e-8e6f-d008c7b47433	5236380c-7df5-4c18-9802-de1bb3a855ff	I11	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
7465c993-1139-4e6a-9df1-edaff5815658	5236380c-7df5-4c18-9802-de1bb3a855ff	I12	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
a059ef5c-282f-4e7d-aaab-46040a5af436	5236380c-7df5-4c18-9802-de1bb3a855ff	I13	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
586fbe0c-a3a6-4429-9b1b-9ffeee2fba19	5236380c-7df5-4c18-9802-de1bb3a855ff	I14	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
4e1f3b09-4ade-4acc-8902-dc65f21ef621	5236380c-7df5-4c18-9802-de1bb3a855ff	I15	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
bcd18867-0077-4652-ad37-26dbd249ac07	5236380c-7df5-4c18-9802-de1bb3a855ff	I16	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
2a022b30-aeb0-4bfb-ab4e-46785cd8b211	5236380c-7df5-4c18-9802-de1bb3a855ff	I17	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
95b2a797-c049-4e9b-a084-002daaa6af20	5236380c-7df5-4c18-9802-de1bb3a855ff	I18	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
36e1bf19-ef72-422b-9cae-89d66d90d800	5236380c-7df5-4c18-9802-de1bb3a855ff	J1	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
15720910-e61e-4ad1-bdf6-94e3fa7e5605	5236380c-7df5-4c18-9802-de1bb3a855ff	J2	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
92fbf2aa-e17f-45d6-a8f8-2f4ad3dca7af	5236380c-7df5-4c18-9802-de1bb3a855ff	J3	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
0424d10a-aa53-4bf5-88db-2954bfe57aa0	5236380c-7df5-4c18-9802-de1bb3a855ff	J4	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
000b2b6b-8f9f-41e5-ae20-647424b791bf	5236380c-7df5-4c18-9802-de1bb3a855ff	J5	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
35c1ee34-f0e7-425e-9d75-a691a5d762f4	5236380c-7df5-4c18-9802-de1bb3a855ff	J6	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
fda4092c-62a9-4a53-8f8c-5a0e88b0880a	5236380c-7df5-4c18-9802-de1bb3a855ff	J7	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
9aba9adc-76d3-4aa2-b6c8-0d0db0b91d19	5236380c-7df5-4c18-9802-de1bb3a855ff	J8	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
6022a606-86e7-486c-8c84-10bdcb28a456	5236380c-7df5-4c18-9802-de1bb3a855ff	J9	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
4df87e27-4ecd-4b8d-9aa1-4f83d05c5ad2	5236380c-7df5-4c18-9802-de1bb3a855ff	J10	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
5043f25e-d910-4020-a508-81a0d9f86ebb	5236380c-7df5-4c18-9802-de1bb3a855ff	J11	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
7b76496c-4c6b-4af3-a189-35c2bc33ba07	5236380c-7df5-4c18-9802-de1bb3a855ff	J12	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
83f7231a-5b78-4960-92fd-6233f4cd41d2	5236380c-7df5-4c18-9802-de1bb3a855ff	J13	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
6da12086-9824-4a4d-b583-602b4bb5e5a1	5236380c-7df5-4c18-9802-de1bb3a855ff	J14	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
0fff6a5b-f652-4a06-894c-017a2265e51c	5236380c-7df5-4c18-9802-de1bb3a855ff	J15	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
1e17e72a-737c-4a84-804b-50ce51b30ec1	5236380c-7df5-4c18-9802-de1bb3a855ff	J16	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
2001f460-2e00-4304-bcbc-89772170febb	5236380c-7df5-4c18-9802-de1bb3a855ff	J17	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
5276127c-d20a-4120-8c3a-7723d977eec2	5236380c-7df5-4c18-9802-de1bb3a855ff	J18	\N	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.682
84159da9-d9c2-457a-8577-6afff5abba85	5236380c-7df5-4c18-9802-de1bb3a855ff	A4	d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.815
88f4c066-9df4-4896-8947-ca832fb9bf84	5236380c-7df5-4c18-9802-de1bb3a855ff	A16	d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.815
584dd419-577b-4f19-8176-5199e4570c9c	5236380c-7df5-4c18-9802-de1bb3a855ff	B7	d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.815
0edd2cc9-f29e-481d-811a-042506b8756f	5236380c-7df5-4c18-9802-de1bb3a855ff	C11	d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.815
bcc5e52d-9c80-40ac-97a6-ffdfaea52752	5236380c-7df5-4c18-9802-de1bb3a855ff	C12	d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.815
e1278e18-cc34-4261-86c1-8667a07d6759	5236380c-7df5-4c18-9802-de1bb3a855ff	C13	d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.815
6efde936-43f3-474f-9dd3-62d53d9fddf3	5236380c-7df5-4c18-9802-de1bb3a855ff	C20	d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.815
529df057-4dfb-4959-8bf3-40478d59f160	5236380c-7df5-4c18-9802-de1bb3a855ff	D20	d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.815
9642230b-8614-4bf3-ae72-b60d3b25aada	5236380c-7df5-4c18-9802-de1bb3a855ff	E4	d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.815
5d4b6ef3-c245-4b06-a0f8-a3f33b1b89f0	5236380c-7df5-4c18-9802-de1bb3a855ff	E13	d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.815
4442d12b-8a51-4bfa-a2c4-c26153c95922	5236380c-7df5-4c18-9802-de1bb3a855ff	E19	d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.815
6a5f6bc2-9666-4f21-9d34-09544a2c40b8	5236380c-7df5-4c18-9802-de1bb3a855ff	F1	d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.815
d700c613-c9a2-4913-b9b9-b44904aab08b	5236380c-7df5-4c18-9802-de1bb3a855ff	F12	d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.815
87df5eba-5a5a-40fc-8408-bfb9d837d1a5	5236380c-7df5-4c18-9802-de1bb3a855ff	G18	d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.815
4f95195b-bb56-430f-814b-931bda5bf84f	5236380c-7df5-4c18-9802-de1bb3a855ff	G24	d2b69853-b8f8-4c0e-bc1e-e41849f5cfe9	\N	\N	2025-10-29 04:15:56.682	2025-10-29 04:15:56.815
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."User" (id, email, "passwordHash", "fullName", "createdAt") FROM stdin;
8320d02b-bdcc-42a1-8010-02e4b45e6157	nguyen.an@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Gia An	2025-10-29 04:15:55.501
e87e1255-1ce3-405d-8f40-f78a943e717f	phan.vy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Bảo Vy	2025-10-29 04:15:55.501
9ee5c0b3-a910-4165-b1d8-a82ca72e4937	tran.long@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Thu Long	2025-10-29 04:15:55.501
32812bca-83ce-470a-b7c1-042fb3195065	tran.dung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Bảo Dũng	2025-10-29 04:15:55.501
8167c208-8fbb-421b-8e74-cfa0ab8ff2ad	duong.dung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Quang Dũng	2025-10-29 04:15:55.501
66318e3f-977f-4ff9-a3e9-dd679060c0da	vo.quyen@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Võ Công Quyên	2025-10-29 04:15:55.501
32e9742d-5013-4730-9758-4898e3855936	le.hung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Lan Hùng	2025-10-29 04:15:55.501
87b277de-46f9-4b6f-9c81-1e2980d75cfd	bui.duy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Anh Duy	2025-10-29 04:15:55.501
9a80e2f9-3bc9-4e4e-974a-da744f84884f	phan.quan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Việt Quân	2025-10-29 04:15:55.501
14fac742-8b1f-4041-911b-60b2b38e68dd	duong.phong@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Trung Phong	2025-10-29 04:15:55.501
1ceaa892-ba53-4b07-b7f7-c70c136845e3	nguyen.khanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Đức Khanh	2025-10-29 04:15:55.501
bfff91a4-e2d9-48ac-9e38-3df3213171fe	phan.duy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Lan Duy	2025-10-29 04:15:55.501
22faacdd-2631-42a2-9254-586962a8d6fd	pham.chau@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Quang Châu	2025-10-29 04:15:55.501
e34bb3d2-0092-4019-be0e-fdfc0ad56e53	huynh.phuc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Thị Phúc	2025-10-29 04:15:55.501
03f6fd1c-4607-4a18-a035-d4da3c3bae55	le.nga@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Xuân Nga	2025-10-29 04:15:55.501
b92ad8db-c45f-4d9c-9e55-783551a7cff1	le.quyen@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Quang Quyên	2025-10-29 04:15:55.501
3a6c6e33-eeb8-4f0b-b0d1-0f3ee975207c	huynh.tam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Đức Tâm	2025-10-29 04:15:55.501
85291320-7a3e-4a0d-be83-496150c40ebe	vo.giang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Võ Việt Giang	2025-10-29 04:15:55.501
6a3b4b5d-47fc-471e-831d-ea32e7433574	bui.dung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Việt Dũng	2025-10-29 04:15:55.501
05148bf5-b107-4c05-bcc2-922c25de76af	do.huy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Quang Huy	2025-10-29 04:15:55.501
55cfc6a6-9875-46de-97cf-40ed13a9298e	ho.nam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Hải Nam	2025-10-29 04:15:55.501
4dda6147-e814-4e5e-9518-ed953195ce90	ly.chi@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Tuấn Chi	2025-10-29 04:15:55.501
3fc89e88-78fa-4d65-a7da-7d3cef39c623	ngo.binh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Yến Bình	2025-10-29 04:15:55.501
9f807a0e-b822-4ff2-979d-4d846efb19d5	ho.giang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Kim Giang	2025-10-29 04:15:55.501
92d180e9-3ad3-4900-bc6d-3bd997a24b25	ly.nga@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Kim Nga	2025-10-29 04:15:55.501
4575e01a-38da-4977-8111-52559ac0254f	do.son@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Đức Sơn	2025-10-29 04:15:55.501
ce246b9c-f21b-4f1c-9c91-3eaf555b5b72	vu.tam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Hồng Tâm	2025-10-29 04:15:55.501
d7c77b55-5f82-44ab-9faa-49e69628a0e6	hoang.son@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Huỳnh Sơn	2025-10-29 04:15:55.501
becc4a55-fc04-48c3-a4d3-85bf694db0a3	huynh.quyen@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Hồng Quyên	2025-10-29 04:15:55.501
76d1d99c-a89f-43f0-99f5-04cd86b97143	le.mai@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Quang Mai	2025-10-29 04:15:55.501
067b2f04-edc5-46e1-9869-1ad137ae80c7	duong.nhung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Quang Nhung	2025-10-29 04:15:55.501
142dcabd-29de-4167-8f61-0976279172a1	huynh.phong@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Kim Phong	2025-10-29 04:15:55.501
45f4808e-447d-415f-b12b-8671820aae71	vu.phong@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Anh Phong	2025-10-29 04:15:55.501
64603edb-edec-4909-8335-e41e63c4c5ca	le.ha@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Lan Hà	2025-10-29 04:15:55.501
bee6da45-04ec-4f22-aa00-82eda5afcadf	vu.thao@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Hồng Thảo	2025-10-29 04:15:55.501
a52141b5-a668-4f36-aeda-c55396b2ca50	ho.vy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Bảo Vy	2025-10-29 04:15:55.501
2ec0b0f4-f25f-4fc7-92d9-c46411ed5068	do.giang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Phương Giang	2025-10-29 04:15:55.501
4c237614-003d-4dab-81dc-f58cf0514351	vu.quan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Xuân Quân	2025-10-29 04:15:55.501
09a62841-b5f5-442a-bc8b-21ab2c2ac90b	duong.thang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Việt Thắng	2025-10-29 04:15:55.501
84bae3ce-3ec3-4633-92cb-ef1f5df10d4b	ly.kim.nga@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Kim Nga	2025-10-29 04:15:55.501
f0dd7b63-7a44-44f7-bdff-02b7851542de	nguyen.long@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Bảo Long	2025-10-29 04:15:55.501
e6cace32-5318-4319-a78b-82b65a594567	ho.huy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Ngọc Huy	2025-10-29 04:15:55.501
fdc633f4-f0bb-48ef-90e3-d2541df8be0f	hoang.hieu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Thanh Hiếu	2025-10-29 04:15:55.501
aa6b6823-f211-4161-82ad-3a662a50961e	le.long@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Gia Long	2025-10-29 04:15:55.501
11e64020-1de9-4bb5-887a-cfa473e3dbea	do.binh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Xuân Bình	2025-10-29 04:15:55.501
e828a0c0-d9a4-4c75-ac47-61d97e083216	bui.tung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Thanh Tùng	2025-10-29 04:15:55.501
8bd67cc7-2b63-4a8c-814c-87bd01b80c3c	duong.minh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Khánh Minh	2025-10-29 04:15:55.501
de66cb03-ccc5-42a7-b55b-b28bc07f87c4	ho.phong@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Công Phong	2025-10-29 04:15:55.501
7bc86bae-4311-4245-8104-05c461fb9a45	dang.quang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Kim Quang	2025-10-29 04:15:55.501
ee6298b0-7c77-4655-a176-18e955f19763	ly.hieu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Minh Hiếu	2025-10-29 04:15:55.501
b04d0d4a-c4b7-472e-becf-ffbb83ef7541	vo.nga@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Võ Huỳnh Nga	2025-10-29 04:15:55.501
c536e398-3934-4719-a6b4-58862421fdf4	ngo.thanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Gia Thành	2025-10-29 04:15:55.501
cfd9f4ee-b434-4b4b-b4b4-adf0eeb4c084	tran.vy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Khánh Vy	2025-10-29 04:15:55.501
5bb57636-f5ac-45b8-910d-d2731f0f3b17	huynh.anh.quyen@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Anh Quyên	2025-10-29 04:15:55.501
1e6894bd-b476-423d-8d25-64190be32ba3	ly.giang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Anh Giang	2025-10-29 04:15:55.501
f12ee458-5c3c-4d89-ba5c-81ccadb0f49e	le.duy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Huỳnh Duy	2025-10-29 04:15:55.501
191c6948-2193-498d-9b74-3e681c4b361f	bui.son@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Phương Sơn	2025-10-29 04:15:55.501
d7efc5cf-2f8d-48e8-8024-9c6168f7c71f	ho.tung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Yến Tùng	2025-10-29 04:15:55.501
da752383-6bd9-4c59-a683-09c9e044f656	duong.huy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Kim Huy	2025-10-29 04:15:55.501
1688ccb2-06e1-4bfa-ba34-a6ec062a003f	bui.tuan.son@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Tuấn Sơn	2025-10-29 04:15:55.501
d94136c4-f1ae-427f-9e5e-923e789d95b5	vu.an@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Ngọc An	2025-10-29 04:15:55.501
5eccdb8c-af6e-45d2-bea2-eecfc6f71679	hoang.giang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Khánh Giang	2025-10-29 04:15:55.501
cbe441d1-53fe-4975-919a-8b606dfd9bbd	nguyen.thanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Thanh Thành	2025-10-29 04:15:55.501
851a9174-170c-4a8a-9742-f31b753fc90c	huynh.minh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Đức Minh	2025-10-29 04:15:55.501
4c7b6536-ca68-4275-b9cb-e01f0149454a	ngo.nhung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Việt Nhung	2025-10-29 04:15:55.501
20127051-757c-4cd0-944a-493bc6f94ad6	ly.khanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Quang Khanh	2025-10-29 04:15:55.501
c5ec5a8c-fc11-40a7-adc0-33a0092e8073	ho.thang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Tuấn Thắng	2025-10-29 04:15:55.501
24740e71-0617-458a-a6ff-d0b66d99722b	huynh.duy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Phương Duy	2025-10-29 04:15:55.501
39e987cb-9358-47c1-be53-947b471a7ec0	duong.long@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Phương Long	2025-10-29 04:15:55.501
08a3f5aa-a669-4a07-9f75-0dbb9666ce59	nguyen.tung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Huỳnh Tùng	2025-10-29 04:15:55.501
a5236962-5514-4213-9321-6154758fc9e0	nguyen.quan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Anh Quân	2025-10-29 04:15:55.501
6f80a2d9-2247-4599-938c-aee1bdac1f15	bui.trung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Yến Trung	2025-10-29 04:15:55.501
6105607d-1b18-4667-9319-f6e6a90bccf8	ho.son@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Ngọc Sơn	2025-10-29 04:15:55.501
05a924e2-48cb-4283-aad4-f1b0792660ea	nguyen.chi@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Thị Chi	2025-10-29 04:15:55.501
a22bc172-0392-45ea-ba8e-147e64b5163b	hoang.linh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Tuấn Linh	2025-10-29 04:15:55.501
a6bdf300-2468-470f-8b90-b70420f10e84	vu.long@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Công Long	2025-10-29 04:15:55.501
8a92dbd3-a016-456e-ab9f-f73ba1d4700d	phan.thi.vy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Thị Vy	2025-10-29 04:15:55.501
5070847b-7280-4637-8e41-46940ba5e8b9	duong.ngoc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Huỳnh Ngọc	2025-10-29 04:15:55.501
c5b7f730-c061-4e0c-a233-96664928e74a	le.nhung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Tuấn Nhung	2025-10-29 04:15:55.501
22b4a50f-c27c-4173-93c3-aafa43c433a1	le.anh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Bảo Anh	2025-10-29 04:15:55.501
78e2bbc1-99bf-4084-acde-88c0d150bf13	duong.thien@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Tuấn Thiên	2025-10-29 04:15:55.501
ca802669-c2d0-4e2b-b151-e8c059d16e2f	ho.nga@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Thị Nga	2025-10-29 04:15:55.501
362d12de-380e-472c-ac4f-e80ad0119a4d	le.chi@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Tuấn Chi	2025-10-29 04:15:55.501
3b89c852-8c17-4eb9-ac13-d4cdd8cfc0dc	ho.dung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Kim Dũng	2025-10-29 04:15:55.501
cbc422b2-dd68-4e50-b8ca-380b7bd4e063	vu.hai@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Công Hải	2025-10-29 04:15:55.501
6fdf4bd7-360d-4966-af0e-f2a5393561de	duong.trung.phong@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Trung Phong	2025-10-29 04:15:55.501
7503ab56-da32-4c39-89c7-3ba17c8d91c0	nguyen.vy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Anh Vy	2025-10-29 04:15:55.501
15328f37-e18c-4d55-acdd-1eb085012252	ho.chau@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Hải Châu	2025-10-29 04:15:55.501
c93947ec-22e9-4577-8f45-f6d74a940484	do.anh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Gia Anh	2025-10-29 04:15:55.501
1e7463fa-51cf-499e-95b9-1b74e59a3b05	do.lan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Lan Lan	2025-10-29 04:15:55.501
d2c31816-d541-40a7-ac5e-892d876977b9	vu.ha@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Gia Hà	2025-10-29 04:15:55.501
82460573-8630-4468-bd32-0c0a391a918c	pham.chi@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Minh Chi	2025-10-29 04:15:55.501
36f21414-4ea3-48ab-9a9b-6d0e3444b848	nguyen.son@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Lan Sơn	2025-10-29 04:15:55.501
5e0d92c6-0ba5-4aa2-ba7f-5d0260bc491c	phan.chi@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Khánh Chi	2025-10-29 04:15:55.501
90d324cc-e9d6-48a7-9688-06df45a51066	hoang.nam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Trung Nam	2025-10-29 04:15:55.501
21f25315-aa0f-4054-8ed5-1dcc431ea340	do.nga@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Tuấn Nga	2025-10-29 04:15:55.501
0b24493c-955e-41d2-a1fe-d659176680e6	pham.anh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Anh Anh	2025-10-29 04:15:55.501
fea622d7-a556-4048-9412-436c745da0be	ly.quang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Bảo Quang	2025-10-29 04:15:55.501
648a38ca-15e7-48d1-823a-1c3ac2ea5e2d	le.quang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Huỳnh Quang	2025-10-29 04:15:55.501
e8ae3ed4-51e3-4168-b15d-3a10974389ec	do.nhung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Kim Nhung	2025-10-29 04:15:55.501
d667f3b0-0cab-4682-acb6-44606758d7db	dang.son@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Khánh Sơn	2025-10-29 04:15:55.501
79adfedc-1bbc-4031-ac20-0a7d429e72c8	ngo.long@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Kim Long	2025-10-29 04:15:55.501
022563e6-79b3-48a7-993a-19e10a64f317	hoang.hai@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Yến Hải	2025-10-29 04:15:55.501
311cad11-785b-44d8-813f-9ebd03565136	vu.anh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Công Anh	2025-10-29 04:15:55.501
9df96cd9-b290-4a5e-8ede-606b33f731f6	ho.gia.phong@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Gia Phong	2025-10-29 04:15:55.501
1bdf001d-daa1-46e5-83e4-fdb0361ed59c	pham.nhung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Thu Nhung	2025-10-29 04:15:55.501
5fd0581f-6292-48a3-812d-658f508b2e28	le.thanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Trung Thành	2025-10-29 04:15:55.501
a1e25305-f3f8-4a17-861f-2de26e74415d	ho.viet.nam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Việt Nam	2025-10-29 04:15:55.501
3171b5ab-e6c0-4f24-bb1c-741af25e9540	ngo.hai.binh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Hải Bình	2025-10-29 04:15:55.501
b537c5ce-2688-4764-9f2a-9a707c5d51f5	phan.duc.chi@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Đức Chi	2025-10-29 04:15:55.501
df88b8fe-c60f-4a16-94f4-11fdf3a3ad01	vu.quang.tam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Quang Tâm	2025-10-29 04:15:55.501
83152a11-d7a1-4a24-acce-340d3ff5ccd7	vo.dung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Võ Hồng Dũng	2025-10-29 04:15:55.501
0bd7c05b-8e57-4a32-baf7-1c3dd014f8a6	ly.anh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Tuấn Anh	2025-10-29 04:15:55.501
3a94d86e-9899-4309-9730-c8904116b55c	duong.tam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Lan Tâm	2025-10-29 04:15:55.501
3f73cd0d-43f6-4067-810e-5d5796384303	bui.nam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Xuân Nam	2025-10-29 04:15:55.501
72a0ab6a-7b5b-4dc5-a916-30e99501e831	dang.tung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Hồng Tùng	2025-10-29 04:15:55.501
3cca9521-1e32-42d1-b377-1d99082e279a	le.lan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Hải Lan	2025-10-29 04:15:55.501
5f16700d-9361-4900-8058-cbfed5aae2ff	tran.my@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Bảo My	2025-10-29 04:15:55.501
ff6bbc23-0725-4005-aba0-70c42bf36ad0	hoang.long@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Minh Long	2025-10-29 04:15:55.501
59fe022b-9c17-4830-a69e-40db6f193ab2	do.hieu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Lan Hiếu	2025-10-29 04:15:55.501
a413effc-3f17-4a2e-b871-c7ea1732de8d	tran.ha@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Thu Hà	2025-10-29 04:15:55.501
91422add-9ffc-4aec-82d5-7573433dbddf	ngo.nam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Hồng Nam	2025-10-29 04:15:55.501
1c4bb10b-5e72-4975-b1ab-a7baab7af71e	le.viet.ha@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Việt Hà	2025-10-29 04:15:55.501
ce2ab9c3-2f5c-4913-abae-8ad699d5c252	ly.nhung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Quang Nhung	2025-10-29 04:15:55.501
3246bac3-fd9c-45ce-89af-a31d1c5dd42f	ho.thao@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Đức Thảo	2025-10-29 04:15:55.501
fd7edf58-d315-4b99-8fe8-dde0315b7894	huynh.vy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Gia Vy	2025-10-29 04:15:55.501
9d00f627-a20d-4f7b-bcc4-fa0bc944561c	nguyen.linh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Hải Linh	2025-10-29 04:15:55.501
f812ca9c-e2af-4864-9078-6b012eeba755	vo.binh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Võ Tuấn Bình	2025-10-29 04:15:55.501
d8ca0fee-8c50-4575-9c18-77fb1c38286a	phan.trung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Bảo Trung	2025-10-29 04:15:55.501
3b722c91-42c0-4273-bc16-45f1e28b899f	nguyen.tu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Anh Tú	2025-10-29 04:15:55.501
321f6830-d555-4e9a-bbe5-75f5d114372f	vu.quyen@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Việt Quyên	2025-10-29 04:15:55.501
a39a93a1-8bd7-42ec-b57b-77056252f4d8	do.hung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Minh Hùng	2025-10-29 04:15:55.501
88e8aead-0520-4bd2-935a-51aa386d013f	ly.thanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Tuấn Thành	2025-10-29 04:15:55.501
47068267-4d11-4b03-af20-2c5bc86bb901	vu.lan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Thị Lan	2025-10-29 04:15:55.501
5b72e687-2883-4268-b161-df36b6a44a49	le.trung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Thu Trung	2025-10-29 04:15:55.501
cd4a65ae-5789-4d8e-b7f5-444142706938	dang.huy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Hải Huy	2025-10-29 04:15:55.501
cbb8e767-67e9-4be6-8bf7-c88deac1ba68	ly.lan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Lan Lan	2025-10-29 04:15:55.501
b4e508f4-90e0-4d7e-af17-e05de8227c62	dang.trang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Lan Trang	2025-10-29 04:15:55.501
e98d7540-6cc4-4375-ac59-35ccbf3ecdf8	ngo.an@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Thanh An	2025-10-29 04:15:55.501
50a9ca32-8a59-4441-9308-3057e4038c88	huynh.an@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Hải An	2025-10-29 04:15:55.501
624f201e-4119-4acf-b4ae-76eeca59bc78	phan.binh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Gia Bình	2025-10-29 04:15:55.501
d94f393d-056e-402f-8df0-c1905b205700	ho.quyen@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Quốc Quyên	2025-10-29 04:15:55.501
27b516cd-e238-447e-a90d-363233b4b1ab	duong.xuan.ngoc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Xuân Ngọc	2025-10-29 04:15:55.501
12fba1b9-aac0-4a06-9bb5-0f80a244a93f	ho.ha@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Gia Hà	2025-10-29 04:15:55.501
f66a853e-dcfa-43e9-ac69-e6b23b353780	nguyen.ngoc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Đức Ngọc	2025-10-29 04:15:55.501
1616a3e1-0781-46e1-b20e-9efb456ed216	do.tung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Quốc Tùng	2025-10-29 04:15:55.501
e8269558-bf5d-4a80-957e-224cb582706d	vo.hai@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Võ Phương Hải	2025-10-29 04:15:55.501
63399fad-609a-4fab-a27d-c9ae0e829c00	ngo.vy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Hải Vy	2025-10-29 04:15:55.501
9c16c19a-18a4-415b-9d73-e7f9b3bba28b	le.trung.nhung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Trung Nhung	2025-10-29 04:15:55.501
e3c7e97e-57b1-4740-b886-73fdbf8afc1b	dang.quan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Thu Quân	2025-10-29 04:15:55.501
9026d9cc-204b-438f-8aad-ff93b897f647	bui.quan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Công Quân	2025-10-29 04:15:55.501
d9f3dc88-602b-4b9e-8e64-088320620d18	ho.hai.dung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Hải Dũng	2025-10-29 04:15:55.501
03b186c7-534c-4315-90c2-8eaa1ee6036c	ho.hai.giang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Hải Giang	2025-10-29 04:15:55.501
7fe61faf-cd68-4bfc-9408-a46961dc1f9d	dang.huynh.trang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Huỳnh Trang	2025-10-29 04:15:55.501
2ba69591-66e2-4a84-9db2-2ced187d0365	dang.phong@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Bảo Phong	2025-10-29 04:15:55.501
8fa4a314-b649-42f8-bc50-8355084e2b04	ho.tu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Xuân Tú	2025-10-29 04:15:55.501
202563c3-bf1c-4a92-af1c-271add115722	ly.thanh.giang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Thanh Giang	2025-10-29 04:15:55.501
98b204ce-9eb2-48b8-ad17-08212848a63d	hoang.tu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Phương Tú	2025-10-29 04:15:55.501
e8f04263-5317-43e0-9c0b-bfffa6971481	pham.ngan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Việt Ngân	2025-10-29 04:15:55.501
934e9b93-2406-4a48-94e8-b3f871a44a23	bui.thien@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Hải Thiên	2025-10-29 04:15:55.501
5cb1b979-474c-469d-af93-a73ef5194782	dang.mai@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Quang Mai	2025-10-29 04:15:55.501
25873e63-5930-4bda-9bc3-d31401d55cf7	vu.my@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Công My	2025-10-29 04:15:55.501
08a37ec8-a785-4723-bfd3-3dab20a7f05c	vo.linh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Võ Lan Linh	2025-10-29 04:15:55.501
a954d3d4-f8a1-4fa5-b67f-1d4420619418	dang.khanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Phương Khanh	2025-10-29 04:15:55.501
85b9f8c1-6269-4a80-b91d-7536ff44830f	dang.thu.quan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Thu Quân	2025-10-29 04:15:55.501
2d0453a0-9912-477e-97c6-7bf08d352231	nguyen.gia.vy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Gia Vy	2025-10-29 04:15:55.501
66fe5463-9958-4977-be29-f7dbfa0a493d	ngo.thien@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Bảo Thiên	2025-10-29 04:15:55.501
cf828458-bb46-4888-bfc1-d397ec296b7f	dang.dung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Bảo Dũng	2025-10-29 04:15:55.501
dfb1fd9f-2285-4731-97f0-5ba34df60a09	le.thao@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Hải Thảo	2025-10-29 04:15:55.501
8cd27058-9220-4234-912b-6ad3ef20456b	hoang.quang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Quốc Quang	2025-10-29 04:15:55.501
146ce7d5-e0df-4f82-9d96-b57ba44a7b04	bui.giang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Huỳnh Giang	2025-10-29 04:15:55.501
099857d6-1de4-4570-b20b-f45b8c0f2a8f	phan.an@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Minh An	2025-10-29 04:15:55.501
43529318-b90c-4987-8cc3-10567b9cba04	vo.phuc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Võ Công Phúc	2025-10-29 04:15:55.501
aad4c311-eb67-47be-b817-fd664d3acdb2	nguyen.chau@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Bảo Châu	2025-10-29 04:15:55.501
a3ceacc3-7335-4275-843f-ac8a53370d01	nguyen.ngan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Việt Ngân	2025-10-29 04:15:55.501
8eac46ba-922b-4473-8284-d89953a6cbf6	pham.phuong.nhung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Phương Nhung	2025-10-29 04:15:55.501
06360910-c6fb-4974-af75-cf22c4f159ac	phan.duc.chi.zm@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Đức Chi	2025-10-29 04:15:55.501
7c74a2e6-819f-479d-b7e7-dde74f2e3c2a	huynh.thang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Trung Thắng	2025-10-29 04:15:55.501
869e852a-303c-4690-a7b6-d02e53dde6a0	duong.duy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Hải Duy	2025-10-29 04:15:55.501
62361b82-5217-4a8a-a705-a80091e9e646	ly.quyen@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Thị Quyên	2025-10-29 04:15:55.501
07591dab-56b1-4e24-b20b-2ee96dd6850e	pham.giang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Gia Giang	2025-10-29 04:15:55.501
7afb1585-054e-43af-a3e5-44ebd7b19437	ngo.phuc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Kim Phúc	2025-10-29 04:15:55.501
4f4edf84-9fbb-48f2-88a2-5ebec856c65d	tran.thien@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Ngọc Thiên	2025-10-29 04:15:55.501
f9483f84-33eb-4c47-ab94-4fad149b6c6a	phan.my@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Việt My	2025-10-29 04:15:55.501
07c03c1c-e49a-4f83-969e-0bfd345b234d	tran.linh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Phương Linh	2025-10-29 04:15:55.501
6f28fa1b-f7ba-43c8-92fd-a616a2476c77	ly.minh.khanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Minh Khanh	2025-10-29 04:15:55.501
96b0d8ab-2946-4abc-9685-dd4bb1d6d57a	phan.quyen@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Xuân Quyên	2025-10-29 04:15:55.501
c737bcfd-29cd-4920-b61a-37a072d7fd20	le.xuan.nga@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Xuân Nga	2025-10-29 04:15:55.501
dddaa5ae-d9be-4f91-a8c7-0c4a2abfedd6	dang.ha@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Huỳnh Hà	2025-10-29 04:15:55.501
dccb4c2f-624a-478c-9d5b-d69df2c08e23	vo.nam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Võ Yến Nam	2025-10-29 04:15:55.501
d9e49aeb-a35d-4362-94f8-2ecedd9fe8af	hoang.tung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Kim Tùng	2025-10-29 04:15:55.501
97af99bf-e399-49e4-bfb8-afb0368bc7f7	huynh.linh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Công Linh	2025-10-29 04:15:55.501
4bd396aa-ca0f-41f0-b001-a6c1dec0f18a	vo.tung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Võ Trung Tùng	2025-10-29 04:15:55.501
a7e5c89b-8c82-47ca-8f2b-8cde2bd40f33	nguyen.yen.chau@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Yến Châu	2025-10-29 04:15:55.501
eda0c11c-4b97-482d-9a4f-02ea0dbe0c2d	bui.yen.nam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Yến Nam	2025-10-29 04:15:55.501
d841592a-15ae-42e6-bb4d-c965256bdd61	hoang.huy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Quang Huy	2025-10-29 04:15:55.501
1e13471a-0f7d-4fd1-ab88-491b86586b67	ngo.anh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Trung Anh	2025-10-29 04:15:55.501
d743e664-0a58-48de-a86e-768958e8307f	phan.nhung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Đức Nhung	2025-10-29 04:15:55.501
2f5ecfcd-ee3c-4d33-a16c-b24d3b17223c	nguyen.huynh.long@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Huỳnh Long	2025-10-29 04:15:55.501
4aec78cb-175e-4c95-9d62-e114cffe4ff3	tran.tung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Thanh Tùng	2025-10-29 04:15:55.501
e041ebd0-42b4-45eb-9f43-f5e26910ed06	do.vy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Kim Vy	2025-10-29 04:15:55.501
31195ff7-4f9e-4871-bac5-0a17a25555b6	bui.phuc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Ngọc Phúc	2025-10-29 04:15:55.501
ddaa64a9-8af3-4267-a0ee-b8b4daedf6d2	vo.viet.giang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Võ Việt Giang	2025-10-29 04:15:55.501
d572f6fe-0d18-4cad-83df-3d1f0c7875e1	ly.minh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Đức Minh	2025-10-29 04:15:55.501
010deaac-7c67-41b5-9a36-9e5bfc20d049	le.tu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Anh Tú	2025-10-29 04:15:55.501
811a23c6-11b4-41e8-9daf-c3a9f32828fb	ngo.son@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Việt Sơn	2025-10-29 04:15:55.501
40b6f470-5586-4eed-baea-b693732980af	le.ngoc.trung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Ngọc Trung	2025-10-29 04:15:55.501
6fb41662-47af-4448-afd4-a3934f718079	bui.an@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Thu An	2025-10-29 04:15:55.501
b5d59442-2c80-47e7-9610-90186128fd05	tran.tam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Việt Tâm	2025-10-29 04:15:55.501
4c31da67-faba-4e0b-a65c-756b229c21eb	hoang.thanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Gia Thành	2025-10-29 04:15:55.501
ac1b1d6d-b25b-44dd-8cd9-09ef4bda4035	duong.quan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Lan Quân	2025-10-29 04:15:55.501
e52dfe52-54f9-412c-b369-4fe3dcbfc614	huynh.khanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Thị Khanh	2025-10-29 04:15:55.501
3ccaba73-f975-483b-a052-95ee1c745c41	ly.thanh.hieu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Thanh Hiếu	2025-10-29 04:15:55.501
a3bf4f61-0194-485f-8b6e-fcf052d9843d	tran.phong@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Hải Phong	2025-10-29 04:15:55.501
aa041faa-ab65-41c0-9022-7b554a07e4f6	phan.thi.binh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Thị Bình	2025-10-29 04:15:55.501
ddd9c373-365b-4a05-bfdc-23a2c36b9844	phan.thu.my@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Thu My	2025-10-29 04:15:55.501
64c142ec-3385-45e5-9344-b35f55805e06	bui.my@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Việt My	2025-10-29 04:15:55.501
8e944ca2-3ae7-40dd-b862-890bf4e1fa38	duong.lan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Tuấn Lan	2025-10-29 04:15:55.501
3446c51d-fa75-4f96-a454-dbfb4c931a6d	ho.thu.ha@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Thu Hà	2025-10-29 04:15:55.501
2af96ba0-cb13-4367-9a78-50be71661040	duong.chi@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Huỳnh Chi	2025-10-29 04:15:55.501
a31a0ebc-3cef-4398-9c4b-1177183c137d	bui.ngoc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Thu Ngọc	2025-10-29 04:15:55.501
75dc9d92-ef33-46dd-ae3f-d06797a9e2a2	duong.ngoc.long@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Ngọc Long	2025-10-29 04:15:55.501
87ad7d66-b3cd-451f-946d-793f316ae2a8	dang.anh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Hải Anh	2025-10-29 04:15:55.501
98a819c1-7a71-414c-a04f-c30ffe9c663a	le.thang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Khánh Thắng	2025-10-29 04:15:55.501
c2997ffc-0d27-4385-9247-38f3efd7ddbb	do.quan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Quốc Quân	2025-10-29 04:15:55.501
468acefa-5825-4ed9-8087-a2c80ea4f5e5	ly.hai@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Lan Hải	2025-10-29 04:15:55.501
f15fcf4a-0a71-4fc4-bf6e-f0d8c743c4e9	vo.trung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Võ Yến Trung	2025-10-29 04:15:55.501
b1c72ffe-f336-4ca8-9037-7cb3e035f4e3	ngo.phong@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Tuấn Phong	2025-10-29 04:15:55.501
2e427732-2b1b-495c-8cd9-e250e0d081ea	le.phong@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Hồng Phong	2025-10-29 04:15:55.501
bf524f2c-a134-4283-924e-ed9ca4224a42	nguyen.thao@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Bảo Thảo	2025-10-29 04:15:55.501
3ae91575-5390-4a83-830d-29249c9973c7	pham.thanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Anh Thành	2025-10-29 04:15:55.501
bc84b2e4-ef43-4b0c-b17c-ed95fc46b1c7	huynh.lan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Thị Lan	2025-10-29 04:15:55.501
081f5516-20c9-4aaf-ba7b-d809649728c2	hoang.thao@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Đức Thảo	2025-10-29 04:15:55.501
b9b05b62-5f6d-4f48-afaf-61403a6d67b2	tran.ngoc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Việt Ngọc	2025-10-29 04:15:55.501
843e5a77-dd69-4fd0-8917-66a0728682f5	ho.hong.huy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Hồng Huy	2025-10-29 04:15:55.501
d5be5fff-6620-4936-876a-b90cdb3d877e	pham.tu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Hải Tú	2025-10-29 04:15:55.501
e95535bd-560c-4bc6-aca2-8a9ee3563c9c	hoang.thien@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Đức Thiên	2025-10-29 04:15:55.501
c632ff21-bdb8-4a17-bf76-c3e281dee1af	hoang.khanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Công Khanh	2025-10-29 04:15:55.501
a60041de-53f2-45de-beb5-74f51ee5c9d4	phan.thang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Lan Thắng	2025-10-29 04:15:55.501
b96d7863-55e2-43e2-82e4-5d985c05f703	vo.tu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Võ Kim Tú	2025-10-29 04:15:55.501
1996a860-04b5-44f9-a075-a9371b8ecfed	ly.thang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Yến Thắng	2025-10-29 04:15:55.501
a744745c-acbf-4a8e-9418-14716faae157	tran.thanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Công Thành	2025-10-29 04:15:55.501
0bb354e6-d24c-4ad8-ab74-a4f9d8863f38	ngo.ngan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Trung Ngân	2025-10-29 04:15:55.501
aa89e4d9-a50f-4d6c-9db9-3f1346916cc5	vu.chi@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Trung Chi	2025-10-29 04:15:55.501
5b535d4a-2d34-44fb-839f-57949b58569c	dang.huynh.trang.gv@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Huỳnh Trang	2025-10-29 04:15:55.501
d0ba2a62-624e-4a39-a394-c5e3061e4430	bui.lan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Xuân Lan	2025-10-29 04:15:55.501
644da359-61fb-4c18-af57-cfedb2eff58a	duong.linh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Thu Linh	2025-10-29 04:15:55.501
433a2780-0cfb-47da-b55f-08f8485a4108	ngo.giang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Công Giang	2025-10-29 04:15:55.501
d7c6fa7e-6ab3-463f-99fa-6fb0d18abd26	duong.thu.chi@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Thu Chi	2025-10-29 04:15:55.501
9a4d1ec4-fe3b-4a11-9621-3cee1fa094dd	do.tu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Gia Tú	2025-10-29 04:15:55.501
965f7d0d-50d9-4d84-9898-2cf2b66b9360	bui.cong.duy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Công Duy	2025-10-29 04:15:55.501
8b1b4885-6ab4-4f8c-ad5b-b1abda4041e4	nguyen.nga@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Ngọc Nga	2025-10-29 04:15:55.501
55ce4c00-0f36-4044-83c4-509c31a5d2a1	huynh.tu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Thị Tú	2025-10-29 04:15:55.501
bdabdf44-e2de-451b-853c-219b505c9c15	nguyen.mai@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Quốc Mai	2025-10-29 04:15:55.501
d47b301a-ebff-4889-9726-1b083bf48c8e	tran.khanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Công Khanh	2025-10-29 04:15:55.501
b641c8f8-f59e-4e3c-9c6c-a0717c5b754e	vu.son@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Việt Sơn	2025-10-29 04:15:55.501
e8314c17-70cc-44b8-8fbe-38dc975161c1	ngo.quoc.thanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Quốc Thành	2025-10-29 04:15:55.501
13ed1bbb-a652-4e1d-8432-2830dce472a9	pham.huy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Kim Huy	2025-10-29 04:15:55.501
88bb0a6e-4bdc-4ed2-a8e1-28aa2326f407	tran.son@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Công Sơn	2025-10-29 04:15:55.501
5ccef538-e785-4b59-88e4-7b00dbe33b24	ly.quoc.thanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Quốc Thành	2025-10-29 04:15:55.501
86793638-fc09-488c-9a19-64aca40ca441	phan.yen.my@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Yến My	2025-10-29 04:15:55.501
4b1dd493-aec8-43e3-8f2e-68fb2c1e2888	bui.quoc.an@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Quốc An	2025-10-29 04:15:55.501
17aa9d50-155c-4847-99e0-467ed20363db	bui.hai@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Quốc Hải	2025-10-29 04:15:55.501
a4f0bc87-b211-4697-ac21-56698cef0b29	bui.quang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Minh Quang	2025-10-29 04:15:55.501
2d283df8-8887-4aa1-b9c5-4e40c87af83c	do.linh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Phương Linh	2025-10-29 04:15:55.501
bca7578d-8915-46d8-9630-db8cdd61f266	ngo.thu.phuc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Thu Phúc	2025-10-29 04:15:55.501
4506aa78-8ce0-4ae6-b74d-6c8f9ca77b49	hoang.minh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Quang Minh	2025-10-29 04:15:55.501
f0cf7049-8749-447a-9d4e-67e56fc6f3d1	ngo.trang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Thu Trang	2025-10-29 04:15:55.501
0ea1a722-e07e-417b-a229-05773a7e679d	dang.long@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Việt Long	2025-10-29 04:15:55.501
a23ed6b0-c1cf-43fa-b836-842fd18d7bb4	le.trang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Đức Trang	2025-10-29 04:15:55.501
2606e25b-b51a-4417-89ee-11759dc25b0e	le.phuc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Anh Phúc	2025-10-29 04:15:55.501
84b5affd-cf44-400d-a113-b7840c4f7751	do.phuc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Yến Phúc	2025-10-29 04:15:55.501
e4b49f1d-ed38-49bc-b7ce-5888adbb779a	ho.tam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Tuấn Tâm	2025-10-29 04:15:55.501
ecd7e89f-0959-422c-8e38-c355b418bc32	le.linh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Anh Linh	2025-10-29 04:15:55.501
18671a59-edcf-4f42-a037-ba022990724a	bui.long@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Minh Long	2025-10-29 04:15:55.501
d65652d9-5733-4f72-9f55-364e5280a820	ho.long@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Kim Long	2025-10-29 04:15:55.501
01eb706a-dc59-49f7-a3a0-e0691fe360eb	tran.minh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Quang Minh	2025-10-29 04:15:55.501
84a44c0b-c5f1-4048-b292-fefe4676d270	phan.lan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Minh Lan	2025-10-29 04:15:55.501
d6cdffb9-05c5-42dd-bc19-c05f82cfa26c	pham.duy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Gia Duy	2025-10-29 04:15:55.501
dde77f3b-756c-4a79-90f7-1856f0c2d86b	nguyen.trung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Quốc Trung	2025-10-29 04:15:55.501
0417a604-cac0-4504-8fbb-8786424b902f	bui.ngan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Gia Ngân	2025-10-29 04:15:55.501
da6431c3-1e28-4038-84e9-23d52eaf1eb1	vu.tung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Việt Tùng	2025-10-29 04:15:55.501
d82094fa-a810-44d9-b731-87758fbdf494	bui.quoc.phuc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Quốc Phúc	2025-10-29 04:15:55.501
e1238b07-d7d9-42c9-b278-f76ff9f929c5	duong.thu.thien@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Thu Thiên	2025-10-29 04:15:55.501
979eb767-74e5-43ae-9edc-e3e7f3e9aeed	dang.chau@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Thị Châu	2025-10-29 04:15:55.501
71beb275-4003-4f38-a09c-1f43957b58e7	pham.hieu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Yến Hiếu	2025-10-29 04:15:55.501
637d063f-c46d-4bd6-a55a-847acc8f87a6	ly.thao@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Phương Thảo	2025-10-29 04:15:55.501
00f056de-47de-47f1-bcd4-8133e3dcbd1e	ngo.quyen@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Thị Quyên	2025-10-29 04:15:55.501
ce1704c2-cac9-448f-a64b-28f053bbb0bb	dang.phuc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Xuân Phúc	2025-10-29 04:15:55.501
e2ee4670-139c-452d-9dbc-bbaed8fe4e03	pham.linh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Hồng Linh	2025-10-29 04:15:55.501
7abf2baa-e55f-490b-a535-cc6ebfde2fb4	huynh.dung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Quốc Dũng	2025-10-29 04:15:55.501
42bdbc1c-3904-4750-9083-955c4d6585b5	dang.thu.huy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Thu Huy	2025-10-29 04:15:55.501
1c47081b-56a7-4016-a315-94776a699ca1	ho.bao.nam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Bảo Nam	2025-10-29 04:15:55.501
c15b1c06-6005-4c45-b58d-5d5387f6d895	le.ngan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Bảo Ngân	2025-10-29 04:15:55.501
eae6fdd8-e09f-4e32-b79a-da63b7b87fec	ho.hai@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Phương Hải	2025-10-29 04:15:55.501
baba92f6-ad7c-4d9f-a6a4-bc76558c472b	pham.tung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Gia Tùng	2025-10-29 04:15:55.501
1d9fd3b0-89f2-4731-8f64-6dc080e3f83a	le.vy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Khánh Vy	2025-10-29 04:15:55.501
77100cf9-c6f6-4a82-b8b6-2920200b5b1a	vu.linh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Thu Linh	2025-10-29 04:15:55.501
f20690eb-2cd0-487d-a15f-f924635643e8	hoang.tam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Thị Tâm	2025-10-29 04:15:55.501
fa37f593-e2b1-4fe1-af7e-18b60cf8739a	nguyen.thu.vy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Thu Vy	2025-10-29 04:15:55.501
0d2c1e22-eeb3-4669-90f0-232531a8f900	duong.ha@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Huỳnh Hà	2025-10-29 04:15:55.501
57a2e2bd-6779-4f01-9480-db5e0d593ad2	hoang.xuan.long@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Xuân Long	2025-10-29 04:15:55.501
7844e833-353e-41e2-bac6-82dd77070d18	ho.xuan.huy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Xuân Huy	2025-10-29 04:15:55.501
fb39722b-7451-47df-9655-700f3ecede54	nguyen.duc.linh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Đức Linh	2025-10-29 04:15:55.501
0ae924a9-2826-495a-b9b7-7e67a6a093e4	ly.trang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Trung Trang	2025-10-29 04:15:55.501
0a377496-21a0-4839-ac4c-01572c277560	vu.huy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Quang Huy	2025-10-29 04:15:55.501
483f6662-9039-4075-9aaf-92ff48430605	duong.hieu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Khánh Hiếu	2025-10-29 04:15:55.501
8cbeada5-9c02-475b-9e3c-96103382bea7	vo.thang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Võ Anh Thắng	2025-10-29 04:15:55.501
753c6bce-fa4b-44fa-97a0-20c45331366a	tran.thu.dung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Thu Dũng	2025-10-29 04:15:55.501
80058e99-f94e-4cf7-aae7-2678c07b726c	do.an@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Thị An	2025-10-29 04:15:55.501
3f31072e-9d81-49b4-8257-ddfd153f9986	vu.ngoc.my@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Ngọc My	2025-10-29 04:15:55.501
968aa44f-be4d-408b-9658-16275a69cce1	bui.yen.an@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Yến An	2025-10-29 04:15:55.501
1d273cbe-59e1-4c08-9027-0ac22af157ed	pham.quyen@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Quang Quyên	2025-10-29 04:15:55.501
5137732b-9db7-4870-8488-8012f97a3023	hoang.minh.huy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Minh Huy	2025-10-29 04:15:55.501
88e12de2-aa67-42eb-b2b5-6a161fcb2728	nguyen.thi.nga@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Thị Nga	2025-10-29 04:15:55.501
1cc804b0-59ef-46a9-a508-6a1395753134	hoang.quyen@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Minh Quyên	2025-10-29 04:15:55.501
18dcecd7-7e1a-42fe-9c2f-b83285b30b64	do.lan.phuc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Lan Phúc	2025-10-29 04:15:55.501
4e4fa597-2920-47b4-b133-606ed2c866ea	huynh.son@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Hồng Sơn	2025-10-29 04:15:55.501
a8cba7da-52dd-4562-bd5c-a30f23263a0a	vo.ngan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Võ Gia Ngân	2025-10-29 04:15:55.501
eee2695d-901b-485d-b206-5fb296fd2a02	dang.thien@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Thanh Thiên	2025-10-29 04:15:55.501
afb1db3a-93ec-4033-9534-5aa4d3d35028	vu.nam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Việt Nam	2025-10-29 04:15:55.501
08966965-1124-45de-a68f-a410df43eab6	hoang.quan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Thị Quân	2025-10-29 04:15:55.501
46b9750a-2c33-4cf3-baa9-72fd0a778270	ly.ngan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Bảo Ngân	2025-10-29 04:15:55.501
aeefb209-49fc-409b-9434-7449733cc584	ho.my@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Yến My	2025-10-29 04:15:55.501
58575c61-8e04-4abf-ad79-e6be33d31a3f	do.lan.nga@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Lan Nga	2025-10-29 04:15:55.501
9f1b305a-c225-4bb3-91b5-a0f206e8afb8	hoang.tuan.thanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Tuấn Thành	2025-10-29 04:15:55.501
5e25f3f8-0213-42a2-80ef-76e3b93d21c3	huynh.giang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Quang Giang	2025-10-29 04:15:55.501
23b9dee8-9e7c-4904-a509-04b0e8c6e2c2	pham.ngoc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Trung Ngọc	2025-10-29 04:15:55.501
08debe87-1779-4917-a007-bec69c8d16ce	hoang.chi@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Quốc Chi	2025-10-29 04:15:55.501
94655bd3-7f51-4ef1-bdcf-ae7da8f4bdee	hoang.phong@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Gia Phong	2025-10-29 04:15:55.501
9161f7d7-af86-423f-8ee1-f9fac5c2f901	bui.ngoc.ngoc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Ngọc Ngọc	2025-10-29 04:15:55.501
35eed734-00a9-4bca-83fe-bb1cc2fdd8f6	phan.thi.an@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Thị An	2025-10-29 04:15:55.501
49181fe0-8c0e-4a13-8a8d-b8e5f68bedfb	ho.hung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Huỳnh Hùng	2025-10-29 04:15:55.501
f536b29f-1835-4a02-b3b3-3137c64ce030	hoang.ngoc.giang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Ngọc Giang	2025-10-29 04:15:55.501
e196afae-0543-4b2d-99f0-6c2c6123b1bc	pham.thang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Kim Thắng	2025-10-29 04:15:55.501
cd47f920-0379-4b99-bf3c-782f9122bdfb	duong.bao.duy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Bảo Duy	2025-10-29 04:15:55.501
6869fc3f-10ad-419c-81d7-91e91ad0f367	ngo.lan.thien@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Lan Thiên	2025-10-29 04:15:55.501
6362a910-8ebd-4b3f-92b5-384960e8f173	le.bao.nhung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Bảo Nhung	2025-10-29 04:15:55.501
9009c2fb-16d3-4050-852f-28873f3faf8b	do.duy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Bảo Duy	2025-10-29 04:15:55.501
2bb5fc24-8d9f-4063-ba65-942e8734462c	duong.chau@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Gia Châu	2025-10-29 04:15:55.501
5165314d-d6d4-461c-8ca6-3acd19c68606	nguyen.hieu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Anh Hiếu	2025-10-29 04:15:55.501
b0f3a408-5012-490d-abf3-0db7167d5cb1	vu.trung.ha@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Trung Hà	2025-10-29 04:15:55.501
a7b7273c-9c14-49e3-b471-feede9ccb30e	ly.tam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Hải Tâm	2025-10-29 04:15:55.501
592c8825-c083-4291-89fa-64ffc66dc2d9	bui.hai.tung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Hải Tùng	2025-10-29 04:15:55.501
e4403eec-4859-4837-ad1f-45fa409a33f8	hoang.duy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Phương Duy	2025-10-29 04:15:55.501
f98de67e-355c-4440-b188-bd95b97032f9	vu.giang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Minh Giang	2025-10-29 04:15:55.501
715fccae-3203-4698-93c9-2665297c949d	duong.thu.tam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Thu Tâm	2025-10-29 04:15:55.501
eaacb310-fdf5-414e-b613-a1f3c11f8762	vu.anh.quan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Anh Quân	2025-10-29 04:15:55.501
8fd6fb61-7f9e-4d0e-85d0-eaf12aa45340	le.son@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Tuấn Sơn	2025-10-29 04:15:55.501
e0abd3f9-d49d-42fe-b358-839d5e445361	ngo.huy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Yến Huy	2025-10-29 04:15:55.501
79cb5a79-5935-4e3e-b598-17e5c9961a1a	ly.tu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Thu Tú	2025-10-29 04:15:55.501
4492adca-6b01-4a59-b87e-08b225a0df48	pham.xuan.chi@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Xuân Chi	2025-10-29 04:15:55.501
48ae26a8-0b96-4375-9ed1-5ddbca889045	phan.thanh.binh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Thanh Bình	2025-10-29 04:15:55.501
8eb82d1f-54c5-4e4a-a918-daa433d4f5ee	tran.nhung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Quang Nhung	2025-10-29 04:15:55.501
eab2bd02-ba14-43d7-913e-93502d38187f	ly.huy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Bảo Huy	2025-10-29 04:15:55.501
cd5d6c51-51f7-4cfd-b49e-54ce0d292c5b	ly.hai.tu@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Hải Tú	2025-10-29 04:15:55.501
137310d9-ef03-45e6-8a1c-f7c7fa1d303e	ho.lan.tung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Lan Tùng	2025-10-29 04:15:55.501
dc1914ce-6ae3-41e3-8d14-5ad75e5cbdb2	ly.phong@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Gia Phong	2025-10-29 04:15:55.501
57169124-4928-435c-a0d6-d05e6617f39b	tran.chau@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Kim Châu	2025-10-29 04:15:55.501
87f63b6c-94c1-49d6-9fb9-f5d8e21d9392	duong.minh.huy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Dương Minh Huy	2025-10-29 04:15:55.501
19c3b0cd-42ed-49be-85b3-f3f9465cdc01	nguyen.phong@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Thị Phong	2025-10-29 04:15:55.501
a798a802-13d2-4753-96d8-930b9c8092df	do.yen.nhung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Yến Nhung	2025-10-29 04:15:55.501
c43b12d2-aaf7-4aa6-8806-9290b0536fae	ly.thi.khanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Thị Khanh	2025-10-29 04:15:55.501
d81f72f7-be3c-4fde-bec1-9f29d7f7eaa8	vu.dung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Hải Dũng	2025-10-29 04:15:55.501
6609c25f-b2d4-4ed6-b9f4-78e34c09f321	hoang.huynh.tung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Huỳnh Tùng	2025-10-29 04:15:55.501
4596d9bb-385d-4bc2-b37b-3caee0878707	le.dung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Anh Dũng	2025-10-29 04:15:55.501
633a7571-0d4f-4a47-b7cd-0f1d51541a0b	ly.tuan.thanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Tuấn Thành	2025-10-29 04:15:55.501
be9e3f22-5ddb-41e8-90aa-1bf0ee17e284	bui.anh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Thị Anh	2025-10-29 04:15:55.501
6b168965-e866-447b-9a2a-bff8cdb71464	do.thi.tung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Thị Tùng	2025-10-29 04:15:55.501
c87cb390-bb81-4a2b-8c12-73bc900df65e	vo.huy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Võ Trung Huy	2025-10-29 04:15:55.501
337b1429-d84e-43d8-974b-a041adb09a0c	dang.my@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Công My	2025-10-29 04:15:55.501
11126037-accf-4d3c-ba44-2515bb95e5a6	ho.duc.thang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Đức Thắng	2025-10-29 04:15:55.501
f9a457dd-69de-43fa-9259-e560504274d5	dang.linh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Lan Linh	2025-10-29 04:15:55.501
ad4b79c3-3d9d-46f1-b15f-dfa0c1ebc201	ngo.lan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Việt Lan	2025-10-29 04:15:55.501
49a1aa77-0b02-407e-85a7-5c1a95f6b12c	bui.gia.phuc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Gia Phúc	2025-10-29 04:15:55.501
14bf8480-6352-4a9c-8953-982221e17f9c	ho.thu.vy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Thu Vy	2025-10-29 04:15:55.501
a86e2f30-bde5-471d-9ccf-11cc36668844	bui.thu.duy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Thu Duy	2025-10-29 04:15:55.501
3ac57d12-957a-4941-a9b5-0365a725175e	do.xuan.son@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Xuân Sơn	2025-10-29 04:15:55.501
52ce4fcf-c0e1-47d0-a5a1-6a08730fb47e	bui.ngoc.quan@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Ngọc Quân	2025-10-29 04:15:55.501
87a0d5eb-b583-4ff6-8e3f-e50870aa518a	phan.bao.my@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phan Bảo My	2025-10-29 04:15:55.501
85412a07-d165-44ac-86e2-fa043eaa89e5	ho.phuc@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hồ Xuân Phúc	2025-10-29 04:15:55.501
6b7735cb-b649-40ea-8621-8c90c694abfa	ly.tuan.huy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Tuấn Huy	2025-10-29 04:15:55.501
3193fcf0-2d29-4efa-abdb-548ed3b1c0a5	dang.hong.mai@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đặng Hồng Mai	2025-10-29 04:15:55.501
0df9fe7d-d2ad-4cf0-9e89-3c8f36a00763	tran.chi@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Kim Chi	2025-10-29 04:15:55.501
bab33655-5d3e-4092-b5d3-3c812415957b	ly.nam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lý Minh Nam	2025-10-29 04:15:55.501
6b972ead-0dc0-4934-91db-ba1de1d71687	le.thanh.hung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Thanh Hùng	2025-10-29 04:15:55.501
442a9ff9-218f-44a8-9cf6-a8b142322ae8	huynh.anh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Bảo Anh	2025-10-29 04:15:55.501
f008a79c-3991-419e-b670-123c482f078e	huynh.thanh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Tuấn Thành	2025-10-29 04:15:55.501
86c2aa9f-1391-43f3-850d-8a24ac04debd	nguyen.quyen@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Thanh Quyên	2025-10-29 04:15:55.501
d1e6e86a-05ed-42b0-912d-86a8e70e2679	do.nam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Đỗ Huỳnh Nam	2025-10-29 04:15:55.501
dc05a238-6105-4d08-9dcb-bf4c5fbfb5a9	tran.nam@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Trần Gia Nam	2025-10-29 04:15:55.501
c51f9cdc-07bd-4388-a077-b461b8981d9e	ngo.quang.nhung@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Ngô Quang Nhung	2025-10-29 04:15:55.501
bae501cf-d2a8-48f1-a749-d7254a5618e2	hoang.vy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Trung Vy	2025-10-29 04:15:55.501
3786ff70-7c8c-4ceb-bbdb-dd5f7b208c21	nguyen.thang@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Nguyễn Quang Thắng	2025-10-29 04:15:55.501
1fc14fc8-6b17-4926-b5bf-ca0f01cf11c5	hoang.binh@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Hoàng Công Bình	2025-10-29 04:15:55.501
a87e0981-404d-4254-89f0-02d87ae939db	le.chau@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Lê Công Châu	2025-10-29 04:15:55.501
87efe4f9-c702-4f16-b73a-d0a25e66bc5d	huynh.quoc.vy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Huỳnh Quốc Vy	2025-10-29 04:15:55.501
0b663717-c7b6-4ce0-b8fc-39bc52734a56	vu.chau@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Vũ Lan Châu	2025-10-29 04:15:55.501
794bd1fa-cf0c-47aa-9863-7bd059110130	bui.tuan.duy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Bùi Tuấn Duy	2025-10-29 04:15:55.501
a28d6d7d-e3bc-4990-be2e-0444c8aca216	pham.ngoc.duy@example.dev	$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq	Phạm Ngọc Duy	2025-10-29 04:15:55.501
3e111396-1701-4ad3-90fc-5f21aec19ecb	demo@seed.local	x	Demo Buyer	2025-10-29 04:15:56.509
\.


--
-- Data for Name: UserRole; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."UserRole" ("userId", "roleId") FROM stdin;
8320d02b-bdcc-42a1-8010-02e4b45e6157	1
e87e1255-1ce3-405d-8f40-f78a943e717f	1
9ee5c0b3-a910-4165-b1d8-a82ca72e4937	1
32812bca-83ce-470a-b7c1-042fb3195065	1
8167c208-8fbb-421b-8e74-cfa0ab8ff2ad	1
66318e3f-977f-4ff9-a3e9-dd679060c0da	1
32e9742d-5013-4730-9758-4898e3855936	1
87b277de-46f9-4b6f-9c81-1e2980d75cfd	1
9a80e2f9-3bc9-4e4e-974a-da744f84884f	1
14fac742-8b1f-4041-911b-60b2b38e68dd	1
1ceaa892-ba53-4b07-b7f7-c70c136845e3	1
bfff91a4-e2d9-48ac-9e38-3df3213171fe	1
22faacdd-2631-42a2-9254-586962a8d6fd	1
e34bb3d2-0092-4019-be0e-fdfc0ad56e53	1
03f6fd1c-4607-4a18-a035-d4da3c3bae55	1
b92ad8db-c45f-4d9c-9e55-783551a7cff1	1
3a6c6e33-eeb8-4f0b-b0d1-0f3ee975207c	1
85291320-7a3e-4a0d-be83-496150c40ebe	1
6a3b4b5d-47fc-471e-831d-ea32e7433574	1
05148bf5-b107-4c05-bcc2-922c25de76af	1
55cfc6a6-9875-46de-97cf-40ed13a9298e	1
4dda6147-e814-4e5e-9518-ed953195ce90	1
3fc89e88-78fa-4d65-a7da-7d3cef39c623	1
9f807a0e-b822-4ff2-979d-4d846efb19d5	1
92d180e9-3ad3-4900-bc6d-3bd997a24b25	1
4575e01a-38da-4977-8111-52559ac0254f	1
ce246b9c-f21b-4f1c-9c91-3eaf555b5b72	1
d7c77b55-5f82-44ab-9faa-49e69628a0e6	1
becc4a55-fc04-48c3-a4d3-85bf694db0a3	1
76d1d99c-a89f-43f0-99f5-04cd86b97143	1
067b2f04-edc5-46e1-9869-1ad137ae80c7	1
142dcabd-29de-4167-8f61-0976279172a1	1
45f4808e-447d-415f-b12b-8671820aae71	1
64603edb-edec-4909-8335-e41e63c4c5ca	1
bee6da45-04ec-4f22-aa00-82eda5afcadf	1
a52141b5-a668-4f36-aeda-c55396b2ca50	1
2ec0b0f4-f25f-4fc7-92d9-c46411ed5068	1
4c237614-003d-4dab-81dc-f58cf0514351	1
09a62841-b5f5-442a-bc8b-21ab2c2ac90b	1
84bae3ce-3ec3-4633-92cb-ef1f5df10d4b	1
f0dd7b63-7a44-44f7-bdff-02b7851542de	1
e6cace32-5318-4319-a78b-82b65a594567	1
fdc633f4-f0bb-48ef-90e3-d2541df8be0f	1
aa6b6823-f211-4161-82ad-3a662a50961e	1
11e64020-1de9-4bb5-887a-cfa473e3dbea	1
e828a0c0-d9a4-4c75-ac47-61d97e083216	1
8bd67cc7-2b63-4a8c-814c-87bd01b80c3c	1
de66cb03-ccc5-42a7-b55b-b28bc07f87c4	1
7bc86bae-4311-4245-8104-05c461fb9a45	1
ee6298b0-7c77-4655-a176-18e955f19763	1
b04d0d4a-c4b7-472e-becf-ffbb83ef7541	1
c536e398-3934-4719-a6b4-58862421fdf4	1
cfd9f4ee-b434-4b4b-b4b4-adf0eeb4c084	1
5bb57636-f5ac-45b8-910d-d2731f0f3b17	1
1e6894bd-b476-423d-8d25-64190be32ba3	1
f12ee458-5c3c-4d89-ba5c-81ccadb0f49e	1
191c6948-2193-498d-9b74-3e681c4b361f	1
d7efc5cf-2f8d-48e8-8024-9c6168f7c71f	1
da752383-6bd9-4c59-a683-09c9e044f656	1
1688ccb2-06e1-4bfa-ba34-a6ec062a003f	1
d94136c4-f1ae-427f-9e5e-923e789d95b5	1
5eccdb8c-af6e-45d2-bea2-eecfc6f71679	1
cbe441d1-53fe-4975-919a-8b606dfd9bbd	1
851a9174-170c-4a8a-9742-f31b753fc90c	1
4c7b6536-ca68-4275-b9cb-e01f0149454a	1
20127051-757c-4cd0-944a-493bc6f94ad6	1
c5ec5a8c-fc11-40a7-adc0-33a0092e8073	1
24740e71-0617-458a-a6ff-d0b66d99722b	1
39e987cb-9358-47c1-be53-947b471a7ec0	1
08a3f5aa-a669-4a07-9f75-0dbb9666ce59	1
a5236962-5514-4213-9321-6154758fc9e0	1
6f80a2d9-2247-4599-938c-aee1bdac1f15	1
6105607d-1b18-4667-9319-f6e6a90bccf8	1
05a924e2-48cb-4283-aad4-f1b0792660ea	1
a22bc172-0392-45ea-ba8e-147e64b5163b	1
a6bdf300-2468-470f-8b90-b70420f10e84	1
8a92dbd3-a016-456e-ab9f-f73ba1d4700d	1
5070847b-7280-4637-8e41-46940ba5e8b9	1
c5b7f730-c061-4e0c-a233-96664928e74a	1
22b4a50f-c27c-4173-93c3-aafa43c433a1	1
78e2bbc1-99bf-4084-acde-88c0d150bf13	1
ca802669-c2d0-4e2b-b151-e8c059d16e2f	1
362d12de-380e-472c-ac4f-e80ad0119a4d	1
3b89c852-8c17-4eb9-ac13-d4cdd8cfc0dc	1
cbc422b2-dd68-4e50-b8ca-380b7bd4e063	1
6fdf4bd7-360d-4966-af0e-f2a5393561de	1
7503ab56-da32-4c39-89c7-3ba17c8d91c0	1
15328f37-e18c-4d55-acdd-1eb085012252	1
c93947ec-22e9-4577-8f45-f6d74a940484	1
1e7463fa-51cf-499e-95b9-1b74e59a3b05	1
d2c31816-d541-40a7-ac5e-892d876977b9	1
82460573-8630-4468-bd32-0c0a391a918c	1
36f21414-4ea3-48ab-9a9b-6d0e3444b848	1
5e0d92c6-0ba5-4aa2-ba7f-5d0260bc491c	1
90d324cc-e9d6-48a7-9688-06df45a51066	1
21f25315-aa0f-4054-8ed5-1dcc431ea340	1
0b24493c-955e-41d2-a1fe-d659176680e6	1
fea622d7-a556-4048-9412-436c745da0be	1
648a38ca-15e7-48d1-823a-1c3ac2ea5e2d	1
e8ae3ed4-51e3-4168-b15d-3a10974389ec	1
d667f3b0-0cab-4682-acb6-44606758d7db	1
79adfedc-1bbc-4031-ac20-0a7d429e72c8	1
022563e6-79b3-48a7-993a-19e10a64f317	1
311cad11-785b-44d8-813f-9ebd03565136	1
9df96cd9-b290-4a5e-8ede-606b33f731f6	1
1bdf001d-daa1-46e5-83e4-fdb0361ed59c	1
5fd0581f-6292-48a3-812d-658f508b2e28	1
a1e25305-f3f8-4a17-861f-2de26e74415d	1
3171b5ab-e6c0-4f24-bb1c-741af25e9540	1
b537c5ce-2688-4764-9f2a-9a707c5d51f5	1
df88b8fe-c60f-4a16-94f4-11fdf3a3ad01	1
83152a11-d7a1-4a24-acce-340d3ff5ccd7	1
0bd7c05b-8e57-4a32-baf7-1c3dd014f8a6	1
3a94d86e-9899-4309-9730-c8904116b55c	1
3f73cd0d-43f6-4067-810e-5d5796384303	1
72a0ab6a-7b5b-4dc5-a916-30e99501e831	1
3cca9521-1e32-42d1-b377-1d99082e279a	1
5f16700d-9361-4900-8058-cbfed5aae2ff	1
ff6bbc23-0725-4005-aba0-70c42bf36ad0	1
59fe022b-9c17-4830-a69e-40db6f193ab2	1
a413effc-3f17-4a2e-b871-c7ea1732de8d	1
91422add-9ffc-4aec-82d5-7573433dbddf	1
1c4bb10b-5e72-4975-b1ab-a7baab7af71e	1
ce2ab9c3-2f5c-4913-abae-8ad699d5c252	1
3246bac3-fd9c-45ce-89af-a31d1c5dd42f	1
fd7edf58-d315-4b99-8fe8-dde0315b7894	1
9d00f627-a20d-4f7b-bcc4-fa0bc944561c	1
f812ca9c-e2af-4864-9078-6b012eeba755	1
d8ca0fee-8c50-4575-9c18-77fb1c38286a	1
3b722c91-42c0-4273-bc16-45f1e28b899f	1
321f6830-d555-4e9a-bbe5-75f5d114372f	1
a39a93a1-8bd7-42ec-b57b-77056252f4d8	1
88e8aead-0520-4bd2-935a-51aa386d013f	1
47068267-4d11-4b03-af20-2c5bc86bb901	1
5b72e687-2883-4268-b161-df36b6a44a49	1
cd4a65ae-5789-4d8e-b7f5-444142706938	1
cbb8e767-67e9-4be6-8bf7-c88deac1ba68	1
b4e508f4-90e0-4d7e-af17-e05de8227c62	1
e98d7540-6cc4-4375-ac59-35ccbf3ecdf8	1
50a9ca32-8a59-4441-9308-3057e4038c88	1
624f201e-4119-4acf-b4ae-76eeca59bc78	1
d94f393d-056e-402f-8df0-c1905b205700	1
27b516cd-e238-447e-a90d-363233b4b1ab	1
12fba1b9-aac0-4a06-9bb5-0f80a244a93f	1
f66a853e-dcfa-43e9-ac69-e6b23b353780	1
1616a3e1-0781-46e1-b20e-9efb456ed216	1
e8269558-bf5d-4a80-957e-224cb582706d	1
63399fad-609a-4fab-a27d-c9ae0e829c00	1
9c16c19a-18a4-415b-9d73-e7f9b3bba28b	1
e3c7e97e-57b1-4740-b886-73fdbf8afc1b	1
9026d9cc-204b-438f-8aad-ff93b897f647	1
d9f3dc88-602b-4b9e-8e64-088320620d18	1
03b186c7-534c-4315-90c2-8eaa1ee6036c	1
7fe61faf-cd68-4bfc-9408-a46961dc1f9d	1
2ba69591-66e2-4a84-9db2-2ced187d0365	1
8fa4a314-b649-42f8-bc50-8355084e2b04	1
202563c3-bf1c-4a92-af1c-271add115722	1
98b204ce-9eb2-48b8-ad17-08212848a63d	1
e8f04263-5317-43e0-9c0b-bfffa6971481	1
934e9b93-2406-4a48-94e8-b3f871a44a23	1
5cb1b979-474c-469d-af93-a73ef5194782	1
25873e63-5930-4bda-9bc3-d31401d55cf7	1
08a37ec8-a785-4723-bfd3-3dab20a7f05c	1
a954d3d4-f8a1-4fa5-b67f-1d4420619418	1
85b9f8c1-6269-4a80-b91d-7536ff44830f	1
2d0453a0-9912-477e-97c6-7bf08d352231	1
66fe5463-9958-4977-be29-f7dbfa0a493d	1
cf828458-bb46-4888-bfc1-d397ec296b7f	1
dfb1fd9f-2285-4731-97f0-5ba34df60a09	1
8cd27058-9220-4234-912b-6ad3ef20456b	1
146ce7d5-e0df-4f82-9d96-b57ba44a7b04	1
099857d6-1de4-4570-b20b-f45b8c0f2a8f	1
43529318-b90c-4987-8cc3-10567b9cba04	1
aad4c311-eb67-47be-b817-fd664d3acdb2	1
a3ceacc3-7335-4275-843f-ac8a53370d01	1
8eac46ba-922b-4473-8284-d89953a6cbf6	1
06360910-c6fb-4974-af75-cf22c4f159ac	1
7c74a2e6-819f-479d-b7e7-dde74f2e3c2a	1
869e852a-303c-4690-a7b6-d02e53dde6a0	1
62361b82-5217-4a8a-a705-a80091e9e646	1
07591dab-56b1-4e24-b20b-2ee96dd6850e	1
7afb1585-054e-43af-a3e5-44ebd7b19437	1
4f4edf84-9fbb-48f2-88a2-5ebec856c65d	1
f9483f84-33eb-4c47-ab94-4fad149b6c6a	1
07c03c1c-e49a-4f83-969e-0bfd345b234d	1
6f28fa1b-f7ba-43c8-92fd-a616a2476c77	1
96b0d8ab-2946-4abc-9685-dd4bb1d6d57a	1
c737bcfd-29cd-4920-b61a-37a072d7fd20	1
dddaa5ae-d9be-4f91-a8c7-0c4a2abfedd6	1
dccb4c2f-624a-478c-9d5b-d69df2c08e23	1
d9e49aeb-a35d-4362-94f8-2ecedd9fe8af	1
97af99bf-e399-49e4-bfb8-afb0368bc7f7	1
4bd396aa-ca0f-41f0-b001-a6c1dec0f18a	1
a7e5c89b-8c82-47ca-8f2b-8cde2bd40f33	1
eda0c11c-4b97-482d-9a4f-02ea0dbe0c2d	1
d841592a-15ae-42e6-bb4d-c965256bdd61	1
1e13471a-0f7d-4fd1-ab88-491b86586b67	1
d743e664-0a58-48de-a86e-768958e8307f	1
2f5ecfcd-ee3c-4d33-a16c-b24d3b17223c	1
4aec78cb-175e-4c95-9d62-e114cffe4ff3	1
e041ebd0-42b4-45eb-9f43-f5e26910ed06	1
31195ff7-4f9e-4871-bac5-0a17a25555b6	1
ddaa64a9-8af3-4267-a0ee-b8b4daedf6d2	1
d572f6fe-0d18-4cad-83df-3d1f0c7875e1	1
010deaac-7c67-41b5-9a36-9e5bfc20d049	1
811a23c6-11b4-41e8-9daf-c3a9f32828fb	1
40b6f470-5586-4eed-baea-b693732980af	1
6fb41662-47af-4448-afd4-a3934f718079	1
b5d59442-2c80-47e7-9610-90186128fd05	1
4c31da67-faba-4e0b-a65c-756b229c21eb	1
ac1b1d6d-b25b-44dd-8cd9-09ef4bda4035	1
e52dfe52-54f9-412c-b369-4fe3dcbfc614	1
3ccaba73-f975-483b-a052-95ee1c745c41	1
a3bf4f61-0194-485f-8b6e-fcf052d9843d	1
aa041faa-ab65-41c0-9022-7b554a07e4f6	1
ddd9c373-365b-4a05-bfdc-23a2c36b9844	1
64c142ec-3385-45e5-9344-b35f55805e06	1
8e944ca2-3ae7-40dd-b862-890bf4e1fa38	1
3446c51d-fa75-4f96-a454-dbfb4c931a6d	1
2af96ba0-cb13-4367-9a78-50be71661040	1
a31a0ebc-3cef-4398-9c4b-1177183c137d	1
75dc9d92-ef33-46dd-ae3f-d06797a9e2a2	1
87ad7d66-b3cd-451f-946d-793f316ae2a8	1
98a819c1-7a71-414c-a04f-c30ffe9c663a	1
c2997ffc-0d27-4385-9247-38f3efd7ddbb	1
468acefa-5825-4ed9-8087-a2c80ea4f5e5	1
f15fcf4a-0a71-4fc4-bf6e-f0d8c743c4e9	1
b1c72ffe-f336-4ca8-9037-7cb3e035f4e3	1
2e427732-2b1b-495c-8cd9-e250e0d081ea	1
bf524f2c-a134-4283-924e-ed9ca4224a42	1
3ae91575-5390-4a83-830d-29249c9973c7	1
bc84b2e4-ef43-4b0c-b17c-ed95fc46b1c7	1
081f5516-20c9-4aaf-ba7b-d809649728c2	1
b9b05b62-5f6d-4f48-afaf-61403a6d67b2	1
843e5a77-dd69-4fd0-8917-66a0728682f5	1
d5be5fff-6620-4936-876a-b90cdb3d877e	1
e95535bd-560c-4bc6-aca2-8a9ee3563c9c	1
c632ff21-bdb8-4a17-bf76-c3e281dee1af	1
a60041de-53f2-45de-beb5-74f51ee5c9d4	1
b96d7863-55e2-43e2-82e4-5d985c05f703	1
1996a860-04b5-44f9-a075-a9371b8ecfed	1
a744745c-acbf-4a8e-9418-14716faae157	1
0bb354e6-d24c-4ad8-ab74-a4f9d8863f38	1
aa89e4d9-a50f-4d6c-9db9-3f1346916cc5	1
5b535d4a-2d34-44fb-839f-57949b58569c	1
d0ba2a62-624e-4a39-a394-c5e3061e4430	1
644da359-61fb-4c18-af57-cfedb2eff58a	1
433a2780-0cfb-47da-b55f-08f8485a4108	1
d7c6fa7e-6ab3-463f-99fa-6fb0d18abd26	1
9a4d1ec4-fe3b-4a11-9621-3cee1fa094dd	1
965f7d0d-50d9-4d84-9898-2cf2b66b9360	1
8b1b4885-6ab4-4f8c-ad5b-b1abda4041e4	1
55ce4c00-0f36-4044-83c4-509c31a5d2a1	1
bdabdf44-e2de-451b-853c-219b505c9c15	1
d47b301a-ebff-4889-9726-1b083bf48c8e	1
b641c8f8-f59e-4e3c-9c6c-a0717c5b754e	1
e8314c17-70cc-44b8-8fbe-38dc975161c1	1
13ed1bbb-a652-4e1d-8432-2830dce472a9	1
88bb0a6e-4bdc-4ed2-a8e1-28aa2326f407	1
5ccef538-e785-4b59-88e4-7b00dbe33b24	1
86793638-fc09-488c-9a19-64aca40ca441	1
4b1dd493-aec8-43e3-8f2e-68fb2c1e2888	1
17aa9d50-155c-4847-99e0-467ed20363db	1
a4f0bc87-b211-4697-ac21-56698cef0b29	1
2d283df8-8887-4aa1-b9c5-4e40c87af83c	1
bca7578d-8915-46d8-9630-db8cdd61f266	1
4506aa78-8ce0-4ae6-b74d-6c8f9ca77b49	1
f0cf7049-8749-447a-9d4e-67e56fc6f3d1	1
0ea1a722-e07e-417b-a229-05773a7e679d	1
a23ed6b0-c1cf-43fa-b836-842fd18d7bb4	1
2606e25b-b51a-4417-89ee-11759dc25b0e	1
84b5affd-cf44-400d-a113-b7840c4f7751	1
e4b49f1d-ed38-49bc-b7ce-5888adbb779a	1
ecd7e89f-0959-422c-8e38-c355b418bc32	1
18671a59-edcf-4f42-a037-ba022990724a	1
d65652d9-5733-4f72-9f55-364e5280a820	1
01eb706a-dc59-49f7-a3a0-e0691fe360eb	1
84a44c0b-c5f1-4048-b292-fefe4676d270	1
d6cdffb9-05c5-42dd-bc19-c05f82cfa26c	1
dde77f3b-756c-4a79-90f7-1856f0c2d86b	1
0417a604-cac0-4504-8fbb-8786424b902f	1
da6431c3-1e28-4038-84e9-23d52eaf1eb1	1
d82094fa-a810-44d9-b731-87758fbdf494	1
e1238b07-d7d9-42c9-b278-f76ff9f929c5	1
979eb767-74e5-43ae-9edc-e3e7f3e9aeed	1
71beb275-4003-4f38-a09c-1f43957b58e7	1
637d063f-c46d-4bd6-a55a-847acc8f87a6	1
00f056de-47de-47f1-bcd4-8133e3dcbd1e	1
ce1704c2-cac9-448f-a64b-28f053bbb0bb	1
e2ee4670-139c-452d-9dbc-bbaed8fe4e03	1
7abf2baa-e55f-490b-a535-cc6ebfde2fb4	1
42bdbc1c-3904-4750-9083-955c4d6585b5	1
1c47081b-56a7-4016-a315-94776a699ca1	1
c15b1c06-6005-4c45-b58d-5d5387f6d895	1
eae6fdd8-e09f-4e32-b79a-da63b7b87fec	1
baba92f6-ad7c-4d9f-a6a4-bc76558c472b	1
1d9fd3b0-89f2-4731-8f64-6dc080e3f83a	1
77100cf9-c6f6-4a82-b8b6-2920200b5b1a	1
f20690eb-2cd0-487d-a15f-f924635643e8	1
fa37f593-e2b1-4fe1-af7e-18b60cf8739a	1
0d2c1e22-eeb3-4669-90f0-232531a8f900	1
57a2e2bd-6779-4f01-9480-db5e0d593ad2	1
7844e833-353e-41e2-bac6-82dd77070d18	1
fb39722b-7451-47df-9655-700f3ecede54	1
0ae924a9-2826-495a-b9b7-7e67a6a093e4	1
0a377496-21a0-4839-ac4c-01572c277560	1
483f6662-9039-4075-9aaf-92ff48430605	1
8cbeada5-9c02-475b-9e3c-96103382bea7	1
753c6bce-fa4b-44fa-97a0-20c45331366a	1
80058e99-f94e-4cf7-aae7-2678c07b726c	1
3f31072e-9d81-49b4-8257-ddfd153f9986	1
968aa44f-be4d-408b-9658-16275a69cce1	1
1d273cbe-59e1-4c08-9027-0ac22af157ed	1
5137732b-9db7-4870-8488-8012f97a3023	1
88e12de2-aa67-42eb-b2b5-6a161fcb2728	1
1cc804b0-59ef-46a9-a508-6a1395753134	1
18dcecd7-7e1a-42fe-9c2f-b83285b30b64	1
4e4fa597-2920-47b4-b133-606ed2c866ea	1
a8cba7da-52dd-4562-bd5c-a30f23263a0a	1
eee2695d-901b-485d-b206-5fb296fd2a02	1
afb1db3a-93ec-4033-9534-5aa4d3d35028	1
08966965-1124-45de-a68f-a410df43eab6	1
46b9750a-2c33-4cf3-baa9-72fd0a778270	1
aeefb209-49fc-409b-9434-7449733cc584	1
58575c61-8e04-4abf-ad79-e6be33d31a3f	1
9f1b305a-c225-4bb3-91b5-a0f206e8afb8	1
5e25f3f8-0213-42a2-80ef-76e3b93d21c3	1
23b9dee8-9e7c-4904-a509-04b0e8c6e2c2	1
08debe87-1779-4917-a007-bec69c8d16ce	1
94655bd3-7f51-4ef1-bdcf-ae7da8f4bdee	1
9161f7d7-af86-423f-8ee1-f9fac5c2f901	1
35eed734-00a9-4bca-83fe-bb1cc2fdd8f6	1
49181fe0-8c0e-4a13-8a8d-b8e5f68bedfb	1
f536b29f-1835-4a02-b3b3-3137c64ce030	1
e196afae-0543-4b2d-99f0-6c2c6123b1bc	1
cd47f920-0379-4b99-bf3c-782f9122bdfb	1
6869fc3f-10ad-419c-81d7-91e91ad0f367	1
6362a910-8ebd-4b3f-92b5-384960e8f173	1
9009c2fb-16d3-4050-852f-28873f3faf8b	1
2bb5fc24-8d9f-4063-ba65-942e8734462c	1
5165314d-d6d4-461c-8ca6-3acd19c68606	1
b0f3a408-5012-490d-abf3-0db7167d5cb1	1
a7b7273c-9c14-49e3-b471-feede9ccb30e	1
592c8825-c083-4291-89fa-64ffc66dc2d9	1
e4403eec-4859-4837-ad1f-45fa409a33f8	1
f98de67e-355c-4440-b188-bd95b97032f9	1
715fccae-3203-4698-93c9-2665297c949d	1
eaacb310-fdf5-414e-b613-a1f3c11f8762	1
8fd6fb61-7f9e-4d0e-85d0-eaf12aa45340	1
e0abd3f9-d49d-42fe-b358-839d5e445361	1
79cb5a79-5935-4e3e-b598-17e5c9961a1a	1
4492adca-6b01-4a59-b87e-08b225a0df48	1
48ae26a8-0b96-4375-9ed1-5ddbca889045	1
8eb82d1f-54c5-4e4a-a918-daa433d4f5ee	1
eab2bd02-ba14-43d7-913e-93502d38187f	1
cd5d6c51-51f7-4cfd-b49e-54ce0d292c5b	1
137310d9-ef03-45e6-8a1c-f7c7fa1d303e	1
dc1914ce-6ae3-41e3-8d14-5ad75e5cbdb2	1
57169124-4928-435c-a0d6-d05e6617f39b	1
87f63b6c-94c1-49d6-9fb9-f5d8e21d9392	1
19c3b0cd-42ed-49be-85b3-f3f9465cdc01	1
a798a802-13d2-4753-96d8-930b9c8092df	1
c43b12d2-aaf7-4aa6-8806-9290b0536fae	1
d81f72f7-be3c-4fde-bec1-9f29d7f7eaa8	1
6609c25f-b2d4-4ed6-b9f4-78e34c09f321	1
4596d9bb-385d-4bc2-b37b-3caee0878707	1
633a7571-0d4f-4a47-b7cd-0f1d51541a0b	1
be9e3f22-5ddb-41e8-90aa-1bf0ee17e284	1
6b168965-e866-447b-9a2a-bff8cdb71464	1
c87cb390-bb81-4a2b-8c12-73bc900df65e	1
337b1429-d84e-43d8-974b-a041adb09a0c	1
11126037-accf-4d3c-ba44-2515bb95e5a6	1
f9a457dd-69de-43fa-9259-e560504274d5	1
ad4b79c3-3d9d-46f1-b15f-dfa0c1ebc201	1
49a1aa77-0b02-407e-85a7-5c1a95f6b12c	1
14bf8480-6352-4a9c-8953-982221e17f9c	1
a86e2f30-bde5-471d-9ccf-11cc36668844	1
3ac57d12-957a-4941-a9b5-0365a725175e	1
52ce4fcf-c0e1-47d0-a5a1-6a08730fb47e	1
87a0d5eb-b583-4ff6-8e3f-e50870aa518a	1
85412a07-d165-44ac-86e2-fa043eaa89e5	1
6b7735cb-b649-40ea-8621-8c90c694abfa	1
3193fcf0-2d29-4efa-abdb-548ed3b1c0a5	1
0df9fe7d-d2ad-4cf0-9e89-3c8f36a00763	1
bab33655-5d3e-4092-b5d3-3c812415957b	1
6b972ead-0dc0-4934-91db-ba1de1d71687	1
442a9ff9-218f-44a8-9cf6-a8b142322ae8	1
f008a79c-3991-419e-b670-123c482f078e	1
86c2aa9f-1391-43f3-850d-8a24ac04debd	1
d1e6e86a-05ed-42b0-912d-86a8e70e2679	1
dc05a238-6105-4d08-9dcb-bf4c5fbfb5a9	1
c51f9cdc-07bd-4388-a077-b461b8981d9e	1
bae501cf-d2a8-48f1-a749-d7254a5618e2	1
3786ff70-7c8c-4ceb-bbdb-dd5f7b208c21	1
1fc14fc8-6b17-4926-b5bf-ca0f01cf11c5	1
a87e0981-404d-4254-89f0-02d87ae939db	1
87efe4f9-c702-4f16-b73a-d0a25e66bc5d	1
0b663717-c7b6-4ce0-b8fc-39bc52734a56	1
794bd1fa-cf0c-47aa-9863-7bd059110130	1
a28d6d7d-e3bc-4990-be2e-0444c8aca216	1
\.


--
-- Data for Name: Venue; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Venue" (id, name, city, address, "createdAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
2100cf8a-8960-4ba1-b708-b2b4f2180870	d5949d4ff0ba470926b8417d67bd1e7e2e5a17e015b2f0ff3b1a5fa627ed2449	2025-10-29 04:15:29.579357+00	20251006153802_init	\N	\N	2025-10-29 04:15:29.403402+00	1
82af1769-0f43-4530-9938-dd3980640361	5cd6a75c1941d7936a07d8ac651ec9483322aa5f00ed58e6458b74287459e634	2025-10-29 04:15:29.604359+00	20251009092139_add_events_shows	\N	\N	2025-10-29 04:15:29.582143+00	1
903aa62b-951a-4f48-885f-8a84e45b72a2	320d0e4aaa66f006c73c84ae8d73c4aad71bbec878877080a614bcbaa27efa25	2025-10-29 04:15:29.625677+00	20251011065121_add_deleted_and_updated_at	\N	\N	2025-10-29 04:15:29.606124+00	1
26a1d6a5-80a7-4493-8c6d-a358473bb1ac	195bb5ecd8dbea996352e933044b52e2d7598350c95c527858d8bb9be7e6deb2	2025-10-29 04:15:29.633207+00	20251011080315_add_event_cover	\N	\N	2025-10-29 04:15:29.627539+00	1
dedc1f05-6dfc-4f6b-b271-43eb4dcfc795	aab1a0e0dd530c4c6f7ad1d2cea87a218514ad3ea10d29ae31734868cd20031a	2025-10-29 04:15:29.662501+00	20251013035024_add_order	\N	\N	2025-10-29 04:15:29.635857+00	1
49438b20-ad30-4c04-9b35-daa2a70e6874	7f9312e302d69900b1e0a2d7c0f7d7fcf8a9bb12939ea00f08236ac9da5204c5	2025-10-29 04:15:29.675277+00	20251015151041_add_ticket_checkin	\N	\N	2025-10-29 04:15:29.664383+00	1
85d907c0-411f-4437-8ca9-6653237fa5c1	490695b2ef33a69430abb3d558e97f9cd2703ec422f0cd3c372fdb26f9a2a57e	2025-10-29 04:15:29.68296+00	20251015174749_add_order_currency	\N	\N	2025-10-29 04:15:29.677059+00	1
f9bebde9-003d-4504-b516-e5d9d23ec290	a8a122648a7be93159b07e01bce107567291093d4d451399be532efc597e78f7	2025-10-29 04:15:29.772549+00	20251021103931_add_venue_seatmap_compat	\N	\N	2025-10-29 04:15:29.684792+00	1
\.


--
-- Name: Role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Role_id_seq"', 1, true);


--
-- Name: Event Event_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_pkey" PRIMARY KEY (id);


--
-- Name: IdempotencyKey IdempotencyKey_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."IdempotencyKey"
    ADD CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY (key);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: SeatMap SeatMap_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."SeatMap"
    ADD CONSTRAINT "SeatMap_pkey" PRIMARY KEY (id);


--
-- Name: ShowTicketType ShowTicketType_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ShowTicketType"
    ADD CONSTRAINT "ShowTicketType_pkey" PRIMARY KEY (id);


--
-- Name: Show Show_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Show"
    ADD CONSTRAINT "Show_pkey" PRIMARY KEY (id);


--
-- Name: Ticket Ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_pkey" PRIMARY KEY (id);


--
-- Name: UserRole UserRole_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId", "roleId");


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Venue Venue_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Venue"
    ADD CONSTRAINT "Venue_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Event_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Event_deletedAt_idx" ON public."Event" USING btree ("deletedAt");


--
-- Name: Event_startsAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Event_startsAt_idx" ON public."Event" USING btree ("startsAt");


--
-- Name: Event_venueId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Event_venueId_idx" ON public."Event" USING btree ("venueId");


--
-- Name: IdempotencyKey_createdAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "IdempotencyKey_createdAt_idx" ON public."IdempotencyKey" USING btree ("createdAt");


--
-- Name: IdempotencyKey_expiresAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "IdempotencyKey_expiresAt_idx" ON public."IdempotencyKey" USING btree ("expiresAt");


--
-- Name: Order_showId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Order_showId_idx" ON public."Order" USING btree ("showId");


--
-- Name: Order_status_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Order_status_idx" ON public."Order" USING btree (status);


--
-- Name: Order_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Order_userId_createdAt_idx" ON public."Order" USING btree ("userId", "createdAt");


--
-- Name: Payment_orderId_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Payment_orderId_key" ON public."Payment" USING btree ("orderId");


--
-- Name: Payment_provider_providerRef_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Payment_provider_providerRef_idx" ON public."Payment" USING btree (provider, "providerRef");


--
-- Name: Payment_status_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Payment_status_idx" ON public."Payment" USING btree (status);


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: ShowTicketType_showId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "ShowTicketType_showId_idx" ON public."ShowTicketType" USING btree ("showId");


--
-- Name: ShowTicketType_showId_name_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "ShowTicketType_showId_name_key" ON public."ShowTicketType" USING btree ("showId", name);


--
-- Name: Show_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Show_deletedAt_idx" ON public."Show" USING btree ("deletedAt");


--
-- Name: Show_eventId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Show_eventId_idx" ON public."Show" USING btree ("eventId");


--
-- Name: Show_seatMapDbId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Show_seatMapDbId_idx" ON public."Show" USING btree ("seatMapDbId");


--
-- Name: Show_startsAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Show_startsAt_idx" ON public."Show" USING btree ("startsAt");


--
-- Name: Show_venueDbId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Show_venueDbId_idx" ON public."Show" USING btree ("venueDbId");


--
-- Name: Ticket_checkedInAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Ticket_checkedInAt_idx" ON public."Ticket" USING btree ("checkedInAt");


--
-- Name: Ticket_code_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Ticket_code_key" ON public."Ticket" USING btree (code);


--
-- Name: Ticket_orderId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Ticket_orderId_idx" ON public."Ticket" USING btree ("orderId");


--
-- Name: Ticket_showId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Ticket_showId_idx" ON public."Ticket" USING btree ("showId");


--
-- Name: Ticket_showId_seatId_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Ticket_showId_seatId_key" ON public."Ticket" USING btree ("showId", "seatId");


--
-- Name: User_email_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "User_email_idx" ON public."User" USING btree (email);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Venue_city_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Venue_city_idx" ON public."Venue" USING btree (city);


--
-- Name: Event Event_venueId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES public."Venue"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: IdempotencyKey IdempotencyKey_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."IdempotencyKey"
    ADD CONSTRAINT "IdempotencyKey_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: IdempotencyKey IdempotencyKey_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."IdempotencyKey"
    ADD CONSTRAINT "IdempotencyKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Order Order_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ShowTicketType ShowTicketType_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ShowTicketType"
    ADD CONSTRAINT "ShowTicketType_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Show Show_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Show"
    ADD CONSTRAINT "Show_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public."Event"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Show Show_seatMapDbId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Show"
    ADD CONSTRAINT "Show_seatMapDbId_fkey" FOREIGN KEY ("seatMapDbId") REFERENCES public."SeatMap"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Show Show_venueDbId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Show"
    ADD CONSTRAINT "Show_venueDbId_fkey" FOREIGN KEY ("venueDbId") REFERENCES public."Venue"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Ticket Ticket_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Ticket Ticket_showId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_showId_fkey" FOREIGN KEY ("showId") REFERENCES public."Show"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRole UserRole_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRole UserRole_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict DiSPDL8jUAkh7SCBucZTjNycW53JakSeFh7OycRkmcIDqL5Un05umBGEmIRnsbC

