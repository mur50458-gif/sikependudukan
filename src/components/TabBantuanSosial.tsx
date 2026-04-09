'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
import { Plus, Pencil, Trash2, Heart, Search, ChevronDown, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { JENIS_BANTUAN_SOSIAL, STATUS_BANTUAN, JENIS_KELAMIN, STATUS_KELUARGA } from '@/lib/constants';

interface BantuanSosialItem {
  id: number;
  noKK: string;
  nik: string;
  namaLengkap: string;
  jenisKelamin: string;
  statusKeluarga: string;
  jenisBantuan: string;
  nomorBantuan: string | null;
  periodeMulai: string | null;
  periodeSelesai: string | null;
  status: string;
  keterangan: string | null;
  createdAt: string;
}

interface PendudukItem {
  id: number;
  noKK: string;
  nik: string;
  namaLengkap: string;
  jenisKelamin: string;
  statusKeluarga: string;
  bantuan: string;
}

interface KKOption {
  noKK: string;
  namaKepala: string;
}

interface FormData {
  noKK: string;
  nik: string;
  namaLengkap: string;
  jenisKelamin: string;
  statusKeluarga: string;
  jenisBantuan: string;
  nomorBantuan: string;
  periodeMulai: string;
  periodeSelesai: string;
  status: string;
  keterangan: string;
}

const defaultForm: FormData = {
  noKK: '',
  nik: '',
  namaLengkap: '',
  jenisKelamin: '',
  statusKeluarga: '',
  jenisBantuan: 'PKH',
  nomorBantuan: '',
  periodeMulai: '',
  periodeSelesai: '',
  status: 'AKTIF',
  keterangan: '',
};

interface TabBantuanSosialProps {
  isAdmin?: boolean;
}

const bantuanColors: Record<string, string> = {
  PKH: 'bg-purple-100 text-purple-700 border-purple-300',
  BPNT: 'bg-blue-100 text-blue-700 border-blue-300',
  BLT: 'bg-green-100 text-green-700 border-green-300',
  BST: 'bg-amber-100 text-amber-700 border-amber-300',
  PIP: 'bg-pink-100 text-pink-700 border-pink-300',
  KUR: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  SUBSIDI: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  LAINNYA: 'bg-gray-100 text-gray-700 border-gray-300',
};

export default function TabBantuanSosial({ isAdmin = true }: TabBantuanSosialProps) {
  const [data, setData] = useState<BantuanSosialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [allPenduduk, setAllPenduduk] = useState<PendudukItem[]>([]);
  const [kkOptions, setKKOptions] = useState<KKOption[]>([]);
  const [kkOpen, setKkOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const kkRef = useRef<HTMLDivElement>(null);
  const memberRef = useRef<HTMLDivElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [formError, setFormError] = useState('');

  const [filterJenis, setFilterJenis] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<BantuanSosialItem | null>(null);

  // Click outside to close dropdowns
  useEffect(() => {
    if (!kkOpen && !memberOpen) return;
    const handler = (e: MouseEvent) => {
      if (kkRef.current && !kkRef.current.contains(e.target as Node)) {
        setKkOpen(false);
      }
      if (memberRef.current && !memberRef.current.contains(e.target as Node)) {
        setMemberOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [kkOpen, memberOpen]);

  const fetchPenduduk = useCallback(async () => {
    try {
      const res = await fetch('/api/penduduk');
      if (res.ok) {
        const result = await res.json();
        setAllPenduduk(result);
        const seen = new Set<string>();
        const options: KKOption[] = [];
        for (const p of result) {
          if (p.statusKeluarga === 'KEPALA KELUARGA' && !seen.has(p.noKK)) {
            seen.add(p.noKK);
            options.push({ noKK: p.noKK, namaKepala: p.namaLengkap });
          }
        }
        setKKOptions(options);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterJenis) params.set('jenis', filterJenis);
      if (filterStatus) params.set('status', filterStatus);
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/bantuan-sosial?${params.toString()}`);
      if (res.ok) setData(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filterJenis, filterStatus, searchQuery]);

  useEffect(() => { fetchPenduduk(); }, [fetchPenduduk]);
  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  const kkMembers = allPenduduk.filter(p => p.noKK === formData.noKK);

  const handleSelectMember = (nik: string) => {
    const member = allPenduduk.find(p => p.nik === nik);
    if (member) {
      setFormData(prev => ({
        ...prev,
        nik: member.nik,
        namaLengkap: member.namaLengkap,
        jenisKelamin: member.jenisKelamin,
        statusKeluarga: member.statusKeluarga,
      }));
      setMemberOpen(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setFormError('');
    setFormData({ ...defaultForm });
    setShowForm(true);
  };

  const openEdit = (item: BantuanSosialItem) => {
    setEditingId(item.id);
    setFormError('');
    setFormData({
      noKK: item.noKK,
      nik: item.nik,
      namaLengkap: item.namaLengkap,
      jenisKelamin: item.jenisKelamin,
      statusKeluarga: item.statusKeluarga,
      jenisBantuan: item.jenisBantuan,
      nomorBantuan: item.nomorBantuan || '',
      periodeMulai: item.periodeMulai || '',
      periodeSelesai: item.periodeSelesai || '',
      status: item.status,
      keterangan: item.keterangan || '',
    });
    setShowForm(true);
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setFormError('');

    if (!formData.noKK || !formData.nik || !formData.namaLengkap || !formData.jenisBantuan) {
      setFormError('Data wajib belum lengkap (No. KK, NIK, Nama, Jenis Bantuan)');
      return;
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...formData } : formData;

      const res = await fetch('/api/bantuan-sosial', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingId ? 'Data bantuan sosial diupdate' : 'Data bantuan sosial ditambahkan');
        setShowForm(false);
        fetchData();
      } else {
        const err = await res.json();
        setFormError(err.error || 'Gagal menyimpan');
      }
    } catch {
      setFormError('Terjadi kesalahan');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/bantuan-sosial?id=${deleteTarget.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Data bantuan sosial dihapus');
      setDeleteTarget(null);
      fetchData();
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/bantuan-sosial');
      if (!res.ok) return;
      const allData = await res.json();

      if (allData.length === 0) {
        toast.error('Tidak ada data untuk diekspor');
        return;
      }

      const headers = ['No', 'No. KK', 'NIK', 'Nama Lengkap', 'Jenis Kelamin', 'Status Keluarga', 'Jenis Bantuan', 'Nomor Bantuan', 'Periode Mulai', 'Periode Selesai', 'Status', 'Keterangan'];
      const rows = allData.map((item: BantuanSosialItem, idx: number) => [
        idx + 1,
        item.noKK,
        item.nik,
        item.namaLengkap,
        item.jenisKelamin,
        item.statusKeluarga,
        item.jenisBantuan,
        item.nomorBantuan || '-',
        item.periodeMulai || '-',
        item.periodeSelesai || '-',
        item.status,
        item.keterangan || '-',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row: any[]) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bantuan_sosial_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Data berhasil diekspor ke CSV');
    } catch {
      toast.error('Gagal mengekspor data');
    }
  };

  // Filtered data
  const filteredData = data;

  // Stats
  const totalAktif = data.filter(d => d.status === 'AKTIF').length;
  const totalTidakAktif = data.filter(d => d.status === 'TIDAK AKTIF').length;

  // Count by jenis
  const countByJenis: Record<string, number> = {};
  JENIS_BANTUAN_SOSIAL.forEach(j => { countByJenis[j] = 0; });
  data.forEach(d => {
    if (countByJenis[d.jenisBantuan] !== undefined) countByJenis[d.jenisBantuan]++;
  });

  const getFilteredKK = () => {
    return kkOptions.filter(kk =>
      kk.noKK.includes(formData.noKK) || kk.namaKepala.toLowerCase().includes(formData.noKK.toLowerCase())
    );
  };

  const getFilteredMembers = () => {
    return kkMembers.filter(m =>
      m.nik.includes(formData.nik) || m.namaLengkap.toLowerCase().includes(formData.nik.toLowerCase())
    );
  };

  const renderKKDropdown = () => (
    <div ref={kkRef} className="relative">
      <div className="relative">
        <Input
          className="text-sm pr-9"
          placeholder="Ketik atau pilih No. KK"
          value={formData.noKK}
          onChange={e => {
            updateField('noKK', e.target.value.replace(/[^0-9]/g, '').slice(0, 16));
            setKkOpen(true);
          }}
          onFocus={() => setKkOpen(true)}
        />
        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>
      {kkOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl">
          <div className="max-h-48 overflow-y-auto p-1" style={{ scrollbarWidth: 'thin' }}>
            {getFilteredKK().length === 0 ? (
              <div className="px-3 py-2.5 text-sm text-gray-400 text-center">Tidak ditemukan</div>
            ) : (
              getFilteredKK().map(kk => (
                <button
                  key={kk.noKK}
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-200"
                  onClick={() => {
                    updateField('noKK', kk.noKK);
                    setKkOpen(false);
                  }}
                >
                  <span className="font-mono text-xs font-medium">{kk.noKK}</span>
                  <span className="ml-2 text-xs text-gray-500">{kk.namaKepala}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderMemberDropdown = () => (
    <div ref={memberRef} className="relative">
      <div className="relative">
        <Input
          className="text-sm pr-9"
          placeholder="Ketik NIK atau nama..."
          value={formData.nik}
          onChange={e => {
            updateField('nik', e.target.value);
            setMemberOpen(true);
          }}
          onFocus={() => setMemberOpen(true)}
        />
        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>
      {memberOpen && kkMembers.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl">
          <div className="max-h-48 overflow-y-auto p-1" style={{ scrollbarWidth: 'thin' }}>
            {getFilteredMembers().length === 0 ? (
              <div className="px-3 py-2.5 text-sm text-gray-400 text-center">Tidak ditemukan</div>
            ) : (
              getFilteredMembers().map(m => (
                <button
                  key={m.nik}
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-200"
                  onClick={() => handleSelectMember(m.nik)}
                >
                  <span className="text-xs font-medium">{m.namaLengkap}</span>
                  <span className="ml-2 text-[10px] text-gray-500 font-mono">{m.nik}</span>
                  <span className="ml-2 text-[10px] text-gray-400">({m.statusKeluarga})</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

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
          <Heart className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-emerald-800">Bantuan Sosial</h2>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button size="sm" variant="outline" onClick={handleExport} className="text-emerald-700 border-emerald-300">
                <Download className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
              <Button size="sm" onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-1" /> Tambah
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700">{data.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Data</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{totalAktif}</p>
            <p className="text-[10px] text-muted-foreground">Aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{totalTidakAktif}</p>
            <p className="text-[10px] text-muted-foreground">Tidak Aktif</p>
          </CardContent>
        </Card>
      </div>

      {/* Per Bantuan Type Summary */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {JENIS_BANTUAN_SOSIAL.map(j => (
          countByJenis[j] > 0 ? (
            <Badge key={j} variant="outline" className={`text-[10px] px-2 py-0.5 border ${bantuanColors[j]}`}>
              {j}: {countByJenis[j]}
            </Badge>
          ) : null
        ))}
      </div>

      {/* Filter & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Select value={filterJenis} onValueChange={v => setFilterJenis(v === '_' ? '' : v)}>
          <SelectTrigger className="text-sm h-9">
            <SelectValue placeholder="Semua Jenis Bantuan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">Semua Jenis Bantuan</SelectItem>
            {JENIS_BANTUAN_SOSIAL.map(j => (
              <SelectItem key={j} value={j}>{j}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v === '_' ? '' : v)}>
          <SelectTrigger className="text-sm h-9">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">Semua Status</SelectItem>
            {STATUS_BANTUAN.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Input
            className="text-sm h-9 pr-9"
            placeholder="Cari nama, NIK, No. KK..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Count */}
      <div className="flex gap-3 justify-center text-sm">
        <Badge variant="outline" className="text-xs px-3 py-1">Ditampilkan: {filteredData.length}</Badge>
      </div>

      {/* Data List */}
      <ScrollArea className="max-h-[calc(100vh-420px)]">
        <div className="space-y-2">
          {filteredData.map(item => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{item.namaLengkap}</p>
                      <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${bantuanColors[item.jenisBantuan] || 'bg-gray-100 text-gray-700'}`}>
                        {item.jenisBantuan}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] px-2 py-0 ${item.status === 'AKTIF' ? 'text-green-600 border-green-300 bg-green-50' : 'text-red-500 border-red-300 bg-red-50'}`}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      NIK: {item.nik} · KK: {item.noKK}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.jenisKelamin === 'LAKI-LAKI' ? 'L' : 'P'} · {item.statusKeluarga}
                      {item.nomorBantuan && ` · No: ${item.nomorBantuan}`}
                    </p>
                    {item.periodeMulai && (
                      <p className="text-[10px] text-muted-foreground">
                        Periode: {item.periodeMulai}{item.periodeSelesai ? ` s/d ${item.periodeSelesai}` : ' sekarang'}
                      </p>
                    )}
                    {item.keterangan && (
                      <p className="text-[10px] text-gray-500 mt-0.5 italic">Ket: {item.keterangan}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    {isAdmin && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteTarget(item)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Heart className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>Tidak ada data bantuan sosial</p>
              {isAdmin && (
                <p className="text-xs mt-1">Klik &quot;Tambah&quot; untuk menambahkan data baru</p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Data Bantuan Sosial' : 'Tambah Data Bantuan Sosial'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded">{formError}</div>
            )}

            {/* No. KK */}
            <div className="space-y-1">
              <Label className="text-xs">No. KK *</Label>
              {renderKKDropdown()}
            </div>

            {/* Pilih Penduduk / Input Manual */}
            {formData.noKK && kkMembers.length > 0 ? (
              <div className="space-y-1">
                <Label className="text-xs">Pilih Penduduk dari KK</Label>
                {renderMemberDropdown()}
                <p className="text-[10px] text-muted-foreground">
                  Pilih dari daftar atau isi manual di bawah
                </p>
              </div>
            ) : null}

            {/* NIK */}
            <div className="space-y-1">
              <Label className="text-xs">NIK *</Label>
              <Input
                className="text-sm"
                value={formData.nik}
                onChange={e => updateField('nik', e.target.value)}
                placeholder="16 digit NIK"
                maxLength={16}
              />
            </div>

            {/* Nama */}
            <div className="space-y-1">
              <Label className="text-xs">Nama Lengkap *</Label>
              <Input
                className="text-sm uppercase"
                value={formData.namaLengkap}
                onChange={e => updateField('namaLengkap', e.target.value.toUpperCase())}
                placeholder="Nama lengkap"
              />
            </div>

            {/* Jenis Kelamin & Status Keluarga */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Jenis Kelamin</Label>
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

            {/* Jenis Bantuan */}
            <div className="space-y-1">
              <Label className="text-xs">Jenis Bantuan *</Label>
              <Select value={formData.jenisBantuan} onValueChange={v => updateField('jenisBantuan', v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JENIS_BANTUAN_SOSIAL.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Nomor Bantuan */}
            <div className="space-y-1">
              <Label className="text-xs">Nomor Bantuan / Kode</Label>
              <Input
                className="text-sm"
                value={formData.nomorBantuan}
                onChange={e => updateField('nomorBantuan', e.target.value)}
                placeholder="Opsional"
              />
            </div>

            {/* Periode */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Periode Mulai</Label>
                <Input
                  type="month"
                  className="text-sm"
                  value={formData.periodeMulai}
                  onChange={e => updateField('periodeMulai', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Periode Selesai</Label>
                <Input
                  type="month"
                  className="text-sm"
                  value={formData.periodeSelesai}
                  onChange={e => updateField('periodeSelesai', e.target.value)}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={formData.status} onValueChange={v => updateField('status', v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_BANTUAN.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Keterangan */}
            <div className="space-y-1">
              <Label className="text-xs">Keterangan</Label>
              <Input
                className="text-sm"
                value={formData.keterangan}
                onChange={e => updateField('keterangan', e.target.value)}
                placeholder="Opsional"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {editingId ? 'Simpan' : 'Tambah'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Bantuan Sosial?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus data bantuan <strong>{deleteTarget?.jenisBantuan}</strong> atas nama <strong>{deleteTarget?.namaLengkap}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
