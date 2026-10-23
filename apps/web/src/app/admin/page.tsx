'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { fetchApi } from '@/lib/api';
import { IBusiness, IClaimRequest, IReport, IAuditLog } from '@bizpockethub/shared';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  Users,
  FileText,
  Star,
  Sparkles,
  RefreshCw,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'claims' | 'reports' | 'logs'>(
    'pending'
  );
  const [stats, setStats] = useState<any>(null);
  const [pendingBusinesses, setPendingBusinesses] = useState<IBusiness[]>([]);
  const [allBusinesses, setAllBusinesses] = useState<IBusiness[]>([]);
  const [claims, setClaims] = useState<IClaimRequest[]>([]);
  const [reports, setReports] = useState<IReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState('');

  const loadAdminData = async () => {
    setLoading(true);
    const [statsRes, pendingRes, allRes, claimsRes, reportsRes, logsRes] = await Promise.all([
      fetchApi('/admin/stats'),
      fetchApi('/admin/businesses/pending'),
      fetchApi('/admin/businesses'),
      fetchApi('/admin/claims'),
      fetchApi('/admin/reports'),
      fetchApi('/admin/audit-logs'),
    ]);

    if (statsRes.success) setStats(statsRes.data);
    if (pendingRes.success && pendingRes.data) setPendingBusinesses(pendingRes.data);
    if (allRes.success && allRes.data) setAllBusinesses(allRes.data);
    if (claimsRes.success && claimsRes.data) setClaims(claimsRes.data);
    if (reportsRes.success && reportsRes.data) setReports(reportsRes.data);
    if (logsRes.success && logsRes.data) setAuditLogs(logsRes.data);

    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'admin') {
        router.push('/');
        return;
      }
      loadAdminData();
    }
  }, [user, authLoading]);

  const handleApproveBusiness = async (id: string, name: string) => {
    const res = await fetchApi(`/admin/businesses/${id}/approve`, { method: 'PATCH' });
    if (res.success) {
      setActionFeedback(`Approved "${name}" — Listing is now publicly live.`);
      loadAdminData();
    }
  };

  const handleRejectBusiness = async (id: string, name: string) => {
    const reason = window.prompt('Specify reason for rejection:');
    if (!reason) return;

    const res = await fetchApi(`/admin/businesses/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
    if (res.success) {
      setActionFeedback(`Rejected "${name}".`);
      loadAdminData();
    }
  };

  const handleToggleFeatured = async (id: string) => {
    const res = await fetchApi(`/admin/businesses/${id}/toggle-featured`, { method: 'PATCH' });
    if (res.success) {
      loadAdminData();
    }
  };

  const handleApproveClaim = async (claimId: string) => {
    const res = await fetchApi(`/admin/claims/${claimId}/approve`, { method: 'PATCH' });
    if (res.success) {
      setActionFeedback('Claim approved and business ownership transferred.');
      loadAdminData();
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    const reason = window.prompt('Reason for rejecting claim:');
    if (!reason) return;
    const res = await fetchApi(`/admin/claims/${claimId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
    if (res.success) {
      setActionFeedback('Claim rejected.');
      loadAdminData();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-sm text-slate-500">
        Authenticating administrator permissions...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Admin Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full mb-1">
            <Shield className="w-3.5 h-3.5" />
            Administrative Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Moderation & Directory Governance
          </h1>
        </div>

        <Button variant="outline" size="sm" onClick={() => loadAdminData()} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Stats
        </Button>
      </div>

      {actionFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center justify-between">
          <span>{actionFeedback}</span>
          <button onClick={() => setActionFeedback('')} className="font-bold text-emerald-700">
            ✕
          </button>
        </div>
      )}

      {/* Real Database Metrics Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-medium">Pending Approvals</span>
            <div className="text-2xl font-extrabold text-amber-600">
              {stats.pendingBusinesses}
            </div>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-medium">Published Listings</span>
            <div className="text-2xl font-extrabold text-teal-600">
              {stats.publishedBusinesses}
            </div>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-medium">Pending Claims</span>
            <div className="text-2xl font-extrabold text-blue-600">{stats.pendingClaims}</div>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-medium">Active Users</span>
            <div className="text-2xl font-extrabold text-slate-900">{stats.totalUsers}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-4 text-xs font-bold overflow-x-auto whitespace-nowrap scrollbar-none pb-px">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'pending'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Pending Submissions ({pendingBusinesses.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'all'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          All Directory Businesses ({allBusinesses.length})
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`pb-3 border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'claims'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Claim Requests ({claims.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'reports'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          User Reports ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'logs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Tab: Pending Submissions */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingBusinesses.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 text-sm">
              No listings currently waiting in the moderation queue.
            </div>
          ) : (
            pendingBusinesses.map((biz) => (
              <div
                key={biz._id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{biz.name}</h3>
                    <p className="text-xs text-slate-500">
                      Submitted by: {(biz.ownerId as any)?.name} ({(biz.ownerId as any)?.email}) •{' '}
                      {new Date(biz.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      onClick={() => handleApproveBusiness(biz._id, biz.name)}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve & Publish
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleRejectBusiness(biz._id, biz.name)}
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg">
                  {biz.description}
                </p>

                <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                  {biz.website && <span>Website: {biz.website}</span>}
                  {biz.contactEmail && <span>Email: {biz.contactEmail}</span>}
                  {biz.phone && <span>Phone: {biz.phone}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: All Businesses */}
      {activeTab === 'all' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Company Name</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Verification</th>
                  <th className="p-3.5">Featured</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allBusinesses.map((biz) => (
                  <tr key={biz._id} className="hover:bg-slate-50/50">
                    <td className="p-3.5">
                      <Link
                        href={`/business/${biz.slug}`}
                        className="font-bold text-slate-900 hover:text-teal-600"
                      >
                        {biz.name}
                      </Link>
                      <div className="text-[11px] text-slate-400">/{biz.slug}</div>
                    </td>
                    <td className="p-3.5">
                      <Badge variant={biz.listingStatus === 'published' ? 'verified' : 'pending'}>
                        {biz.listingStatus}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <span className="capitalize">{biz.verificationStatus}</span>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleFeatured(biz._id)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          biz.isFeatured ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {biz.isFeatured ? 'Featured ★' : 'Standard'}
                      </button>
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        href={`/business/${biz.slug}`}
                        className="text-xs font-semibold text-teal-600 hover:underline"
                      >
                        Inspect Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Claims */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          {claims.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 text-sm">
              No claim requests submitted.
            </div>
          ) : (
            claims.map((claim) => (
              <div
                key={claim._id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Listing: {(claim.businessId as any)?.name}
                    </h4>
                    <p className="text-slate-500">
                      Claimant: {(claim.claimantId as any)?.name} ({(claim.claimantId as any)?.email})
                    </p>
                  </div>
                  <Badge variant={claim.status === 'approved' ? 'verified' : 'pending'}>
                    {claim.status}
                  </Badge>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <div>Official Corporate Email: <strong>{claim.businessEmail}</strong></div>
                  <div>Contact Phone: <strong>{claim.phone}</strong></div>
                  <div className="pt-1">
                    <strong>Evidence / Statement:</strong> {claim.notes}
                  </div>
                </div>

                {claim.status === 'pending' && (
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleApproveClaim(claim._id)}
                    >
                      Approve Ownership Claim
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRejectClaim(claim._id)}
                    >
                      Reject Claim
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-slate-900">Security & Administrative Actions</h3>
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log._id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-4"
              >
                <div>
                  <strong className="text-slate-900 font-mono">{log.action}</strong> •{' '}
                  <span className="text-slate-600">{log.entityType} ({log.entityId})</span>
                  <div className="text-[11px] text-slate-400">
                    Actor: {(log.actorId as any)?.email || 'System'} • IP: {log.ipAddress || 'Internal'}
                  </div>
                </div>
                <span suppressHydrationWarning className="text-[11px] text-slate-400 font-mono">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
