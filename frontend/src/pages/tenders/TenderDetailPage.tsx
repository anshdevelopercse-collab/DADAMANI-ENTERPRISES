import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileSpreadsheet,
  Calendar,
  MapPin,
  IndianRupee,
  Clock,
  Send,
  User,
  CheckCircle,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { api } from '../../services/api';
import { Tender } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const TenderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    fetchTender();
  }, [id]);

  const fetchTender = async () => {
    try {
      const res = await api.get(`/tenders/${id}`);
      if (res.data?.data) {
        setTender(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await api.post(`/tenders/${id}/comments`, { comment: commentText });
      setCommentText('');
      fetchTender();
    } catch (e) {
      alert('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val?.toLocaleString()}`;
  };

  if (loading || !tender) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/tenders')}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white font-mono">{tender.tenderNumber}</h1>
            <StatusBadge status={tender.status} />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{tender.title}</p>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-slate-800">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Client Organization
          </span>
          <p className="text-sm font-bold text-white mt-1">{tender.clientName}</p>
          {tender.clientDepartment && (
            <p className="text-xs text-slate-400 mt-0.5">{tender.clientDepartment}</p>
          )}
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-800">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Estimated Value
          </span>
          <p className="text-sm font-bold text-emerald-400 mt-1">
            {formatCurrency(tender.estimatedValue)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            EMD: {formatCurrency(tender.earnestMoneyDeposit || 0)}
          </p>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-800">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Submission Deadline
          </span>
          <p className="text-sm font-bold text-white mt-1 font-mono">
            {new Date(tender.submissionDeadline).toLocaleDateString()}
          </p>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-400" />
            <span>Strict Closing Time: 17:00 IST</span>
          </p>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-800">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Site Location
          </span>
          <p className="text-sm font-bold text-white mt-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>{tender.location}</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{tender.state || 'Odisha'}</p>
        </div>
      </div>

      {/* Scope & Specifications */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
          Scope of Work & Technical Terms
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          {tender.scopeOfWork || 'No detailed technical scope entered for this tender proposal.'}
        </p>
      </div>

      {/* Comments & Activity Timeline Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comments Stream */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Internal Discussion & Notes
              </h3>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto mb-4 pr-1">
              {(!tender.comments || tender.comments.length === 0) ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  No internal comments recorded yet. Start discussion below.
                </p>
              ) : (
                tender.comments.map((c, idx) => (
                  <div key={idx} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-200">{c.userName} ({c.userRole})</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-300">{c.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2 pt-3 border-t border-slate-800">
            <input
              type="text"
              required
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add internal operational note or comment..."
              className="flex-1 px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              disabled={submittingComment}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-sky-600/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Post</span>
            </button>
          </form>
        </div>

        {/* Activity Timeline */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Tender Activity Timeline
            </h3>
          </div>

          <div className="space-y-4 max-h-80 overflow-y-auto pl-2 border-l-2 border-slate-800">
            {(!tender.timeline || tender.timeline.length === 0) ? (
              <p className="text-xs text-slate-500 text-center py-8">No timeline events logged.</p>
            ) : (
              tender.timeline.map((evt, idx) => (
                <div key={idx} className="relative pl-5 text-xs">
                  <div className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-sky-500 border-2 border-slate-900" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{evt.action}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(evt.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    By <span className="text-slate-300">{evt.performerName}</span>
                    {evt.details && ` — ${evt.details}`}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
