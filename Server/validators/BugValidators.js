const Joi = require("joi");

const bugSchema = Joi.object({
  project_id: Joi.string().required().messages({
    "string.empty": "L'ID du projet ne peut pas être vide",
    "any.required": "L'ID du projet est requis",
  }),
  title: Joi.string().trim().min(3).max(100).required().messages({
    "string.empty": "Le titre ne peut pas être vide",
    "string.min": "Le titre doit contenir au moins 3 caractères",
    "string.max": "Le titre ne peut pas dépasser 100 caractères",
    "any.required": "Le titre est requis",
  }),
  description: Joi.string().trim().required().messages({
    "string.empty": "La description ne peut pas être vide",
    "any.required": "La description est requise",
  }),
  status: Joi.string()
    .valid("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED")
    .default("OPEN")
    .messages({
      "any.only":
        "Le statut doit être l'un des suivants : OPEN, IN_PROGRESS, RESOLVED, CLOSED",
    }),
  priority: Joi.string()
    .valid("LOW", "MEDIUM", "HIGH", "CRITICAL")
    .default("MEDIUM")
    .messages({
      "any.only":
        "La priorité doit être l'une des suivantes : LOW, MEDIUM, HIGH, CRITICAL",
    }),
  complexity: Joi.string()
    .valid("LOW", "MEDIUM", "HIGH")
    .default("MEDIUM")
    .messages({
      "any.only":
        "La complexité doit être l'une des suivantes : LOW, MEDIUM, HIGH",
    }),
  closure_date: Joi.date().iso().optional().allow(null).messages({
    "date.base": "La date de clôture doit être une date valide au format ISO",
    "date.format": "La date de clôture doit être au format ISO (YYYY-MM-DD)",
  }),
  module: Joi.string()
    .valid("FRONTEND", "BACKEND", "API", "DATABASE", "INFRASTRUCTURE", "OTHER")
    .required()
    .messages({
      "any.only":
        "Le module doit être l'un des suivants : FRONTEND, BACKEND, API, DATABASE, INFRASTRUCTURE, OTHER",
      "any.required": "Le module est requis",
    }),
  type: Joi.string()
    .valid("UI", "PERFORMANCE", "SECURITY", "FUNCTIONAL", "LOGIC", "OTHER")
    .required()
    .messages({
      "any.only":
        "Le type doit être l'un des suivants : UI, PERFORMANCE, SECURITY, FUNCTIONAL, LOGIC, OTHER",
      "any.required": "Le type est requis",
    }),
  assigned_to: Joi.string().allow(null).optional().messages({
    "string.base": "L'ID de l'utilisateur assigné doit être une chaîne valide",
  }),
  reported_by: Joi.string().required().messages({
    "string.empty": "L'ID du rapporteur ne peut pas être vide",
    "any.required": "L'ID du rapporteur est requis",
  }),
  image: Joi.string().uri().optional().messages({
    "string.uri": "Image URL must be a valid URI",
  }),
}).messages({
  "object.base": "Les données du bug doivent être un objet",
});

module.exports = {
  validateBug: (data) => bugSchema.validate(data, { abortEarly: false }),
};
