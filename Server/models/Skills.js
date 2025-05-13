const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Référence à l'ID de l'utilisateur
    ref: 'User', // Référence au modèle User
    required: true, // Ce champ est obligatoire
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: false, // Ce champ n'est pas obligatoire
  },
  name: {
    type: String,
    required: true,
    trim: true, // Enlève les espaces inutiles avant et après
  },
  description: {
    type: String,
    trim: true, // Enlève les espaces inutiles avant et après
    required: true, // Le champ description est requis
  },
  category: {
    type: String,
    required: true, // Le champ catégorie est requis
    enum: ['Technical', 'Soft Skill', 'Management'], // Liste de catégories possibles (par exemple)
  },
  tags: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true, // Enregistre automatiquement les dates de création et de mise à jour
});

module.exports = mongoose.model('Skill', skillSchema);