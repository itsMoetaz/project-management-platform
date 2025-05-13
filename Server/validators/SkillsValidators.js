const Joi = require('joi');

const skillSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required',
  }),
  description: Joi.string().trim().required().messages({
    'string.empty': 'Description is required',
    'any.required': 'Description is required',
  }),
  category: Joi.string().valid('Technical', 'Soft Skill', 'Management').required().messages({
    'any.only': 'Category must be either Technical, Soft Skill, or Management',
    'any.required': 'Category is required',
  }),
  tags: Joi.number().min(0).max(100).default(0).messages({
    'number.base': 'Tags must be a number',
    'number.min': 'Tags must be at least 0',
    'number.max': 'Tags must not exceed 100',
  }),
  userId: Joi.any(),         // Accepte n'importe quelle valeur
  workspaceId: Joi.any(),    // Accepte n'importe quelle valeur
});

const skillUpdateSchema = Joi.object({
  name: Joi.string().trim(),
  description: Joi.string().trim(),
  category: Joi.string().valid('Technical', 'Soft Skill', 'Management'),
  tags: Joi.number().min(0).max(100),
  userId: Joi.any(),
  workspaceId: Joi.any(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

module.exports = {
  validateSkill: (data) => skillSchema.validate(data, { abortEarly: false }),
  validateSkillUpdate: (data) => skillUpdateSchema.validate(data, { abortEarly: false }),
};
