--
-- PostgreSQL database dump
--

\restrict nPj3CaLk2reV5zf9y0TaF4bxABafhwTgyk2ZxDKku5moVXJbKi6sXdcPCQUcPAH

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg12+1)
-- Dumped by pg_dump version 16.11 (Debian 16.11-1.pgdg12+1)

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: blog_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO blog_user;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: blog_user
--

COMMENT ON SCHEMA public IS '';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: AuthProvider; Type: TYPE; Schema: public; Owner: blog_user
--

CREATE TYPE public."AuthProvider" AS ENUM (
    'local',
    'google',
    'github'
);


ALTER TYPE public."AuthProvider" OWNER TO blog_user;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: blog_user
--

CREATE TYPE public."UserRole" AS ENUM (
    'USER',
    'ADMIN',
    'MODERATOR'
);


ALTER TYPE public."UserRole" OWNER TO blog_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: blog_user
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


ALTER TABLE public._prisma_migrations OWNER TO blog_user;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: blog_user
--

CREATE TABLE public.categories (
    id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.categories OWNER TO blog_user;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: blog_user
--

CREATE TABLE public.comments (
    id text NOT NULL,
    content text NOT NULL,
    approved boolean DEFAULT true NOT NULL,
    "postId" text NOT NULL,
    "authorId" text NOT NULL,
    "parentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.comments OWNER TO blog_user;

--
-- Name: home_configs; Type: TABLE; Schema: public; Owner: blog_user
--

CREATE TABLE public.home_configs (
    id text NOT NULL,
    "userId" text,
    "layoutJson" text NOT NULL,
    "navJson" text NOT NULL,
    "canvasJson" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.home_configs OWNER TO blog_user;

--
-- Name: home_layout_templates; Type: TABLE; Schema: public; Owner: blog_user
--

CREATE TABLE public.home_layout_templates (
    id text NOT NULL,
    "userId" text,
    name text NOT NULL,
    description text,
    "layoutJson" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "navJson" text NOT NULL,
    "canvasJson" text
);


ALTER TABLE public.home_layout_templates OWNER TO blog_user;

--
-- Name: post_categories; Type: TABLE; Schema: public; Owner: blog_user
--

CREATE TABLE public.post_categories (
    "postId" text NOT NULL,
    "categoryId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.post_categories OWNER TO blog_user;

--
-- Name: post_embeddings; Type: TABLE; Schema: public; Owner: blog_user
--

CREATE TABLE public.post_embeddings (
    id text NOT NULL,
    post_id text NOT NULL,
    chunk_index integer DEFAULT 0 NOT NULL,
    content text NOT NULL,
    embedding public.vector(1024),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.post_embeddings OWNER TO blog_user;

--
-- Name: post_tags; Type: TABLE; Schema: public; Owner: blog_user
--

CREATE TABLE public.post_tags (
    "postId" text NOT NULL,
    "tagId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.post_tags OWNER TO blog_user;

--
-- Name: posts; Type: TABLE; Schema: public; Owner: blog_user
--

CREATE TABLE public.posts (
    id text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    excerpt text,
    content text NOT NULL,
    "coverImage" text,
    published boolean DEFAULT false NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "authorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.posts OWNER TO blog_user;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: blog_user
--

CREATE TABLE public.tags (
    id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tags OWNER TO blog_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: blog_user
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    "passwordHash" text,
    name text,
    bio text,
    avatar text,
    role public."UserRole" DEFAULT 'USER'::public."UserRole" NOT NULL,
    provider public."AuthProvider" DEFAULT 'local'::public."AuthProvider" NOT NULL,
    "providerId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO blog_user;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: blog_user
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
b72f6806-0df3-45c2-9b67-22cdb19b488a	449561455099f83de20a93838282f58a74d90f129e3dbbfab2c508e6a2673365	2026-02-28 02:32:32.087845+00	20260126095354_init	\N	\N	2026-02-28 02:32:32.035508+00	1
423264a9-fc19-49af-82cb-2643308d583a	dac7895377150920ce205e5df6218d8a54906b93d766bad9276977ada785d07b	2026-02-28 02:32:32.091346+00	20260227101827_add_post_feature_flags	\N	\N	2026-02-28 02:32:32.088847+00	1
1089d91b-f6a2-4a0a-8ea6-a4b957cbc2f5	13e683b7a6845e5fddaf4e43fee65e69f6866824193d2df1d01e52655b834a60	2026-02-28 02:32:32.118273+00	20260228100000_add_semantic_search	\N	\N	2026-02-28 02:32:32.0918+00	1
2551a8c9-11ba-4cdd-9c89-edcbb9b00dcf	25a152ea7211ae6df49ef9d260999aaee55e9eec6056c49fff720dbf1aee9a7d	2026-02-28 03:19:37.296188+00	20260228120000_embedding_dim_1024	\N	\N	2026-02-28 03:19:37.28953+00	1
622d20d3-89eb-4f0c-ab35-0a14d0bf3589	d294bcae616ecea3d786d74e99251f9a430b5080677fe5df486ff39910ba5399	2026-02-28 03:19:37.670768+00	20260228031937_embedding_dim_1024	\N	\N	2026-02-28 03:19:37.661365+00	1
d9efbf1e-8ca6-443f-bf04-788608eae1a3	773f6c6dc604d00f6db2b904b27e2aad783d6397489878391eefbdda3a9f4e42	2026-02-28 03:20:02.720347+00	20260228130000_recreate_post_embeddings_1024	\N	\N	2026-02-28 03:20:02.688406+00	1
7dc8bbc5-553e-4d38-b1dc-8aafedb2821c	0ac5a021e258a28f0782a7795a8011d8f0eb098dce906233e4d7ed93f94dd140	2026-03-01 14:49:13.921172+00	20260301000000_add_home_config_and_templates		\N	2026-03-01 14:49:13.921172+00	0
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: blog_user
--

COPY public.categories (id, slug, name, description, "createdAt", "updatedAt") FROM stdin;
cmm5q1x6l0002ctuibu8evoi4	technology	Technology	Tech news and tutorials	2026-02-28 02:48:32.061	2026-02-28 02:48:32.061
cmm5q1x6v0003ctuig26k3mph	web-development	Web Development	Frontend and backend web development	2026-02-28 02:48:32.061	2026-02-28 02:48:32.061
cmm5q1x700004ctuiogzracmz	programming	Programming	Programming languages and best practices	2026-02-28 02:48:32.061	2026-02-28 02:48:32.061
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: blog_user
--

COPY public.comments (id, content, approved, "postId", "authorId", "parentId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: home_configs; Type: TABLE DATA; Schema: public; Owner: blog_user
--

COPY public.home_configs (id, "userId", "layoutJson", "navJson", "canvasJson", "createdAt", "updatedAt") FROM stdin;
cmm7ves3n0000ct11mqs5rvcy	\N	{"id":"layout-1772089639687","cards":[{"id":"profile-1772089639685-dy8z8diqj","type":"profile","size":"custom","borderRadius":40,"padding":24,"config":{"showAvatar":true,"showBio":true,"showSocialLinks":true},"visible":true,"createdAt":"2026-02-26T07:07:19.685Z","updatedAt":"2026-02-27T07:18:57.770Z","animationPriority":1,"position":{"x":812.6591552734375,"y":285.55272930526735,"z":0},"customDimensions":{"width":299.9296875,"height":346.8359375}},{"id":"calendar-1772089639687-18i0nlbr5","type":"calendar","size":"custom","borderRadius":40,"padding":24,"config":{"showPostDots":true,"highlightToday":true},"visible":true,"createdAt":"2026-02-26T07:07:19.687Z","updatedAt":"2026-02-27T07:19:14.012Z","animationPriority":8,"position":{"x":1157.8446491020582,"y":462.0751089912036,"z":7},"customDimensions":{"width":336.00390625,"height":324.00390625}},{"id":"motto-1772090195922-3z0yqbisx","type":"motto","size":"custom","borderRadius":40,"padding":0,"config":{"motto":"种一棵树最好的时间是十年前 其次是现在。","author":"","fontStyle":"serif","textAlign":"center","showDivider":true,"dividerStyle":"line","textSize":"medium"},"visible":true,"createdAt":"2026-02-26T07:16:35.922Z","updatedAt":"2026-03-04T09:28:38.618Z","position":{"x":295.6523168945315,"y":541.7564866333008,"z":3},"customDimensions":{"width":479.69140625,"height":123.62890625}},{"id":"music-1772090210468-s8ih4b508","type":"music","size":"custom","borderRadius":40,"padding":0,"config":{"title":"爱不会绝迹","artist":"林","autoPlay":true,"showProgress":true,"showVolume":true,"audioUrl":"http://localhost:3000/music/林俊杰+-+爱不会绝迹.wav","playlist":[{"audioUrl":"http://localhost:3000/music/林俊杰-爱不会绝迹.mp3","title":"爱不会绝迹","artist":"林俊杰","coverUrl":""},{"audioUrl":"http://localhost:3000/music/林俊杰-背对背拥抱.mp3","title":"背对背拥抱","artist":"林俊杰","coverUrl":""},{"audioUrl":"http://localhost:3000/music/전쟁터-AKMU_李仙姬.mp3","title":"전쟁터","artist":"AKMU/李仙姬","coverUrl":""},{"audioUrl":"http://localhost:3000/music/王力宏-爱错.mp3","title":"爱错","artist":"王力宏","coverUrl":""}],"coverUrl":"","simplifiedMode":true,"persistAcrossPages":true},"visible":true,"createdAt":"2026-02-26T07:16:50.468Z","updatedAt":"2026-03-04T09:28:46.910Z","position":{"x":349.74351969920286,"y":441.18510480383674,"z":4},"customDimensions":{"width":244.8046875,"height":73.35546875}},{"id":"image-1772090233717-b4gu1cd23","type":"image","size":"custom","borderRadius":40,"padding":24,"config":{"src":"/images/dashboard/cat.webp","alt":"Cover Image","objectFit":"cover","showOverlay":false,"navigateTo":"/pictures","linkUrl":""},"visible":true,"createdAt":"2026-02-26T07:17:13.717Z","updatedAt":"2026-02-28T15:53:48.696Z","position":{"x":1166.8235517578123,"y":189.53528561057897,"z":5},"customDimensions":{"width":242.19921875,"height":231.5}},{"id":"clock-1772090365195-zr21crs0z","type":"clock","size":"custom","borderRadius":40,"padding":24,"config":{"format24h":true,"showSeconds":true,"showDate":true,"fontStyle":"mono"},"visible":true,"createdAt":"2026-02-26T07:19:25.195Z","updatedAt":"2026-02-27T05:39:03.361Z","position":{"x":812.6591557617185,"y":136.43501752433625,"z":5},"customDimensions":{"width":292.953125,"height":124.22265625}},{"id":"reading-1772177283949-fi9k1huyg","type":"reading","size":"custom","borderRadius":40,"padding":20,"config":{"bookTitle":"百年孤独","author":"加西亚·马尔克斯","totalPages":360,"currentPage":120,"status":"reading","startDate":"2024-01-01","streak":7,"dailyGoal":30,"showStreak":true,"showProgress":true,"showAuthor":true},"visible":true,"createdAt":"2026-02-27T07:28:03.949Z","updatedAt":"2026-03-03T02:31:59.781Z","position":{"x":819.0100709287136,"y":667.7459317244346,"z":6},"customDimensions":{"width":285.6953125,"height":252.53125}},{"id":"latest_posts-1772616292583-qzrdy69lg","type":"latest_posts","size":"custom","borderRadius":40,"padding":24,"config":{"limit":1,"showImage":true,"showExcerpt":true,"showDate":true},"visible":true,"createdAt":"2026-03-04T09:24:52.583Z","updatedAt":"2026-03-04T09:28:40.420Z","position":{"x":394.41724529346396,"y":704.8283078071216,"z":7},"customDimensions":{"width":381.25390625,"height":195.31640625}},{"id":"image-1772616835350-wuqulf7er","type":"image","size":"custom","borderRadius":40,"padding":8,"config":{"src":"/images/avatar/avatar-pink.png","alt":"Cover Image","objectFit":"cover","showOverlay":false,"hideCardContainer":false},"visible":true,"createdAt":"2026-03-04T09:33:55.350Z","updatedAt":"2026-03-04T10:24:13.091Z","position":{"x":404.05528947866225,"y":238.01564141044435,"z":8},"customDimensions":{"width":188.890625,"height":174.8984375}},{"id":"wooden_fish-1772617754205-dl7co98r9","type":"wooden_fish","size":"custom","borderRadius":14,"padding":0,"config":{"hideCardContainer":true},"visible":true,"createdAt":"2026-03-04T09:49:14.205Z","updatedAt":"2026-03-04T09:56:45.303Z","position":{"x":1157.8589176484215,"y":740.5202506062034,"z":9},"customDimensions":{"width":148.8203125,"height":179.75390625}}],"version":2,"createdAt":"2026-02-26T07:07:19.685Z","updatedAt":"2026-03-04T10:24:13.091Z"}	{"horizontalPosition":{"x":0,"y":0},"verticalPosition":{"x":-257.279541015625,"y":-209.5864715576172},"layout":"auto","customSize":null,"visibleItems":["home","blog","pictures","thoughts","works","about"]}	{"scale":1}	2026-03-01 14:54:02.435	2026-03-04 10:24:52.997
\.


--
-- Data for Name: home_layout_templates; Type: TABLE DATA; Schema: public; Owner: blog_user
--

COPY public.home_layout_templates (id, "userId", name, description, "layoutJson", "createdAt", "updatedAt", "navJson", "canvasJson") FROM stdin;
cmm7vpp340001ctmg4rhq0rl8	\N	demo3	\N	{"id":"layout-1772089639687","cards":[{"id":"profile-1772089639685-dy8z8diqj","type":"profile","size":"custom","borderRadius":40,"padding":24,"config":{"showAvatar":true,"showBio":true,"showSocialLinks":true},"visible":true,"createdAt":"2026-02-26T07:07:19.685Z","updatedAt":"2026-02-27T07:18:57.770Z","animationPriority":1,"position":{"x":812.6591552734375,"y":285.55272930526735,"z":0},"customDimensions":{"width":299.9296875,"height":346.8359375}},{"id":"calendar-1772089639687-18i0nlbr5","type":"calendar","size":"custom","borderRadius":40,"padding":24,"config":{"showPostDots":true,"highlightToday":true},"visible":true,"createdAt":"2026-02-26T07:07:19.687Z","updatedAt":"2026-02-27T07:19:14.012Z","animationPriority":8,"position":{"x":1157.8446491020582,"y":462.0751089912036,"z":7},"customDimensions":{"width":336.00390625,"height":324.00390625}},{"id":"music-1772090210468-s8ih4b508","type":"music","size":"custom","borderRadius":40,"padding":0,"config":{"title":"爱不会绝迹","artist":"林","autoPlay":true,"showProgress":true,"showVolume":true,"audioUrl":"http://localhost:3000/music/林俊杰+-+爱不会绝迹.wav","playlist":[{"audioUrl":"http://localhost:3000/music/林俊杰-爱不会绝迹.mp3","title":"爱不会绝迹","artist":"林俊杰","coverUrl":""},{"audioUrl":"http://localhost:3000/music/林俊杰-背对背拥抱.mp3","title":"背对背拥抱","artist":"林俊杰","coverUrl":""}],"coverUrl":"","simplifiedMode":true,"persistAcrossPages":true},"visible":true,"createdAt":"2026-02-26T07:16:50.468Z","updatedAt":"2026-03-01T14:57:12.603Z","position":{"x":533.311907150375,"y":690.8223837345008,"z":4},"customDimensions":{"width":244.8046875,"height":73.35546875}},{"id":"image-1772090233717-b4gu1cd23","type":"image","size":"custom","borderRadius":40,"padding":24,"config":{"src":"/images/dashboard/cat.webp","alt":"Cover Image","objectFit":"cover","showOverlay":false,"navigateTo":"/pictures","linkUrl":""},"visible":true,"createdAt":"2026-02-26T07:17:13.717Z","updatedAt":"2026-02-28T15:53:48.696Z","position":{"x":1166.8235517578123,"y":189.53528561057897,"z":5},"customDimensions":{"width":242.19921875,"height":231.5}},{"id":"clock-1772090365195-zr21crs0z","type":"clock","size":"custom","borderRadius":40,"padding":24,"config":{"format24h":true,"showSeconds":true,"showDate":true,"fontStyle":"mono"},"visible":true,"createdAt":"2026-02-26T07:19:25.195Z","updatedAt":"2026-02-27T05:39:03.361Z","position":{"x":812.6591557617185,"y":136.43501752433625,"z":5},"customDimensions":{"width":292.953125,"height":124.22265625}},{"id":"reading-1772177283949-fi9k1huyg","type":"reading","size":"custom","borderRadius":40,"padding":20,"config":{"bookTitle":"百年孤独","author":"加西亚·马尔克斯","totalPages":360,"currentPage":120,"status":"reading","startDate":"2024-01-01","streak":7,"dailyGoal":30,"showStreak":true,"showProgress":true,"showAuthor":true},"visible":true,"createdAt":"2026-02-27T07:28:03.949Z","updatedAt":"2026-03-01T14:57:24.572Z","position":{"x":820.5852584287136,"y":665.5078706892784,"z":6},"customDimensions":{"width":292.02734375,"height":252.53125}}],"version":2,"createdAt":"2026-02-26T07:07:19.685Z","updatedAt":"2026-03-01T14:57:24.572Z"}	2026-03-01 15:02:31.745	2026-03-01 15:02:31.745	{"horizontalPosition":{"x":0,"y":0},"verticalPosition":{"x":-257.64453125,"y":-72.943359375},"layout":"auto","customSize":null,"visibleItems":["home","blog","pictures","thoughts","works","about"]}	{"scale":1}
cmm7vqx4z0002ctmgojzkgtsc	\N	first_index	\N	{"id":"layout-1772089639687","cards":[{"id":"profile-1772089639685-dy8z8diqj","type":"profile","size":"custom","borderRadius":40,"padding":24,"config":{"showAvatar":true,"showBio":true,"showSocialLinks":true},"visible":true,"createdAt":"2026-02-26T07:07:19.685Z","updatedAt":"2026-02-27T07:18:57.770Z","animationPriority":1,"position":{"x":812.6591552734375,"y":285.55272930526735,"z":0},"customDimensions":{"width":299.9296875,"height":346.8359375}},{"id":"calendar-1772089639687-18i0nlbr5","type":"calendar","size":"custom","borderRadius":40,"padding":24,"config":{"showPostDots":true,"highlightToday":true},"visible":true,"createdAt":"2026-02-26T07:07:19.687Z","updatedAt":"2026-02-27T07:19:14.012Z","animationPriority":8,"position":{"x":1157.8446491020582,"y":462.0751089912036,"z":7},"customDimensions":{"width":336.00390625,"height":324.00390625}},{"id":"motto-1772090195922-3z0yqbisx","type":"motto","size":"custom","borderRadius":40,"padding":0,"config":{"motto":"Stay hungry, stay foolish.","author":"Steve Jobs","fontStyle":"serif","textAlign":"center","showDivider":true,"dividerStyle":"line","textSize":"medium"},"visible":true,"createdAt":"2026-02-26T07:16:35.922Z","updatedAt":"2026-02-28T15:07:35.335Z","position":{"x":348.50889135742216,"y":653.5131873168946,"z":3},"customDimensions":{"width":405.21875,"height":200.453125}},{"id":"music-1772090210468-s8ih4b508","type":"music","size":"custom","borderRadius":40,"padding":0,"config":{"title":"爱不会绝迹","artist":"林","autoPlay":true,"showProgress":true,"showVolume":true,"audioUrl":"http://localhost:3000/music/林俊杰+-+爱不会绝迹.wav","playlist":[{"audioUrl":"http://localhost:3000/music/林俊杰-爱不会绝迹.mp3","title":"爱不会绝迹","artist":"林俊杰","coverUrl":""},{"audioUrl":"http://localhost:3000/music/林俊杰-背对背拥抱.mp3","title":"背对背拥抱","artist":"林俊杰","coverUrl":""}],"coverUrl":"","simplifiedMode":true,"persistAcrossPages":true},"visible":true,"createdAt":"2026-02-26T07:16:50.468Z","updatedAt":"2026-02-28T15:44:02.643Z","position":{"x":500.5078021699061,"y":543.0917680118446,"z":4},"customDimensions":{"width":244.8046875,"height":73.35546875}},{"id":"image-1772090233717-b4gu1cd23","type":"image","size":"custom","borderRadius":40,"padding":24,"config":{"src":"/images/dashboard/cat.webp","alt":"Cover Image","objectFit":"cover","showOverlay":false,"navigateTo":"/pictures","linkUrl":""},"visible":true,"createdAt":"2026-02-26T07:17:13.717Z","updatedAt":"2026-02-28T15:53:48.696Z","position":{"x":1166.8235517578123,"y":189.53528561057897,"z":5},"customDimensions":{"width":242.19921875,"height":231.5}},{"id":"clock-1772090365195-zr21crs0z","type":"clock","size":"custom","borderRadius":40,"padding":24,"config":{"format24h":true,"showSeconds":true,"showDate":true,"fontStyle":"mono"},"visible":true,"createdAt":"2026-02-26T07:19:25.195Z","updatedAt":"2026-02-27T05:39:03.361Z","position":{"x":812.6591557617185,"y":136.43501752433625,"z":5},"customDimensions":{"width":292.953125,"height":124.22265625}},{"id":"reading-1772177283949-fi9k1huyg","type":"reading","size":"custom","borderRadius":40,"padding":20,"config":{"bookTitle":"百年孤独","author":"加西亚·马尔克斯","totalPages":360,"currentPage":120,"status":"reading","startDate":"2024-01-01","streak":7,"dailyGoal":30,"showStreak":true,"showProgress":true,"showAuthor":true},"visible":true,"createdAt":"2026-02-27T07:28:03.949Z","updatedAt":"2026-02-28T15:28:04.594Z","position":{"x":812.6780396787136,"y":667.7459317244346,"z":6},"customDimensions":{"width":292.02734375,"height":252.53125}}],"version":2,"createdAt":"2026-02-26T07:07:19.685Z","updatedAt":"2026-02-28T15:53:48.696Z"}	2026-03-01 15:03:28.835	2026-03-01 15:03:28.835	{"horizontalPosition":{"x":0,"y":0},"verticalPosition":{"x":-287.6875,"y":-222.0591278076172},"layout":"auto","customSize":null,"visibleItems":["home","blog","pictures","thoughts","works","about"]}	{"scale":1}
cmmbuc7lp0000ctaespdw53a0	\N	丰富	较多卡片	{"id":"layout-1772089639687","cards":[{"id":"profile-1772089639685-dy8z8diqj","type":"profile","size":"custom","borderRadius":40,"padding":24,"config":{"showAvatar":true,"showBio":true,"showSocialLinks":true},"visible":true,"createdAt":"2026-02-26T07:07:19.685Z","updatedAt":"2026-02-27T07:18:57.770Z","animationPriority":1,"position":{"x":812.6591552734375,"y":285.55272930526735,"z":0},"customDimensions":{"width":299.9296875,"height":346.8359375}},{"id":"calendar-1772089639687-18i0nlbr5","type":"calendar","size":"custom","borderRadius":40,"padding":24,"config":{"showPostDots":true,"highlightToday":true},"visible":true,"createdAt":"2026-02-26T07:07:19.687Z","updatedAt":"2026-02-27T07:19:14.012Z","animationPriority":8,"position":{"x":1157.8446491020582,"y":462.0751089912036,"z":7},"customDimensions":{"width":336.00390625,"height":324.00390625}},{"id":"motto-1772090195922-3z0yqbisx","type":"motto","size":"custom","borderRadius":40,"padding":0,"config":{"motto":"种一棵树最好的时间是十年前 其次是现在。","author":"","fontStyle":"serif","textAlign":"center","showDivider":true,"dividerStyle":"line","textSize":"medium"},"visible":true,"createdAt":"2026-02-26T07:16:35.922Z","updatedAt":"2026-03-04T09:28:38.618Z","position":{"x":295.6523168945315,"y":541.7564866333008,"z":3},"customDimensions":{"width":479.69140625,"height":123.62890625}},{"id":"music-1772090210468-s8ih4b508","type":"music","size":"custom","borderRadius":40,"padding":0,"config":{"title":"爱不会绝迹","artist":"林","autoPlay":true,"showProgress":true,"showVolume":true,"audioUrl":"http://localhost:3000/music/林俊杰+-+爱不会绝迹.wav","playlist":[{"audioUrl":"http://localhost:3000/music/林俊杰-爱不会绝迹.mp3","title":"爱不会绝迹","artist":"林俊杰","coverUrl":""},{"audioUrl":"http://localhost:3000/music/林俊杰-背对背拥抱.mp3","title":"背对背拥抱","artist":"林俊杰","coverUrl":""},{"audioUrl":"http://localhost:3000/music/전쟁터-AKMU_李仙姬.mp3","title":"전쟁터","artist":"AKMU/李仙姬","coverUrl":""},{"audioUrl":"http://localhost:3000/music/王力宏-爱错.mp3","title":"爱错","artist":"王力宏","coverUrl":""}],"coverUrl":"","simplifiedMode":true,"persistAcrossPages":true},"visible":true,"createdAt":"2026-02-26T07:16:50.468Z","updatedAt":"2026-03-04T09:28:46.910Z","position":{"x":349.74351969920286,"y":441.18510480383674,"z":4},"customDimensions":{"width":244.8046875,"height":73.35546875}},{"id":"image-1772090233717-b4gu1cd23","type":"image","size":"custom","borderRadius":40,"padding":24,"config":{"src":"/images/dashboard/cat.webp","alt":"Cover Image","objectFit":"cover","showOverlay":false,"navigateTo":"/pictures","linkUrl":""},"visible":true,"createdAt":"2026-02-26T07:17:13.717Z","updatedAt":"2026-02-28T15:53:48.696Z","position":{"x":1166.8235517578123,"y":189.53528561057897,"z":5},"customDimensions":{"width":242.19921875,"height":231.5}},{"id":"clock-1772090365195-zr21crs0z","type":"clock","size":"custom","borderRadius":40,"padding":24,"config":{"format24h":true,"showSeconds":true,"showDate":true,"fontStyle":"mono"},"visible":true,"createdAt":"2026-02-26T07:19:25.195Z","updatedAt":"2026-02-27T05:39:03.361Z","position":{"x":812.6591557617185,"y":136.43501752433625,"z":5},"customDimensions":{"width":292.953125,"height":124.22265625}},{"id":"reading-1772177283949-fi9k1huyg","type":"reading","size":"custom","borderRadius":40,"padding":20,"config":{"bookTitle":"百年孤独","author":"加西亚·马尔克斯","totalPages":360,"currentPage":120,"status":"reading","startDate":"2024-01-01","streak":7,"dailyGoal":30,"showStreak":true,"showProgress":true,"showAuthor":true},"visible":true,"createdAt":"2026-02-27T07:28:03.949Z","updatedAt":"2026-03-03T02:31:59.781Z","position":{"x":819.0100709287136,"y":667.7459317244346,"z":6},"customDimensions":{"width":285.6953125,"height":252.53125}},{"id":"latest_posts-1772616292583-qzrdy69lg","type":"latest_posts","size":"custom","borderRadius":40,"padding":24,"config":{"limit":1,"showImage":true,"showExcerpt":true,"showDate":true},"visible":true,"createdAt":"2026-03-04T09:24:52.583Z","updatedAt":"2026-03-04T09:28:40.420Z","position":{"x":394.41724529346396,"y":704.8283078071216,"z":7},"customDimensions":{"width":381.25390625,"height":195.31640625}},{"id":"image-1772616835350-wuqulf7er","type":"image","size":"custom","borderRadius":40,"padding":24,"config":{"src":"/images/avatar/avatar-pink.png","alt":"Cover Image","objectFit":"cover","showOverlay":false},"visible":true,"createdAt":"2026-03-04T09:33:55.350Z","updatedAt":"2026-03-04T09:34:06.757Z","position":{"x":404.05528947866225,"y":238.01564141044435,"z":8},"customDimensions":{"width":188.890625,"height":174.8984375}}],"version":2,"createdAt":"2026-02-26T07:07:19.685Z","updatedAt":"2026-03-04T09:34:06.757Z"}	2026-03-04 09:35:07.641	2026-03-04 09:35:07.641	{"horizontalPosition":{"x":0,"y":0},"verticalPosition":{"x":-257.279541015625,"y":-209.5864715576172},"layout":"auto","customSize":null,"visibleItems":["home","blog","pictures","thoughts","works","about"]}	{"scale":1}
\.


--
-- Data for Name: post_categories; Type: TABLE DATA; Schema: public; Owner: blog_user
--

COPY public.post_categories ("postId", "categoryId", "createdAt") FROM stdin;
cmm5q1x7o000actuile4fzwt2	cmm5q1x700004ctuiogzracmz	2026-02-28 02:48:32.1
\.


--
-- Data for Name: post_embeddings; Type: TABLE DATA; Schema: public; Owner: blog_user
--

COPY public.post_embeddings (id, post_id, chunk_index, content, embedding, created_at) FROM stdin;
pe_551bf6c13511ae4b60fb198a	cmm5q1x7o000actuile4fzwt2	0	标题：Getting Started with TypeScript\n标签：TypeScript\n正文：TypeScript is a typed superset of JavaScript...	[-0.082212746,0.020161984,0.013165475,-0.03448602,-0.054377172,-0.04917117,0.028392287,0.093166426,-0.008087363,0.085703485,0.03532861,0.020658512,0.030664273,0.01885296,-0.0025503405,-0.018582128,-0.013203091,-0.07649517,0.010472195,-0.05181931,0.030182792,-0.019123793,0.06824982,0.018521942,-0.032108713,-0.008854723,0.05482856,-0.03614111,0.057988275,0.008779491,-0.07691646,-0.022644617,0.021455962,0.030543903,-0.03277075,0.025142295,-0.040895727,0.03960175,0.02387841,-0.06493965,-0.02207286,0.0037352333,-0.007778915,-0.053654954,0.040654987,0.040805448,-0.016942086,-0.0058153784,-0.00235662,0.047786914,-0.018416619,0.019364534,-0.035087872,-0.020282354,0.0067332,0.018326342,0.00016221746,-0.004513877,0.008237826,0.017950185,0.02262957,0.014707716,-0.0034079773,0.04748599,0.03253001,-0.049261447,-0.05819892,0.025518453,-0.014692671,-0.032229085,-0.044597108,0.08046738,-0.044597108,0.034064725,-0.059914198,0.048509132,-0.048810057,0.051398017,-0.0147829475,-0.043724425,0.013308414,0.03058904,-0.008749398,0.008388288,-0.0036317904,0.0225092,-0.0007509023,-0.026616829,0.013473923,0.06782853,-0.022117998,0.0001216631,0.019409671,0.021335592,-0.04441655,0.042851742,-0.07372666,-0.02669206,0.0072033955,0.022012675,-0.041016098,-0.03469667,-0.037736014,-0.05675448,0.013917788,-0.014903318,-0.077036835,0.041738316,-0.0058680405,-0.05254153,0.023246467,0.01409082,0.039421193,-0.008140025,0.03556935,-0.017739538,-0.0067708157,-0.015422414,0.024420075,0.041136466,0.0030863634,-0.013142906,-0.056182723,-0.020523096,-0.0005783405,0.0035866515,0.045048494,-0.048810057,0.025458267,-0.013398692,-0.0123379305,-0.046884138,0.0062103425,-0.012789318,0.019108746,-0.037615642,0.028843675,-0.005830425,-0.008335627,-0.014497069,-0.027278865,0.010720458,0.10694879,0.030664273,-0.033492967,-0.01481304,0.010073469,0.008711783,-6.961098e-06,0.0018911265,-0.001877961,-0.010758074,-0.022133045,-0.017965231,0.04441655,-0.00051815546,0.025909655,0.00044950694,0.010442102,-0.04847904,-0.055009115,-0.05166885,0.025834424,-0.043393407,-0.028001085,-0.0059620794,-0.055941984,-0.011149277,-0.0033045344,0.019244162,-0.023592532,0.046131823,-0.007105595,-0.020282354,0.040504526,-0.0041301977,0.012668949,0.029084416,0.036472127,-0.01692704,-0.020056661,0.027399234,0.048810057,0.026526552,-0.022825172,0.005119489,0.034877226,0.029731404,-0.024901556,-0.008832153,-0.010449626,0.05777763,-0.057025313,0.049231354,0.00082096143,-0.0060824496,-0.034064725,0.025668915,0.04390498,-0.0014735928,0.01483561,0.040414248,-0.002866312,-0.009892914,0.0066241147,0.0037352333,-0.014263852,-0.07228222,0.00095261616,-0.011021383,0.018536989,-0.0077864383,0.04077536,-0.0094039105,-0.0015234336,-0.0012356739,-0.04655312,-0.014466977,0.014971026,0.0076848757,-0.024254566,0.0892544,0.0039872583,0.014745332,-0.01370714,0.037134163,0.022253415,0.014151005,0.040293876,-0.009689789,0.04724525,0.05218042,-0.07890257,-0.017032363,0.0011642042,0.0075231288,-0.051608663,0.029595988,-0.008975092,0.01050981,0.021004574,0.053233657,-0.06493965,0.018521942,0.015264428,0.02038768,-0.014241283,-0.013240706,0.024209429,0.0255335,-0.049231354,-0.022178182,0.030152699,-0.018567082,-0.023050867,-0.07890257,0.00019607155,0.027233725,0.014008066,0.0045740623,-0.021847166,0.005446745,9.262852e-05,0.0043558916,0.005063066,-0.016310142,0.06397668,-0.03397445,-0.051849402,0.061479006,-0.031416584,-0.00716578,0.01579857,-0.04321285,0.005774001,-0.014527162,0.0056273,0.05410634,-0.026947847,-0.0033195806,0.0035960556,-0.015136534,0.041467484,0.010163747,0.013330984,0.048388764,0.0050367345,0.028166594,0.029731404,-0.012714087,0.0076623065,0.056423463,-0.03099529,-0.008170118,-0.032830935,0.015618015,0.0071356874,-0.015768478,0.03590037,-0.029776543,0.026496459,-0.003073198,-0.04787719,0.035870276,0.0064209905,0.011698465,-0.015768478,-0.056904946,0.067467414,-0.043363314,-0.013188045,0.028557796,-0.012179946,-0.014068251,0.039812397,-0.049261447,0.015587922,-0.0024280897,0.0050893966,-0.027339049,-0.009012708,0.0076096444,-0.02979159,0.0028625506,-0.014918364,0.010404487,0.046131823,-0.046402656,0.0022061574,-0.033101767,-0.015663154,0.029054323,0.04929154,0.01745366,-0.022238368,-0.0136093395,-0.023020774,0.055972077,-0.024013827,-0.036111016,0.07089797,0.0019879867,0.007884239,-0.03915036,0.018040463,0.011728558,-0.00079463044,0.044205904,-0.03517815,0.012390593,-0.015497645,0.024555491,0.0202974,0.051789217,0.024660816,0.00807984,0.034335557,0.0074930363,0.01740852,0.014512115,0.01334603,0.041858688,-0.025383037,-0.014226236,0.0035546783,-0.019424718,-0.0060824496,0.057175778,0.0041640517,0.014181097,0.035479076,0.01211976,0.036562406,0.0051909587,0.018341387,-0.0027854384,0.066504456,0.020493003,-0.034606393,0.014308991,0.014135959,0.008117456,0.0008740935,-0.077518314,0.00807984,-0.029400386,-0.02681243,0.011585618,-0.00514582,-0.032018434,0.03259019,-0.02279508,-0.024465214,-0.008222779,-0.012398116,0.011788743,-0.0025710291,0.015873801,0.06343502,-0.013383646,0.013586771,-0.024254566,-0.013428785,-0.015211766,-0.023201328,-0.044446643,0.027113356,0.004137721,-0.016611068,0.022764986,-0.00021911113,-0.03132631,0.043182757,-0.043182757,-0.022178182,-0.01596408,-0.0029114508,-0.010457149,0.044536922,0.010645227,0.023502253,-0.011367448,-0.0075757904,-0.005254905,-0.022268461,0.080828495,0.009900438,0.01091606,0.05937253,-0.038969807,-0.03863879,0.0070228404,0.00026048833,0.006676777,-0.019800875,-0.0060072183,0.025428174,0.07011556,-0.010758074,-0.004893795,-0.022148091,-0.009832729,-0.01224013,-0.014963503,-0.0084936125,0.010141177,0.02488651,0.003927073,-0.030303162,0.025683962,-0.002841862,-0.0054881223,0.030017283,0.054527637,0.010005761,0.027549697,0.039872583,-0.06662483,-0.032891117,-0.002926497,0.050314683,-0.009659697,-0.030438578,-0.009133078,0.0052511436,-0.013263276,-0.009915483,0.012653902,0.061569285,0.029595988,0.048268393,0.012691518,0.025819378,-0.039932765,0.037675828,-0.026014978,-0.001666373,-0.006172727,0.02094439,0.07107852,0.045379512,0.025879562,-0.020026568,-0.038006846,-0.086485885,-0.057235964,-0.0018215375,0.01370714,-0.04546979,-0.053745233,0.029580941,0.0015478837,0.040113322,-0.0105474265,0.014143482,0.010953675,-0.047817007,0.028196687,-0.01837148,-0.008960046,-0.058469757,0.010111085,-0.051067,-0.034395743,-0.010923583,0.0016654326,-0.023592532,-0.0014397388,0.014000542,0.01676153,0.025503406,0.015542784,0.021561287,0.0028023655,0.019199025,0.009554373,-0.011194415,0.06499983,-0.004205429,-0.021380732,0.0073162424,-0.015888847,-0.039421193,0.02818164,-0.039451286,0.08702755,-0.042189706,-0.038759157,0.056573927,-0.024344845,0.02411915,0.0069212783,-0.024329798,0.013015012,0.021531194,0.059613273,0.0073764278,-0.028497612,-0.009644651,0.014151005,0.03746518,0.048539225,0.010690366,0.020447863,0.020748788,0.059071604,-0.043182757,0.0021459723,-0.011382493,-0.002943424,0.0050555426,0.008937477,0.021817073,-0.026014978,0.007184588,0.009719882,-0.008606459,0.009900438,-0.0051420582,-0.038849436,0.009727405,-0.034516115,-0.04706469,-0.06463872,0.03111566,-0.03051381,0.030799689,-0.01445193,0.019244162,0.017739538,0.0010071589,-0.0021967536,-0.022539293,0.006199058,-0.005345183,0.0015779763,0.024946695,0.040113322,0.04282165,-0.013436308,-0.007015317,0.0026218104,-0.01591894,0.0011745484,0.04706469,0.032951303,0.0030957675,0.0024036395,0.009486665,0.026315903,-0.010141177,-0.000824723,-0.03352306,-0.00049370533,-0.02166661,0.013977973,0.05254153,0.013451354,0.009524281,0.034666575,-0.0016080687,-0.04288183,0.019846013,-0.013248229,0.021455962,-0.023126097,0.0120445285,-0.0823933,0.008869769,0.018822867,0.036442034,0.05335403,0.04896052,-0.009817683,-0.031777695,-0.02544322,0.037073977,-0.0566943,0.039511472,-0.043032296,-0.019936292,-0.015061303,-0.007831577,-0.015226812,0.011668373,0.009178217,0.016731437,-0.021275409,0.036321666,-0.02532285,-0.009005185,0.059432715,0.040263783,0.04161795,0.03448602,-0.0043709376,-0.0032424685,-0.01740852,0.014369176,-0.0013588651,0.029731404,-0.0011143634,-0.0017980278,-0.07210167,9.744803e-05,0.009629604,-0.03147677,-0.03948138,-0.0020876683,0.01077312,0.022840219,-0.003253753,0.01385008,-0.0076547833,0.037404995,-0.022900404,-0.045319326,-0.051307738,-0.014579823,-0.054076247,-0.026120303,-0.06138873,0.008809583,-0.0010109204,-0.016475651,0.015738385,0.039511472,0.0066466844,0.0055821612,0.012037006,-0.03960175,-0.056874853,0.00016339295,0.017092548,0.020402724,-0.0058492324,-0.03421519,0.0073801894,0.059191976,0.016234912,0.0063307127,-0.015144058,-0.044567015,-0.023020774,-0.011450202,-0.010585042,0.05109709,-0.037826292,-0.036291573,-0.00391955,-0.04580081,-0.036381852,-0.016626114,0.0006441679,0.0030242978,-0.025036972,-0.017137688,-0.0021290453,0.037073977,0.049923483,-0.053685047,-0.03421519,0.0015046258,-0.051518384,0.010449626,-0.018943237,-0.04691423,-0.019906199,0.019891152,0.0030807212,-0.0058830865,-0.02022217,-0.026421228,-0.029219832,0.002555983,-0.009020232,0.01776963,-0.017107595,-0.0030431056,0.005695008,0.008967569,-0.021471009,0.028046224,-0.027248772,-0.097439565,-0.006225389,0.005480599,0.017303197,-0.027639974,0.049442,0.021696704,-0.014105866,-0.004446169,-0.00601098,0.02548836,0.025458267,-0.01286455,-0.010306686,0.020884205,-0.007974517,0.013496493,0.010848352,0.03361334,-0.029716358,0.09792104,-0.0032255414,-0.050404962,-0.031627234,-0.08504145,-0.0405948,0.0076735914,-0.042942017,-0.08612478,-0.0077412995,0.01603931,-0.02890386,0.0018751398,-0.018476805,-0.0035678437,-0.013752279,-0.011894067,-0.10971731,0.0019616557,0.03924064,0.012443255,0.0101487,-0.009223356,-0.025337897,-0.020372633,0.025082111,-0.011314785,-0.04595127,0.033673525,0.0566943,0.007899285,-0.041226745,-0.02034254,-0.017574029,-0.06265262,-0.023652716,-0.046101734,-0.012894643,-0.07264333,-0.00095167576,0.020146938,-0.0022512963,0.030152699,-0.0039007422,-0.050796166,-0.018958284,0.00032020317,0.0115254335,-0.02745942,0.013473923,0.03316195,0.014105866,3.1326777e-05,-0.01495598,0.09503216,-0.026300857,-0.015422414,-0.02633095,0.010607611,-0.044958215,-0.023096005,0.008260395,-0.019605273,-0.01543746,0.0043709376,0.009780067,-0.017935138,-0.042671185,0.021982582,0.01077312,0.030438578,-0.011043953,-0.023381883,-0.0053752754,0.0053150905,-0.0062441966,0.0054617915,0.015663154,0.011359924,0.017844861,0.016776577,-0.006752008,0.0047771866,-0.033462875,0.04477766,0.014655055,0.05862022,0.03674296,-0.022644617,0.0144594535,0.00018502194,0.019710597,-0.0333726,0.023983734,-0.00078663713,0.027083263,-0.02777539,-0.012661425,0.03277075,-0.038849436,-0.029340202,0.031055475,-0.020161984,-0.02685757,-0.028317057,0.023261514,-0.034997594,0.017589075,-0.0211099,0.007564506,-0.03481704,-0.016054356,0.016219866,0.04832858,-0.0034549967,-0.0017011674,-0.014256328,-0.018582128,0.007011556,0.065300755,0.017543936,0.00012518956,0.0446272,0.00685357,0.046402656,0.014579823,-0.0075231288,0.08943495,0.030242978,0.046523027,-0.03626148,0.008854723,-0.011924159,0.0048486562,0.004724525,0.0042580906,0.039902676,-0.023020774,0.0037747298,0.0010720459,0.045650344,-0.0010861517,0.09816178,0.014564777,-0.016370328,0.032108713,-0.018476805,0.07577295,-0.03520824,0.03292121,0.018100647,-0.085101634,0.030573994,0.00047654318,-0.011931682,-0.029565895,0.015384798,0.0008764445,-0.038819343,0.026285812,0.0036994985,-0.031627234,-0.04884015,0.005766478,-0.02484137,0.030483717,-0.03147677,0.032861024,-0.004780948,0.036682773,0.001632519,0.027564744,0.049502186,-0.0076623065,0.012097191,-0.011232031,-0.018446712,-0.006906232,0.0864257,0.00656393,0.010238978,0.00051909586,0.007997085,-0.00048383122,-0.0005872742,0.040113322,-0.0045477315,0.04571053,-0.0019014707,0.016671253,0.029957099,0.026120303,-0.03746518,-0.037736014,-0.009870345,-0.00051862566,-0.012029483,-0.017920092,0.04212952,-0.010336779,0.0048749875,0.011141754,0.0046756244,0.026270766,-0.013977973,-0.0033571962,0.009877868,-0.011969297,-0.0223136,-0.039361008,0.023050867,0.023291606,0.013586771,-0.034606393,-0.01274418,-0.024525398,-0.00019818742,0.04920126,-0.008057271,-0.07721739,0.016249958,-0.020146938,-0.032349452,-0.00070012116,-0.0020707413,-0.019259209,0.0043558916,-0.016325189,0.009998238,-0.054347083,-0.025398083,0.0470346,-0.015302043,-0.015903894,-0.042942017,-0.04799756,-0.051367924,0.009027754,0.030573994,0.0041339593,-0.009644651,-0.057416517,0.0023509776,-0.02765502,-0.01397045,-0.005318852,0.005318852,0.011653326,0.009712359,0.057717443,0.0025352943,0.019199025,0.026752245,-0.031296216,0.021380732,-0.008042225,0.016626114,-0.0009276958,0.02931011,-0.017574029,0.00247699,0.019665457,-0.031627234,0.030197838,0.0061539193,-0.038849436,0.01789,-0.0004955861,0.03770592,-0.03505778,0.03710407,-0.005638585,-0.046282288,0.014677624,0.044717476,0.010863397,-0.016415467,0.025924701,-0.0013306533,-0.0099907145]	2026-02-28 03:20:06.305067+00
pe_47fce99f01f3bcc8ba197707	cmm5q2cpb0001ct7z9qqw17yc	0	标题：2026年最值得掌握的10个技术点\n标签：\n正文：2026年最值得掌握的10个技术点（按重要性排序）Prompt → Function Calling → Structured Output（必会）\n提示 → 函数调用 → 结构化输出（必会）\nVercel AI SDK / LangChain.js / LlamaIndex.TS\nReact Server Components + Server Actions\nStreaming + Suspense + useOptimistic\nRAG 前端实现（向量搜索 + 引用溯源展示）随着AI技术从探索走向落地，掌握核心工具链与模式已成为开发者构建下一代应用的关键。以下是根据技术趋势与市场需求梳理的十个技术要点。\n\n**1. 提示工程 → 函数调用 → 结构化输出（必会）**\n这构成了与AI模型交互的核心工作流。精妙的“提示工程”是引导模型理解意图的第一步；而“函数调用”能力让大模型从“思考者”转变为“行动者”，能根据用户请求动态调用外部工具或API；“结构化输出”则确保了模型返回的信息是稳定、可程序化处理的数据格式（如JSON）。三者结合，实现了从自然语言指令到可靠、可执行结果的完整自动化链条，是任何AI功能的基础。\n\n**2. 主流AI应用开发框架（Vercel AI SDK / LangChain.js / LlamaIndex.TS）**\n选择并精通一个主流框架至关重要。Vercel AI SDK 以其与Next.js的深度集成、简洁的流式响应处理见长，适合全栈开发者快速构建Web应用。LangChain.js 提供了最丰富的模块化抽象（链、智能体、检索器），适用于需要复杂编排和实验性探索的场景。LlamaIndex.TS 则专精于RAG（检索增强生成）应用的构建，擅长文档索引与检索。理解它们的哲学与优劣，能让你在合适的场景选用最锋利的工具。\n\n**3. React Server Components + Server Actions**\n这一组合正在重新定义全栈React应用架构。Server Components允许在服务端直接获取数据并渲染非交互式UI，极大提升了初始加载性能和SEO。Server Actions则提供了在服务端安全执行数据变更（如数据库操作、AI调用）的简洁途径。对于AI应用，这意味着可以将耗时的LLM调用、向量搜索等完全放在服务端，仅流式传输结果到客户端，从而提升安全性、降低客户端复杂度，并实现更平滑的交互。\n\n**4. 流式响应 + Suspense + useOptimistic**\n这是打造流畅AI用户体验的前端“铁三角”。“流式响应”允许UI逐词、逐段地显示AI生成的长内容，显著降低用户感知延迟。配合React的Suspense组件，可以在等待流式内容时优雅地展示加载状态。而`useOptimistic`钩子则能实现“乐观更新”，在AI处理用户指令（如翻译一段文本）的同时，界面立即显示预期结果，待真实结果返回后再无缝替换。这三者共同消除了等待的焦虑感，使交互感觉即时而自然。\n\n**5. RAG的前端实现：向量搜索与引用溯源展示**\nRAG（检索增强生成）系统的价值不仅在于后端检索的准确性，更在于前端的透明化呈现。前端需要实现：1）对用户查询进行预处理并可能发起多轮向量搜索；2）清晰展示AI回答所依据的“参考资料”或原文片段。这通常通过高亮、侧边栏引用或脚注实现，让用户可以追溯和验证信息来源，极大增强答案的可信度与系统的可靠性。\n\n**6. Tool Call在前端的完整交互闭环**\n当AI模型通过“函数调用”触发一个真实操作（如发送邮件、预订机票）时，前端需要设计完整的交互闭环。这包括：**确认**（向用户展示AI计划执行的操作并请求授权）、**中断**（允许用户在操作执行中随时取消）、**进度反馈**（展示操作执行状态）以及**人工介入**的入口（当AI无法完成时，平滑切换至人工流程）。这一闭环是构建负责任、可信赖的AI助手产品的关键。\n\n**7. 多模态输入输出处理管道**\n未来的AI应用将超越纯文本。技术要点包括：处理图像、音频、PDF等多种格式的**输入**（如通过视觉理解模型描述图片内容，或通过解析器提取文档文本）；生成图文并茂、附带图表或合成语音的**输出**。前端需要搭建一个能够路由、协调不同模态处理模型，并统一呈现结果的管道，以提供更丰富、更人性化的交互体验。\n\n**8. 小模型端侧部署与量化技术**\n出于成本、延迟、隐私和离线可用性的考虑，将经过“量化”（降低模型精度以压缩体积和加速）的小型模型（如Phi-3, Gemma 2B）部署到浏览器、手机或边缘设备端侧运行，已成为重要趋势。掌握相关的推理框架（如ONNX Runtime, TensorFlow.js）和优化技术，	[-0.07124556,0.03675867,-0.022922894,-0.012439575,0.017827164,-0.008463959,0.023522392,0.054459624,-0.058593,0.088662535,0.04193328,-0.0064643193,-0.07023588,0.006748292,-0.08386656,0.02412189,0.013717451,-0.04231191,0.0072689084,-0.027718876,0.030905679,0.0023269972,0.057141587,-0.0050878413,-0.02096664,0.0029777677,0.0510204,-0.038494054,0.019972736,0.02049335,0.03843095,-0.040544968,0.04133378,-0.018852621,-0.04836999,0.027624218,-0.022023648,0.023553945,-0.023459287,0.0010116522,0.03578054,0.03156828,-0.006752236,-0.0051075616,-0.03969305,0.01730655,-0.03388739,-0.038115427,-0.0034688034,-0.016281093,0.011272132,9.151459e-05,-0.027797757,-0.015918238,-0.07837642,0.07635706,-0.0054822476,0.007813189,-0.009686619,0.04650839,-0.00829042,0.018458216,-0.018000703,0.043290038,-0.018679082,-0.02500536,0.008243091,0.021077072,-0.017353877,-0.038967345,-0.0043503013,-0.045120083,0.023837917,0.014048752,-0.06187446,0.049221907,-0.027229812,0.03704264,-0.0006611236,-0.0018527237,-0.031662937,0.026330566,-0.009576186,-0.015216195,0.038841132,-0.01498744,-0.031047665,-0.017795613,0.036695562,0.05253492,-0.038241636,0.0017058073,-0.02386947,0.049695194,-0.04357401,-0.0088978065,-0.085002445,0.011847965,0.027261363,-0.014593033,-0.00036531885,-0.019057713,0.0057819965,-0.0068311174,0.0050286804,0.041775517,-0.07118245,0.014758684,-0.012360694,0.03615917,-0.03174182,-0.045751132,-0.034202915,0.0026326622,0.038115427,0.030574378,0.03073214,0.0026681586,-0.01549228,0.013599129,-0.032688394,0.012060945,-0.005758332,-0.0327515,-0.032152,0.012581561,0.0022915006,-0.015318741,0.086580075,-0.02336463,0.008258868,-0.020319814,-0.012266036,-0.022670474,0.028649675,-0.0074858316,0.02336463,-0.015437063,-0.0012532261,0.0059160944,-0.017369654,-0.04231191,0.09768655,0.056510534,0.03726351,0.015610602,0.02290712,-0.008834701,-0.0017136954,0.018963056,-0.015500168,-0.0060896333,-0.02588883,0.027671546,0.04029255,-0.011776973,0.024989584,-0.0036088177,0.021787005,-0.0041688746,-0.05218784,0.027845085,0.048717067,0.023553945,0.015547496,-0.07269697,0.07200281,-0.030669035,-0.051367477,-0.0052219396,-0.0070440965,0.03152095,-0.009205443,-0.035086386,0.008116881,0.0122897,0.058277477,0.020430246,0.02538399,-0.06985725,0.0032439919,-0.0064051584,-0.0013350653,-0.020856205,-0.01856865,-0.027087824,0.042595882,0.043321587,0.036979534,-0.012053057,0.019262804,0.04736031,-0.036600906,0.018679082,0.054080993,0.02020938,-0.062789485,0.015697371,0.07761916,0.02311221,-0.002183039,-0.006618138,0.009931151,0.04133378,-0.0029304388,-0.0217239,-0.0009766486,-0.016154882,0.0012394218,-0.00875582,-0.01300752,-0.021581912,0.06086478,-0.015563273,-0.01098816,0.002001612,-0.03767369,0.036979534,0.02374326,-0.012660443,-0.021234836,0.03590675,-0.005868766,0.0036778387,-0.009520968,0.024326982,-0.016470408,0.016991023,0.022291845,0.0076554264,0.0032084952,-0.0015371986,-0.096803084,-0.038620267,-0.010420214,0.03199424,0.008101106,0.037484374,-0.0071624187,0.05367081,0.0844345,0.00837719,0.0103492215,0.04079739,0.009931151,-0.043763325,-0.04108136,0.034549993,0.0030191804,0.05881387,-0.060170628,-0.01329938,-0.028665451,0.022544265,0.0011536385,-0.019893855,0.005237716,0.0012906947,0.036190722,0.0025399767,-0.015184643,0.0125263445,0.017101457,0.030527048,0.017353877,0.013812109,0.0009238968,0.0013291492,-0.053355284,0.012392246,-0.011106482,0.026977392,0.021597689,-0.028002847,0.050957296,0.017795613,0.042974513,-0.014664027,-0.008605946,0.038241636,-0.047581177,-0.0048985262,-0.003253852,0.0055177445,0.020887759,-0.04499387,0.014821789,0.00212585,0.006239508,-0.013110066,0.0010589809,0.05098885,0.021439927,0.031252757,-0.0055808495,0.024169218,0.008574394,0.026661867,-0.00031429253,0.032846157,-0.01902616,-0.0019631574,0.05117816,0.014238068,0.015271412,0.015539609,-0.008463959,-0.14779194,-0.01511365,-0.07004656,-0.020761548,0.012857646,0.06136962,-0.04650839,0.02071422,-0.048717067,-0.016470408,-0.013078514,-0.0079709515,-0.025857277,0.023049105,-0.01300752,0.01713301,-0.003628538,0.06556611,-0.003567405,-0.0050168484,-0.026330566,-0.0106726345,-0.012534233,-0.042879853,0.038494054,0.02954892,0.021297941,0.023538169,-0.003636426,-0.06525058,0.024816046,0.013117954,0.029075634,0.012258148,-0.04647684,-0.053449944,0.015468615,0.02513157,-0.01637575,-0.032814603,-0.03969305,-0.03877803,0.00112603,-0.0024630674,0.02871278,0.016565066,0.016454631,0.028176386,0.011982064,-0.008637498,0.023301525,0.0042635323,0.010893502,0.013181059,0.0047802045,-0.024058785,-0.037200402,-0.0011743448,-0.0046421625,-0.0009677745,0.038083874,0.002372354,0.0029146627,-0.007667259,-0.060486153,0.017022576,0.0043503013,-0.0075804894,0.032972366,-0.010633194,-0.011918958,0.012802429,0.013086401,-0.0077974126,0.015050544,0.0074858316,-0.053954784,0.01317317,0.008858366,-0.052661132,0.014435271,0.015444951,-0.03477086,0.038967345,-0.025447095,-0.0056597306,-0.033792734,0.020808877,-0.0116744265,0.009670842,0.010506984,0.03581209,-0.0028121169,0.013094289,-0.019925406,0.032341316,-0.02707205,-0.023222644,-0.009631402,-0.0057188915,0.023932574,-0.0302273,-0.024468968,-0.055721723,0.010215123,0.03855716,0.01814269,0.029075634,0.0058253813,-0.004066329,-0.012068833,0.038651817,0.053323735,0.04751807,0.0103728855,0.00043286092,-0.020351365,-0.04474145,0.1737912,-0.053891677,-0.07099313,-0.0057031154,0.030022208,-0.06966793,-0.056857612,0.050862636,0.0383994,0.018205795,-0.0067049074,0.015973456,-0.0025202562,0.007552881,-0.013433479,-0.013354598,-0.026582984,0.018884175,0.0022086753,-0.014411607,0.038872685,0.001623968,-0.07231834,0.010538536,0.009166002,-2.6067792e-05,-0.022591593,-0.020777324,-0.0026622426,-0.0077698044,0.005442807,0.043258484,0.006586585,-0.00997848,-0.00029777677,0.0040860493,-0.00862961,-0.010120465,-0.05329218,0.049695194,0.03309858,-0.039882366,0.027987072,0.02702472,-0.03128431,-0.008779485,-0.054964464,-0.033634968,-0.020319814,-0.05253492,-0.029091408,-0.006941551,0.03439223,0.011563993,0.05149369,-0.0022185354,0.013204724,-0.009962703,-0.016005008,-0.025415542,-0.019057713,0.01831623,-0.00726102,-0.042122595,-0.011272132,0.01561849,-0.07383286,0.04474145,-0.030069537,0.012818205,-0.018600201,0.015894575,-0.035843644,-0.0013528137,-0.005754388,-0.005072065,0.024248099,0.0060975216,-0.007253132,-0.014364278,-0.0034648594,-0.0012828065,0.05061022,-0.0029659355,-0.008385078,-0.015263524,-0.017574744,0.038620267,0.049916063,0.030921454,-0.0097655,0.042027935,0.036506247,-0.021913214,0.016186435,0.058782317,0.010514872,0.023254195,-0.015397622,-0.013961983,0.022891343,-0.0037941886,0.02689851,0.0742746,-0.031079218,-0.016391527,-0.024595177,-0.041743964,-0.029990656,-0.03631693,0.07452702,0.013543912,0.015555385,-0.008779485,0.06562921,0.0041215457,-0.028917871,0.015168866,0.03439223,-0.00854284,0.019578328,-0.006819285,-0.03123698,-0.013346709,-0.0032755444,0.04937967,0.07225524,0.032435976,-0.020067394,0.030653259,-0.031031888,0.019247027,0.048906382,-0.0061527384,-0.027450679,-0.0046737147,-0.025683738,-0.01801648,-0.021834332,-0.0245794,-0.029359605,-0.06301035,0.02992755,0.012171378,-0.05392323,-0.0018487796,0.011319461,0.014285397,0.01708568,0.006133018,0.021439927,-0.010451768,0.047044784,0.07534738,-0.004571169,0.0016052336,-0.03880958,-0.04966364,0.0434478,-0.0017314437,-0.0050326246,0.007063817,-0.022749355,0.015018992,0.016344197,-0.024705611,-0.045972,-0.090303265,0.03338255,0.007963063,0.00092143175,0.07162418,0.024610953,-0.012218707,0.061622042,0.0032084952,-0.014190739,-0.0067798444,-0.00039144827,0.058624554,0.03212045,0.012108274,0.000561043,0.016864814,0.025604857,0.03562278,-0.0033899222,0.0047210436,-0.006748292,-0.011461447,-0.019814974,-0.024405863,0.037011087,-0.017164562,0.006929719,0.022922894,0.0077145873,-0.021597689,-0.025857277,-0.009662954,-0.050357796,0.008014336,-0.00829042,0.004744708,-0.03581209,-0.0002340555,0.026235908,0.005249548,0.027261363,-0.0039125104,-0.025178898,-0.012242372,-0.029895999,-0.007379342,0.011942623,0.027261363,0.0075449925,0.0116744265,0.030353509,-0.04963209,0.031394742,-0.0340136,-0.012226596,-0.015539609,0.022812461,0.016612394,0.011280021,-0.0073911743,-0.011879518,-0.008038,0.008432407,0.008385078,-0.046066657,-0.009607738,-0.07320181,-0.049411222,-0.022197187,0.029754011,0.004744708,0.028381478,-0.024106113,-0.012131938,0.012573673,0.029817117,-0.02197632,-0.029769788,-0.03574899,-0.036569353,0.042375013,-0.0069731036,0.06225309,0.010562201,0.023932574,0.06386227,-0.0012226596,-0.04546716,0.029406935,0.022986,-0.026977392,-0.01998851,-0.007209747,0.03581209,-0.02659876,-0.04912725,-0.009883822,-0.06294724,0.014695579,0.018473992,-0.010743628,-0.070109665,0.013441367,-0.030274628,-0.010301893,0.091502264,0.06891067,0.035685882,-0.008002504,-0.022780908,0.025983488,0.016912142,-0.005083897,-0.0073635657,-0.02972246,0.005789885,0.01902616,-0.00027460538,0.030968783,0.023553945,-0.04445748,-0.002431515,0.010451768,-0.016817484,-0.0059752557,-0.05316597,0.014632474,0.029138738,-0.02530511,-0.012408023,0.031804923,-0.064177796,0.03237287,0.0024275708,0.0033958382,-0.010680523,0.0245794,-0.0131258415,-0.04647684,0.031063441,-0.014419494,-0.034360677,-0.060423046,-0.04773894,-0.0064524873,-0.04852775,-0.02997488,-0.0074108946,-0.009449976,0.047770493,-0.021203283,0.05152524,0.0031059496,-0.01174542,0.024658283,0.007450335,0.01629687,0.016849037,0.0029679076,-0.08102683,-0.0045435606,0.014593033,0.023301525,-0.015571161,0.007186083,-0.012392246,-0.052881997,-0.0020154163,-0.056384325,-0.021282164,-0.019483672,-0.024863373,0.021029744,-0.0040308326,0.06326277,0.006870558,0.03631693,0.0038888461,-0.0020864094,0.048054464,0.024563625,0.02222874,-0.0008312113,0.005383646,-0.005628178,0.012762988,-0.040166337,-0.015381846,0.034960177,-0.018742187,-0.030243076,0.021361046,0.041901726,-0.021581912,0.024642507,-0.016991023,-0.020745771,0.00374686,0.04370022,0.031142322,-0.060423046,0.028160611,0.004066329,0.030921454,-0.039093554,0.024043009,-0.003435279,0.012739324,-0.0383994,-0.018253123,-0.005935815,0.008850478,0.028681226,-0.015200419,-0.023932574,0.016738603,-0.033445656,-0.028586568,-0.055879485,-0.013267828,-0.010972383,0.022796685,-0.026851181,-0.06954172,0.0022106473,-0.004239868,-0.012786653,-0.010633194,-0.006992824,-0.002433487,-0.00938687,-0.0043581896,-0.047928255,0.020729996,-0.017180339,-0.002510396,-0.0016505904,0.016060226,0.012068833,-0.01523986,0.026945839,0.011216915,0.023206867,-0.012557897,0.009039792,-0.034202915,0.039756157,-0.006708851,-0.002121906,0.010451768,-0.004062385,-0.00463033,-0.014206516,0.00888203,-0.051683,-5.0995503e-05,0.012005728,-0.055974144,-0.007888126,0.0001463001,-0.0019463951,0.008179987,-0.020808877,-0.013267828,0.015508056,0.02167657,-0.04660305,-0.0019631574,-0.02091931,-0.04448903,-0.02210253,0.012802429,-0.00888203,-0.026693419,0.030290404,0.07534738,0.03691643,-0.026220132,0.0957934,-0.0072925724,0.01683326,0.0110985935,-0.029769788,-0.02904408,0.019262804,-0.027229812,0.013938319,0.022323398,-0.0059713116,0.009229108,-0.018757964,0.06954172,-0.031378966,0.006929719,-0.0040229443,0.008692715,0.031505175,-0.01511365,-0.006807453,-0.03893579,0.05404944,0.100652486,-0.017480088,0.015066321,0.019625658,0.05190387,0.014947999,0.05430186,0.057236243,-0.0006754208,0.057772636,-0.045751132,-0.027229812,-0.0346131,-0.023680154,0.006835061,-0.021708123,0.016675498,0.023333076,0.015926126,0.00488275,0.019688763,-0.004709211,-0.0027588722,-0.0226547,0.0047644284,0.011216915,-0.0014326809,-0.0027588722,0.054743595,-0.03093723,0.0061566825,-0.020777324,0.017117234,0.034833964,-0.007209747,-0.015926126,0.012518456,0.039503735,-0.011343125,0.0054151984,0.02631479,-0.006744348,0.025210451,-0.016912142,0.0045317286,-0.024200771,-0.023411958,-0.03338255,0.033067025,0.03562278,-0.00015123017,0.036348484,0.011437783,-0.04650839,-0.022165634,0.030116865,0.013015408,0.013867326,-0.025620634,-0.021534584,0.0089214705,-0.0011526524,-0.040229443,-0.027182482,-0.0009643234,-0.023995679,0.011469335,0.031978462,0.03817853,-0.026551433,0.013417702,0.018442439,-0.015839357,0.0012364638,0.02344351,0.0097970525,-0.01995696,0.060170628,0.0032577962,-0.0428483,-0.055469304,-0.033350997,-0.019972736,-0.032010015,-0.014190739,-0.0629157,-0.019483672,-0.008101106,0.046760812,0.022875566,0.0191997,-0.036853325,0.013756892,-0.0036127619,-0.020446023,0.006681243,-0.019767644,0.025652187,0.05379702,-0.01624954,0.05808816,-5.0841438e-05,0.0032656842,-0.02614125,0.013622794,-0.023080656,0.0018162411,0.0037172795,-0.009095009,-0.037957665,0.030811021,0.016517736,-0.08651697,0.020619562,-0.0072689084,0.03625383,0.0077343076,-0.003370202,-0.014119746,-0.0059042624,-0.01435639,-0.08222583,-0.03682177,0.008653275,-0.0006162599,-0.06739615,-0.030195747,-0.027482232,0.00900824,0.0148533415]	2026-02-28 03:20:06.603909+00
pe_d20dc090fa42f3662e6d076e	cmm5r3j230001ct1dzw4n2ar0	0	标题：元宝历险记：从街头“流浪猫”到温暖家庭的艰辛历程\n标签：\n正文：# 从街头到家园：一只流浪银渐层的重生历程\n\n## 初遇：街角那双琥珀色的眼睛\n去年深秋，我在小区的垃圾桶旁第一次遇见它——小小的身影蜷成一团，灰扑扑的，唯独那双琥珀色的眼睛亮得惊人。走近细看，才发现这竟是只银渐层。本该柔软光亮的银灰色毛发，此刻却打结板结，沾满草屑与污垢。我试探着唤了声“咪咪”，它警惕地后退两步，却没有逃走。\n\n## 流浪的印记\n从保安大叔那儿得知，它已在这片区域徘徊了近两个月。一只品种猫流落街头，生存尤其艰难：\n\n- **缺乏野外生存能力**：不懂得翻找垃圾桶，饿极了才肯啃食半截发霉的火腿肠  \n- **常受同类欺凌**：总被本地的野猫追赶到矮墙上，瑟瑟发抖  \n- **对人类矛盾的情感**：有人靠近时会仰起头张望，可当手伸到一半，它又会迅速躲闪\n\n一场暴雨过后，我见它蜷在车库角落发抖，前爪上多了一道新鲜的血痕。去便利店买火腿肠时，店员忽然说道：“这猫是叫元宝吧？以前住在7栋的小姑娘养的，搬家时就被留下了。” 那一刻，我手中的猫罐头忽然沉了几分。\n\n## 缓慢的靠近\n我开始每天在固定位置放置猫粮：\n\n1. **第一周**：放下便离开，通过监控看着它谨慎地进食  \n2. **第二周**：坐在三米外陪它吃饭，它每吃几口便抬头望我一眼  \n3. **第三周**：尝试轻声唤“元宝”，它的耳朵会微微转动\n\n转机出现在寒流来袭的那一夜。常放粮的位置不见它的踪影，最终我在废弃快递柜后发现了一个纸箱——它自己叼来旧毛巾垫成小窝，正缩在里面打着喷嚏。看见我时，它第一次没有立即逃跑，只是用沙哑的嗓子发出一声细微的“啊呜”。\n\n## 走向家的旅程\n带它去宠物医院的路上，它在航空箱里安静得令人心疼。检查结果却比预想中乐观：\n\n- 轻度营养不良  \n- 爪子发炎，耳螨严重  \n- 最庆幸的是：没有感染猫瘟或传腹\n\n医生微笑着说：“流浪这么久还能保持这样的状态，真是只有福气的猫。” 洗澡时才注意到，它的脖颈上还挂着半截褪色的红绳，铃铛早已不知去向。\n\n## 新家的第一个月\n适应新环境的过程并不轻松：\n\n- **凌晨巡视**：每天半夜三点，它要把所有房间的门缝检查一遍  \n- **藏粮习惯**：总会把冻干偷偷叼到沙发底下囤起来  \n- **矛盾的信任**：允许我抚摸它的肚子，可一听见塑料袋的声音，还是会吓得炸毛\n\n直到某个加班的深夜，我在沙发上睡着了，醒来时发现它正端坐在茶几上静静望着我。见我睁开眼，它犹豫着向前挪了半步，用还沾着猫粮碎屑的鼻子，轻轻碰了碰我的手指。\n\n## 如今的元宝\n现在，它最钟情三件事：\n\n1. 清晨洒满阳光的窗台  \n2. 装猫条的抽屉被拉开的声音  \n3. 被挠下巴时发出拖拉机般响亮的呼噜声\n\n上周带去宠物店，店员惊叹：“这只银渐层品相真好！” 我笑了笑，没有多言。他们看见的是缎子般光亮的皮毛和圆润的身形，只有我知道，有些痕迹永远不会消失——它至今不敢玩带铃铛的玩具，每到下雨天，一定要紧挨着人的腿才能安睡。\n\n## 尾声\n元宝的故事很普通，不过是万千流浪猫中幸运的一例。但每当它跳上膝盖，团成一颗银灰色的毛球时，我总会想起那个湿冷的傍晚——倘若当时径直走开，此刻的客厅该是多么安静。\n\n**或许所有的相遇都是双向的拯救：我给了它一个家，而它让我在这座匆忙的城市里，重新学会了“等待”与“靠近”的温柔。** 如今的元宝不再狼吞虎咽，而是悠闲地享用每一餐；最大的变化是，它开始在阳光晴好的下午，挨着我的脚边躺下，露出柔软的肚皮，发出满足的呼噜声。\n\n如今，元宝最大的爱好便是趴在窗台上晒太阳，望着窗外飞过的小鸟，然后回头对我轻唤一声，跳下窗台，亲昵地蹭过我的腿。曾经那只惊惶不安的小猫，已然不见踪影。从一个风雨飘摇的流浪者，蜕变成会撒娇、有点挑食、喜欢独占沙发的“家中小主”，元宝的转变温暖了它的余生，也完整了我的生活。\n\n有时望着它安睡的侧脸，我总会想起，在那个寒冷的秋夜，给予它一个家或许是我做过最正确的决定。**每一个流浪的生命，都值得一次被温柔拥抱的机会。** 元宝的故事很短，只是无数流浪动物找到归宿的微小缩影；而这份彼此给予的温暖却很长，将在我们共同的生命里，持续地散发着光亮。\n\n##前言：一只猫的“系统日志”在城市的某个角落，一只橘白相间的小猫正在执行它的日常任务：觅食、寻找临时栖身地、躲避危险。它的毛色让它看起来像个小元宝，附近的居民偶尔会叫它“元宝”，但大多数时候，它只是庞大都市数据流中一个微不足道的节点——一只典型的# 元宝：从流浪到有家的猫生转折\n\n去年深秋，我下班回家时，在小区废弃的花坛边第一次遇见了它。它蜷缩在一堆枯叶里，原本应该是金灿灿的橘色毛发，沾满了灰土和草屑，结成了缕。我试探性地叫了声“咪咪”，它警觉地抬起头——一双琥珀色的眼睛圆溜溜的，透着疲惫和警惕。那时我没想到，这个脏兮兮的小家伙，后来会有一个	[0.004966268,-0.033215426,0.0411422,-0.020699468,-0.06001241,-0.0050866134,-0.030262943,0.023956826,-0.027166046,0.06562854,-0.00041719858,-0.012315381,-0.048074115,0.022978015,-0.021726418,0.010413919,-0.10693121,-0.07541667,-0.059306383,0.027326507,-0.01838883,-0.01123227,0.035140958,-0.03969805,0.008624778,0.020185994,0.011071809,0.039441314,-0.0079749115,0.035526063,-0.08915213,0.030680142,-0.0012365525,0.00896977,-0.016142376,0.029203901,-0.029139716,0.03883156,-0.023844503,0.0073972517,0.04464025,-0.018613474,-0.002338719,-0.014200798,-0.0056522386,0.05359397,0.010959486,-0.059306383,-0.027679522,0.05356188,-0.0012265238,-0.034659576,-0.0341461,0.014056383,0.056514364,-0.027984397,-0.002330696,0.0009918496,-0.010036835,-0.007116445,0.0088093085,0.044126775,-0.015773315,-0.039794326,0.03517305,-0.020972252,0.05750922,0.0320922,0.020426685,-0.040821277,-0.036809754,0.030952927,-0.027856028,0.05125124,-0.025497252,0.037002306,0.00541957,0.0068917996,-0.026588386,0.0018643562,-0.02698954,-0.011553192,-0.022512678,0.031321988,0.011721675,0.022881737,-0.030535728,0.033151243,0.0124517735,0.0831188,0.054043263,0.021132713,0.038061347,-0.0033155254,0.015107403,0.013976153,-0.049839184,0.009162323,0.008624778,-0.05317677,-0.037451595,0.10725213,-0.026074912,0.019849025,-0.022288032,0.031338032,-0.020089716,0.00064685836,-0.012491888,-0.0010791002,-0.019447872,-0.026684664,0.035108864,-0.0027398714,0.046052307,-0.0040436173,0.059338477,-0.00836804,-0.01083914,0.04961454,0.007894681,0.050513122,-0.013374424,-0.029893883,-0.014529743,-0.005547939,-0.001350881,-0.033215426,0.01859743,-0.019207181,-0.02430984,-0.009739982,0.023635905,-0.008179499,-0.005844792,-0.032894503,0.03299078,0.0062018177,-0.08459504,-0.044479787,-0.006169725,0.0059290337,0.00056211493,-0.017538387,-0.0015464429,-0.033568442,-0.019544149,-0.00071204564,0.0030327127,0.025914451,-0.033183333,0.022352217,-0.0072167334,0.050384752,0.035526063,-0.016912589,0.0120345745,0.041784044,-0.019303458,-0.06158493,-0.014722296,-0.012820833,-0.018051863,-0.00981219,-0.0059049646,8.311378e-05,-0.04464025,-0.058600355,-0.06617411,0.0121870125,0.0034840093,0.023924734,0.014449513,0.028706472,0.04425514,-0.028658334,-0.0052631204,-0.007926773,0.067136884,-0.053048406,0.012170967,0.009106161,0.0045771496,-0.009619636,-0.031787325,0.022271985,-0.008777216,0.013831737,-0.008745125,-0.020667376,-0.042490073,0.011135993,-0.03295869,0.011296454,-0.04393422,-0.030985018,-0.06277234,-0.019768795,0.017618617,0.0017119183,-0.017458156,0.00010404893,-0.010903325,0.04014734,0.009258599,-0.02698954,-0.004561104,-0.01662376,-0.030166667,0.011561215,0.0386711,-0.005700377,0.013847784,-0.008889539,-0.004633311,0.034081914,0.03722695,-0.04900479,0.03215638,0.011954344,0.017586526,0.03459539,0.008496409,-0.026877217,-0.0041398937,-0.011071809,0.052727483,-0.032124292,-0.03851064,-0.018709753,0.009515337,0.03360053,-0.05192518,-0.009274646,-0.02612305,0.027422784,-0.0072448137,0.011593306,-0.03899202,0.01610226,0.024791224,0.029974114,-0.028882978,-0.0012546044,-0.0056883423,0.017746987,-0.018420922,-0.0017971632,-0.026363742,0.04653369,-0.022111526,0.00064284686,-0.01883812,-0.024197519,-0.010381826,-0.039922696,0.04059663,0.032525443,-0.017907446,0.023603812,-0.034242377,0.016896542,-0.0073250444,0.005925022,-0.04820248,-0.0041679745,-0.0072167334,0.058407802,-0.0019054743,-0.07875425,-0.0061857714,-0.001570512,0.008705009,-0.021068528,0.005543927,0.020218085,-0.022512678,0.036328368,-0.046629965,-0.025240514,-0.022384308,0.00886547,-0.029893883,-0.02180665,0.017426064,-0.016479345,0.016880497,0.01291711,0.0056883423,0.015139495,-0.01781117,0.03924876,0.028257182,-0.020474823,-0.024085196,-0.009427084,0.032011967,0.055647872,-0.02838555,0.024085196,-0.05150798,0.009186392,-0.04322819,-0.019752748,0.028882978,0.015139495,-0.020169947,-0.055423226,0.010630541,-0.0806156,-0.050256383,0.015067288,-0.054043263,0.0431961,-0.008123338,-0.0046132538,-0.012283289,-0.03883156,-0.025866313,-0.045057446,-0.06511507,0.058792908,-0.06412021,-0.0018061891,-0.005732469,0.017329788,-0.008873493,-0.004264251,0.01749025,0.0040476285,0.04701507,-0.008115315,0.049775,0.010758909,-0.031129433,-0.058311526,-0.016479345,0.031289894,-0.016463298,0.038189717,0.018629521,0.06322163,-0.008319902,-0.0028562057,-0.0032232602,-0.009330807,0.06585319,0.057990603,0.0150191495,0.0038269947,-0.005925022,-0.0038189716,-0.037997164,-0.00831188,-0.02665257,-0.06383138,0.001815215,0.005327305,-0.024855409,0.02422961,-0.04024362,-0.011641446,-0.018501153,-0.05863245,0.039056204,0.021935018,-0.032782182,0.03151454,0.01814814,-0.018629521,0.03385727,-0.013061525,-0.029027393,0.012556073,-0.055391137,-0.034691665,-0.014088475,-0.00973196,-0.02686117,0.05808688,0.046373226,-0.024999823,0.0037768506,-0.053208865,0.010446011,0.004593196,0.030022252,0.022897784,0.03998688,-0.008528502,-0.0014511691,-0.030696189,-0.024117287,-0.02312243,-0.0025874334,-0.003782868,-0.02533679,-0.038574822,0.08331135,-0.013534885,-0.017987678,0.008255718,0.0082156025,0.03222057,0.014938919,-0.013430585,0.0042401818,-0.011817953,0.010935416,-0.030920833,-0.05606507,0.029428547,-0.0053473627,0.06655922,-0.028417641,-0.008099269,-0.02517633,-0.024486348,-0.015660994,0.061231915,-0.011874113,0.01168156,0.026813032,0.012700488,0.018420922,0.10263085,0.051443797,-0.009683821,-0.021854788,0.030198758,-0.033311702,0.023491489,-0.025288653,0.0062780366,0.0011603335,0.0016607713,-0.0013649213,0.05731667,-0.056289718,-0.018870212,-0.043837942,0.007954854,0.028931117,-0.029011348,0.03246126,-0.026187234,-0.03311915,0.07066702,0.009475222,0.023748226,-0.004677438,0.0045731384,0.030712234,-0.03162686,-0.033183333,-0.026508156,-0.0056883423,0.017249556,-0.02793626,0.04088546,-0.02599468,-0.003945335,-0.022239894,-0.025272606,0.006450532,0.012082713,0.051058687,0.016559575,0.017249556,0.011513077,-0.051026598,-0.04653369,-0.0038029256,0.009756029,-0.0031871565,-0.031610817,-0.07952447,0.054973938,0.008504433,-0.054717198,-0.006402394,0.0571883,-0.038895745,0.0005345357,-0.074261345,0.018854167,0.009106161,-0.006029322,0.06848475,0.012804788,0.022721278,-0.049710818,0.024951685,-0.011079832,-0.044768617,-0.008091246,0.03809344,0.02480727,-0.018453015,-0.021549912,-0.023700088,0.014658112,0.0005766567,-0.0083038565,-0.0022564828,-0.01123227,-0.011192154,-0.0008439245,-0.010165204,-0.040692907,-0.027599292,-0.01528391,0.02201525,-0.0427789,0.053016312,0.028353458,-0.03385727,0.0075857937,0.01683236,-0.022817554,0.024839362,-0.023010107,0.03546188,-0.036071632,-0.0001969408,-0.023106383,0.020169947,-0.02386055,0.00907407,-0.027246278,-0.032316845,0.017714893,-0.0015594803,-0.012716534,-0.010847163,0.04191241,0.011898182,0.016928636,-0.02204734,0.010165204,0.0296211,0.066880144,0.03127385,0.0036324358,0.035718616,-0.06453741,0.03504468,0.03693812,0.008175488,-0.03340798,-0.049999647,-0.0083921105,-7.997978e-05,-0.04191241,0.014441489,0.011978413,-0.015131472,-0.015115426,0.01396813,-0.011152039,-0.010887278,-0.033985637,0.013221986,0.0493578,0.038446452,-0.022817554,-0.039441314,-0.03886365,0.018982535,0.058183156,0.002709785,0.04756064,0.0493578,0.0010550311,0.040692907,-0.012114805,0.017763032,0.029380407,0.14415815,0.0033736925,0.0012285295,0.0038149601,-0.061424468,0.067907095,-0.0024971743,-0.008360018,-0.06161702,0.017057003,-0.039441314,0.019078812,-0.016278768,0.015139495,-0.005210971,0.025497252,-0.04406259,0.018356739,0.039890602,0.018083954,-0.011713653,-0.0025894393,-0.007389229,-0.010694725,0.006542797,0.0076941047,0.041334752,-0.026764894,0.00238084,-0.035975356,0.029845744,0.014072429,-0.048972696,-0.011224247,-0.026716756,-0.0016918606,0.0121228285,0.0298297,0.015316002,0.01670399,-0.0045972075,-0.050256383,-0.0024008977,-0.011103901,0.0559367,-0.0042963433,-0.027567199,-0.012491888,0.00896977,-0.01838883,0.017105142,-0.041848227,0.0008434231,-0.047175534,0.0056442153,0.079717025,0.024871454,-0.035108864,-0.018164184,0.0121228285,-0.020635284,0.008131361,0.029925976,0.018613474,-0.018661615,0.0031169548,0.034467023,-0.024406116,-0.06347837,-0.030632004,-0.04425514,0.010534264,-0.0037768506,-0.01423289,0.017201418,-0.030856648,0.02130922,-0.06598156,0.0067072697,-0.030423405,0.007433356,-0.0016778202,-0.036713477,0.08029468,-0.03735532,0.016960727,0.022576861,0.012387589,-0.0056321807,0.0020579123,-0.012660372,0.0024550532,-0.020715514,-0.049967553,-0.013470701,0.04011525,-0.039858513,0.025593529,-0.0038310064,0.019945301,-0.0118580675,-0.014842642,0.01814814,-0.011753768,-0.020041578,0.01744211,-0.0024269726,-0.037708335,0.017971631,-0.0063101286,-0.023090336,-0.014714274,0.0107829785,-0.03388936,0.013398493,-0.020619238,0.0012375554,0.009715913,-0.08382482,-0.03822181,0.030776419,0.005327305,-0.04887642,-0.005539916,0.0040135304,-0.0073410906,-0.022576861,0.00907407,0.0070642955,-0.0468867,0.0092265075,0.00896977,-0.0006127604,0.00090459886,-0.022143617,0.0047295876,0.0040957667,0.031578723,-0.031113386,0.02065133,-0.02320266,-0.011304477,-0.019849025,-0.030904787,-0.021999203,-0.018533245,-0.08260532,0.006903834,0.060397517,-0.0027920213,-0.018565336,-0.020314362,-0.003993473,-0.012876995,0.01528391,-0.017185373,-0.0037507757,0.01904672,-0.024390072,-0.03241312,-0.0011663509,-0.025160285,-0.0105422875,-0.018982535,0.020025533,-0.020972252,0.06643085,-0.06694432,-0.038735285,0.053465605,0.059017554,-0.020185994,-0.015893662,-0.005218994,-0.02278546,0.017907446,0.010101019,-0.015243795,0.042522162,0.012684441,-0.017008865,0.030952927,-0.004609242,-0.05834362,-0.008640825,-0.0104540335,0.03953759,0.047785286,0.002904344,-0.023667997,-0.029925976,0.029300177,0.002872252,0.018372783,-0.025770037,0.0038510638,0.066045746,-0.018565336,0.00071906584,0.0048338873,0.0007752272,-0.045057446,0.041687768,0.06553227,-0.0362,0.027085816,0.017763032,0.0008243684,-0.039858513,-0.043324467,-0.025208423,-0.04541046,-0.017137235,0.07548085,0.014890781,-0.019367643,0.03427447,-0.0011713653,0.0051106825,-0.014617996,-0.0025874334,-0.018051863,0.0013609098,-0.11225851,0.08671312,0.005563985,0.0024470303,0.039312944,-0.04127057,-0.008087235,0.003317531,0.0060373447,-0.0133503545,-0.01875789,0.061905853,0.0026616468,0.00584078,-0.013607092,-0.02201525,0.024855409,0.0019716644,0.00941906,0.033632625,-0.018116046,0.0025894393,0.028995302,0.015267864,-0.004025565,-0.046180673,0.0037267066,0.0066992464,0.01244375,-0.003435871,-0.023026153,-0.046565782,0.050513122,-0.05468511,-0.028112765,0.014024291,0.038125534,-0.049967553,0.008247695,-0.019640425,0.03064805,-0.01760257,-0.01365523,0.011224247,0.013775576,0.0029946032,0.009041977,-0.04014734,0.011761791,-0.09505709,-0.010446011,-0.037868794,-0.023347074,0.039312944,0.008015026,0.0012907081,0.0543,0.022368263,-0.010060905,-0.009619636,0.01331024,0.018629521,-0.0020599181,-0.010726818,0.027631383,0.021549912,0.009748005,0.05750922,-0.004408666,0.043805853,0.0077221855,0.013262101,0.040757094,0.034820035,-0.06694432,-0.03324752,-0.031899646,-0.00011182125,-0.015677039,6.8572e-05,0.0063382094,0.008360018,-0.029893883,0.006747385,-0.03340798,-0.020025533,0.032060105,0.0074413787,0.009266622,0.06306117,0.011833998,0.0018773937,0.041687768,0.037900887,-0.042393796,0.056739006,0.025256561,-0.036392555,0.01123227,0.067971274,-0.010381826,0.028192997,-0.011432846,-0.01233945,-0.034467023,-0.009178369,-0.020747606,-0.06119982,0.022641046,0.011360639,0.049742907,-0.0003718182,-0.023234751,0.03603954,0.0019155032,0.033921454,0.008953723,0.031113386,0.019560196,-0.0074654478,0.009643706,0.020057624,-0.045474645,-0.008552571,-0.02378032,0.012804788,0.017795125,0.007842531,0.011432846,-0.009186392,-0.0060654255,0.053754434,0.0062018177,0.010028812,-0.004516977,-0.0021501773,-0.0077743353,-0.04627695,0.0031350066,0.010044858,0.040532447,-0.012090736,-0.025224468,0.023347074,0.0098843975,-0.0032152373,-0.017105142,-0.04130266,-0.039152484,-0.040468264,-0.028112765,-0.0117056295,-0.01396813,-0.00415594,-0.01602203,0.036103725,0.03222057,-0.02764743,0.00040466257,0.051700532,-0.030086437,0.0012255209,0.02365195,-0.039312944,0.003680574,-0.004930164,0.012556073,-0.038478546,0.03340798,0.027133955,-0.059498936,0.0010530252,-0.02357172,-0.042522162,0.05503812,-0.043805853,-0.00013927513,0.010405895,0.042104963,0.037034396,-0.0028080675,-0.02554539,-0.023972873,-0.0036183954,0.020041578,0.013422562,0.0051106825,0.009988697,0.0038711214,0.028144859,-0.03998688,-0.003048759,0.023411259,0.04245798,-0.05227819,0.000120596465,0.024374025,0.019672519,-0.0077021276,0.041848227,0.052214008,-0.0027679522,0.020587146,0.014393351,0.053497694,0.053465605,-0.0083921105,0.004256228,0.018308599,0.030246897,0.008075199,-0.050577305,0.004001496,0.035943262,-0.0670727,-0.075801775,-0.0018884253,0.036456738,-0.022512678,-0.07284929,0.011416799,0.0079749115,0.026347695]	2026-02-28 03:20:07.028746+00
pe_475e42af18efe294543e4f77	cmmbpjmus0001ctnctnhx65hm	0	标题：小张求职记\n标签：\n正文：# 当五年经验的前端程序员遇见AI：小张的求职启示录\n\n我叫小张，一名拥有五年经验的前端程序员。在过去的一个月里，我经历了一次不同寻常的求职历程。这次求职，与以往最大的不同，是AI这个变量已从技术热词，变成了实实在在嵌入到我技能栈、项目思考和职业规划中的存在。我想把我的经历和思考分享出来，或许能给你带来一些启发。\n\n## 一、风口之下：五年经验与AI浪潮的碰撞\n\n工作五年，意味着什么？意味着我熟练掌握了Vue/React全家桶，对工程化、性能优化有了实战心得，也带过小团队，做过几个像样的项目。简历看起来挺丰满，本以为在求职市场上会很有底气。\n\n然而，真正开始看机会时，我发现风向变了。几乎所有的“资深前端”或“前端专家”岗位JD里，都或多或少出现了新的关键词：**AI工程化、LLM应用、智能体（Agent）、AI Copilot集成、RAG系统**。\n\n起初有些焦虑，感觉五年积累的“传统”技能瞬间贬值。但冷静下来后我意识到，这并非替代，而是一次重大的 **“能力升级”** 窗口。五年的前端经验，恰恰是我理解和接入AI世界最宝贵的资产。\n\n## 二、技能升级：一个前端如何快速拥抱AI\n\n对于大多数前端同学而言，直接投身算法和模型训练门槛太高。但AI的应用层，尤其是与用户体验直接交互的部分，恰恰是我们的主场。我快速为自己制定了“前端+AI”的学习和应用路径：\n\n### 1. 理解核心概念与工作流\n*   **放弃“从零开始学模型”的执念**：我首先搞懂了提示词工程、RAG、Function Calling、Agent工作流等概念。明白了AI应用如何通过API、SDK与我们熟悉的“前端请求-后端响应”模式对接。\n*   **关键工具实践**：我利用周末时间，基于 `LangChain.js` 或 `Vercel AI SDK` 这类前端友好库，亲手搭建了一个简单的“文档问答助手”。这一步至关重要，它让我对AI应用的“数据流入、处理、输出”全链路有了直观感受。\n\n### 2. 将AI能力融入现有技能树\n*   **工程化思维迁移**：如何管理大量的提示词模板？AI接口的稳定性、降级方案、错误处理如何设计？如何对AI输出进行结构化、安全过滤？这和我之前处理第三方API、做错误监控的逻辑一脉相承。\n*   **交互设计的新挑战**：AI应用通常是异步、流式输出的。这意味着前端需要处理SSE或WebSocket，实现打字机效果，并提供良好的“等待”、“中断”、“重新生成”交互。这为我的前端交互设计能力打开了新课题。\n\n### 3. 在项目中寻找切入点\n我把过往项目在脑子里过了一遍，思考哪些地方可以被AI增强：\n*   一个后台管理系统，能否增加一个“用自然语言描述你要的报表”的功能？\n*   一个内容创作平台，能否集成AI辅助写作和配图？\n*   一个复杂的表单页面，能否用对话式引导用户填写？\n这些思考，后来都成了我面试时展示“AI思维”的绝佳素材。\n\n## 三、求职实战：如何向面试官讲述你的“AI准备”\n\n调整了技能方向后，我的求职策略也变了。\n\n**1. 简历重塑**\n我不再简单罗列“Vue3 + TypeScript + Webpack”。在项目经历中，我增加了这样的描述：\n> “项目后期，**探索并原型设计了集成AI代码辅助（Copilot）的开发流程**，提升了团队日常组件开发的效率。”\n> “负责XX模块，**曾调研基于RAG的智能帮助中心方案**，以解决传统文档检索体验不佳的问题。”\n——关键在于，展现出你对趋势的关注和主动探索的意愿，哪怕只是调研和原型。\n\n**2. 面试沟通的核心转变**\n当面试官（通常是技术负责人或CTO）问及“你对前端未来怎么看”或“最近在学什么”时，我不再泛泛而谈微前端或跨端。我会这样回答：\n> “我认为前端正在从‘界面构建者’向‘智能交互设计师’演进。我最近重点关注AI Native应用的交互范式。比如，在传统CRUD应用中，我们可以思考如何用‘对话’替代部分复杂表单和筛选操作。我利用LangChain.js实践了一个简单的Demo，深刻感受到处理好流式响应、中间状态和用户预期的重要性。我五年的前端工程经验，让我能更稳健地将这些新兴AI能力落地到产品中。”\n\n**3. 准备一个有AI味道的“加试题”**\n我特意准备了一个“旧项目AI化改造”的简短方案。当被问到项目深度时，我会说：“以我之前做的电商后台为例，如果现在让我加入AI能力，我可能会分三步走：第一，在商品列表页加入自然语言搜索；第二，为运营人员开发一个自动生成营销文案的助手；第三，长远来看，可以尝试构建一个能自动处理常规客诉的对话机器人。技术上，前端侧我会考虑用...，并注意...”\n\n## 四、心态与展望：回归本质，持续进化\n\n最终，我拿到了	[-0.08257789,-0.0076009925,-0.011922022,-0.032751396,-0.016367659,-0.010378511,0.044408128,0.10418706,-0.032269046,0.11364107,0.032654926,0.016657067,-0.009703224,0.0034327062,-0.069779605,-0.01837744,-0.005631407,0.0021564953,0.004333088,-0.0130475,-0.015973741,-0.0011405508,0.038619958,-0.013980038,-0.028796146,0.033571385,-0.003444765,0.0077778534,-0.030259266,0.029567901,0.007814029,0.009035977,0.021287603,-0.01810411,-0.044858318,-0.0038246138,-0.025146382,0.014004156,0.021271525,-0.016608832,-0.0015264289,0.009019898,0.0034668727,-0.035758026,-0.03143298,0.00716286,0.0059770895,-0.027992234,0.036497626,-0.016407855,-0.022123672,0.038877208,-0.03929524,-0.010788506,-0.05260803,0.028265564,0.019133117,0.0015505463,-0.018088032,0.041578352,-0.009638911,0.0048355334,-0.005036512,0.03952034,-0.005932874,-0.031095335,-0.023329541,0.0153627675,0.006953843,-0.035243522,-0.017991561,-0.0043290686,0.020708786,0.023281306,-0.05173981,0.02911771,-0.022622097,0.021094663,-0.0050123944,0.03418236,-0.0104106665,0.026287938,0.015692372,-0.025194617,0.065695725,0.0036236355,-0.042768143,0.014679442,0.001644001,0.10245061,-0.0007390971,-0.030789848,0.0054987613,0.05784954,-0.058299735,0.042382266,-0.07408857,0.016480206,-0.0028438405,0.0054344484,-0.03739801,-0.03665841,-0.031545527,0.018795474,-0.014727677,0.004103973,-0.039648965,-0.025821669,-0.023297384,0.036529783,0.0054746442,-0.063798495,0.011793396,-0.026239704,0.020724865,-0.041674823,0.049649637,0.004393382,-0.022895427,-0.0003803511,-0.071451746,0.027043616,-0.060679317,-0.018023718,-0.027349103,-0.021914655,0.011463792,-0.025725199,0.0613546,-0.028442424,-0.026673816,-0.04090307,-0.021078585,-0.012171235,-0.006495613,-0.007066391,-0.002691097,0.03370001,-0.06331615,-0.027525963,0.0070945276,-0.017766466,0.09029545,0.011238697,-0.021384072,-0.027333025,0.019117039,0.010708114,-0.009084211,0.0094781285,-0.0668212,-0.0110377185,-0.020933881,0.028538894,0.04106385,0.008151673,0.03849133,-0.0082722595,0.045051254,0.011343205,-0.045758698,0.0013164066,0.03350707,0.04887788,-0.039230928,-0.0900382,0.047977496,-0.046723396,-0.05209353,-0.016190797,0.0075045233,0.027686747,0.012267705,-0.06913647,0.036143906,0.016560597,0.07055136,0.018940179,-0.0031654055,-0.09357541,0.013216321,0.0024901188,-0.027525963,-0.008473238,0.020805255,0.0045782817,0.060229123,0.023329541,0.0253554,0.017171571,0.026287938,0.03177062,-0.016866084,0.013304751,0.016343541,0.0070583518,-0.054794677,0.010603606,0.062480077,-0.00881892,0.037912514,-0.026304016,-0.03948818,0.017268041,-0.058782082,0.028956927,-0.018634692,-0.044504594,0.0032196695,-0.0034427552,-0.0343753,-0.0334106,-0.011166344,0.02903732,-0.022911506,-0.015169829,-0.02701146,0.031063179,0.04270383,-0.029230257,-0.03685135,0.078654796,0.002150466,-0.009019898,-0.0034889802,-0.0010882965,0.008425003,0.037526634,0.01303946,-0.01993703,-0.03350707,0.04225364,-0.06238361,-0.062801644,-0.054183703,0.012171235,-0.015025125,0.0499712,-0.023377776,0.035500776,0.0702298,0.015925506,0.016327463,0.04038856,0.0066282586,0.0054223896,-0.07402426,0.026448721,0.010683997,0.06984392,-0.041128162,0.00064061774,0.008191869,-0.010322236,0.025194617,-0.033024725,-0.0015857174,0.014044351,0.0017706172,0.0006571985,-0.025114227,0.029439276,-0.009454011,0.0020529914,-0.019390369,0.012549074,0.019004492,0.018811552,-0.028587129,-0.044665378,0.007572856,0.015370807,0.00072804326,0.025419712,0.08778724,0.03005025,-0.0015073359,-0.029841231,-0.040131312,-0.017203728,0.0011516047,0.006953843,0.026947146,-0.02334562,0.007645208,-0.036819194,0.023104444,0.0018520134,-0.0022831114,0.0076210904,-0.0056515047,0.05006767,-0.021528777,-0.017332353,-0.042510893,0.011463792,0.016214915,-0.025612652,0.0028076645,0.008923429,-0.015234142,0.04572654,0.018875865,-0.01102164,-0.00025034338,0.0056354264,0.014984929,-0.1578241,-0.0036316747,-0.05749582,0.0072512906,0.0039170636,-0.0029342806,-0.023554636,-0.0073879557,0.03305688,-0.00076120463,-0.00063006644,-0.018425675,0.00707443,0.008617942,0.024374627,-0.01635962,-0.0052495487,0.0672714,0.012066727,0.0056354264,-0.02847458,0.023747575,-0.028394189,-0.03392511,0.029503588,0.053797822,0.008063242,-0.0103704715,-0.008513433,-0.018602535,0.03546862,0.03405373,0.004972199,0.0052133724,0.03601528,0.008923429,-0.023007976,0.014140821,0.00844912,-0.0015927516,-0.00909225,-0.02213975,-0.009494207,0.0031895228,-0.015402963,-0.00022032227,0.014655325,0.019133117,-0.032381594,-0.012516918,0.005426409,-0.029664371,0.019117039,-0.04199639,0.018039797,-0.02874791,-0.059328742,0.017525293,-0.012790248,-0.005844444,0.00070342346,0.008875194,-0.012179274,-0.013497691,-0.05161118,0.03132043,0.0069056083,-0.020065656,0.043025397,0.051289618,-0.00027006434,0.02397267,0.019808404,-0.031368665,0.0072914865,0.015025125,-0.04704496,-0.01047498,0.017316274,0.012179274,0.014816107,0.036497626,-1.863758e-05,-0.00048184505,-0.03188317,-0.008746568,-0.027718903,0.06649964,-0.030982787,0.023056211,-0.026030686,0.07100155,0.00064262754,-0.023442088,-0.025484025,0.0021243386,0.0066403174,0.0032357478,-0.06164401,0.058653455,0.037719574,0.00076572667,-0.0037924573,-0.07563209,0.016833927,0.0343753,0.033089038,0.007653247,0.017316274,0.015555707,0.0007787902,0.011825553,0.0061217938,0.043121867,-0.00010356654,-0.0031091315,0.014615129,-0.038619958,0.08997389,-0.010531253,-0.054891147,-0.007383936,0.004976218,-0.025693044,0.027783215,0.010491058,0.008163732,0.017396666,0.012227509,0.01451062,-0.068686284,0.014406112,-0.018779395,-0.0026167352,-0.0055711134,4.3555727e-05,0.022702489,0.026689894,0.0067769825,-0.0036316747,-0.037237227,-0.011520066,0.020998195,-0.0024016886,-0.008059223,-0.008425003,-0.007211095,0.00735178,0.014582973,0.03556509,-0.031802777,-0.024953444,0.03133651,0.024374627,0.012661622,0.0027312927,-0.05125746,0.024197767,0.069779605,0.007753736,0.037172914,0.030018093,-0.02802439,-0.01459905,-0.05337979,-0.033089038,-0.01810411,-0.048492003,-0.013248478,0.0013917735,0.04961748,0.010844779,0.050935894,-0.020065656,0.005301803,-0.06183695,0.0082722595,-0.0044777924,-0.0398419,0.010507137,-0.027622433,-0.028265564,-0.053251162,0.0025041874,-0.06296243,-0.012862599,0.02929457,-0.03022711,-0.038780738,0.020628395,-0.038812894,0.015611981,0.015668254,0.0073276623,0.015539628,0.03794467,0.0017495146,-0.009285189,-0.0043773036,0.017042944,0.020322908,0.028185172,-0.027316947,-0.02094996,0.0014349838,0.006740806,0.0077135405,0.018602535,-0.0029262414,0.011150266,0.031545527,-0.020885646,0.02048369,0.013586121,0.036819194,0.033024725,-0.02369934,-0.03169023,0.04952101,0.072673686,-0.016657067,0.088816255,-0.0408066,-0.015113555,-0.0054746442,-0.022011124,0.010153415,-0.07383132,0.094604425,0.01992095,0.014349838,0.0032417772,0.036272533,-0.008465199,-0.0069659017,0.026352251,0.09145308,-0.0073557994,-0.017846858,0.0094781285,-0.0011033699,-0.009236954,0.021689558,0.0094781285,0.053990763,0.02307229,-0.012557114,0.024567565,-0.035950966,-0.008171771,0.053444102,0.034793332,-0.055084083,0.017026866,-0.009526363,-0.009703224,-0.0019032628,4.7198457e-05,-0.02295974,-0.06714277,0.02067663,-0.039906215,-0.054633893,0.003738193,-0.0037683398,0.058685612,0.044054404,0.03177062,0.006817178,0.017718231,0.025741277,0.07601797,-0.0056716027,0.014936694,-0.009663028,-0.015169829,0.023120522,0.011809475,0.008859116,0.043507744,0.034343142,0.021689558,0.036979973,-0.047848873,-0.027783215,-0.070679985,0.022718567,-0.024101296,0.013650434,0.06582435,0.0013314801,0.014679442,0.044794004,0.008859116,0.034407455,0.03408589,0.0030347696,0.03894152,0.07987674,-0.027429495,-0.0048274947,0.020322908,0.05080727,0.06662827,-0.02746165,0.0122435875,-0.003288002,-0.06164401,-0.011375362,-0.0061861067,0.01303946,-0.03739801,0.019261744,0.0053500375,-0.0030850142,0.0037562812,-0.03810545,-0.032735318,-0.03296041,-0.003380452,0.00089887466,-0.010274001,-0.0052977833,0.02664166,0.01865077,-0.01423729,0.028362032,-0.0079587335,-0.014277486,-0.03646547,-0.012645544,-0.017573528,0.032783553,0.03556509,0.007412073,-0.0028780068,0.0021022311,-0.015668254,-0.017589604,-0.05836405,-0.039745435,0.025323244,0.00094409473,-0.00982381,0.009558519,-0.015595903,0.015354728,-0.01065988,-0.04373284,0.04659477,-0.023377776,-0.022461316,-0.01157634,-0.022268375,-0.0249856,0.014936694,-0.0045501445,0.03392511,-0.060775783,-0.01699471,0.014012195,-0.01377906,0.008416964,-0.038427018,-0.008706372,0.008099418,0.032671005,-0.03775173,0.021737793,0.016407855,0.04016347,0.031240039,0.006869432,-0.063991435,0.0115281055,-0.049649637,-0.04090307,-0.03324982,0.017605683,0.01902057,-0.02857105,-0.034246672,-0.00835265,-0.028490659,0.0005763048,-0.039327398,-0.008617942,-0.021544855,0.00024569576,-0.052672345,-0.004473773,0.04135326,0.039648965,0.025950296,0.033314135,-0.0051932745,0.00035171173,0.027622433,-0.039423868,-0.021930734,0.010700075,0.01984056,-0.025033835,0.02268641,0.013795138,-0.027911842,-0.037269384,-0.0066001215,0.077947356,-0.013634356,0.00532994,-0.057817385,-0.004751123,0.04289677,0.0011043748,-0.008055204,0.025612652,-0.08662961,0.023393853,0.031288274,-0.0122435875,0.00597307,-0.014092586,-0.019309979,-0.038780738,0.0150090465,-0.02149662,0.024133453,-0.01000871,-0.02286327,-0.00854559,-0.04344343,-0.040677972,0.0055349376,-0.0019947079,-0.021818185,-0.02019428,0.05173981,0.021432307,0.016198836,0.033474915,0.06354124,-0.008119516,0.0038648094,0.004196423,-0.08006968,0.017042944,0.028506737,0.059939716,-0.0062222825,-0.003575401,-0.027590277,-0.018666849,0.005587192,-0.031384744,0.0181845,0.003738193,0.014526699,0.052993912,0.031577684,0.04714143,0.019406447,0.02241308,-0.013336908,-0.0435399,0.048910037,-0.0069980584,0.022252297,0.0051771966,-0.01047498,-0.069072165,0.017155493,-0.021110741,-0.002930261,0.020933881,-0.06759296,0.0123320175,0.023924436,0.013971999,-0.023811888,0.015684333,-0.013771021,-0.045758698,0.022815036,0.05926443,0.01203457,-0.048202593,0.03739801,0.023361698,-0.0058404244,-0.07897636,0.018666849,-0.011656731,0.010064985,-0.018489987,-0.05357273,-0.0045380862,-0.0008240103,-0.027172241,0.0014540767,0.00020173179,-0.014373955,-0.009502246,-0.008979702,-0.04106385,-0.005687681,-0.040195625,0.04508341,-0.03997053,-0.04842769,0.0030548675,0.03611175,-0.055727214,-0.000946607,0.03794467,0.0033201587,0.007488445,0.016850006,-0.012733974,0.034021575,-0.039102305,-0.0012350106,0.020001343,0.0046827905,-0.051579025,0.017444901,0.03398942,-0.0063428697,-0.027027538,-0.024969522,-0.024776584,-0.0043129907,-0.014172977,0.028088702,-0.021351915,-0.0023212973,-0.0033844716,0.0065679653,0.014759833,0.002086153,-0.002819723,-0.03656194,-0.021914655,-0.06228714,0.010973405,-0.009293228,0.03656194,0.016319424,-0.004385343,-0.028973006,0.056177404,0.0024016886,-0.026384408,-0.011327127,-0.018715084,-0.045115568,-0.03169023,-0.0040376503,-0.030629067,-0.03501843,0.050357077,0.07293094,0.006258459,0.0051370007,0.032735318,0.005623368,0.022268375,0.04373284,-0.013328869,-0.02278288,-0.004429558,0.016882163,0.021737793,0.030066326,-0.0047149467,-0.040292095,-0.020097813,0.06386281,-0.0061660088,0.031641997,-0.028281642,0.037880357,0.018039797,-0.027300868,0.041288946,-0.021480542,0.010113219,0.048620626,0.05209353,0.037623104,0.025660887,-0.0017766466,0.0007662291,0.054280173,0.0663067,0.0004027099,0.028667519,-0.060486376,-0.034407455,-0.009502246,0.005639446,-0.0061901263,0.01664099,0.024406783,0.04042072,-0.0041481885,-0.04813828,0.015724529,0.04189992,0.029825153,-0.053797822,-0.021271525,0.01139144,-0.039648965,0.013819256,0.055534273,-0.007054332,0.018843709,0.009582637,0.042125013,0.019165274,0.030371813,-0.03296041,-0.014317681,0.02307229,0.0385878,0.0095665585,0.025676966,-0.0025504124,0.0010134322,-0.020467613,-0.017444901,-0.011986335,-0.00043712743,-0.02857105,0.009027937,0.0006928721,0.02580559,0.030516518,-0.0060775783,-0.041932076,0.008296377,0.009445972,0.027590277,0.018297048,-0.0028639382,-0.01800764,0.01664099,0.0138916075,-0.00084662036,-0.0146955205,0.023538558,-0.00339854,0.048073966,0.0020700747,0.01763784,-0.029246336,0.015644137,8.580824e-06,-0.02397267,0.003288002,0.008658137,0.037976827,0.01432572,0.014944733,0.0012440545,-0.02728479,-0.046884175,0.06257655,-0.01976017,-0.012195352,-0.056627598,-0.03874858,-0.01598982,0.0006195151,0.0072512906,0.010450862,-0.03373217,-0.07280231,0.015515511,5.2631145e-05,-0.0038909365,0.028120859,0.025033835,-0.032912176,0.01689824,0.04399009,0.02279896,-0.008211966,-0.011745161,-0.028490659,0.009172642,0.015917467,-0.008248142,-0.0051691574,-0.009815771,-0.017927248,0.0103704715,0.014084547,-0.07781873,0.03382864,-0.001782676,0.00854559,0.031915326,0.0077858926,0.020773098,0.016480206,0.022155829,-0.045147724,-0.06457025,-0.0019213508,-0.02940712,-0.025934217,-0.0018339254,0.023393853,0.0038266235,0.014341799]	2026-03-04 07:20:56.337728+00
pe_09dd29ebe686cc9fea53693d	cmmbp7eak0001ctv5qwjzf7rn	0	标题：从同事到伴侣：希言和燕子的五年故事\n标签：\n正文：# 从同事到伴侣：希言和燕子的五年故事\n\n在写字楼的格子间里，每天都有无数的故事在发生。有些故事随着下班打卡而结束，有些却悄然生根，最终开出意想不到的花。希言和燕子的故事，就属于后者。从共享一份项目文档的同事，到共享彼此人生的伴侣，他们用五年的时间，书写了一段关于“慢热”与“笃定”的现代感情叙事。\n\n## 一、起点：格子间里的平行线\n\n希言和燕子相识于五年前的那个春天，同在一家互联网公司的产品部。\n\n*   **希言**是后端开发工程师，性格正如他的名字，沉稳少言，逻辑清晰，他的世界主要由代码和架构图组成。\n*   **燕子**则是前端工程师，灵动、细致，对用户体验有着执着的追求，她的桌面总是点缀着绿植和小摆件。\n\n他们的工位隔着一个过道，最初的交集仅限于工作。希言提交的接口文档，由燕子来实现页面交互；燕子遇到的诡异Bug，有时也需要希言帮忙排查后端逻辑。他们的交流，完全围绕着JIRA任务编号、API字段和每周的站立会议。\n\n很长一段时间里，他们是两条标准的“职场平行线”——专业、高效、保持恰到好处的距离。除了工作，唯一的共同点或许是都习惯在加班后的深夜，去公司楼下那家灯光温暖的便利店买一杯关东煮。\n\n## 二、转折：从“我们项目”到“我们”\n\n关系的微妙变化，往往始于工作之外的偶然。\n\n有一次，为了赶一个重要的版本上线，团队连续熬了几个通宵。最后一个深夜，当所有人都疲惫不堪时，燕子发现了一个前端性能上的瓶颈，却怎么也找不到根源。正当她有些焦躁时，希言默默坐到了她旁边，没有过多言语，只是说：“把日志和监控数据给我看看。”\n\n两人一起排查了两个小时，最终发现是一个非常隐蔽的第三方库兼容性问题。问题解决的那一刻，窗外天已蒙蒙亮。燕子长舒一口气，由衷地说：“太感谢了，没有你，我今天肯定搞不定。”希言只是揉了揉发酸的眼睛，回了句：“应该的，是我们项目。”\n\n那句自然的“我们项目”，让燕子心里微微一动。她忽然觉得，这个平时沉默寡言的同事，身上有一种令人安心的可靠。\n\n从那之后，他们之间的“安全距离”开始缓缓缩短。会一起讨论技术方案，也会偶尔在午餐时聊聊最近看的电影或书籍。他们发现，彼此对技术的热爱、对工作的责任心，甚至对生活那种略显“宅”的品味，都出奇地一致。\n\n从同事到朋友的过渡是自然而然的。而从朋友到情侣的跨越，则需要一个契机。这个契机发生在一次团队户外拓展活动，在一次需要双人紧密配合的高空项目中，恐高的燕子下意识地紧紧抓住了希言的手臂。落地后，她的手心全是汗，不知是吓的还是别的什么原因。希言递给她一瓶水，低声说了句：“别怕，我在呢。”\n\n那句话，像一把钥匙，轻轻打开了一扇门。回去的路上，他们比往常沉默了更多，但空气里似乎有些不一样的东西在流动。几天后，希言第一次在非工作时间，以非工作的理由，约燕子去看了一场她提过的展览。\n\n## 三、五年：平衡“我们”与“我”\n\n确定关系后，如何处理好“曾经的同事”和“现在的恋人”这双重身份，成为了他们的第一个课题。\n\n**1. 职场与情场的“开关”艺术**\n在公司，他们依然是专业的产品搭档。他们约定了一个原则：**“进公司门，我们是战友；出公司门，我们才是情侣。”** 会议上可以为了一个设计方案据理力争，但绝不把工作争执的情绪带回家。这种默契的“角色切换”能力，让他们既维护了职业形象，也保护了私人感情。\n\n**2. 共同的成长是最牢固的纽带**\n在一起的五年，也正是他们职业生涯快速发展的五年。从初级工程师到技术骨干，他们见证了彼此每一个加班啃下的难点、每一个获得认可的项目。这种“革命战友”般的情谊，让他们的关系超越了简单的风花雪月，多了一份深厚的理解与支持。他们不仅是生活伴侣，更是彼此最懂行的“技术顾问”和“职业导师”。\n\n**3. 保留独立的空间**\n曾是同事的经历，让他们深知彼此对专注工作的需求。他们不会要求对方必须秒回信息，也尊重对方需要独处充电的时间。希言可能周末沉迷于他的开源项目，而燕子则乐于参加她的插画 workshop。健康的感情，不是时时刻刻的捆绑，而是在各自的世界里深耕，然后分享收获的喜悦。\n\n## 结语\n\n如今，当朋友们问起“和同事谈恋爱是什么感觉”时，希言和燕子通常会相视一笑。\n\n这段始于同事关系的五年感情，带给他们的不仅仅是爱情，还有一份难得的“懂得”。因为他们见过彼此在职场中最专业、最专注，甚至最焦头烂额的样子，所以更能理解对方笑容背后的压力，沉默之下的思考。\n\n他们的故事或许没有戏剧性的一见钟情，却有着细水长流的扎实与温暖。它告诉我们，美好的关系有时就萌芽于最平常的日常协作中——那份基于专业能力而产生的欣赏，那种在共同目标下培养出的信任，一旦遇到合适的土壤，便能悄然生长，最终枝繁叶茂。\n\n从“我们项目”到“我们未来”，希言和燕子仍在续写他们的故事。而他们的经历，也给所	[-0.053188387,-0.075410485,-0.030900547,-0.031377204,-0.032083973,-0.027021542,0.012508146,0.09381932,-0.017636323,0.092898875,0.010100205,0.05085441,0.03780386,-0.006804695,-0.025739498,-0.005452796,-0.025295714,-0.024227343,-0.055062145,0.020956488,-0.04227458,0.03274143,0.083037004,0.0075772083,-0.045035902,-0.018047234,-0.006923859,0.059105515,-0.06765247,0.006377347,-0.0443127,-0.0024880692,0.031015601,-0.039644744,-0.066732034,-0.010461807,-0.014012083,0.0076552816,-0.0020576394,-0.010248133,0.011579487,-0.01634606,0.018195162,-0.045364633,-0.011834252,0.037179276,0.01588584,-0.09868451,0.03131146,0.006430765,0.025476515,-0.03826408,-0.059006896,0.022402896,0.037540875,-0.052892532,0.016000895,0.024112288,0.005810289,0.0075032446,0.010576863,0.015433837,-0.0056377063,0.017373338,-0.0047912286,0.017537704,0.011258976,0.020775687,0.001613855,-0.055719603,-0.026988668,0.079618216,0.016370716,0.027826928,-0.01862251,0.0245232,-0.027679,0.014932524,-0.04220883,0.02429309,-0.04217596,-0.01546671,0.016000895,-0.027662564,0.054700542,0.014792815,-0.014735287,0.008255213,-0.01657617,0.08014418,0.030670436,-0.051150266,0.013009459,0.021055106,0.011793161,0.0807359,0.008168921,0.022863118,-0.015335218,-0.006981387,0.010930247,0.025953172,-0.11939445,-0.038658556,0.033891983,-0.023980796,-0.0019805937,-0.0155078005,0.0024017778,0.018343091,0.010733009,-0.063280374,0.014217539,-0.016962428,0.023931487,0.006089709,0.01644468,0.005448687,-0.006574584,0.049145017,0.05253093,0.037639495,0.0066937488,-0.021630382,-0.0031414186,-0.05825082,-0.020134665,-0.061669603,-0.007815537,-0.02526284,-0.046054963,-0.06962485,-0.018425273,-0.005025448,0.056903027,-0.04263618,-0.0106836995,-0.0037701132,-0.033103034,-0.033481073,0.035371263,0.028320022,0.01653508,-0.033727616,-0.0027037978,0.036620434,0.0016487825,-0.008345613,-0.01221229,0.01964157,-0.050098334,0.019986736,-0.025624443,-0.015055798,0.044575684,-0.0071087694,0.0018244472,-0.0065540387,-0.008785289,-0.045594744,-0.0027941985,-0.02210704,0.036817674,-0.026512012,0.009097581,-0.030325271,-0.03533839,-0.016756972,-0.0807359,-0.006488293,0.028057039,0.021383835,0.011415122,0.043490876,0.012688948,0.00020751033,0.010971338,0.010404279,0.031837426,0.008394922,-0.0057486524,0.010576863,-0.041781485,0.034911044,-0.022550825,-0.010782318,0.014809252,0.016469333,-0.036949165,0.060946397,-0.021350963,0.03162375,0.008793507,0.003967351,-0.06923037,0.027202344,-0.029503448,0.053024024,0.06988783,-0.06804695,0.031640187,-0.025131349,-0.027646128,0.017587014,0.009492056,0.0075730993,0.06646905,-0.044740047,-0.0058020707,0.003009927,0.009590675,-0.008703106,0.0060116355,-0.00046278912,-0.009294819,-0.0038481865,-0.06232706,-0.011694542,0.008136048,0.039874855,-0.03757375,0.039809108,0.02726809,-0.03625883,0.030670436,0.053056896,0.019756626,-0.0039447504,-0.014505177,0.01946077,0.010116641,0.060617667,-0.011678105,-0.08310275,-0.04894778,0.030801928,0.020233283,-0.04411546,0.042932037,-0.03106491,0.01588584,0.016822718,-0.0034804207,-0.012409528,0.009582457,0.0035050754,-0.027580382,-0.03724502,-0.006747167,0.0058719255,-0.020545576,0.021170162,0.013354625,-0.014275067,0.008867471,-0.02864875,-0.011374031,0.033415325,-0.02716947,-0.023652067,-0.0023093228,-0.012138327,-0.015162636,-0.02424378,-0.035930105,-0.010593299,-0.031870298,0.02057845,-0.003967351,0.023586322,0.0010745337,-0.03333314,0.017619886,-0.009574238,0.021433145,0.031032039,0.010552208,-0.00038548638,-0.014365467,-0.036094468,-0.014743505,0.018934803,0.020824997,-0.030078724,-0.0032934558,0.0292569,0.022041295,-0.034056347,0.03180455,0.010297443,-0.044509936,0.029421264,-0.038658556,-0.028007729,-0.033103034,0.024966985,-0.014661323,0.030752618,0.0030859455,-0.009155109,-0.019493643,0.042471815,-0.04385248,-0.034713805,0.040433694,0.04773148,-0.013223133,-0.11735633,-0.020512704,-0.10631103,-0.021663256,0.059762973,-0.003589312,-0.012327346,0.01862251,-0.01574613,-0.030160906,-0.0050377753,-0.021844057,-0.029141845,0.012434183,-0.06397071,0.015779002,0.010050896,0.02953632,0.017176101,-0.0018758111,-0.057757724,0.0127793485,-0.033645436,-0.009730385,-0.0041234973,0.032560628,-0.015705038,0.013773754,-0.032116845,0.0066855303,0.068704404,0.008440123,0.0115877045,0.008440123,0.045956343,0.009072927,-0.053911593,-0.011924652,0.0069279685,0.004988466,0.03892154,-0.015770784,-0.0068211313,0.032774303,-0.012508146,-0.026807867,0.051807724,-0.0029092536,-0.019345714,-0.014685978,0.013025896,-0.045430377,-0.00038805458,-0.026396956,0.00017643513,-0.019805936,-0.022764498,0.029273337,0.00081617304,-0.03190317,-0.02633121,0.035272647,0.028878862,-0.015762566,-0.026396956,0.014028519,-0.008049757,-0.0033181105,0.021581072,0.0066773123,-0.024983421,-0.0023278138,-0.030292397,-0.0035071298,-0.05335275,0.016847372,-0.020660631,-0.007125206,0.033596125,-0.013223133,-0.01783356,-0.025295714,-0.00984544,0.0010550154,0.010239915,0.02043052,-0.0065417113,-0.008045647,0.0008285004,0.019247096,-0.024720438,0.053714354,-0.030621126,0.0009831059,0.029602066,-0.021482455,0.041781485,0.037606623,-0.015877621,0.035930105,0.07527899,0.003659167,0.02577237,-0.016724098,-0.0014176448,-0.013412152,0.038296953,0.0097879125,-0.013182042,0.04109115,0.0014710632,-0.033661872,-0.064956896,-0.0091058,-0.006952623,-0.036982037,-0.008012774,-0.0152119445,0.02006892,0.009138673,-0.011637014,0.037902478,0.023487702,-0.013239569,0.029733557,-0.021466019,-0.020101791,0.028829552,0.018770438,0.020562014,0.0018922476,-0.036850546,-0.043359384,-0.03055538,0.01425863,0.017406212,-0.0071950606,0.0055144327,0.049079273,0.008189467,-0.026183283,0.017110355,0.021400273,-0.030834801,-0.01356008,-0.011316503,0.030867673,-0.021055106,-0.010790536,0.033924855,-0.04861905,-0.046482313,0.030341707,0.0064430926,0.0046474095,-0.013938119,-0.016502207,0.02633121,0.030062288,-0.015022925,-0.00622531,-0.022419333,0.022139912,-0.036620434,0.011908216,-0.0399406,-0.018030798,0.036094468,-0.010116641,-0.015705038,0.06706076,0.004499481,-0.07278065,-0.0061184727,0.036883418,0.023208283,0.0062499642,-0.03566712,-0.017866433,-0.06416795,-0.0022045404,0.0056582517,0.0020073028,0.029322647,-0.00835794,0.014127138,0.054404687,-0.024095852,-0.0022250859,-0.01597624,0.054174576,-0.03892154,-0.05447043,-0.004951484,0.0017001465,0.0073594255,-0.016699445,0.026988668,0.0038810594,-0.008029211,-0.012146545,-0.007351207,-0.0021942675,-0.025805244,0.026183283,-0.05364861,0.033957727,-0.018277345,-0.004086515,-0.016863808,0.024260217,0.005678797,-0.0185732,0.0038605137,0.036850546,0.009294819,-0.043589495,-0.068770155,0.03228121,0.014365467,-0.04023646,0.048783418,-0.023816433,-0.019263532,-0.019115604,0.0034968571,-0.00016256687,0.030670436,0.012039708,0.03330027,0.013182042,0.0085716145,0.026922923,0.0046843914,0.026627067,-0.0040844604,0.0024223235,-0.010979556,-0.03218259,0.008629142,0.029519884,0.0054938872,0.021679692,-0.035009664,0.026347646,-0.034286458,-0.0031311458,0.01003446,0.015705038,0.021071542,0.02582168,0.04240607,-0.023306902,-0.020775687,-0.010108423,0.05848093,-0.021350963,0.007642954,-0.05532513,0.010354971,0.016428243,-0.043030653,-0.011941089,-0.020085355,-0.0039221505,-0.029437702,0.0041871886,0.028369332,-0.018556764,0.016756972,0.033727616,0.14490384,0.008366158,-0.008612705,-0.012598547,-0.037738115,0.03925027,0.0040947334,0.037738115,0.009319473,0.04003922,-0.011678105,-0.0047994466,-0.092109926,0.02043052,-0.014677759,0.039414633,-0.015055798,0.00891678,0.01263142,0.0036694398,-2.0898704e-05,-0.007067678,-0.025509387,0.0055103237,0.025969608,0.01890193,0.022682317,-0.033316705,-0.027744746,-0.0600917,-0.0007627545,0.032527756,-0.0008819189,-0.026758559,-0.01913204,-0.022287842,-0.056409933,-0.027498199,0.0063937833,0.029832177,0.045134522,-0.010437152,-0.034878172,-0.012253381,0.0075073536,-0.009590675,-0.010042678,-0.018918367,0.018803312,0.03343176,-0.023274029,-0.015984459,-0.012754694,0.027021542,0.0019395024,0.03182099,0.010338534,0.0038235318,-0.013527207,0.0064472016,-0.0008588051,0.038625684,0.02373425,0.026758559,-0.037310768,-0.0053377408,-0.013132732,-0.031032039,-0.044411317,-0.008025102,0.02665994,0.009492056,0.021120852,-0.03282361,0.04953949,-0.029963668,0.008530524,-0.0636091,0.004557009,-0.0019918936,-0.0124917105,-0.0106754815,-0.024095852,-0.04838894,-0.03106491,0.025098477,0.020085355,0.01105352,0.03093342,0.01811298,0.015072235,-0.00427348,-0.04217596,-0.023947924,-0.010322098,-0.0085633965,-0.054141704,-0.027235216,0.028336458,0.036653306,-0.009237291,0.0025414878,-0.047435626,0.00038728412,-0.034812424,-0.015852967,0.038395572,-0.042603306,-0.013412152,-0.031936042,0.0097879125,0.04993397,0.012927277,-0.047271263,-0.016978864,0.0031270366,0.004351553,0.020397648,0.008242886,0.011694542,0.039611872,0.009163327,-0.06436518,0.024950547,-0.023997232,0.0027839255,-0.00027171525,-0.047435626,0.032856487,-0.042373195,0.0064061107,0.0038296955,0.02851726,0.014192884,-0.047632866,-0.027350271,0.015236599,0.06660054,-0.020414084,0.04289916,-0.035897233,-0.021679692,-0.009648203,-0.025180658,-0.0107741,-0.007527899,-0.023553448,0.008727761,0.040696677,-0.00562127,0.0054404684,0.047205515,-0.005843162,-0.07909225,0.0052309036,-0.013666918,0.013625826,0.05424032,-0.016378934,-0.05197209,0.02020041,-0.021679692,-0.015384528,-0.029010354,-0.057889216,0.006623894,0.011694542,-0.04523314,0.004881629,0.02874737,0.010042678,0.006775931,0.058086455,0.0075648814,-0.017817123,-0.0044296263,0.021350963,0.031081347,-0.0290761,0.010026242,-0.0076635,-0.025016293,-0.025788806,-0.06242568,0.049473748,-0.0023709594,-0.0016292642,-0.056212697,0.017176101,-0.023372648,-0.015622856,0.01170276,-0.0103878435,-0.0026175063,0.06719225,0.0001237871,-0.039184522,-0.0057897433,0.037869606,-0.010050896,0.008140157,-0.012886185,0.0013087532,0.0154831465,-0.10348396,0.02284668,0.022024857,0.010708354,-0.012976586,0.009360565,0.008801725,-0.07751435,-0.014644886,0.04612071,0.042603306,-0.023602758,0.029437702,0.05141325,-0.009730385,0.03540414,0.031229276,-0.009163327,0.016847372,-0.0664033,-0.025657315,0.011957525,-0.01082341,-0.023537012,-0.01770207,0.018918367,-0.042570435,-0.011069956,-0.032626376,-0.04779723,-0.0076799365,-0.054864906,0.07573921,0.0032688011,-0.023027482,-0.0073388796,0.028730934,-0.026873613,0.029371956,0.027695436,0.030982729,0.0029154173,-0.0065047294,-0.009401656,0.038099717,-0.020841433,-0.013724445,-0.028928172,0.122090034,-0.03376049,-0.04227458,0.062359933,0.039513253,-0.036160216,0.037836734,-0.034878172,0.024671128,0.052958276,0.009368783,-0.06656767,-0.033513945,0.021005796,-0.0024839602,0.02205773,0.034812424,0.017619886,-0.031377204,0.053287007,-0.09605468,0.0017340466,-0.0070389146,0.03915165,-0.028303586,-0.0011289794,0.02536146,0.09763258,0.009886531,0.007630627,-0.011086393,-0.05151187,-0.06521988,-0.039578997,-0.012236945,-0.0134039335,0.043326512,0.018195162,-0.017718505,-0.02006892,0.045759108,0.020151101,0.0013693627,-0.008164812,0.035042536,0.03721215,-0.03523977,0.029141845,-0.027596818,0.03780386,-0.017570578,-0.044477064,-0.004988466,-0.0015429728,0.04040082,-0.0046515185,0.009623548,-0.053714354,-0.011168575,0.011374031,-0.0037660042,0.039743364,0.028385768,0.006106145,-0.021893365,-0.025229968,0.0033633108,-0.013058769,0.015762566,0.0021798857,-0.020923615,-0.047862973,-0.021630382,0.0411569,-0.0259203,-0.05246518,-0.0124917105,0.010042678,-0.04375386,-0.018392399,-0.02248508,0.013362843,0.0004234957,-0.040663805,-0.07501601,0.047567118,0.015384528,-0.013601172,0.009549584,0.036686182,-0.01082341,0.004146097,0.08053866,0.014702414,-0.028270712,0.025082039,0.002062776,-0.017406212,0.010338534,-0.027711874,-0.018047234,0.00417897,-0.023816433,0.02716947,-0.002564088,0.011201448,-0.019953864,-0.018523892,-0.029240465,0.019773062,-0.025969608,-0.020151101,-0.0056459242,-0.017406212,0.004086515,0.04950662,-0.008456559,-0.037606623,-0.033694744,0.005424032,-0.04980248,0.0027654346,-0.007211497,-0.017636323,0.046646677,0.0071498607,0.02633121,-0.014570923,0.033481073,0.0014813361,0.018408837,-0.0016631644,-0.02684074,0.015877621,-0.04569336,-0.015524237,-0.021712566,0.004269371,-0.069953576,-0.018392399,0.023537012,-0.023750687,-0.01923066,-0.04838894,-0.07705413,0.026807867,-0.03431933,0.0039796783,-0.03523977,-0.026627067,-0.015154417,-0.00069187226,0.013749099,-0.009114018,0.0185732,-0.011546614,0.03635745,-0.020315466,-0.041485626,0.01509689,0.0039550234,-0.013543644,0.032429136,0.048980653,-0.003478366,-0.0068704407,0.010001587,-0.028402204,0.054634795,-0.00123068,0.043030653,0.02350414,0.00066824484,0.039809108,0.01755414,0.047074024,0.0005174917,-0.013223133,0.010979556,0.025739498,0.0052884314,-0.02401367,0.028073475,-0.038757175,0.037968226,0.0059828716,-0.010700136,0.01240131,0.00023550367,-0.029897923,-0.035042536,0.004561118,0.008185358,0.022189222]	2026-03-04 08:18:52.780821+00
\.


--
-- Data for Name: post_tags; Type: TABLE DATA; Schema: public; Owner: blog_user
--

COPY public.post_tags ("postId", "tagId", "createdAt") FROM stdin;
cmm5q1x7o000actuile4fzwt2	cmm5q1x760007ctuisnidxuq4	2026-02-28 02:48:32.1
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: blog_user
--

COPY public.posts (id, slug, title, excerpt, content, "coverImage", published, "publishedAt", "viewCount", "authorId", "createdAt", "updatedAt", "isFeatured") FROM stdin;
cmm5q1x7o000actuile4fzwt2	getting-started-with-typescript	Getting Started with TypeScript	Learn the basics of TypeScript and why you should use it	TypeScript is a typed superset of JavaScript...	\N	t	2026-02-28 02:48:32.098	11	cmm5q1x4d0000ctuiw5ranw3u	2026-02-28 02:48:32.1	2026-02-28 08:36:03.97	f
cmm5q2cpb0001ct7z9qqw17yc	202610	2026年最值得掌握的10个技术点	2026年最值得掌握的10个技术点（按重要性排序）Prompt → Function Calling → Structured Output（必会）\n提示 → 函数调用 → 结构化输出（必会）\nVercel AI SDK / LangChain.js / LlamaIndex.TS\nReact Server Components + Server Actions\nStreaming + Suspense + useOptimistic\nRAG 前端实现（向量搜索 + 引用溯源展示）随着AI技术从探索走向落地，掌握核心工具链与模式已成为开发者构建下一代应用的关键。以下是根据技术趋势与市场需求梳理的十个技术要点。\n\n**1. 提示工程 → 函数调用 → 结构化输出（必会）**\n这构成了与AI模型交互的核心工作流。精妙的“提示工程”是引导模型理解意图的第一步；而“函数调用”能力让大模型从“思考者”转变为“行动者”，能根据用户请求动态调用外部工具或API；“结构化输出”则确保了模型返回的信息是稳定、可程序化处理的数据格式（如JSON）。三者结合，实现了从自然语言指令到可靠、可执行结果的完整自动	2026年最值得掌握的10个技术点（按重要性排序）Prompt → Function Calling → Structured Output（必会）\n提示 → 函数调用 → 结构化输出（必会）\nVercel AI SDK / LangChain.js / LlamaIndex.TS\nReact Server Components + Server Actions\nStreaming + Suspense + useOptimistic\nRAG 前端实现（向量搜索 + 引用溯源展示）随着AI技术从探索走向落地，掌握核心工具链与模式已成为开发者构建下一代应用的关键。以下是根据技术趋势与市场需求梳理的十个技术要点。\n\n**1. 提示工程 → 函数调用 → 结构化输出（必会）**\n这构成了与AI模型交互的核心工作流。精妙的“提示工程”是引导模型理解意图的第一步；而“函数调用”能力让大模型从“思考者”转变为“行动者”，能根据用户请求动态调用外部工具或API；“结构化输出”则确保了模型返回的信息是稳定、可程序化处理的数据格式（如JSON）。三者结合，实现了从自然语言指令到可靠、可执行结果的完整自动化链条，是任何AI功能的基础。\n\n**2. 主流AI应用开发框架（Vercel AI SDK / LangChain.js / LlamaIndex.TS）**\n选择并精通一个主流框架至关重要。Vercel AI SDK 以其与Next.js的深度集成、简洁的流式响应处理见长，适合全栈开发者快速构建Web应用。LangChain.js 提供了最丰富的模块化抽象（链、智能体、检索器），适用于需要复杂编排和实验性探索的场景。LlamaIndex.TS 则专精于RAG（检索增强生成）应用的构建，擅长文档索引与检索。理解它们的哲学与优劣，能让你在合适的场景选用最锋利的工具。\n\n**3. React Server Components + Server Actions**\n这一组合正在重新定义全栈React应用架构。Server Components允许在服务端直接获取数据并渲染非交互式UI，极大提升了初始加载性能和SEO。Server Actions则提供了在服务端安全执行数据变更（如数据库操作、AI调用）的简洁途径。对于AI应用，这意味着可以将耗时的LLM调用、向量搜索等完全放在服务端，仅流式传输结果到客户端，从而提升安全性、降低客户端复杂度，并实现更平滑的交互。\n\n**4. 流式响应 + Suspense + useOptimistic**\n这是打造流畅AI用户体验的前端“铁三角”。“流式响应”允许UI逐词、逐段地显示AI生成的长内容，显著降低用户感知延迟。配合React的Suspense组件，可以在等待流式内容时优雅地展示加载状态。而`useOptimistic`钩子则能实现“乐观更新”，在AI处理用户指令（如翻译一段文本）的同时，界面立即显示预期结果，待真实结果返回后再无缝替换。这三者共同消除了等待的焦虑感，使交互感觉即时而自然。\n\n**5. RAG的前端实现：向量搜索与引用溯源展示**\nRAG（检索增强生成）系统的价值不仅在于后端检索的准确性，更在于前端的透明化呈现。前端需要实现：1）对用户查询进行预处理并可能发起多轮向量搜索；2）清晰展示AI回答所依据的“参考资料”或原文片段。这通常通过高亮、侧边栏引用或脚注实现，让用户可以追溯和验证信息来源，极大增强答案的可信度与系统的可靠性。\n\n**6. Tool Call在前端的完整交互闭环**\n当AI模型通过“函数调用”触发一个真实操作（如发送邮件、预订机票）时，前端需要设计完整的交互闭环。这包括：**确认**（向用户展示AI计划执行的操作并请求授权）、**中断**（允许用户在操作执行中随时取消）、**进度反馈**（展示操作执行状态）以及**人工介入**的入口（当AI无法完成时，平滑切换至人工流程）。这一闭环是构建负责任、可信赖的AI助手产品的关键。\n\n**7. 多模态输入输出处理管道**\n未来的AI应用将超越纯文本。技术要点包括：处理图像、音频、PDF等多种格式的**输入**（如通过视觉理解模型描述图片内容，或通过解析器提取文档文本）；生成图文并茂、附带图表或合成语音的**输出**。前端需要搭建一个能够路由、协调不同模态处理模型，并统一呈现结果的管道，以提供更丰富、更人性化的交互体验。\n\n**8. 小模型端侧部署与量化技术**\n出于成本、延迟、隐私和离线可用性的考虑，将经过“量化”（降低模型精度以压缩体积和加速）的小型模型（如Phi-3, Gemma 2B）部署到浏览器、手机或边缘设备端侧运行，已成为重要趋势。掌握相关的推理框架（如ONNX Runtime, TensorFlow.js）和优化技术，能让你的应用在资源受限的环境下依然提供智能能力，并保护用户数据隐私。\n\n**9. Agent Memory在前端的可视化表现形式**\n具备“记忆”能力的AI智能体（Agent）是其个性化的核心。前端面临的挑战是如何将Agent的内部状态（如对话历史、对用户偏好的理解、执行任务的过程记忆）以直观的方式呈现给用户。这可能体现为：**时间线**（展示思考和行动序列）、**知识图谱**（可视化Agent对实体及其关系的认知）或**交互画布**（允许用户拖拽、编辑Agent的任务规划）。良好的记忆可视化能帮助用户理解、调试甚至引导Agent的行为。\n\n**10. AI产品体验的量化指标体系**\n构建AI产品不仅是技术问题，更是体验问题。必须建立一套核心指标来衡量和优化：**响应延迟**（从用户提问到收到首个有效字符的时间，直接影响体验流畅度）、**任务成功率**（用户指令被准确理解和完成的比例，而非简单的聊天轮次）、以及**用户满意度**（通过NPS、五星评分或直接反馈来衡量）。持续监测并优化这些指标，是确保AI产品从“能用”走向“好用”并最终获得用户青睐的科学路径。\nTool Call 在前端的完整闭环（确认/中断/人工介入）\n多模态输入输出处理管道\n小模型端侧部署与量化\nAgent Memory 在前端的表现形式（时间线/知识图谱/画布）\nAI产品体验指标体系（Response Latency、Task Success Rate、User Satisfaction）\nAI 产品体验指标体系（响应延迟、任务成功率、用户满意度）\n\n	\N	t	2026-02-27 18:39:00	23	cmm5q1x4d0000ctuiw5ranw3u	2026-02-28 02:48:52.175	2026-02-28 14:54:13.574	t
cmm5r3j230001ct1dzw4n2ar0	xxxxxxx	元宝历险记：从街头“流浪猫”到温暖家庭的艰辛历程	# 从街头到家园：一只流浪银渐层的重生历程\n\n## 初遇：街角那双琥珀色的眼睛\n去年深秋，我在小区的垃圾桶旁第一次遇见它——小小的身影蜷成一团，灰扑扑的，唯独那双琥珀色的眼睛亮得惊人。走近细看，才发现这竟是只银渐层。本该柔软光亮的银灰色毛发，此刻却打结板结，沾满草屑与污垢。我试探着唤了声“咪咪”，它警惕地后退两步，却没有逃走。\n\n## 流浪的印记\n从保安大叔那儿得知，它已在这片区域徘徊了近两个月。一只品种猫流落街头，生存尤其艰难：\n\n- **缺乏野外生存能力**：不懂得翻找垃圾桶，饿极了才肯啃食半截发霉的火腿肠  \n- **常受同类欺凌**：总被本地的野猫追赶到矮墙上，瑟瑟发抖  \n- **对人类矛盾的情感**：有人靠近时会仰起头张望，可当手伸到一半，它又会迅速躲闪\n\n一场暴雨过后，我见它蜷在车库角落发抖，前爪上多了一道新鲜的血痕。去便利店买火腿肠时，店员忽然说道：“这猫是叫元宝吧？以前住在7栋的小姑娘养的，搬家时就被留下了。” 那一刻，我手中的猫罐头忽然沉了几分。\n\n## 缓慢的靠近\n我开始每天在固定位置放置猫粮：\n\n1. **第一周**：放下便离开，通过监控看着它谨慎地进食  \n2	# 从街头到家园：一只流浪银渐层的重生历程\n\n## 初遇：街角那双琥珀色的眼睛\n去年深秋，我在小区的垃圾桶旁第一次遇见它——小小的身影蜷成一团，灰扑扑的，唯独那双琥珀色的眼睛亮得惊人。走近细看，才发现这竟是只银渐层。本该柔软光亮的银灰色毛发，此刻却打结板结，沾满草屑与污垢。我试探着唤了声“咪咪”，它警惕地后退两步，却没有逃走。\n\n## 流浪的印记\n从保安大叔那儿得知，它已在这片区域徘徊了近两个月。一只品种猫流落街头，生存尤其艰难：\n\n- **缺乏野外生存能力**：不懂得翻找垃圾桶，饿极了才肯啃食半截发霉的火腿肠  \n- **常受同类欺凌**：总被本地的野猫追赶到矮墙上，瑟瑟发抖  \n- **对人类矛盾的情感**：有人靠近时会仰起头张望，可当手伸到一半，它又会迅速躲闪\n\n一场暴雨过后，我见它蜷在车库角落发抖，前爪上多了一道新鲜的血痕。去便利店买火腿肠时，店员忽然说道：“这猫是叫元宝吧？以前住在7栋的小姑娘养的，搬家时就被留下了。” 那一刻，我手中的猫罐头忽然沉了几分。\n\n## 缓慢的靠近\n我开始每天在固定位置放置猫粮：\n\n1. **第一周**：放下便离开，通过监控看着它谨慎地进食  \n2. **第二周**：坐在三米外陪它吃饭，它每吃几口便抬头望我一眼  \n3. **第三周**：尝试轻声唤“元宝”，它的耳朵会微微转动\n\n转机出现在寒流来袭的那一夜。常放粮的位置不见它的踪影，最终我在废弃快递柜后发现了一个纸箱——它自己叼来旧毛巾垫成小窝，正缩在里面打着喷嚏。看见我时，它第一次没有立即逃跑，只是用沙哑的嗓子发出一声细微的“啊呜”。\n\n## 走向家的旅程\n带它去宠物医院的路上，它在航空箱里安静得令人心疼。检查结果却比预想中乐观：\n\n- 轻度营养不良  \n- 爪子发炎，耳螨严重  \n- 最庆幸的是：没有感染猫瘟或传腹\n\n医生微笑着说：“流浪这么久还能保持这样的状态，真是只有福气的猫。” 洗澡时才注意到，它的脖颈上还挂着半截褪色的红绳，铃铛早已不知去向。\n\n## 新家的第一个月\n适应新环境的过程并不轻松：\n\n- **凌晨巡视**：每天半夜三点，它要把所有房间的门缝检查一遍  \n- **藏粮习惯**：总会把冻干偷偷叼到沙发底下囤起来  \n- **矛盾的信任**：允许我抚摸它的肚子，可一听见塑料袋的声音，还是会吓得炸毛\n\n直到某个加班的深夜，我在沙发上睡着了，醒来时发现它正端坐在茶几上静静望着我。见我睁开眼，它犹豫着向前挪了半步，用还沾着猫粮碎屑的鼻子，轻轻碰了碰我的手指。\n\n## 如今的元宝\n现在，它最钟情三件事：\n\n1. 清晨洒满阳光的窗台  \n2. 装猫条的抽屉被拉开的声音  \n3. 被挠下巴时发出拖拉机般响亮的呼噜声\n\n上周带去宠物店，店员惊叹：“这只银渐层品相真好！” 我笑了笑，没有多言。他们看见的是缎子般光亮的皮毛和圆润的身形，只有我知道，有些痕迹永远不会消失——它至今不敢玩带铃铛的玩具，每到下雨天，一定要紧挨着人的腿才能安睡。\n\n## 尾声\n元宝的故事很普通，不过是万千流浪猫中幸运的一例。但每当它跳上膝盖，团成一颗银灰色的毛球时，我总会想起那个湿冷的傍晚——倘若当时径直走开，此刻的客厅该是多么安静。\n\n**或许所有的相遇都是双向的拯救：我给了它一个家，而它让我在这座匆忙的城市里，重新学会了“等待”与“靠近”的温柔。** 如今的元宝不再狼吞虎咽，而是悠闲地享用每一餐；最大的变化是，它开始在阳光晴好的下午，挨着我的脚边躺下，露出柔软的肚皮，发出满足的呼噜声。\n\n如今，元宝最大的爱好便是趴在窗台上晒太阳，望着窗外飞过的小鸟，然后回头对我轻唤一声，跳下窗台，亲昵地蹭过我的腿。曾经那只惊惶不安的小猫，已然不见踪影。从一个风雨飘摇的流浪者，蜕变成会撒娇、有点挑食、喜欢独占沙发的“家中小主”，元宝的转变温暖了它的余生，也完整了我的生活。\n\n有时望着它安睡的侧脸，我总会想起，在那个寒冷的秋夜，给予它一个家或许是我做过最正确的决定。**每一个流浪的生命，都值得一次被温柔拥抱的机会。** 元宝的故事很短，只是无数流浪动物找到归宿的微小缩影；而这份彼此给予的温暖却很长，将在我们共同的生命里，持续地散发着光亮。\n\n##前言：一只猫的“系统日志”在城市的某个角落，一只橘白相间的小猫正在执行它的日常任务：觅食、寻找临时栖身地、躲避危险。它的毛色让它看起来像个小元宝，附近的居民偶尔会叫它“元宝”，但大多数时候，它只是庞大都市数据流中一个微不足道的节点——一只典型的# 元宝：从流浪到有家的猫生转折\n\n去年深秋，我下班回家时，在小区废弃的花坛边第一次遇见了它。它蜷缩在一堆枯叶里，原本应该是金灿灿的橘色毛发，沾满了灰土和草屑，结成了缕。我试探性地叫了声“咪咪”，它警觉地抬起头——一双琥珀色的眼睛圆溜溜的，透着疲惫和警惕。那时我没想到，这个脏兮兮的小家伙，后来会有一个叫“元宝”的名字，并成为我家的一份子。\n\n## 相遇：寒夜里的金眼睛\n\n起初的几次接触并不顺利。我放下的猫粮，它总要等我退开很远才敢上前，吃得飞快，一边吃一边不住地张望，随时准备逃跑。它的左耳尖有个小小的缺口，那是流浪猫绝育后的标记，也是它艰难生存过的勋章。邻居说，它在这片街区游荡快一年了，夏天在车底乘凉，冬天就挤在供暖井盖旁，靠好心人偶尔的投喂和翻找垃圾桶为生。\n\n天气越来越冷，接连几天秋雨，我再见它时，它正哆哆嗦嗦地试图舔干湿透的皮毛。那一刻，我心里某个地方被触动了。我拿来一个不用的纸箱，垫上旧毛巾，放在楼道避风的角落。第二天早上，我看到它整个身子蜷在箱子里，睡得正沉。那也许是我们之间信任的开始。\n\n## 蜕变：从警觉到撒娇\n\n我决定收养它。带它去宠物医院检查、驱虫，是个大工程。在航空箱里它害怕得不行，但到了家，当我把食盆和水盆放好，它小心翼翼地探索完每个角落，最终在柔软的猫窝旁趴下时，发出了一声长长的、仿佛叹息般的呼噜。\n\n我给它取名“元宝”，因为它橘色的毛发像个小金锭，也寓意着它能开启富足安稳的“猫生”。适应期比想象中快。不过一周，元宝就明白了“开罐头”声音的意义，会竖着尾巴颠颠地跑过来。它# 遇见元宝：一只流浪银渐层的重生故事\n\n## 楔子：街角的“小脏团”\n去年深秋，我在小区垃圾桶旁第一次见到它——团成一团，灰扑扑的，只有那双琥珀色的眼睛亮得惊人。走近才发现，这竟是只银渐层，本该柔软发亮的银灰色毛发打结板结，沾满了草屑和污垢。我试着唤了声“咪咪”，它警惕地后退两步，却没逃走。\n\n## **流浪的痕迹**\n后来从保安大叔那儿听说，它在这片徘徊快两个月了。品种猫流落街头尤其艰难：\n- **毫无野外生存技能**：不会翻垃圾桶，饿极了才啃半截发霉的火腿肠\n- **容易被欺负**：常被本地野猫追得跳上矮墙瑟瑟发抖\n- **对人类既渴望又恐惧**：有人靠近时会仰起头，但手伸到半空它就会躲闪\n\n有次暴雨后，我发现它蜷在车库角落发抖，前爪有道新鲜血口子。去便利店买火腿肠时，店员忽然说：“这猫叫元宝吧？以前住7栋的小姑娘养的，搬家就扔下了。” 那一刻，纸袋里的猫罐头突然变得沉甸甸的。\n\n## **笨拙的靠近**\n我开始每天在固定位置放粮：\n1. **第一周**：放下就走，通过监控看它谨慎地吃\n2. **第二周**：坐在三米外陪它吃饭，它吃几口就抬头看我一眼\n3. **第三周**：尝试轻声叫“元宝”，它耳朵会轻轻转动\n\n转折发生在寒流来袭那夜。我在老地方没找到它，最后在废弃快递柜后发现个纸箱——它自己叼了旧毛巾垫窝，正缩在里面打喷嚏。看到我时，它第一次没有起身逃跑，只是用沙哑的嗓子发出细微的“啊呜”声。\n\n## **回家的路**\n带它去宠物医院的路上，它在航空箱里安静得可怕。检查结果比想象中好：\n- 轻度营养不良\n- 爪子发炎，耳螨严重\n- 最重要的：没有猫瘟和传腹\n\n医生笑着说：“流浪这么久还这个状态，真是只有福气的猫。” 洗澡时才发现，它脖颈上还挂着半截褪色的红绳，铃铛早已不知去向。\n\n## **在新家的第一个月**\n适应比预期艰难：\n- **凌晨三点巡视**：必须把所有房间门缝检查一遍\n- **藏食物**：会把冻干叼到沙发下囤着\n- **奇怪的信任**：允许我摸肚子，但听见塑料袋声音还是会炸毛\n\n直到某个加班夜，我窝在沙发睡着，醒来发现它端坐在茶几上静静看我。见我睁眼，它犹豫地往前挪了半步，用还沾着猫粮碎屑的鼻子，轻轻碰了碰我的手指。\n\n## **现在的元宝**\n如今它最爱三件事：\n1. 清晨阳光最好的窗台\n2. 装猫条的抽屉开关声\n3. 被挠下巴时发出拖拉机般的呼噜声\n\n上周带去宠物店，店员惊叹：“这银渐层品相真好！” 我笑着没说话。他们看见的是缎子般的皮毛和圆润的身形，只有我知道，有些痕迹永远都在——它至今不敢玩带铃铛的玩具，下雨天一定要挨着人的腿睡。\n\n## 最后\n元宝的故事很普通，不过是千万流浪猫中幸运的一个。但每次它跳上膝盖团成银灰色的毛球时，我总会想起那个湿冷的傍晚——如果当时径直走过，此刻我的客厅该有多安静。\n\n**或许所有相遇都是双向拯救：我给了它一个家，它让我在这个匆忙的城市里，重新学会了“等待”与“靠近”的温柔。**不再狼吞虎咽，而是悠闲地进食；最大的变化是，它开始会在阳光好的下午，挨着我的脚边躺下，露出肚皮，发出满足的呼噜声。\n\n现在，元宝最喜欢的事就是在窗台上晒太阳，看外面的小鸟，然后回头对我“喵”一声，跳下来蹭我的腿。它身上再也看不到当初那只惊弓之鸟的影子。从一个风雨无依的流浪者，到如今这个会撒娇、挑食、霸占沙发的“家中小主”，元宝的转变，温暖了它的余生，也完整了我的生活。\n\n有时看着它安睡的侧脸，我会想，给它一个家，也许是那个寒冷秋夜我做过最对的决定。**每个流浪的生命，都值得一次被温柔拥抱的机会。** 元宝的故事很短，只是无数流浪动物找到归宿的缩影；但这份相互给予的温暖，却很长，会持续在我们彼此的生命里发光。	\N	t	2026-02-27 19:13:00	15	cmm5q1x4d0000ctuiw5ranw3u	2026-02-28 03:17:46.682	2026-02-28 15:54:46.395	f
cmmbpjmus0001ctnctnhx65hm	-1772608855921	小张求职记	# 当五年经验的前端程序员遇见AI：小张的求职启示录\n\n我叫小张，一名拥有五年经验的前端程序员。在过去的一个月里，我经历了一次不同寻常的求职历程。这次求职，与以往最大的不同，是AI这个变量已从技术热词，变成了实实在在嵌入到我技能栈、项目思考和职业规划中的存在。我想把我的经历和思考分享出来，或许能给你带来一些启发。\n\n## 一、风口之下：五年经验与AI浪潮的碰撞\n\n工作五年，意味着什么？意味着我熟练掌握了Vue/React全家桶，对工程化、性能优化有了实战心得，也带过小团队，做过几个像样的项目。简历看起来挺丰满，本以为在求职市场上会很有底气。\n\n然而，真正开始看机会时，我发现风向变了。几乎所有的“资深前端”或“前端专家”岗位JD里，都或多或少出现了新的关键词：**AI工程化、LLM应用、智能体（Agent）、AI Copilot集成、RAG系统**。\n\n起初有些焦虑，感觉五年积累的“传统”技能瞬间贬值。但冷静下来后我意识到，这并非替代，而是一次重大的 **“能力升级”** 窗口。五年的前端经验，恰恰是我理解和接入AI世界最宝贵的资产。\n\n## 二、技能升级：一个前端如何快速拥抱AI\n\n对	# 当五年经验的前端程序员遇见AI：小张的求职启示录\n\n我叫小张，一名拥有五年经验的前端程序员。在过去的一个月里，我经历了一次不同寻常的求职历程。这次求职，与以往最大的不同，是AI这个变量已从技术热词，变成了实实在在嵌入到我技能栈、项目思考和职业规划中的存在。我想把我的经历和思考分享出来，或许能给你带来一些启发。\n\n## 一、风口之下：五年经验与AI浪潮的碰撞\n\n工作五年，意味着什么？意味着我熟练掌握了Vue/React全家桶，对工程化、性能优化有了实战心得，也带过小团队，做过几个像样的项目。简历看起来挺丰满，本以为在求职市场上会很有底气。\n\n然而，真正开始看机会时，我发现风向变了。几乎所有的“资深前端”或“前端专家”岗位JD里，都或多或少出现了新的关键词：**AI工程化、LLM应用、智能体（Agent）、AI Copilot集成、RAG系统**。\n\n起初有些焦虑，感觉五年积累的“传统”技能瞬间贬值。但冷静下来后我意识到，这并非替代，而是一次重大的 **“能力升级”** 窗口。五年的前端经验，恰恰是我理解和接入AI世界最宝贵的资产。\n\n## 二、技能升级：一个前端如何快速拥抱AI\n\n对于大多数前端同学而言，直接投身算法和模型训练门槛太高。但AI的应用层，尤其是与用户体验直接交互的部分，恰恰是我们的主场。我快速为自己制定了“前端+AI”的学习和应用路径：\n\n### 1. 理解核心概念与工作流\n*   **放弃“从零开始学模型”的执念**：我首先搞懂了提示词工程、RAG、Function Calling、Agent工作流等概念。明白了AI应用如何通过API、SDK与我们熟悉的“前端请求-后端响应”模式对接。\n*   **关键工具实践**：我利用周末时间，基于 `LangChain.js` 或 `Vercel AI SDK` 这类前端友好库，亲手搭建了一个简单的“文档问答助手”。这一步至关重要，它让我对AI应用的“数据流入、处理、输出”全链路有了直观感受。\n\n### 2. 将AI能力融入现有技能树\n*   **工程化思维迁移**：如何管理大量的提示词模板？AI接口的稳定性、降级方案、错误处理如何设计？如何对AI输出进行结构化、安全过滤？这和我之前处理第三方API、做错误监控的逻辑一脉相承。\n*   **交互设计的新挑战**：AI应用通常是异步、流式输出的。这意味着前端需要处理SSE或WebSocket，实现打字机效果，并提供良好的“等待”、“中断”、“重新生成”交互。这为我的前端交互设计能力打开了新课题。\n\n### 3. 在项目中寻找切入点\n我把过往项目在脑子里过了一遍，思考哪些地方可以被AI增强：\n*   一个后台管理系统，能否增加一个“用自然语言描述你要的报表”的功能？\n*   一个内容创作平台，能否集成AI辅助写作和配图？\n*   一个复杂的表单页面，能否用对话式引导用户填写？\n这些思考，后来都成了我面试时展示“AI思维”的绝佳素材。\n\n## 三、求职实战：如何向面试官讲述你的“AI准备”\n\n调整了技能方向后，我的求职策略也变了。\n\n**1. 简历重塑**\n我不再简单罗列“Vue3 + TypeScript + Webpack”。在项目经历中，我增加了这样的描述：\n> “项目后期，**探索并原型设计了集成AI代码辅助（Copilot）的开发流程**，提升了团队日常组件开发的效率。”\n> “负责XX模块，**曾调研基于RAG的智能帮助中心方案**，以解决传统文档检索体验不佳的问题。”\n——关键在于，展现出你对趋势的关注和主动探索的意愿，哪怕只是调研和原型。\n\n**2. 面试沟通的核心转变**\n当面试官（通常是技术负责人或CTO）问及“你对前端未来怎么看”或“最近在学什么”时，我不再泛泛而谈微前端或跨端。我会这样回答：\n> “我认为前端正在从‘界面构建者’向‘智能交互设计师’演进。我最近重点关注AI Native应用的交互范式。比如，在传统CRUD应用中，我们可以思考如何用‘对话’替代部分复杂表单和筛选操作。我利用LangChain.js实践了一个简单的Demo，深刻感受到处理好流式响应、中间状态和用户预期的重要性。我五年的前端工程经验，让我能更稳健地将这些新兴AI能力落地到产品中。”\n\n**3. 准备一个有AI味道的“加试题”**\n我特意准备了一个“旧项目AI化改造”的简短方案。当被问到项目深度时，我会说：“以我之前做的电商后台为例，如果现在让我加入AI能力，我可能会分三步走：第一，在商品列表页加入自然语言搜索；第二，为运营人员开发一个自动生成营销文案的助手；第三，长远来看，可以尝试构建一个能自动处理常规客诉的对话机器人。技术上，前端侧我会考虑用...，并注意...”\n\n## 四、心态与展望：回归本质，持续进化\n\n最终，我拿到了几个不错的Offer，选择的是一家在积极探索AI与自身业务结合的中型公司。回头看这段经历，我的体会有几点：\n\n1.  **基础依然为王**：面试中问得最深的，还是JavaScript闭包、React渲染优化、浏览器原理。AI是新的增长点，但扎实的基础是你接入任何新技术的底座。五年经验的价值，在此时更显厚重。\n2.  **从“使用者”变为“连接者”**：前端程序员不必成为AI科学家，但需要成为优秀的“连接者”和“翻译者”——将AI的能力“翻译”成稳定、好用的用户体验，将用户的需求“连接”到AI的接口之上。\n3.  **保持好奇，快速实验**：AI领域日新月异，每天都有新工具、新论文。不必恐慌性学习，但需要保持敏感。拿出做Side Project的劲头，快速上手几个新工具，这种手感无法替代。\n\n对于和我一样有几年经验的前端同行来说，AI带来的不是颠覆性的职业危机，而是一次清晰的升级信号。它要求我们跳出“画页面、调接口”的舒适区，更多地去思考交互的本质、用户的需求以及技术如何更智能地服务于人。\n\n五年经验，不再是重复劳动的年资证明，而应成为你理解复杂系统、快速学习新范式、并将之稳健落地的能力背书。拥抱变化，持续学习，我们的职业道路，只会越走越宽。	http://localhost:3001/uploads/covers/b3f40ef6-a754-41e9-b625-86cf611acab1.png	t	2026-03-03 23:13:00	18	cmm5q1x4d0000ctuiw5ranw3u	2026-03-04 07:20:55.924	2026-03-04 10:29:48.42	f
cmmbp7eak0001ctv5qwjzf7rn	cmmbp7eak0001ctv5qwjzf7rn	从同事到伴侣：希言和燕子的五年故事	# 从同事到伴侣：希言和燕子的五年故事\n\n在写字楼的格子间里，每天都有无数的故事在发生。有些故事随着下班打卡而结束，有些却悄然生根，最终开出意想不到的花。希言和燕子的故事，就属于后者。从共享一份项目文档的同事，到共享彼此人生的伴侣，他们用五年的时间，书写了一段关于“慢热”与“笃定”的现代感情叙事。\n\n## 一、起点：格子间里的平行线\n\n希言和燕子相识于五年前的那个春天，同在一家互联网公司的产品部。\n\n*   **希言**是后端开发工程师，性格正如他的名字，沉稳少言，逻辑清晰，他的世界主要由代码和架构图组成。\n*   **燕子**则是前端工程师，灵动、细致，对用户体验有着执着的追求，她的桌面总是点缀着绿植和小摆件。\n\n他们的工位隔着一个过道，最初的交集仅限于工作。希言提交的接口文档，由燕子来实现页面交互；燕子遇到的诡异Bug，有时也需要希言帮忙排查后端逻辑。他们的交流，完全围绕着JIRA任务编号、API字段和每周的站立会议。\n\n很长一段时间里，他们是两条标准的“职场平行线”——专业、高效、保持恰到好处的距离。除了工作，唯一的共同点或许是都习惯在加班后的深夜，去公司楼下那家灯光温暖的便利店	# 从同事到伴侣：希言和燕子的五年故事\n\n在写字楼的格子间里，每天都有无数的故事在发生。有些故事随着下班打卡而结束，有些却悄然生根，最终开出意想不到的花。希言和燕子的故事，就属于后者。从共享一份项目文档的同事，到共享彼此人生的伴侣，他们用五年的时间，书写了一段关于“慢热”与“笃定”的现代感情叙事。\n\n## 一、起点：格子间里的平行线\n\n希言和燕子相识于五年前的那个春天，同在一家互联网公司的产品部。\n\n*   **希言**是后端开发工程师，性格正如他的名字，沉稳少言，逻辑清晰，他的世界主要由代码和架构图组成。\n*   **燕子**则是前端工程师，灵动、细致，对用户体验有着执着的追求，她的桌面总是点缀着绿植和小摆件。\n\n他们的工位隔着一个过道，最初的交集仅限于工作。希言提交的接口文档，由燕子来实现页面交互；燕子遇到的诡异Bug，有时也需要希言帮忙排查后端逻辑。他们的交流，完全围绕着JIRA任务编号、API字段和每周的站立会议。\n\n很长一段时间里，他们是两条标准的“职场平行线”——专业、高效、保持恰到好处的距离。除了工作，唯一的共同点或许是都习惯在加班后的深夜，去公司楼下那家灯光温暖的便利店买一杯关东煮。\n\n## 二、转折：从“我们项目”到“我们”\n\n关系的微妙变化，往往始于工作之外的偶然。\n\n有一次，为了赶一个重要的版本上线，团队连续熬了几个通宵。最后一个深夜，当所有人都疲惫不堪时，燕子发现了一个前端性能上的瓶颈，却怎么也找不到根源。正当她有些焦躁时，希言默默坐到了她旁边，没有过多言语，只是说：“把日志和监控数据给我看看。”\n\n两人一起排查了两个小时，最终发现是一个非常隐蔽的第三方库兼容性问题。问题解决的那一刻，窗外天已蒙蒙亮。燕子长舒一口气，由衷地说：“太感谢了，没有你，我今天肯定搞不定。”希言只是揉了揉发酸的眼睛，回了句：“应该的，是我们项目。”\n\n那句自然的“我们项目”，让燕子心里微微一动。她忽然觉得，这个平时沉默寡言的同事，身上有一种令人安心的可靠。\n\n从那之后，他们之间的“安全距离”开始缓缓缩短。会一起讨论技术方案，也会偶尔在午餐时聊聊最近看的电影或书籍。他们发现，彼此对技术的热爱、对工作的责任心，甚至对生活那种略显“宅”的品味，都出奇地一致。\n\n从同事到朋友的过渡是自然而然的。而从朋友到情侣的跨越，则需要一个契机。这个契机发生在一次团队户外拓展活动，在一次需要双人紧密配合的高空项目中，恐高的燕子下意识地紧紧抓住了希言的手臂。落地后，她的手心全是汗，不知是吓的还是别的什么原因。希言递给她一瓶水，低声说了句：“别怕，我在呢。”\n\n那句话，像一把钥匙，轻轻打开了一扇门。回去的路上，他们比往常沉默了更多，但空气里似乎有些不一样的东西在流动。几天后，希言第一次在非工作时间，以非工作的理由，约燕子去看了一场她提过的展览。\n\n## 三、五年：平衡“我们”与“我”\n\n确定关系后，如何处理好“曾经的同事”和“现在的恋人”这双重身份，成为了他们的第一个课题。\n\n**1. 职场与情场的“开关”艺术**\n在公司，他们依然是专业的产品搭档。他们约定了一个原则：**“进公司门，我们是战友；出公司门，我们才是情侣。”** 会议上可以为了一个设计方案据理力争，但绝不把工作争执的情绪带回家。这种默契的“角色切换”能力，让他们既维护了职业形象，也保护了私人感情。\n\n**2. 共同的成长是最牢固的纽带**\n在一起的五年，也正是他们职业生涯快速发展的五年。从初级工程师到技术骨干，他们见证了彼此每一个加班啃下的难点、每一个获得认可的项目。这种“革命战友”般的情谊，让他们的关系超越了简单的风花雪月，多了一份深厚的理解与支持。他们不仅是生活伴侣，更是彼此最懂行的“技术顾问”和“职业导师”。\n\n**3. 保留独立的空间**\n曾是同事的经历，让他们深知彼此对专注工作的需求。他们不会要求对方必须秒回信息，也尊重对方需要独处充电的时间。希言可能周末沉迷于他的开源项目，而燕子则乐于参加她的插画 workshop。健康的感情，不是时时刻刻的捆绑，而是在各自的世界里深耕，然后分享收获的喜悦。\n\n## 结语\n\n如今，当朋友们问起“和同事谈恋爱是什么感觉”时，希言和燕子通常会相视一笑。\n\n这段始于同事关系的五年感情，带给他们的不仅仅是爱情，还有一份难得的“懂得”。因为他们见过彼此在职场中最专业、最专注，甚至最焦头烂额的样子，所以更能理解对方笑容背后的压力，沉默之下的思考。\n\n他们的故事或许没有戏剧性的一见钟情，却有着细水长流的扎实与温暖。它告诉我们，美好的关系有时就萌芽于最平常的日常协作中——那份基于专业能力而产生的欣赏，那种在共同目标下培养出的信任，一旦遇到合适的土壤，便能悄然生长，最终枝繁叶茂。\n\n从“我们项目”到“我们未来”，希言和燕子仍在续写他们的故事。而他们的经历，也给所有在职场中寻觅缘分的人，提供了一种温暖的可能：那个对的人，也许正坐在你隔壁的工位上，和你一起，为了同一个目标而努力着。	http://localhost:3001/uploads/covers/94f689c5-e0cd-46a3-a714-ff67d8314f2b.png	t	2025-09-03 23:09:00	8	cmm5q1x4d0000ctuiw5ranw3u	2026-03-04 07:11:24.956	2026-03-04 08:18:52.338	f
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: blog_user
--

COPY public.tags (id, slug, name, "createdAt", "updatedAt") FROM stdin;
cmm5q1x760007ctuisnidxuq4	typescript	TypeScript	2026-02-28 02:48:32.082	2026-02-28 02:48:32.082
cmm5q1x760006ctuii07wf6mz	javascript	JavaScript	2026-02-28 02:48:32.082	2026-02-28 02:48:32.082
cmm5q1x760005ctuiwnu82cqi	react	React	2026-02-28 02:48:32.082	2026-02-28 02:48:32.082
cmm5q1x7h0008ctuiuxcuu29j	nodejs	Node.js	2026-02-28 02:48:32.082	2026-02-28 02:48:32.082
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: blog_user
--

COPY public.users (id, email, username, "passwordHash", name, bio, avatar, role, provider, "providerId", "createdAt", "updatedAt") FROM stdin;
cmm5q1x4d0000ctuiw5ranw3u	admin@blog.com	admin	$2b$10$8Kq/pbnQJ30RVxl7Zm2dWOJWTLq22AaJ1cKPkjtQigN2s99IoVn.q	Admin User	Blog administrator	\N	ADMIN	local	\N	2026-02-28 02:48:31.981	2026-02-28 02:48:31.981
cmm5q1x6i0001ctuiyidij2my	user@blog.com	johndoe	$2b$10$rbngYnywjNNWzZnggChVFOffZDB6Op4DMWaeRMuxL16wA3agv6.6K	John Doe	Regular blog user	\N	USER	local	\N	2026-02-28 02:48:32.058	2026-02-28 02:48:32.058
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: home_configs home_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.home_configs
    ADD CONSTRAINT home_configs_pkey PRIMARY KEY (id);


--
-- Name: home_layout_templates home_layout_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.home_layout_templates
    ADD CONSTRAINT home_layout_templates_pkey PRIMARY KEY (id);


--
-- Name: post_categories post_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.post_categories
    ADD CONSTRAINT post_categories_pkey PRIMARY KEY ("postId", "categoryId");


--
-- Name: post_embeddings post_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.post_embeddings
    ADD CONSTRAINT post_embeddings_pkey PRIMARY KEY (id);


--
-- Name: post_tags post_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_pkey PRIMARY KEY ("postId", "tagId");


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: categories_slug_idx; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE INDEX categories_slug_idx ON public.categories USING btree (slug);


--
-- Name: categories_slug_key; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);


--
-- Name: comments_authorId_idx; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE INDEX "comments_authorId_idx" ON public.comments USING btree ("authorId");


--
-- Name: comments_parentId_idx; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE INDEX "comments_parentId_idx" ON public.comments USING btree ("parentId");


--
-- Name: comments_postId_idx; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE INDEX "comments_postId_idx" ON public.comments USING btree ("postId");


--
-- Name: home_configs_userId_key; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE UNIQUE INDEX "home_configs_userId_key" ON public.home_configs USING btree ("userId");


--
-- Name: home_layout_templates_userId_idx; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE INDEX "home_layout_templates_userId_idx" ON public.home_layout_templates USING btree ("userId");


--
-- Name: idx_post_embeddings_hnsw; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE INDEX idx_post_embeddings_hnsw ON public.post_embeddings USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: idx_post_embeddings_post_id; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE INDEX idx_post_embeddings_post_id ON public.post_embeddings USING btree (post_id);


--
-- Name: posts_authorId_idx; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE INDEX "posts_authorId_idx" ON public.posts USING btree ("authorId");


--
-- Name: posts_isFeatured_idx; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE INDEX "posts_isFeatured_idx" ON public.posts USING btree ("isFeatured");


--
-- Name: posts_published_idx; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE INDEX posts_published_idx ON public.posts USING btree (published);


--
-- Name: posts_slug_idx; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE INDEX posts_slug_idx ON public.posts USING btree (slug);


--
-- Name: posts_slug_key; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE UNIQUE INDEX posts_slug_key ON public.posts USING btree (slug);


--
-- Name: tags_slug_idx; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE INDEX tags_slug_idx ON public.tags USING btree (slug);


--
-- Name: tags_slug_key; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE UNIQUE INDEX tags_slug_key ON public.tags USING btree (slug);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_username_idx; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE INDEX users_username_idx ON public.users USING btree (username);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: blog_user
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: comments comments_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: comments comments_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.comments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: comments comments_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES public.posts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: post_categories post_categories_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.post_categories
    ADD CONSTRAINT "post_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: post_categories post_categories_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.post_categories
    ADD CONSTRAINT "post_categories_postId_fkey" FOREIGN KEY ("postId") REFERENCES public.posts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: post_embeddings post_embeddings_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.post_embeddings
    ADD CONSTRAINT post_embeddings_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_tags post_tags_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT "post_tags_postId_fkey" FOREIGN KEY ("postId") REFERENCES public.posts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: post_tags post_tags_tagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT "post_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES public.tags(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: posts posts_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: blog_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: blog_user
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict nPj3CaLk2reV5zf9y0TaF4bxABafhwTgyk2ZxDKku5moVXJbKi6sXdcPCQUcPAH

