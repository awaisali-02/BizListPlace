'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { fetchApi } from '@/lib/api';
import { IBusiness, IClaimRequest, IBusinessLocation } from '@bizpockethub/shared';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CountrySelect } from '@/components/ui/CountrySelect';
import { CitySelect } from '@/components/ui/CitySelect';
import {
  Building2,
  PlusCircle,
  ExternalLink,
  MapPin,
  GitBranch,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Eye,
  FileText,
  UserCheck,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState<IBusiness[]>([]);
  const [claims, setClaims] = useState<IClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Branch Modal State
  const [selectedBizForBranch, setSelectedBizForBranch] = useState<IBusiness | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchCountry, setBranchCountry] = useState('US');
  const [branchCity, setBranchCity] = useState('');
  const [branchRegion, setBranchRegion] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchSuccess, setBranchSuccess] = useState('');
  const [branchError, setBranchError] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [bizRes, claimRes] = await Promise.all([
      fetchApi<IBusiness[]>('/owner/businesses'),
      fetchApi<IClaimRequest[]>('/owner/claims'),
    ]);

    if (bizRes.success && bizRes.data) {
      setBusinesses(Array.isArray(bizRes.data) ? bizRes.data : (bizRes.data as any).data || []);
    }
    if (claimRes.success && claimRes.data) {
      setClaims(Array.isArray(claimRes.data) ? claimRes.data : (claimRes.data as any).data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, authLoading]);

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBizForBranch) return;

    setBranchError('');
    setBranchSuccess('');
    setBranchLoading(true);

    const res = await fetchApi(`/businesses/${selectedBizForBranch._id}/locations`, {
      method: 'POST',
      body: JSON.stringify({
        branchName,
        countryCode: branchCountry,
        region: branchRegion,
        city: branchCity,
        addressLine1: branchAddress,
        phone: branchPhone,
      }),
    });

    setBranchLoading(false);

    if (res.success) {
      setBranchSuccess(`Branch "${branchName}" added successfully.`);
      setBranchName('');
      setBranchCity('');
      setBranchRegion('');
      setBranchAddress('');
      setBranchPhone('');
      loadData();
    } else {
      setBranchError(res.message || 'Failed to add branch location.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-sm text-slate-500">
        Loading your dashboard data...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Owner Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Welcome back, <strong>{user?.name}</strong> ({user?.email})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/add-business">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <PlusCircle className="w-4 h-4" />
              Add New Listing
            </Button>
          </Link>
          <Link href="/claim-business">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Claim Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content: My Listings */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-teal-600" />
          My Registered Businesses ({businesses.length})
        </h2>

        {businesses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">No Listings Registered Yet</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              You haven&apos;t added any business listings or claimed any existing profiles under this
              account yet.
            </p>
            <Link href="/add-business">
              <Button variant="primary" size="sm" className="mt-2">
                Register Your First Listing
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {businesses.map((biz) => {
              const locations = (biz as any).locations || [];
              const statusVariant =
                biz.listingStatus === 'published'
                  ? 'verified'
                  : biz.listingStatus === 'pending'
                  ? 'pending'
                  : 'rejected';

              return (
                <div
                  key={biz._id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-lg font-bold text-slate-900">{biz.name}</h3>
                        <Badge variant={statusVariant as any} className="capitalize">
                          {biz.listingStatus}
                        </Badge>
                        {biz.verificationStatus === 'verified' && (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Slug: <code>/business/{biz.slug}</code> • Created:{' '}
                        {new Date(biz.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/business/${biz.slug}`}>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          View Public Page
                        </Button>
                      </Link>
                      <Button
                        variant="primary"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setSelectedBizForBranch(biz)}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Add Branch Location
                      </Button>
                    </div>
                  </div>

                  {/* Rejection / Moderation Alert if rejected */}
                  {biz.listingStatus === 'rejected' && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        Listing Moderation Feedback:
                      </div>
                      <p className="text-rose-800">
                        {biz.rejectionReason ||
                          'Please revise your listing details to ensure accurate company representation and valid operational premises.'}
                      </p>
                    </div>
                  )}

                  {/* Locations List */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-teal-600" />
                      Branch Locations ({locations.length})
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {locations.map((loc: IBusinessLocation) => (
                        <div
                          key={loc.branchSlug}
                          className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span>{loc.branchName}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {loc.countryCode}
                            </span>
                          </div>
                          <p className="text-slate-500 line-clamp-2">
                            {loc.addressLine1}, {loc.city}, {loc.region}
                          </p>
                          {loc.phone && <div className="text-[11px] text-slate-600">{loc.phone}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Claim Requests Section */}
      <div className="space-y-4 pt-6 border-t border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-600" />
          My Claim Submissions ({claims.length})
        </h2>

        {claims.length === 0 ? (
          <p className="text-xs text-slate-500">
            No claim requests submitted. If you find an existing listing for your business, you can
            claim it to gain management access.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {claims.map((claim) => (
              <div
                key={claim._id}
                className="bg-white border border-slate-200 rounded-xl p-4 text-xs space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    {(claim.businessId as any)?.name || 'Business'}
                  </span>
                  <Badge
                    variant={
                      claim.status === 'approved'
                        ? 'verified'
                        : claim.status === 'rejected'
                        ? 'rejected'
                        : 'pending'
                    }
                    className="capitalize"
                  >
                    {claim.status}
                  </Badge>
                </div>
                <div className="text-slate-500">
                  Business Email: <strong>{claim.businessEmail}</strong> • Phone:{' '}
                  <strong>{claim.phone}</strong>
                </div>
                {claim.rejectionReason && (
                  <p className="text-rose-700 bg-rose-50 p-2 rounded">
                    Rejection note: {claim.rejectionReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Branch Location Modal */}
      {selectedBizForBranch && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                Add Branch Location to {selectedBizForBranch.name}
              </h3>
              <button
                onClick={() => setSelectedBizForBranch(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {branchSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg">
                {branchSuccess}
              </div>
            )}
            {branchError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg">{branchError}</div>
            )}

            <form onSubmit={handleAddBranch} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. London Regional Office"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Country *</label>
                  <CountrySelect
                    value={branchCountry}
                    onChange={(code) => {
                      setBranchCountry(code);
                      setBranchCity('');
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                  <CitySelect
                    countryCode={branchCountry}
                    value={branchCity}
                    onChange={(city) => setBranchCity(city)}
                    allowCustomInput={true}
                    placeholder="Select or enter city..."
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Region / State *
                  </label>
                  <input
                    type="text"
                    required
                    value={branchRegion}
                    onChange={(e) => setBranchRegion(e.target.value)}
                    placeholder="Greater London"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch Phone
                  </label>
                  <input
                    type="tel"
                    value={branchPhone}
                    onChange={(e) => setBranchPhone(e.target.value)}
                    placeholder="+44 20 7946 0912"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address Line 1 *
                </label>
                <input
                  type="text"
                  required
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="25 Finsbury Circus"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedBizForBranch(null)}
                >
                  Close
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={branchLoading}>
                  Save Branch Location
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
