/*
 * 本文件属于 红月创作 (Hongyue Creation) 项目。
 * Copyright (C) 2026 chen647208
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 本程序为自由软件：您可依据 GNU Affero 公共许可证第 3 版（AGPL-3.0-only）修改与分发；
 * 商业闭源使用需另行获取授权，详见 docs/guides/licensing.md。
 */

/**
 * 从 src/assets/app-icon.svg 生成各平台图标：icon.png / icon.ico / icon.icns / tray.png。
 * 用法：npm run icons:generate
 * ICO/ICNS 直接内嵌 PNG 数据（Windows Vista+ / macOS 现代系统均支持）。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'src/assets');
const svg = readFileSync(join(assets, 'app-icon.svg'));

async function png(size) {
  return sharp(svg, { density: 512 }).resize(size, size).png().toBuffer();
}

function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + 16 * entries.length;
  const blobs = [];
  entries.forEach((entry, index) => {
    const at = index * 16;
    const dim = entry.size >= 256 ? 0 : entry.size;
    dir.writeUInt8(dim, at);
    dir.writeUInt8(dim, at + 1);
    dir.writeUInt8(0, at + 2);
    dir.writeUInt8(0, at + 3);
    dir.writeUInt16LE(1, at + 4);
    dir.writeUInt16LE(32, at + 6);
    dir.writeUInt32LE(entry.png.length, at + 8);
    dir.writeUInt32LE(offset, at + 12);
    offset += entry.png.length;
    blobs.push(entry.png);
  });
  return Buffer.concat([header, dir, ...blobs]);
}

function buildIcns(entries) {
  const parts = entries.map((entry) => {
    const head = Buffer.alloc(8);
    head.write(entry.type, 0, 'ascii');
    head.writeUInt32BE(entry.png.length + 8, 4);
    return Buffer.concat([head, entry.png]);
  });
  const total = 8 + parts.reduce((sum, part) => sum + part.length, 0);
  const header = Buffer.alloc(8);
  header.write('icns', 0, 'ascii');
  header.writeUInt32BE(total, 4);
  return Buffer.concat([header, ...parts]);
}

const ICNS_TYPES = { 16: 'icp4', 32: 'icp5', 64: 'icp6', 128: 'ic07', 256: 'ic08', 512: 'ic09', 1024: 'ic10' };
const ICO_SIZES = [16, 32, 48, 64, 128, 256];

const png1024 = await png(1024);
writeFileSync(join(assets, 'icon.png'), png1024);

writeFileSync(join(assets, 'icon.ico'), buildIco(await Promise.all(ICO_SIZES.map(async (size) => ({ size, png: await png(size) })))));

writeFileSync(
  join(assets, 'icon.icns'),
  buildIcns(await Promise.all(Object.entries(ICNS_TYPES).map(async ([size, type]) => ({ type, png: await png(Number(size)) })))),
);

writeFileSync(join(assets, 'tray.png'), await png(32));

// 应用内品牌标识（窗口/关于页用 SVG）
writeFileSync(join(assets, 'logo.png'), await sharp(readFileSync(join(assets, 'logo.svg')), { density: 512 }).resize(256, 256).png().toBuffer());

console.log('图标已生成：icon.png / icon.ico / icon.icns / tray.png / logo.png');
