// validators/resignationValidator.js
const { body, param, query, validationResult } = require('express-validator');

const validateResignationSubmit = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid User ID format'),
  body('workspaceId')
    .notEmpty().withMessage('Workspace ID is required')
    .isMongoId().withMessage('Invalid Workspace ID format'),
  body('reason')
    .notEmpty().withMessage('Reason is required')
    .isIn(['Personal Reasons', 'Career Change', 'Relocation', 'Other']).withMessage('Invalid reason'),
  body('effectiveDate')
    .notEmpty().withMessage('Effective date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      const date = new Date(value);
      if (date <= new Date()) {
        throw new Error('Effective date must be in the future');
      }
      return true;
    }),
  body('comment')
    .optional()
    .isString().withMessage('Comment must be a string'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateResignationStatus = [
  param('id')
    .notEmpty().withMessage('Resignation ID is required')
    .isMongoId().withMessage('Invalid Resignation ID format'),
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['Approved', 'Rejected']).withMessage('Invalid status'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = { validateResignationSubmit, validateResignationStatus };