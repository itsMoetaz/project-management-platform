import { motion } from 'framer-motion';
import { useRef, useState } from 'react';

const BugDetailsModal = ({ isOpen, onClose, bug }) => {
  const modalRef = useRef();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  if (!isOpen || !bug) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal modal-open"
    >
      <div className="modal-box max-w-lg" ref={modalRef}>
        <h3 className="font-bold text-xl mb-4">Bug Details</h3>
        <div className="space-y-4">
          <div className="form-control">
            <label className="label font-medium">Title</label>
            <p className="text-base-content/80">{bug.title || 'N/A'}</p>
          </div>
          <div className="form-control">
            <label className="label font-medium">Description</label>
            <p className="text-base-content/80">{bug.description || 'N/A'}</p>
          </div>
          <div className="form-control">
            <label className="label font-medium">Status</label>
            <p className="text-base-content/80">{bug.status || 'N/A'}</p>
          </div>
          <div className="form-control">
            <label className="label font-medium">Priority</label>
            <p className="text-base-content/80">{bug.priority || 'N/A'}</p>
          </div>
          <div className="form-control">
            <label className="label font-medium">Complexity</label>
            <p className="text-base-content/80">{bug.complexity || 'N/A'}</p>
          </div>
          <div className="form-control">
            <label className="label font-medium">Module</label>
            <p className="text-base-content/80">{bug.module || 'N/A'}</p>
          </div>
          <div className="form-control">
            <label className="label font-medium">Type</label>
            <p className="text-base-content/80">{bug.type || 'N/A'}</p>
          </div>
          <div className="form-control">
            <label className="label font-medium">Reported By</label>
            <p className="text-base-content/80">
              {bug.reported_by?.name || bug.reported_by?.email || 'N/A'}
            </p>
          </div>
          <div className="form-control">
            <label className="label font-medium">Assigned To</label>
            <p className="text-base-content/80">
              {bug.assigned_to?.name || bug.assigned_to?.email || 'Unassigned'}
            </p>
          </div>
          <div className="form-control">
            <label className="label font-medium">Created At</label>
            <p className="text-base-content/80">
              {bug.created_at ? new Date(bug.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          {bug.closure_date && (
            <div className="form-control">
              <label className="label font-medium">Closure Date</label>
              <p className="text-base-content/80">
                {new Date(bug.closure_date).toLocaleDateString()}
              </p>
            </div>
          )}
          {bug.image ? (
            <div className="form-control">
              <label className="label font-medium">Image</label>
              <div className="relative w-full max-w-[400px] h-[200px] bg-base-200 rounded-lg overflow-hidden shadow-md">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {imageError ? (
                  <div className="flex items-center justify-center w-full h-full bg-base-300 text-base-content/60">
                    <p>Image not available</p>
                  </div>
                ) : (
                  <img
                    src={bug.image}
                    alt="Bug screenshot"
                    className={`w-full h-full object-contain rounded-lg ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="form-control">
              <label className="label font-medium">Image</label>
              <p className="text-base-content/60">No image provided</p>
            </div>
          )}
        </div>
        <div className="modal-action mt-6">
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default BugDetailsModal;