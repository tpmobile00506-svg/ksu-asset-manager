'use client';

import { useState, useMemo } from 'react';
import { Download, Printer, TrendingDown, CheckCircle2, AlertCircle, FileSpreadsheet, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import { Asset, money, bookValue, standardBranches } from '@/shared/domain';
import { printAssets } from '@/frontend/services/excel-export';
import { Badge, Empty, Pager } from '@/frontend/components/common';
import type { WorkspaceData } from '@/shared/models';

export default function ReportsView({
  data,
  select,
  exportRows,
  busy
}: {
  data: Pick<WorkspaceData, 'assets'>;
  select: (a: Asset) => void;
  exportRows: (a: Asset[]) => void;
  busy: boolean;
}) {
  const [fiscalYear, setFiscalYear] = useState('2569');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [page, setPage] = useState(0);

  const active = useMemo(
    () => data.assets.filter(a => a.lifecycle === 'active'),
    [data.assets]
  );

  const filtered = useMemo(() => {
    return active.filter(a => selectedBranch === 'all' || a.branch === selectedBranch);
  }, [active, selectedBranch]);

  // วันที่สิ้นปีงบประมาณเป้าหมาย (30 กันยายน ของปี พ.ศ. ที่เลือก)
  const asOfDate = useMemo(() => {
    const yearBE = Number(fiscalYear) || 2569;
    const yearCE = yearBE - 543;
    return new Date(`${yearCE}-09-30T23:59:59Z`);
  }, [fiscalYear]);

  // Financial Calculations
  const stats = useMemo(() => {
    let totalCost = 0;
    let totalNetBook = 0;
    let totalAccDep = 0;
    let fullyDepreciatedCount = 0;

    for (const a of filtered) {
      totalCost += a.totalSatang;
      const bv = bookValue(a, asOfDate);
      if (bv !== null) {
        totalNetBook += bv;
        totalAccDep += Math.max(0, a.totalSatang - bv);
        if (bv <= (a.salvageSatang || 100)) {
          fullyDepreciatedCount++;
        }
      } else {
        totalNetBook += a.totalSatang;
      }
    }

    const accDepPercent = totalCost > 0 ? ((totalAccDep / totalCost) * 100).toFixed(1) : '0.0';

    return {
      totalCost,
      totalAccDep,
      totalNetBook,
      accDepPercent,
      fullyDepreciatedCount,
      count: filtered.length
    };
  }, [filtered, asOfDate]);

  const branches = useMemo(() => {
    return Array.from(new Set([...standardBranches, ...active.map(a => a.branch)])).filter(Boolean);
  }, [active]);

  const handlePrint = () => {
    printAssets(filtered);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 4 Financial Summary KPI Cards matching desktop_5_reports.svg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: ราคาทุนรวมทั้งสิ้น */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 font-bold text-lg">
            ฿
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-slate-500 font-medium block">ราคาทุนรวมทั้งสิ้น (Historical Cost)</span>
            <strong className="text-xl font-bold text-slate-900 block leading-tight">
              {money(stats.totalCost)} ฿
            </strong>
            <span className="text-[11px] font-bold text-blue-600 block mt-0.5">
              ครุภัณฑ์ทั้งหมด {stats.count.toLocaleString('th-TH')} รายการ
            </span>
          </div>
        </div>

        {/* Card 2: ค่าเสื่อมราคาสะสม */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <TrendingDown size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-slate-500 font-medium block">ค่าเสื่อมราคาสะสม (Acc. Dep.)</span>
            <strong className="text-xl font-bold text-rose-600 block leading-tight">
              {money(stats.totalAccDep)} ฿
            </strong>
            <span className="text-[11px] text-rose-700 block mt-0.5">
              คิดเป็น {stats.accDepPercent}% ของมูลค่าทุน
            </span>
          </div>
        </div>

        {/* Card 3: มูลค่าสุทธิตามบัญชี */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 size={22} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-slate-500 font-medium block">มูลค่าสุทธิตามบัญชี (Net Book Value)</span>
            <strong className="text-xl font-bold text-emerald-600 block leading-tight">
              {money(stats.totalNetBook)} ฿
            </strong>
            <span className="text-[11px] text-emerald-700 block mt-0.5">
              มูลค่าสินทรัพย์คงเหลือจริง
            </span>
          </div>
        </div>

        {/* Card 4: ครุภัณฑ์ครบอายุใช้งาน */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <AlertCircle size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-slate-500 font-medium block">ครุภัณฑ์ครบอายุการใช้งาน</span>
            <strong className="text-xl font-bold text-amber-600 block leading-tight">
              {stats.fullyDepreciatedCount.toLocaleString('th-TH')} รายการ
            </strong>
            <span className="text-[11px] text-amber-700 block mt-0.5">
              คงเหลือมูลค่าทางบัญชี 1 บาท
            </span>
          </div>
        </div>
      </div>

      {/* Action / Filter Bar matching desktop_5_reports.svg */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-700">ปีงบประมาณ:</span>
            <select
              value={fiscalYear}
              onChange={e => setFiscalYear(e.target.value)}
              className="bg-transparent font-medium text-slate-900 border-none outline-none cursor-pointer"
            >
              <option value="2569">2569 (ปัจจุบัน)</option>
              <option value="2568">2568</option>
              <option value="2567">2567</option>
            </select>
          </div>

          {/* Department selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Filter size={13} className="text-slate-400" />
            <span className="font-bold text-slate-700">สาขาวิชา:</span>
            <select
              value={selectedBranch}
              onChange={e => {
                setSelectedBranch(e.target.value);
                setPage(0);
              }}
              className="bg-transparent font-medium text-slate-900 border-none outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="all">ทุกสาขาวิชา</option>
              {branches.map(b => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!filtered.length || busy}
            onClick={() => exportRows(filtered)}
            className="h-9 px-3 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 cursor-pointer"
          >
            <Download size={14} className="mr-1 text-emerald-600" /> Excel
          </Button>
          <Button
            size="sm"
            disabled={!filtered.length}
            onClick={handlePrint}
            className="h-9 px-3 text-xs font-bold bg-[#2563eb] hover:bg-[#1d4ed8] text-white cursor-pointer shadow-sm"
          >
            <Printer size={14} className="mr-1" /> พิมพ์รายงาน (PDF)
          </Button>
        </div>
      </div>

      {/* Depreciation Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ตารางคำนวณค่าเสื่อมราคาครุภัณฑ์ (Depreciation Schedule)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงรายการครุภัณฑ์พร้อมมูลค่าทุน ค่าเสื่อมราคาสะสม และมูลค่าสุทธิตามบัญชี
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            รวม {filtered.length} รายการ
          </span>
        </div>

        {filtered.length ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70 text-slate-600 text-xs">
                    <TableHead className="font-bold">รหัสครุภัณฑ์</TableHead>
                    <TableHead className="font-bold">รายการครุภัณฑ์</TableHead>
                    <TableHead className="font-bold">วันที่ได้มา</TableHead>
                    <TableHead className="font-bold text-center">อายุใช้งาน</TableHead>
                    <TableHead className="font-bold text-right">ราคาทุน</TableHead>
                    <TableHead className="font-bold text-right">ค่าเสื่อมสะสม</TableHead>
                    <TableHead className="font-bold text-right">มูลค่าคงเหลือสุทธิ</TableHead>
                    <TableHead className="font-bold text-center">สภาพ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(page * 40, (page + 1) * 40).map(a => {
                    const bv = bookValue(a, asOfDate);
                    const netBook = bv !== null ? bv : a.totalSatang;
                    const accDep = bv !== null ? Math.max(0, a.totalSatang - bv) : 0;

                    return (
                      <TableRow
                        key={a.id}
                        className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                        onClick={() => select(a)}
                      >
                        <TableCell className="font-mono text-xs font-bold text-blue-700 select-all whitespace-nowrap">
                          {a.code}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-xs text-slate-900 line-clamp-1">{a.name}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">{a.branch || '—'}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                          {a.receivedDate || '—'}
                        </TableCell>
                        <TableCell className="text-center text-xs text-slate-600 whitespace-nowrap">
                          {a.lifeYears ? `${a.lifeYears} ปี` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-xs text-slate-900 whitespace-nowrap">
                          ฿{money(a.totalSatang)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-rose-600 whitespace-nowrap">
                          {accDep > 0 ? `฿${money(accDep)}` : '0.00 ฿'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs text-emerald-700 whitespace-nowrap">
                          ฿{money(netBook)}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <Badge value={a.condition} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                แสดงรายการที่ {page * 40 + 1} - {Math.min((page + 1) * 40, filtered.length)} จากทั้งหมด {filtered.length} รายการ
              </span>
              <Pager page={page} total={filtered.length} onChange={setPage} />
            </div>
          </>
        ) : (
          <Empty title="ไม่พบรายการครุภัณฑ์ตามตัวกรองนี้" />
        )}
      </div>
    </div>
  );
}
