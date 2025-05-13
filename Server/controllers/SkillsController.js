const Skill = require('../models/Skills');
const Workspace = require('../models/Workspace');
const { validateSkill, validateSkillUpdate } = require('../validators/SkillsValidators');

// Vérifier si l'utilisateur est owner de l'espace de travail
const checkOwnerPermission = async (workspaceId, userId) => {
  if (!workspaceId) return true; // Si workspaceId n'est pas fourni, pas de vérification
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new Error('Espace de travail non trouvé');
  }
  return workspace.owner.toString() === userId.toString();
};

// Obtenir toutes les compétences
exports.getAllSkills = async (req, res) => {
  try {
    const skills = await Skill.find();
    res.status(200).json(skills);
  } catch (err) {
    console.error('Erreur lors de la récupération des compétences :', err.message);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Obtenir une compétence par ID
exports.getSkillById = async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ message: 'Compétence non trouvée' });

    const workspaceId = req.query.workspaceId;
    const isOwner = workspaceId ? await checkOwnerPermission(workspaceId, req.user._id) : false;
    if (skill.userId.toString() !== req.user._id.toString() && !isOwner) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    res.status(200).json(skill);
  } catch (err) {
    console.error('Erreur lors de la récupération de la compétence par ID :', err.message);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Créer une compétence (pour l'utilisateur connecté uniquement)
exports.createSkill = async (req, res) => {
  console.log('Requête reçue, headers :', req.headers);
  console.log('Données reçues dans req.body :', req.body);

  const { error } = validateSkill(req.body);
  if (error) {
    console.log('Erreurs de validation :', error.details);
    return res.status(400).json({ errors: error.details.map((err) => err.message) });
  }

  if (!req.user || !req.user._id) {
    console.log('Utilisateur non authentifié, req.user :', req.user);
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  const { workspaceId, name, description, category, tags } = req.body;

  try {
    // Vérifier l'accès à l'espace de travail si fourni
    if (workspaceId) {
      const workspace = await Workspace.findOne({
        _id: workspaceId,
        $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
      });
      if (!workspace) {
        return res.status(403).json({ message: 'Accès refusé à l\'espace de travail' });
      }
    }

    console.log('Création de la compétence avec les données :', req.body, 'pour userId :', req.user._id);
    const newSkill = new Skill({
      userId: req.user._id,
      workspaceId: workspaceId || null, // Facultatif
      name,
      description,
      category,
      tags,
    });
    await newSkill.save();
    res.status(201).json(newSkill);
  } catch (err) {
    console.error('Erreur lors de la création de la compétence :', err.message, err.stack);
    res.status(500).json({ message: 'Échec de la création de la compétence', error: err.message });
  }
};

// Ajouter une compétence à un membre (accessible à tous)
exports.addSkillToMember = async (req, res) => {
  console.log('Requête reçue, headers :', req.headers);
  console.log('Données reçues dans req.body :', req.body);

  const { error } = validateSkill(req.body);
  if (error) {
    console.log('Erreurs de validation :', error.details); // Ajouter ce log
    return res.status(400).json({ errors: error.details.map((err) => err.message) });
  }

  if (!req.user || !req.user._id) {
    console.log('Utilisateur non authentifié, req.user :', req.user);
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  const { userId, workspaceId, name, description, category, tags } = req.body;

  try {
    if (workspaceId) {
      const workspaceAccess = await Workspace.findOne({
        _id: workspaceId,
        $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
      });
      if (!workspaceAccess) {
        return res.status(403).json({ message: 'Vous n\'avez pas accès à cet espace de travail' });
      }
    }

    if (workspaceId) {
      const workspace = await Workspace.findOne({
        _id: workspaceId,
        $or: [{ owner: userId }, { 'members.user': userId }],
      });
      if (!workspace) {
        return res.status(403).json({ message: 'L\'utilisateur cible n\'est pas membre de cet espace de travail' });
      }
    }

    console.log('Ajout de la compétence avec les données :', req.body, 'pour userId :', userId);
    const newSkill = new Skill({
      userId,
      workspaceId: workspaceId || null,
      name,
      description,
      category,
      tags,
    });
    await newSkill.save();
    res.status(201).json(newSkill);
  } catch (err) {
    console.error('Erreur lors de l\'ajout de la compétence :', err.message, err.stack);
    res.status(500).json({ message: 'Échec de l\'ajout de la compétence', error: err.message });
  }
};

// Mettre à jour une compétence
exports.updateSkill = async (req, res) => {
  const { error } = validateSkillUpdate(req.body);
  if (error) {
    console.log('Erreurs de validation :', error.details);
    return res.status(400).json({ errors: error.details.map((err) => err.message) });
  }

  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ message: 'Compétence non trouvée' });

    const workspaceId = req.body.workspaceId || req.query.workspaceId;
    const isOwner = workspaceId ? await checkOwnerPermission(workspaceId, req.user._id) : false;
    if (skill.userId.toString() !== req.user._id.toString() && !isOwner) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    console.log('Mise à jour de la compétence avec ID :', req.params.id, 'Données :', req.body);
    const updatedSkill = await Skill.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body, workspaceId: req.body.workspaceId || null } },
      { new: true }
    );
    res.status(200).json(updatedSkill);
  } catch (err) {
    console.error('Erreur lors de la mise à jour de la compétence :', err.message);
    res.status(500).json({ message: 'Échec de la mise à jour de la compétence', error: err.message });
  }
};

// Supprimer une compétence
exports.deleteSkill = async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ message: 'Compétence non trouvée' });

    const workspaceId = req.query.workspaceId;
    const isOwner = workspaceId ? await checkOwnerPermission(workspaceId, req.user._id) : false;
    if (skill.userId.toString() !== req.user._id.toString() && !isOwner) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    await Skill.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Compétence supprimée avec succès' });
  } catch (err) {
    console.error('Erreur lors de la suppression de la compétence :', err.message);
    res.status(500).json({ message: 'Échec de la suppression de la compétence', error: err.message });
  }
};

// Obtenir toutes les compétences de l'utilisateur connecté
exports.getUserSkills = async (req, res) => {
  console.log('Requête reçue, headers :', req.headers);
  console.log('Utilisateur de la requête :', req.user);

  if (!req.user || !req.user._id) {
    console.log('Utilisateur non authentifié, req.user :', req.user, 'Headers :', req.headers);
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  try {
    const skills = await Skill.find({ userId: req.user._id });
    console.log('Compétences trouvées pour userId :', req.user._id, skills);
    if (!skills.length) {
      return res.status(200).json({ message: 'Aucune compétence trouvée pour cet utilisateur', skills: [] });
    }
    res.status(200).json(skills);
  } catch (err) {
    console.error('Erreur lors de la récupération des compétences de l\'utilisateur :', err.message, err.stack);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Obtenir les compétences d'un membre
exports.getMemberSkills = async (req, res) => {
  try {
    const { userId } = req.params;
    const { workspaceId } = req.query;

    console.log('Récupération des compétences pour userId :', userId, 'dans workspaceId :', workspaceId);

    // Pas de vérification d'accès si workspaceId est absent
    const query = { userId };
    if (workspaceId) {
      query.workspaceId = workspaceId;
      const workspace = await Workspace.findOne({
        _id: workspaceId,
        $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
      });
      if (!workspace) {
        return res.status(403).json({ message: 'Accès refusé' });
      }
    }

    const skills = await Skill.find(query);
    console.log('Compétences trouvées pour userId :', userId, skills);
    res.status(200).json({ skills });
  } catch (error) {
    console.error('Erreur lors de la récupération des compétences du membre :', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};