'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, FileUp, Pencil, Trash2, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  AGAMA, PENDIDIKAN, PEKERJAAN, STATUS_PERKAWINAN, BANTUAN_OPTIONS,
  BPJS_OPTIONS,
  STATUS_KTP, STATUS_KELUARGA, JENIS_KELAMIN,
} from '@/lib/constants';
import { hitungUmur, formatTanggal, validateNIK, validateNoKK } from '@/lib/utils-kependudukan';

interface Penduduk {
  id: number;
  noKK: string;
  nik: string;
  namaLengkap: string;
  jenisKelamin: string;
  statusKeluarga: string;
  tempatLahir: string;
  tanggalLahir: string;
  agama: string;
  pendidikan: string;
  pekerjaan: string;
  statusPerkawinan: string;
  kewarganegaraan: string;
  namaAyah: string;
  namaIbu: string;
  namaPanggilan: string | null;
  noHP: string | null;
  punyaKTP: string;
  bantuan: string;
  bpjs: string | null;
  keterangan: string | null;
}

interface KKGroup {
  noKK: string;
  kepala: Penduduk;
  anggota: Penduduk[];
}

const defaultFormData = {
  noKK: '',
  nik: '',
  namaLengkap: '',
  jenisKelamin: '',
  statusKeluarga: '',
  tempatLahir: '',
  tanggalLahir: '',
  agama: '',
  pendidikan: '',
  pekerjaan: '',
  statusPerkawinan: '',
  kewarganegaraan: 'WNI',
  namaAyah: '',
  namaIbu: '',
  namaPanggilan: '',
  noHP: '',
  punyaKTP: 'BELUM',
  bantuan: [] as string[],
  bpjs: '',
  keterangan: '',
};

interface TabPendudukProps {
  isAdmin?: boolean;
}

export default function TabPenduduk({ isAdmin = true }: TabPendudukProps) {
  const [penduduk, setPenduduk] = useState<Penduduk[]>([]);
  const [kkGroups, setKKGroups] = useState<KKGroup[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedKK, setExpandedKK] = useState<Set<string>>(new Set());

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [formError, setFormError] = useState('');

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Penduduk | null>(null);

  // Import
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetchPenduduk = useCallback(async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/penduduk${params}`);
      if (res.ok) {
        const data = await res.json();
        setPenduduk(data);
        groupByKK(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const groupByKK = (data: Penduduk[]) => {
    const map = new Map<string, KKGroup>();
    for (const p of data) {
      let group = map.get(p.noKK);
      if (!group) {
        group = { noKK: p.noKK, kepala: null as unknown as Penduduk, anggota: [] };
        map.set(p.noKK, group);
      }
      if (p.statusKeluarga === 'KEPALA KELUARGA') {
        group.kepala = p;
      } else {
        group.anggota.push(p);
      }
    }
    setKKGroups(Array.from(map.values()));
  };

  useEffect(() => {
    fetchPenduduk();
  }, [fetchPenduduk]);

  const openAddForm = (noKK?: string) => {
    setEditingId(null);
    setFormError('');
    setFormData({
      ...defaultFormData,
      noKK: noKK || '',
      bantuan: [],
    });
    setShowForm(true);
  };

  const openEditForm = (p: Penduduk) => {
    setEditingId(p.id);
    setFormError('');
    setFormData({
      noKK: p.noKK,
      nik: p.nik,
      namaLengkap: p.namaLengkap,
      jenisKelamin: p.jenisKelamin,
      statusKeluarga: p.statusKeluarga,
      tempatLahir: p.tempatLahir,
      tanggalLahir: p.tanggalLahir.split('T')[0],
      agama: p.agama,
      pendidikan: p.pendidikan,
      pekerjaan: p.pekerjaan,
      statusPerkawinan: p.statusPerkawinan,
      kewarganegaraan: p.kewarganegaraan,
      namaAyah: p.namaAyah,
      namaIbu: p.namaIbu,
      namaPanggilan: p.namaPanggilan || '',
      noHP: p.noHP || '',
      punyaKTP: p.punyaKTP,
      bantuan: JSON.parse(p.bantuan || '[]'),
      bpjs: p.bpjs || '',
      keterangan: p.keterangan || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setFormError('');

    if (!validateNoKK(formData.noKK)) {
      setFormError('No. KK harus 16 digit angka');
      return;
    }
    if (!validateNIK(formData.nik)) {
      setFormError('NIK harus 16 digit angka');
      return;
    }
    if (!formData.namaLengkap || !formData.tanggalLahir || !formData.jenisKelamin) {
      setFormError('Data wajib belum lengkap');
      return;
    }

    try {
      const url = editingId ? '/api/penduduk' : '/api/penduduk';
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingId ? 'Data berhasil diupdate' : 'Data berhasil ditambahkan');
        setShowForm(false);
        fetchPenduduk();
      } else {
        const err = await res.json();
        setFormError(err.error || 'Gagal menyimpan data');
      }
    } catch {
      setFormError('Terjadi kesalahan');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/penduduk?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Data berhasil dihapus');
        setDeleteTarget(null);
        fetchPenduduk();
      }
    } catch {
      toast.error('Gagal menghapus data');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/penduduk/import', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.message}${data.errors?.length ? ` (${data.errors.length} error)` : ''}`);
        if (data.errors) {
          console.warn('Import errors:', data.errors);
        }
        fetchPenduduk();
        setShowImport(false);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Gagal mengimpor');
      }
    } catch {
      toast.error('Gagal mengimpor file');
    } finally {
      setImporting(false);
    }
  };

  const toggleExpand = (noKK: string) => {
    const next = new Set(expandedKK);
    if (next.has(noKK)) next.delete(noKK);
    else next.add(noKK);
    setExpandedKK(next);
  };

  const updateField = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleBantuan = (item: string) => {
    setFormData(prev => ({
      ...prev,
      bantuan: prev.bantuan.includes(item)
        ? prev.bantuan.filter(b => b !== item)
        : [...prev.bantuan, item],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-emerald-800">Data Penduduk</h2>
          <Badge variant="secondary" className="text-xs">{penduduk.length} orang</Badge>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <FileUp className="h-4 w-4 mr-1" /> Impor
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" onClick={() => openAddForm()} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-1" /> Tambah KK
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama, NIK, No. KK..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* KK List */}
      <ScrollArea className="max-h-[calc(100vh-260px)]">
        <div className="space-y-2">
          {kkGroups.map(group => {
            const isExpanded = expandedKK.has(group.noKK);
            const totalL = (group.kepala?.jenisKelamin === 'LAKI-LAKI' ? 1 : 0) + group.anggota.filter(a => a.jenisKelamin === 'LAKI-LAKI').length;
            const totalP = (group.kepala?.jenisKelamin === 'PEREMPUAN' ? 1 : 0) + group.anggota.filter(a => a.jenisKelamin === 'PEREMPUAN').length;

            return (
              <Card key={group.noKK} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* KK Header */}
                  <button
                    onClick={() => toggleExpand(group.noKK)}
                    className="w-full flex items-center gap-2 p-3 hover:bg-emerald-50 transition-colors text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-emerald-600 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{group.kepala?.namaLengkap || '-'}</p>
                      <p className="text-[11px] text-muted-foreground">KK: {group.noKK}</p>
                    </div>
                    <div className="flex gap-1 items-center shrink-0">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">L:{totalL}</Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">P:{totalP}</Badge>
                    </div>
                  </button>

                  {/* Expanded Members */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50">
                      {/* Kepala Keluarga */}
                      {group.kepala && (
                        <PendudukRow
                          penduduk={group.kepala}
                          isKK
                          isAdmin={isAdmin}
                          onEdit={openEditForm}
                          onDelete={setDeleteTarget}
                          onAddMember={() => openAddForm(group.noKK)}
                        />
                      )}
                      {/* Anggota */}
                      {group.anggota.map(a => (
                        <PendudukRow
                          key={a.id}
                          penduduk={a}
                          isKK={false}
                          isAdmin={isAdmin}
                          onEdit={openEditForm}
                          onDelete={setDeleteTarget}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {kkGroups.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Tidak ada data penduduk</p>
              {isAdmin && <p className="text-xs mt-1">Klik &quot;Tambah KK&quot; untuk menambahkan data baru</p>}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Data Penduduk' : 'Tambah Data Penduduk'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded">{formError}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">No. KK *</Label>
                <Input
                  className="text-sm"
                  value={formData.noKK}
                  onChange={e => updateField('noKK', e.target.value)}
                  placeholder="16 digit"
                  maxLength={16}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">NIK *</Label>
                <Input
                  className="text-sm"
                  value={formData.nik}
                  onChange={e => updateField('nik', e.target.value)}
                  placeholder="16 digit"
                  maxLength={16}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nama Lengkap *</Label>
              <Input
                className="text-sm uppercase"
                value={formData.namaLengkap}
                onChange={e => updateField('namaLengkap', e.target.value.toUpperCase())}
                placeholder="NAMA LENGKAP"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Jenis Kelamin *</Label>
                <Select value={formData.jenisKelamin} onValueChange={v => updateField('jenisKelamin', v)}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    {JENIS_KELAMIN.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status Keluarga</Label>
                <Select value={formData.statusKeluarga} onValueChange={v => updateField('statusKeluarga', v)}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_KELUARGA.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tempat Lahir</Label>
                <Input
                  className="text-sm uppercase"
                  value={formData.tempatLahir}
                  onChange={e => updateField('tempatLahir', e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tanggal Lahir *</Label>
                <Input
                  type="date"
                  className="text-sm"
                  value={formData.tanggalLahir}
                  onChange={e => updateField('tanggalLahir', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Agama</Label>
                <Select value={formData.agama} onValueChange={v => updateField('agama', v)}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    {AGAMA.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pendidikan</Label>
                <Select value={formData.pendidikan} onValueChange={v => updateField('pendidikan', v)}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    {PENDIDIKAN.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Pekerjaan</Label>
                <Select value={formData.pekerjaan} onValueChange={v => updateField('pekerjaan', v)}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    {PEKERJAAN.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status Perkawinan</Label>
                <Select value={formData.statusPerkawinan} onValueChange={v => updateField('statusPerkawinan', v)}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_PERKAWINAN.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nama Ayah</Label>
                <Input
                  className="text-sm uppercase"
                  value={formData.namaAyah}
                  onChange={e => updateField('namaAyah', e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nama Ibu</Label>
                <Input
                  className="text-sm uppercase"
                  value={formData.namaIbu}
                  onChange={e => updateField('namaIbu', e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nama Panggilan</Label>
                <Input
                  className="text-sm uppercase"
                  value={formData.namaPanggilan}
                  onChange={e => updateField('namaPanggilan', e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">No. HP</Label>
                <Input
                  className="text-sm"
                  value={formData.noHP}
                  onChange={e => updateField('noHP', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Status KTP</Label>
                <Select value={formData.punyaKTP} onValueChange={v => updateField('punyaKTP', v)}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_KTP.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kewarganegaraan</Label>
                <Input
                  className="text-sm uppercase"
                  value={formData.kewarganegaraan}
                  onChange={e => updateField('kewarganegaraan', e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Bantuan</Label>
              <div className="flex flex-wrap gap-2">
                {BANTUAN_OPTIONS.map(b => (
                  <label key={b} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={formData.bantuan.includes(b)}
                      onCheckedChange={() => toggleBantuan(b)}
                    />
                    <span className="text-xs">{b}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">BPJS</Label>
                <Select value={formData.bpjs} onValueChange={v => updateField('bpjs', v)}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    {BPJS_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Keterangan</Label>
                <Input
                  className="text-sm"
                  value={formData.keterangan}
                  onChange={e => updateField('keterangan', e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {editingId ? 'Simpan Perubahan' : 'Tambah Data'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Impor Data dari Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload file Excel (.xlsx) sesuai format import. Data keluarga akan dikelompokkan berdasarkan No. KK.
            </p>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              disabled={importing}
            />
            {importing && (
              <div className="flex items-center gap-2 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600" />
                <span>Mengimpor data...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data <strong>{deleteTarget?.namaLengkap}</strong> ({deleteTarget?.nik})?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PendudukRow({
  penduduk,
  isKK,
  isAdmin = true,
  onEdit,
  onDelete,
  onAddMember,
}: {
  penduduk: Penduduk;
  isKK: boolean;
  isAdmin?: boolean;
  onEdit: (p: Penduduk) => void;
  onDelete: (p: Penduduk) => void;
  onAddMember?: () => void;
}) {
  const umur = hitungUmur(penduduk.tanggalLahir);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium truncate">{penduduk.namaLengkap}</span>
          {isKK && <Badge className="text-[9px] px-1 py-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">KK</Badge>}
          {!isKK && (
            <Badge variant="outline" className="text-[9px] px-1 py-0">{penduduk.statusKeluarga}</Badge>
          )}
          {penduduk.bpjs && penduduk.bpjs !== 'TIDAK' && (
            <Badge className="text-[9px] px-1.5 py-0 bg-blue-100 text-blue-700 hover:bg-blue-100">BPJS {penduduk.bpjs}</Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          NIK: {penduduk.nik} · {penduduk.jenisKelamin === 'LAKI-LAKI' ? 'L' : 'P'} · Umur: {umur.label}
        </p>
        {isKK && penduduk.bantuan && penduduk.bantuan !== '[]' && (() => {
          const arr = JSON.parse(penduduk.bantuan);
          const active = arr.filter((b: string) => b !== 'TIDAK');
          if (active.length > 0) return (
            <div className="flex flex-wrap gap-1 mt-1">
              {active.map((b: string) => (
                <Badge key={b} variant="outline" className="text-[9px] px-1.5 py-0 border-orange-300 text-orange-600">{b}</Badge>
              ))}
            </div>
          );
          return null;
        })()}
      </div>
      <div className="flex gap-1 shrink-0">
        {isAdmin && isKK && onAddMember && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onAddMember}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
        {isAdmin && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(penduduk)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {isAdmin && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => onDelete(penduduk)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
