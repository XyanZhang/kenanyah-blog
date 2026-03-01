/*
  Warnings:

  - You are about to drop the `post_embeddings` table. If the table is not empty, all the data it contains will be lost.

*/
-- 仅 DROP TABLE IF EXISTS：不依赖表是否存在，shadow 库重放时安全；删表会一并移除外键
DROP TABLE IF EXISTS "post_embeddings";
