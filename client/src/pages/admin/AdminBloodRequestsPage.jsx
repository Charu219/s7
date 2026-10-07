import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Search, Trash2 } from 'lucide-react';
import { getBloodRequests, updateBloodRequest, getRequestResponses, deleteBloodRequest } from '../../api/bloodRequests';
import { Card } from '../../components/ui/Card';
import { Badge, UrgencyBadge, BloodGroupBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SpinnerCenter } from '../../components/ui/Spinner';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import toast from 'react-hot-toast';

export default function AdminBloodRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [statusModal, setStatusModal] = useState(null);
  const [responsesModal, setResponsesModal] = useState(null);
  const [responses, setResponses] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getBloodRequests()
      .then((res) => setRequests(res.data.bloodRequests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStatusUpdate = async () => {
    if (!statusModal) return;
    setUpdating(true);
    try {
      await updateBloodRequest(statusModal.req._id, { status: statusModal.newStatus });
      toast.success('Request status updated.');
      setRequests((prev) => prev.map((r) => r._id === statusModal.req._id ? { ...r, status: statusModal.newStatus } : r));
      setStatusModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally { setUpdating(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBloodRequest(deleteTarget._id);
      toast.success('Blood request deleted successfully.');
      setRequests((prev) => prev.filter((r) => r._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to delete. Please try again.');
    } finally { setDeleting(false); }
  };

  const viewResponses = async (req) => {
    setResponsesModal(req);
    try {
      const res = await getRequestResponses(req._id);
      setResponses(res.data.responses || []);
    } catch { setResponses([]); }
  };

  if (loading) return <SpinnerCenter />;

  const filtered = requests.filter((r) => {
    const matchSearch = !search
      || r.patientName?.toLowerCase().includes(search.toLowerCase())
      || r.hospitalName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusConfig = { ACTIVE: 'warning', FULFILLED: 'success', CANCELLED: 'danger', CLOSED: 'neutral' };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Blood Requests</h1>
        <p className="page-subtitle">Manage all blood requests across the system</p>
      </div>

      <div className="flex items-center gap-3" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: '1 1 240px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Search by patient or hospital…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          {['PENDING','SEARCHING','DONOR_ACCEPTED','CONTACT_SHARED','DONATION_COMPLETED','CANCELLED','EXPIRED'].map(
            (s) => <option key={s} value={s}>{s}</option>
          )}
        </select>
      </div>

      <Card>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Blood Group</th>
                <th>Units</th>
                <th>Urgency</th>
                <th>Hospital</th>
                <th>Required By</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No requests found
                  </td>
                </tr>
              )}
              {filtered.map((req, i) => (
                <motion.tr
                  key={req._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <td style={{ fontWeight: 600 }}>
                    {req.patientName}{' '}
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      ({req.patientAge}y)
                    </span>
                  </td>
                  <td><BloodGroupBadge group={req.bloodGroup} /></td>
                  <td>{req.unitsRequired}</td>
                  <td><UrgencyBadge urgency={req.urgency} /></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{req.hospitalName}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    {format(new Date(req.requiredDate), 'MMM d, yyyy')}
                  </td>
                  <td>
                    <button
                      onClick={() => setStatusModal({ req, newStatus: req.status })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <Badge variant={statusConfig[req.status] || 'neutral'}>{req.status}</Badge>
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Button variant="ghost" size="sm" onClick={() => viewResponses(req)}>
                        Responses
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(req)}
                        style={{ color: 'var(--primary-500)', padding: '0.25rem 0.5rem' }}
                        title="Delete blood request"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Status modal */}
      <Modal
        isOpen={!!statusModal}
        onClose={() => setStatusModal(null)}
        title="Update Request Status"
        footer={
          <>
            <Button variant="ghost" onClick={() => setStatusModal(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleStatusUpdate} loading={updating}>Update</Button>
          </>
        }
      >
        <Select
          label="New Status"
          value={statusModal?.newStatus || ''}
          onChange={(e) => setStatusModal((p) => ({ ...p, newStatus: e.target.value }))}
          options={[
            'PENDING','SEARCHING','DONOR_ACCEPTED','CONTACT_SHARED',
            'DONATION_COMPLETED','CANCELLED','EXPIRED',
          ].map((s) => ({ value: s, label: s }))}
        />
      </Modal>

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Blood Request"
        message={`Are you sure you want to delete the blood request for ${deleteTarget?.patientName}? This will also remove all donor responses and contact records. This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleting}
      />

      {/* Responses modal */}
      <Modal
        isOpen={!!responsesModal}
        onClose={() => { setResponsesModal(null); setResponses([]); }}
        title={`Donor Responses — ${responsesModal?.patientName}`}
        size="lg"
      >
        {responses.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <div className="empty-title">No responses yet</div>
            <div className="empty-desc">Donors haven't responded to this request yet.</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Donor</th><th>Blood Group</th><th>Response</th><th>Date</th></tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <tr key={r._id}>
                    <td>{r.donorId?.userId?.name || '—'}</td>
                    <td><BloodGroupBadge group={r.donorId?.bloodGroup} /></td>
                    <td>
                      <Badge variant={r.response === 'ACCEPTED' ? 'success' : 'danger'}>
                        {r.response}
                      </Badge>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {format(new Date(r.createdAt), 'MMM d, yyyy HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
