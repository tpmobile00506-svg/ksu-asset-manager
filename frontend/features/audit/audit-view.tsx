'use client';

import { useState, useMemo } from 'react';
import {
  History,
  Search,
  Download,
  Filter,
  Upload,
  Pencil,
  ArrowLeftRight,
  Wrench,
  ShieldCheck,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileSpreadsheet,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  X,
  Clock,
  Eye,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, Empty, Pager } from '@/frontend/components/common';
import { Asset, money, conditions } from '@/shared/domain';
import type { WorkspaceData, AuditRecord } from '@/shared/models';
import { toast } from 'sonner';

type TabKey = 'all' | 'import' | 'edit' | 'transfer' | 'repair' | 'stocktake' | 'user';
type TimeRange = 'all' | 'today' | '7days' | '30days';

// แมปชื่อฟิลด์ภาษาอังกฤษ -> ภาษาไทย
const fieldLabels: Record<string, string> = {
  location: 'สถานที่ตั้ง',
  branch: 'สาขาวิชา',
  condition: 'สภาพการใช้งาน',
  custodian: 'ผู้รับผิดชอบ / ผู้ดูแล',
  unitSatang: 'ราคาต่อหน่วย',
  totalSatang: 'มูลค่ารวม',
  quantity: 'จำนวนหน่วย',
  category: 'หมวดหมู่',
  name: 'ชื่อรายการครุภัณฑ์',
  code: 'รหัสครุภัณฑ์',
  serial: 'หมายเลขเครื่อง / Serial No.',
  notes: 'หมายเหตุ',
  receivedDate: 'วันที่ตรวจรับ/ได้มา',
  lifeYears: 'อายุการใช้งานตามเกณฑ์',
  groupName: 'หมวด/โครงการ',
  status: 'สถานะคำขอ',
  role: 'สิทธิ์การใช้งาน (Role)',
  active: 'สถานะบัญชี'
};

function formatThaiDateTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = (d.getFullYear() + 543) % 100;
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${mins}`;
  } catch {
    return isoStr;
  }
}

function formatRelativeTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'เมื่อสักครู่';
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'เมื่อวานนี้';
    if (days < 30) return `${days} วันที่แล้ว`;
    return `${Math.floor(days / 30)} เดือนที่แล้ว`;
  } catch {
    return '';
  }
}

function getActionMeta(action: string) {
  const a = (action || '').toLowerCase();
  if (a.includes('import') || a.includes('นำเข้า') || a.includes('excel')) {
    return {
      label: 'นำเข้าข้อมูล',
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      badgeBg: 'bg-blue-100/80 text-blue-800 border-blue-200',
      icon: Upload,
      kind: 'import' as TabKey
    };
  }
  if (a.includes('transfer') || a.includes('โอนย้าย')) {
    return {
      label: 'โอนย้ายสถานที่',
      color: 'text-purple-700',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      badgeBg: 'bg-purple-100/80 text-purple-800 border-purple-200',
      icon: ArrowLeftRight,
      kind: 'transfer' as TabKey
    };
  }
  if (a.includes('repair') || a.includes('ซ่อม')) {
    return {
      label: 'แจ้งส่งซ่อม',
      color: 'text-orange-700',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      badgeBg: 'bg-orange-100/80 text-orange-800 border-orange-200',
      icon: Wrench,
      kind: 'repair' as TabKey
    };
  }
  if (a.includes('check') || a.includes('ตรวจนับ') || a.includes('round')) {
    return {
      label: 'ตรวจนับครุภัณฑ์',
      color: 'text-sky-700',
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      badgeBg: 'bg-sky-100/80 text-sky-800 border-sky-200',
      icon: QrCode,
      kind: 'stocktake' as TabKey
    };
  }
  if (a.includes('user') || a.includes('ผู้ใช้') || a.includes('สิทธิ์')) {
    return {
      label: 'จัดการผู้ใช้งาน',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      badgeBg: 'bg-emerald-100/80 text-emerald-800 border-emerald-200',
      icon: ShieldCheck,
      kind: 'user' as TabKey
    };
  }
  if (a.includes('dispose') || a.includes('จำหน่าย')) {
    return {
      label: 'ขอจำหน่าย',
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      badgeBg: 'bg-rose-100/80 text-rose-800 border-rose-200',
      icon: Trash2,
      kind: 'other' as TabKey
    };
  }
  // Default to edit
  return {
    label: action || 'แก้ไขข้อมูล',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-100/80 text-amber-800 border-amber-200',
    icon: Pencil,
    kind: 'edit' as TabKey
  };
}

const technicalKeys = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'version',
  'sourceId',
  'sourceRow',
  'passwordHash',
  'token',
  'parentId',
  'salvageSatang',
  'lifecycle',
  // Request / workflow fields (not asset data)
  'assetId',
  'assetVersion',
  'kind',
  'payload',
  'stage',
  'chain',
  'actor',
  'imageVersion',
  'imageUrl'
]);

function formatValue(key: string, val: unknown): string {
  if (val === null || val === undefined || val === '') return '—';
  if (key === 'unitSatang' || key === 'totalSatang') {
    return `฿${money(Number(val))}`;
  }
  if (key === 'condition' && typeof val === 'string') {
    return conditions[val as keyof typeof conditions] || val;
  }
  if (key === 'active') {
    return val ? 'เปิดใช้งาน' : 'ระงับการใช้งาน';
  }
  if (key === 'quantity') {
    return `${Number(val).toLocaleString()} หน่วย`;
  }
  if (key === 'lifeYears') {
    return `${val} ปี`;
  }
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

function parseJsonSafe(str: string | null | undefined): Record<string, unknown> {
  if (!str || str === 'null' || str === 'undefined') return {};
  try {
    const parsed = typeof str === 'string' ? JSON.parse(str) : str;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fallback safe empty object
  }
  return {};
}

function VisualDiffViewer({
  beforeStr,
  afterStr,
  action
}: {
  beforeStr: string;
  afterStr: string;
  action?: string;
}) {
  const beforeObj = parseJsonSafe(beforeStr);
  const afterObj = parseJsonSafe(afterStr);

  if (Object.keys(beforeObj).length === 0 && Object.keys(afterObj).length === 0) {
    return (
      <div className="text-[11.5px] text-slate-400 italic">
        ไม่มีรายละเอียดการเปลี่ยนแปลงที่บันทึกไว้
      </div>
    );
  }

  // 1. กรณีเป็น Batch Import / Upload Excel (นำเข้าข้อมูล)
  const count = afterObj.rows ?? afterObj.rowCount ?? afterObj.imported ?? afterObj.count;
  if (count !== undefined && count !== null) {
    const filename = typeof afterObj.filename === 'string' ? ` (ไฟล์: ${afterObj.filename})` : '';
    const totalMoney = afterObj.totalSatang ? ` · มูลค่ารวม ฿${money(Number(afterObj.totalSatang))} บาท` : '';
    return (
      <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-lg p-2.5 text-xs flex flex-wrap items-center gap-2">
        <span className="font-bold text-emerald-800 flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-emerald-600" />
          บันทึกข้อมูลเข้าสู่ระบบสำเร็จ {Number(count).toLocaleString()} รายการ{filename}{totalMoney}
        </span>
      </div>
    );
  }

  // 2. กรณีเพิ่มครุภัณฑ์ใหม่ (Create New Asset)
  const isCreate = Object.keys(beforeObj).length === 0 || (action && action.includes('เพิ่ม'));
  if (isCreate) {
    const fieldsToDisplay: Array<{ label: string; val: string }> = [];
    const priorityKeys = [
      'location',
      'branch',
      'category',
      'quantity',
      'unitSatang',
      'totalSatang',
      'condition',
      'serial',
      'brand',
      'custodian',
      'groupName',
      'receivedDate',
      'notes'
    ];

    for (const k of priorityKeys) {
      const v = afterObj[k];
      if (v === null || v === undefined || v === '') continue;
      if (k === 'lifeYears' && Number(v) === 0) continue;
      if (k === 'notes' && !String(v).trim()) continue;
      if (k === 'groupName' && String(v).trim() === 'ทั่วไป') continue;
      if (k === 'totalSatang' && (Number(afterObj.quantity) <= 1 || Number(v) === Number(afterObj.unitSatang))) continue;
      const formatted = formatValue(k, v);
      if (formatted !== '—') {
        fieldsToDisplay.push({
          label: fieldLabels[k] || k,
          val: formatted
        });
      }
    }

    if (fieldsToDisplay.length > 0) {
      return (
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-2.5 text-xs space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            ข้อมูลสำคัญที่ลงทะเบียน:
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {fieldsToDisplay.map((f, i) => (
              <div key={i} className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 font-medium text-[11.5px]">{f.label}:</span>
                <span className="font-bold text-slate-800 text-[11.5px]">{f.val}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  // 3. กรณีแก้ไขข้อมูล (Edit/Update Asset)
  const allKeys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]));
  const diffs: Array<{ key: string; label: string; oldVal: string; newVal: string }> = [];

  for (const k of allKeys) {
    if (technicalKeys.has(k)) continue;
    const oldV = beforeObj[k];
    const newV = afterObj[k];
    const oldFormatted = formatValue(k, oldV);
    const newFormatted = formatValue(k, newV);

    // ถ้าค่าเหมือนเดิม ให้ข้ามไป
    if (oldFormatted === newFormatted) continue;
    // ทั้งคู่ว่าง ข้ามไป
    if (oldFormatted === '—' && (newFormatted === '—' || !newFormatted)) continue;
    // ค่าใหม่ว่าง → after snapshot ไม่มีฟิลด์นี้ ไม่ใช่การลบจริง ข้ามไป
    if (newFormatted === '—') continue;
    // ค่าเดิมว่าง และเป็นฟิลด์ที่ไม่สำคัญ ข้ามไป
    if (oldFormatted === '—' && !fieldLabels[k]) continue;

    diffs.push({
      key: k,
      label: fieldLabels[k] || k,
      oldVal: oldFormatted,
      newVal: newFormatted
    });
  }

  if (diffs.length === 0) {
    return (
      <div className="text-[11.5px] text-slate-400 italic">
        ไม่มีข้อมูลฟิลด์สำคัญที่มีการเปลี่ยนแปลง
      </div>
    );
  }

  return (
    <div className="bg-slate-50/90 border border-slate-200 rounded-lg p-2.5 space-y-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {diffs.map(d => (
          <div key={d.key} className="inline-flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-600 text-[11.5px]">{d.label}:</span>
            <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded text-[11px] line-through border border-rose-100">
              {d.oldVal}
            </span>
            <span className="text-slate-400 text-xs font-bold">→</span>
            <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[11px] border border-emerald-200">
              {d.newVal}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuditView({
  data,
  select,
  open
}: {
  data: WorkspaceData;
  select?: (a: Asset) => void;
  open?: (k: string, a?: Record<string, unknown>) => void;
}) {
  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [page, setPage] = useState(0);

  const events: AuditRecord[] = data.events || [];
  const assets: Asset[] = data.assets || [];

  // สถิติ KPI ด้านบน 4 ใบ
  const stats = useMemo(() => {
    let total = events.length;
    let editCount = 0;
    let movementCount = 0;
    let systemCount = 0;

    for (const e of events) {
      const meta = getActionMeta(e.action);
      if (meta.kind === 'edit') editCount++;
      else if (meta.kind === 'transfer' || meta.kind === 'repair') movementCount++;
      else if (meta.kind === 'import' || meta.kind === 'user') systemCount++;
    }

    return { total, editCount, movementCount, systemCount };
  }, [events]);

  // ตัวกรองรายการประวัติ
  const filtered = useMemo(() => {
    return events.filter(e => {
      // 1. กรองตามแท็บประเภท
      if (tab !== 'all') {
        const meta = getActionMeta(e.action);
        if (meta.kind !== tab) return false;
      }

      // 2. กรองตามช่วงเวลา
      if (timeRange !== 'all') {
        const d = new Date(e.createdAt);
        const diffMs = Date.now() - d.getTime();
        const days = diffMs / (1000 * 60 * 60 * 24);
        if (timeRange === 'today' && days > 1) return false;
        if (timeRange === '7days' && days > 7) return false;
        if (timeRange === '30days' && days > 30) return false;
      }

      // 3. กรองตามช่องค้นหา
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const linkedAsset = assets.find(a => a.id === e.assetId);
        const match = [
          e.action,
          e.actorName,
          e.reason,
          e.assetId,
          linkedAsset?.code,
          linkedAsset?.name,
          e.before,
          e.after
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!match.includes(q)) return false;
      }

      return true;
    });
  }, [events, tab, timeRange, search, assets]);

  const pageSize = 15;
  const paginated = useMemo(() => {
    return filtered.slice(page * pageSize, (page + 1) * pageSize);
  }, [filtered, page]);

  // ส่งออกรายงาน Audit Trail เป็น Excel
  const handleExportExcel = async () => {
    if (!filtered.length) {
      toast.info('ไม่มีรายการที่จะส่งออก');
      return;
    }

    try {
      const ExcelModule = await import('exceljs');
      const Excel = (ExcelModule as any).default || ExcelModule;
      const wb = new Excel.Workbook();
      wb.creator = 'คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม มหาวิทยาลัยกาฬสินธุ์';

      const ws = wb.addWorksheet('บันทึกประวัติการทำงาน (Audit)', {
        views: [{ showGridLines: true }]
      });

      // หัวตาราง
      ws.columns = [
        { header: 'ลำดับ', key: 'no', width: 8 },
        { header: 'วันและเวลา', key: 'createdAt', width: 22 },
        { header: 'ประเภทเหตุการณ์', key: 'action', width: 22 },
        { header: 'รหัสครุภัณฑ์', key: 'assetCode', width: 24 },
        { header: 'ชื่อรายการครุภัณฑ์', key: 'assetName', width: 32 },
        { header: 'ผู้ดำเนินการ', key: 'actorName', width: 28 },
        { header: 'เหตุผล / คำอธิบาย', key: 'reason', width: 35 },
        { header: 'ข้อมูลเดิม (Before)', key: 'before', width: 35 },
        { header: 'ข้อมูลใหม่ (After)', key: 'after', width: 35 }
      ];

      // สไตล์แถวหัวกระดาษ
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' }
      };

      filtered.forEach((e, idx) => {
        const linkedAsset = assets.find(a => a.id === e.assetId);
        ws.addRow({
          no: idx + 1,
          createdAt: formatThaiDateTime(e.createdAt),
          action: e.action,
          assetCode: linkedAsset?.code || e.assetId || '—',
          assetName: linkedAsset?.name || '—',
          actorName: e.actorName || 'ผู้ใช้ในระบบ',
          reason: e.reason || '—',
          before: e.before || '',
          after: e.after || ''
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ksu-audit-trail-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('ส่งออกรายงาน Audit Trail เรียบร้อยแล้ว');
    } catch (err: any) {
      toast.error('ส่งออกไฟล์ Excel ไม่สำเร็จ: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 📊 4 KPI Summary Cards matching desktop_9_audit.svg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: ประวัติทั้งหมด */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <History size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-slate-500 font-medium block">ประวัติเหตุการณ์ทั้งหมด</span>
            <strong className="text-xl font-bold text-slate-900 block leading-tight">
              {stats.total.toLocaleString('th-TH')} รายการ
            </strong>
            <span className="text-[11px] text-blue-600 block mt-0.5 font-medium">บันทึกอัตโนมัติแบบ Real-time</span>
          </div>
        </div>

        {/* Card 2: แก้ไขสเปก / สถานที่ / ราคา */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Pencil size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-slate-500 font-medium block">แก้ไขสเปก / สถานที่ / ราคา</span>
            <strong className="text-xl font-bold text-amber-600 block leading-tight">
              {stats.editCount.toLocaleString('th-TH')} รายการ
            </strong>
            <span className="text-[11px] text-amber-700 block mt-0.5 font-medium">ปรับปรุงข้อมูลในทะเบียน</span>
          </div>
        </div>

        {/* Card 3: โอนย้าย / ส่งซ่อม / คำขอ */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <ArrowLeftRight size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-slate-500 font-medium block">โอนย้าย / ส่งซ่อม / คำขอ</span>
            <strong className="text-xl font-bold text-purple-600 block leading-tight">
              {stats.movementCount.toLocaleString('th-TH')} รายการ
            </strong>
            <span className="text-[11px] text-purple-700 block mt-0.5 font-medium">ความเคลื่อนไหวทางกายภาพ</span>
          </div>
        </div>

        {/* Card 4: นำเข้า Excel / ผู้ใช้ */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Upload size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-slate-500 font-medium block">นำเข้า Excel / บัญชีผู้ใช้</span>
            <strong className="text-xl font-bold text-emerald-600 block leading-tight">
              {stats.systemCount.toLocaleString('th-TH')} รายการ
            </strong>
            <span className="text-[11px] text-emerald-700 block mt-0.5 font-medium">รายการระบบและการจัดการสิทธิ์</span>
          </div>
        </div>
      </div>

      {/* 🔍 Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'all' as TabKey, label: `ทั้งหมด (${events.length})` },
            { key: 'edit' as TabKey, label: `แก้ไขข้อมูล (${stats.editCount})` },
            { key: 'transfer' as TabKey, label: 'โอนย้าย' },
            { key: 'repair' as TabKey, label: 'ส่งซ่อม' },
            { key: 'import' as TabKey, label: 'นำเข้าข้อมูล' },
            { key: 'user' as TabKey, label: 'ผู้ใช้/สิทธิ์' }
          ].map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                setPage(0);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                tab === t.key
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[260px] sm:min-w-[320px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              placeholder="ค้นหาผู้ดำเนินการ, รหัสครุภัณฑ์, รายการ หรือเหตุผล…"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className={`pl-9 h-9 text-xs bg-white border-slate-200 ${search ? 'pr-8' : ''}`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="ล้างคำค้นหา"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Time Range Filter */}
          <select
            value={timeRange}
            onChange={e => {
              setTimeRange(e.target.value as TimeRange);
              setPage(0);
            }}
            className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="all">ทุกช่วงเวลา</option>
            <option value="today">วันนี้</option>
            <option value="7days">7 วันล่าสุด</option>
            <option value="30days">30 วันล่าสุด</option>
          </select>

          {/* Export Excel Button */}
          <Button
            size="sm"
            onClick={handleExportExcel}
            className="h-9 px-3.5 text-xs font-bold bg-[#0f172a] hover:bg-[#1e293b] text-white shadow-sm cursor-pointer"
          >
            <Download size={14} className="mr-1.5" /> ส่งออก Excel
          </Button>
        </div>
      </div>

      {/* 📋 Main Audit Records Panel */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History size={17} className="text-blue-600" />
              บันทึกเหตุการณ์ประวัติล่าสุด (Audit Records)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ติดตามทุกการบันทึก การอนุมัติ และการแก้ไขข้อมูลในระบบแบบ Real-time
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            พบ {filtered.length} รายการ
          </span>
        </div>

        {/* Audit Items List */}
        <div className="divide-y divide-slate-100">
          {paginated.map(e => {
            const meta = getActionMeta(e.action);
            const Icon = meta.icon;
            const afterObj = parseJsonSafe(e.after);
            const beforeObj = parseJsonSafe(e.before);
            const linkedAsset = assets.find(a => 
              (e.assetId && a.id === e.assetId) ||
              (afterObj.id && a.id === String(afterObj.id)) ||
              (afterObj.code && a.code === String(afterObj.code)) ||
              (beforeObj.code && a.code === String(beforeObj.code))
            );

            return (
              <div key={e.id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left Column: Type Icon & Main Content */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Category Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl ${meta.bg} ${meta.color} flex items-center justify-center shrink-0 border ${meta.border} shadow-xs mt-0.5`}
                    >
                      <Icon size={18} />
                    </div>

                    {/* Information */}
                    <div className="min-w-0 flex-1 space-y-2">
                      {/* Row 1: Action Badge + Asset Code + Name */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${meta.badgeBg}`}
                        >
                          {meta.label}
                        </span>

                        {linkedAsset ? (
                          <>
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100 select-all">
                              {linkedAsset.code}
                            </span>
                            <span className="text-xs font-bold text-slate-900 line-clamp-1">
                              {linkedAsset.name}
                            </span>
                          </>
                        ) : afterObj.code ? (
                          <>
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100 select-all">
                              {String(afterObj.code)}
                            </span>
                            {afterObj.name ? (
                              <span className="text-xs font-bold text-slate-900 line-clamp-1">
                                {String(afterObj.name)}
                              </span>
                            ) : null}
                          </>
                        ) : e.assetId ? (
                          <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {e.assetId}
                          </span>
                        ) : null}
                      </div>

                      {/* Row 2: Actor & Reason */}
                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">
                          ผู้ดำเนินการ:{' '}
                          <strong className="text-slate-900 font-bold">
                            {e.actorName || 'ผู้ใช้ในระบบ'}
                          </strong>
                        </span>
                        {e.reason && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-700">
                              เหตุผล: <span className="italic">{e.reason}</span>
                            </span>
                          </>
                        )}
                      </div>

                      {/* Row 3: Human-Readable Field Diff Viewer */}
                      <VisualDiffViewer beforeStr={e.before} afterStr={e.after} action={e.action} />
                    </div>
                  </div>

                  {/* Right Column: Timestamp & Action Buttons */}
                  <div className="flex sm:flex-col sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-1">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                        {formatThaiDateTime(e.createdAt)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatRelativeTime(e.createdAt)}
                      </div>
                    </div>

                    {/* View Asset Button */}
                    {linkedAsset && select && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => select(linkedAsset)}
                        className="h-8 px-3 text-xs font-semibold text-blue-700 bg-blue-50/90 hover:bg-blue-600 hover:text-white border-blue-200 cursor-pointer rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs mt-1"
                        title="เปิดดูรายละเอียดครุภัณฑ์นี้"
                      >
                        <Eye size={13} />
                        <span>เปิดดูครุภัณฑ์</span>
                        <ArrowRight size={13} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {!filtered.length && (
            <div className="py-12">
              <Empty title={events.length ? 'ไม่พบเหตุการณ์ที่ตรงกับตัวกรอง' : 'ยังไม่มีบันทึกประวัติเหตุการณ์'}>
                <p className="text-xs text-slate-400 mt-1">
                  {events.length
                    ? 'ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองช่วงเวลาอื่น'
                    : 'เมื่อมีการเพิ่ม แก้ไข หรือส่งคำขอในระบบ ประวัติจะถูกบันทึกที่นี่โดยอัตโนมัติ'}
                </p>
              </Empty>
            </div>
          )}
        </div>

        {/* 📑 Pagination Bar */}
        {filtered.length > pageSize && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              แสดงรายการที่ {page * pageSize + 1} - {Math.min((page + 1) * pageSize, filtered.length)} จากทั้งหมด{' '}
              {filtered.length} เหตุการณ์
            </span>
            <Pager page={page} total={filtered.length} size={pageSize} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
