import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast'; // Ensure this is installed

const BugModal = ({
  isOpen,
  onClose,
  bug,
  projectId,
  onCreateBug,
  onUpdateBug,
  modalRef,
  isViewMode = false,
  isEditMode = false,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'OPEN',
    priority: 'MEDIUM',
    complexity: 'MEDIUM',
    closure_date: '',
    module: 'OTHER',
    type: 'OTHER',
    image: null,
  });

  const [loading, setLoading] = useState(false);

  // Initialize form with bug data if editing or viewing
  useEffect(() => {
    if (bug) {
      setFormData({
        title: bug.title || '',
        description: bug.description || '',
        status: bug.status || 'OPEN',
        priority: bug.priority || 'MEDIUM',
        complexity: bug.complexity || 'MEDIUM',
        closure_date: bug.closure_date ? new Date(bug.closure_date).toISOString().split('T')[0] : '',
        module: bug.module || 'OTHER',
        type: bug.type || 'OTHER',
        image: null,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'OPEN',
        priority: 'MEDIUM',
        complexity: 'MEDIUM',
        closure_date: '',
        module: 'OTHER',
        type: 'OTHER',
        image: null,
      });
    }
  }, [bug]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image' && !isViewMode) {
      setFormData({ ...formData, image: files[0] || null });
    } else if (!isViewMode) {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const bugToSubmit = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        complexity: formData.complexity,
        closure_date: formData.closure_date || undefined,
        module: formData.module,
        type: formData.type,
        image: formData.image || null,
        project_id: projectId,
      };

      console.log('BugModal - Submitting bug with fixed ID format:', {
        id: bug?._id,
        data: bugToSubmit,
      });

      if (bug && isEditMode) {
        const bugId = String(bug._id);
        await onUpdateBug(bugId, bugToSubmit);
      } else if (!bug) {
        await onCreateBug(bugToSubmit);
      }
      onClose();
    } catch (error) {
      console.error('Error submitting bug:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
        toast.error(`Error: ${error.response.data.message || 'Unknown server error'}`);
      } else {
        toast.error('Failed to save bug');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClickOutside = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const modalTitle = isViewMode ? 'View Bug' : isEditMode ? 'Edit Bug' : 'Report New Bug';
  const submitButtonText = isViewMode ? 'Close' : isEditMode ? 'Update Bug' : 'Report Bug';
  const isDisabled = isViewMode || loading;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClickOutside}
        >
          <motion.div
            ref={modalRef}
            className="bg-base-100 rounded-xl shadow-2xl max-w-xl w-full"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary rounded-t-xl"></div>

              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-primary">{modalTitle}</h2>
                  <button
                    className="btn btn-sm btn-circle btn-ghost"
                    onClick={onClose}
                    disabled={loading}
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Bug Title</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      placeholder="Enter bug title"
                      className="input input-bordered"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      disabled={isDisabled}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Description</span>
                    </label>
                    <textarea
                      name="description"
                      placeholder="Describe the bug..."
                      className="textarea textarea-bordered h-24"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      disabled={isDisabled}
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Status</span>
                      </label>
                      <select
                        name="status"
                        className="select select-bordered w-full"
                        value={formData.status}
                        onChange={handleChange}
                        disabled={isDisabled}
                      >
                        <option value="OPEN">Open</option>
               
                        <option value="CLOSED">Closed</option>
                      </select>
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Priority</span>
                      </label>
                      <select
                        name="priority"
                        className="select select-bordered w-full"
                        value={formData.priority}
                        onChange={handleChange}
                        disabled={isDisabled}
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Complexité</span>
                      </label>
                      <select
                        name="complexity"
                        className="select select-bordered w-full"
                        value={formData.complexity}
                        onChange={handleChange}
                        disabled={isDisabled}
                      >
                        <option value="LOW">Basse</option>
                        <option value="MEDIUM">Moyenne</option>
                        <option value="HIGH">Haute</option>
                      </select>
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Module</span>
                      </label>
                      <select
                        name="module"
                        className="select select-bordered w-full"
                        value={formData.module}
                        onChange={handleChange}
                        required
                        disabled={isDisabled}
                      >
                        <option value="FRONTEND">Frontend</option>
                        <option value="BACKEND">Backend</option>
                        <option value="API">API</option>
                        <option value="DATABASE">Base de Données</option>
                        <option value="INFRASTRUCTURE">Infrastructure</option>
                        <option value="OTHER">Autre</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Type de Bug</span>
                    </label>
                    <select
                      name="type"
                      className="select select-bordered w-full"
                      value={formData.type}
                      onChange={handleChange}
                      required
                      disabled={isDisabled}
                    >
                      <option value="UI">Interface Utilisateur</option>
                      <option value="PERFORMANCE">Performance</option>
                      <option value="SECURITY">Sécurité</option>
                      <option value="FUNCTIONAL">Fonctionnel</option>
                      <option value="LOGIC">Logique</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Date de Clôture</span>
                      </label>
                      <input
                        type="date"
                        name="closure_date"
                        className="input input-bordered"
                        value={formData.closure_date}
                        onChange={handleChange}
                        disabled={isDisabled}
                      />
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Screenshot (Optional)</span>
                    </label>
                    <input
                      type="file"
                      name="image"
                      accept="image/*"
                      className="file-input file-input-bordered w-full"
                      onChange={handleChange}
                      disabled={isDisabled}
                    />
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`btn btn-primary ${loading ? 'loading' : ''}`}
                      disabled={isDisabled || loading}
                    >
                      {loading ? 'Saving...' : submitButtonText}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BugModal;