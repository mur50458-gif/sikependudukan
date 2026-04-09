import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch all bantuan sosial
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jenis = searchParams.get('jenis') || '';
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    const where: any = {};

    if (jenis) where.jenisBantuan = jenis;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { namaLengkap: { contains: search, mode: 'insensitive' } },
        { nik: { contains: search } },
        { noKK: { contains: search } },
        { nomorBantuan: { contains: search } },
      ];
    }

    const data = await prisma.bantuanSosial.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

// POST - Create new bantuan sosial
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.nik || !body.namaLengkap || !body.jenisBantuan || !body.noKK) {
      return NextResponse.json({ error: 'Data wajib belum lengkap (NIK, Nama, No. KK, Jenis Bantuan)' }, { status: 400 });
    }

    const data = await prisma.bantuanSosial.create({
      data: {
        noKK: body.noKK,
        nik: body.nik,
        namaLengkap: body.namaLengkap,
        jenisKelamin: body.jenisKelamin || '-',
        statusKeluarga: body.statusKeluarga || '-',
        jenisBantuan: body.jenisBantuan,
        nomorBantuan: body.nomorBantuan || null,
        periodeMulai: body.periodeMulai || null,
        periodeSelesai: body.periodeSelesai || null,
        status: body.status || 'AKTIF',
        keterangan: body.keterangan || null,
      },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Gagal menyimpan data' }, { status: 500 });
  }
}

// PUT - Update bantuan sosial
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    }

    const data = await prisma.bantuanSosial.update({
      where: { id: body.id },
      data: {
        noKK: body.noKK,
        nik: body.nik,
        namaLengkap: body.namaLengkap,
        jenisKelamin: body.jenisKelamin,
        statusKeluarga: body.statusKeluarga,
        jenisBantuan: body.jenisBantuan,
        nomorBantuan: body.nomorBantuan || null,
        periodeMulai: body.periodeMulai || null,
        periodeSelesai: body.periodeSelesai || null,
        status: body.status,
        keterangan: body.keterangan || null,
      },
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Gagal mengupdate data' }, { status: 500 });
  }
}

// DELETE - Delete bantuan sosial
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    }

    await prisma.bantuanSosial.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: 'Data berhasil dihapus' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 });
  }
}
