import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FONNTE_API_KEY = process.env.FONNTE_API_KEY || '';
const API_BASE = 'https://sikependudukan.vercel.app/api';

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return dateStr; }
}

function formatPenduduk(p: any): string {
  let t = `*${p.namaLengkap}*\n`;
  t += `├ NIK: ${p.nik}\n├ No. KK: ${p.noKK}\n├ JK: ${p.jenisKelamin}\n├ Status: ${p.statusKeluarga}\n`;
  t += `├ TTL: ${p.tempatLahir}, ${formatDate(p.tanggalLahir)}\n├ Agama: ${p.agama}\n├ Pendidikan: ${p.pendidikan}\n`;
  t += `├ Pekerjaan: ${p.pekerjaan}\n├ Kawin: ${p.statusPerkawinan}\n├ WNI: ${p.kewarganegaraan}\n`;
  if (p.noHP) t += `├ HP: ${p.noHP}\n`;
  t += `├ KTP: ${p.punyaKTP}`;
  if (p.bantuan && p.bantuan !== '[]') {
    try { const a = JSON.parse(p.bantuan).filter((b: string) => b !== 'TIDAK'); if (a.length) t += `\n├ Bantuan: ${a.join(', ')}`; } catch {}
  }
  t += `\n└ BPJS: ${p.bpjs && p.bpjs !== 'TIDAK' ? p.bpjs : '-'}`;
  return t;
}

async function sendFonnte(target: string, message: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': FONNTE_API_KEY },
      body: JSON.stringify({ target, message, delay: '1', country_code: '62' }),
    });
    const data = await res.json();
    console.log('Fonnte:', JSON.stringify(data));
    return data.status === true;
  } catch (e) { console.error('Fonnte err:', e); return false; }
}

async function searchByNIK(nik: string): Promise<any[] | null> {
  try {
    const res = await fetch(`${API_BASE}/penduduk?search=${encodeURIComponent(nik)}`, { cache: 'no-store' });
    const data = await res.json();
    const exact = data.filter((p: any) => p.nik === nik);
    return exact.length > 0 ? exact : data;
  } catch { return null; }
}

async function searchByKK(noKK: string): Promise<any[] | null> {
  try {
    const res = await fetch(`${API_BASE}/penduduk?noKK=${encodeURIComponent(noKK)}`, { cache: 'no-store' });
    return await res.json();
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Webhook:', JSON.stringify(body));

    const sender = body.sender || body.phone || body.from || '';
    const message = (body.message || body.text || body.body || '').toString().trim();
    const chatId = body.chat_id || body.chatID || body.group_id || '';
    const isGroup = body.is_group === true || body.isGroup === true || chatId.endsWith('@g.us');

    if (!message.startsWith('!')) return NextResponse.json({ status: 'ignored' });
    if (!isGroup) return NextResponse.json({ status: 'ignored', reason: 'not_group' });

    const target = chatId || sender;
    const args = message.split(/\s+/);
    const cmd = args[0].toLowerCase();

    if (cmd === '!nik') {
      if (!args[1]) { await sendFonnte(target, '❌ Format: !nik <16 digit NIK>\nContoh: !nik 3215051234560001'); return NextResponse.json({ status: 'ok' }); }
      const nik = args[1].replace(/\D/g, '');
      if (nik.length !== 16) { await sendFonnte(target, '❌ NIK harus 16 digit angka.'); return NextResponse.json({ status: 'ok' }); }
      await sendFonnte(target, '🔍 Mencari data penduduk...');
      const data = await searchByNIK(nik);
      if (!data) { await sendFonnte(target, '⚠️ Gagal menghubungi server. Coba lagi.'); return NextResponse.json({ status: 'error' }); }
      if (data.length === 0) { await sendFonnte(target, `❌ NIK *${nik}* tidak ditemukan.`); return NextResponse.json({ status: 'ok' }); }
      await sendFonnte(target, `📋 *Data Penduduk*\n\n${formatPenduduk(data[0])}`);
      return NextResponse.json({ status: 'ok' });
    }

    if (cmd === '!kk') {
      if (!args[1]) { await sendFonnte(target, '❌ Format: !kk <16 digit No.KK>\nContoh: !kk 3215051234560002'); return NextResponse.json({ status: 'ok' }); }
      const noKK = args[1].replace(/\D/g, '');
      if (noKK.length !== 16) { await sendFonnte(target, '❌ No.KK harus 16 digit angka.'); return NextResponse.json({ status: 'ok' }); }
      await sendFonnte(target, '🔍 Mencari data KK...');
      const data = await searchByKK(noKK);
      if (!data) { await sendFonnte(target, '⚠️ Gagal menghubungi server. Coba lagi.'); return NextResponse.json({ status: 'error' }); }
      if (data.length === 0) { await sendFonnte(target, `❌ KK *${noKK}* tidak ditemukan.`); return NextResponse.json({ status: 'ok' }); }
      let r = `👨‍👩‍👧‍👦 *Data KK: ${noKK}*\n━━━━━━━━━━━━━━━━━━\n\n`;
      data.forEach((p: any, i: number) => { r += `${i+1}. *${p.namaLengkap}*\n   ${p.nik} | ${p.jenisKelamin === 'LAKI-LAKI' ? 'L' : 'P'} | ${p.statusKeluarga}\n\n`; });
      r += `━━━━━━━━━━━━━━━━━━\nTotal: *${data.length} orang*`;
      await sendFonnte(target, r);
      return NextResponse.json({ status: 'ok' });
    }

    if (cmd === '!bantuan' || cmd === '!help') {
      await sendFonnte(target, `🤖 *Bot Sikependudukan*\n\n📋 !nik <NIK> - Cari penduduk\n👨‍👩‍👧‍👦 !kk <NoKK> - Cari anggota KK\n❓ !bantuan - Bantuan`);
      return NextResponse.json({ status: 'ok' });
    }

    return NextResponse.json({ status: 'ignored' });
  } catch (e) { console.error('Webhook err:', e); return NextResponse.json({ error: 'Internal error' }, { status: 500 }); }
}

export async function GET() {
  return NextResponse.json({ status: 'online', message: 'Bot Sikependudukan WA aktif', version: '1.0.0' });
}
