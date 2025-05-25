const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { validateUser } = require('../validators/validators');
const sendEmail = require('../utils/sendEmail');
// const { OAuth2Client } = require('google-auth-library');
// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const axios = require('axios');



exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Email ou mot de passe incorrect" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Email ou mot de passe incorrect" });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            {expiresIn: process.env.JWT_EXPIRE_TIME}
        );
        res.cookie('token', token, {
            httpOnly: false,
            secure: true,
            sameSite: 'None',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
        }).json({ 
            message: "Connexion réussie",
            token: token, // Add this line to include token in response
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            }
        });

    } catch (error) {
        res.status(500).json({ error: "Erreur serveur", details: error });
    }
};

exports.register = async (req, res) => {
    try {
        const { error, value } = validateUser(req.body);
        if (error) {
            return res.status(400).json({ errors: error.details.map(err => err.message) });
        }

        const { name, email, password, authentication_method, role, phone_number, bio } = value;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email déjà utilisé.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate verification token (6-digit code)
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            authentication_method: authentication_method || 'local',
            role: role || 'user',
            phone_number: phone_number || '',
            bio: bio ? bio.trim() : '',
            emailVerificationToken: hashedVerificationToken,
            emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            isVerified: false
        });

        await newUser.save();

        // Send verification email
        await sendEmail({
            email: newUser.email,
            name: newUser.name,
            subject: '[Planify] Vérification de votre adresse email',
            verificationToken: verificationToken,
            type: 'verification'
        });

        res.status(201).json({ 
            message: 'Utilisateur créé avec succès. Veuillez vérifier votre adresse email pour activer votre compte.',
            userId: newUser._id
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('token', {
        domain: process.env.COOKIE_DOMAIN || 'localhost',
        path: '/',
    }).json({ message: 'Déconnexion réussie' });
        res.status(200).json({ 
      message: 'Logged out successfully',
      clearStorage: true // Add this flag
    });
};

// exports.protection = async (req, res, next) => {
//     const token = req.cookies.token;
//     if (!token) {
//         return res.status(401).json({ error: 'Non authentifiéee. Veuillez vous connecter.' });
//     }

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         const user = await User.findById(decoded.id);

//         if (!user) {
//             return res.status(401).json({ error: 'Utilisateur non trouvé. Veuillez vous connecter.' });
//         }

//         if (user.passwordChangedAt) {
//             const passwordChangedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
//             if (decoded.iat < passwordChangedTimestamp) {
//                 return res.status(401).json({ error: 'Mot de passe récemment changé. Veuillez vous reconnecter.' });
//             }
//         }
        
//         req.user = user;
//         next();     
//     } catch (error) {
//         res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter.' });
//     }
// }

exports.protection = async (req, res, next) => {
  
    let token;
    // Vérifie l'en-tête Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Vérifie le cookie comme fallback
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else {
      return res.status(401).json({ error: 'Non authentifiéee. Veuillez vous connecter.' });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
  
      if (!user) {
        return res.status(401).json({ error: 'Utilisateur non trouvé. Veuillez vous connecter.' });
      }
  
      if (user.passwordChangedAt) {
        const passwordChangedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
        if (decoded.iat < passwordChangedTimestamp) {
          return res.status(401).json({ error: 'Mot de passe récemment changé. Veuillez vous reconnecter.' });
        }
      }
      
      req.user = user;
      next();     
    } catch (error) {
      console.error('Erreur lors de la vérification du token :', error.message);
      res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter.' });
    }
  };

exports.allowTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Non autorisé.' });
        }
        next();
    }
}

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé.' });
        }

        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');      
        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save();  

        await sendEmail({
            email: user.email,
            name: user.name,
            subject: '[Planify] Réinitialisation du mot de passe',
            resetToken
        });

        res.status(200).json({ status:'succes', message: 'Code de réinitialisation envoyé à votre adresse email.' });

    } catch (error) {     
        res.status(500).json({ error: error.message });
    }           
}

exports.verifyResetToken = async (req, res) => {
    const hashedToken = crypto
    .createHash('sha256')
    .update(req.body.resetToken)
    .digest('hex');      
    
    const user = await User.findOne({
         passwordResetToken: hashedToken,
          passwordResetExpires: { $gt: Date.now() }
         });
    
    if (!user) {
        return res.status(400).json({ error: 'Token invalide ou expiré.' });
    }

    user.passwordResetVerified = true;
    await user.save();

    res.status(200).json({ status: 'success', message: 'Token vérifié avec succès.' });

};

exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword, resetToken } = req.body;
        
        console.log("Request body:", { 
            emailProvided: !!email, 
            passwordProvided: !!newPassword, 
            tokenProvided: !!resetToken 
        });
        
        // Validate inputs
        if (!email || !newPassword || !resetToken) {
            return res.status(400).json({ 
                error: "Tous les champs sont requis (email, newPassword, resetToken)." 
            });
        }
        
        // Hash the token for comparison
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
            
        const user = await User.findOne({ 
            email,
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(404).json({ error: "Utilisateur non trouvé ou token invalide." });
        }

        // Additional verification
        if (!user.passwordResetVerified) {
            return res.status(401).json({ error: "Le token n'a pas été vérifié." });
        }

        // Make sure password is valid before hashing
        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({ 
                error: "Le nouveau mot de passe doit contenir au moins 6 caractères." 
            });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update user fields
        user.password = hashedPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.passwordResetVerified = false;
        user.passwordChangedAt = new Date();

        await user.save();

        res.status(200).json({ status: "success", message: "Mot de passe réinitialisé avec succès." });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ error: "Erreur lors de la réinitialisation du mot de passe." });
    }
};


exports.initiateGoogleAuth = (req, res) => {
    // Capture any client-side state info (like clientRedirect flag)
    const clientRedirect = req.query.clientRedirect === 'true';
    
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: `${process.env.BACKEND_URL}/api/auth/google/callback`,
        response_type: 'code',
        scope: 'profile email',
        access_type: 'offline',
        prompt: 'consent',
        // Store clientRedirect flag in state to retrieve it in callback
        state: clientRedirect ? 'clientRedirect=true' : ''
    });
    
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

exports.handleGoogleCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code) return res.status(400).json({ error: 'Authorization code missing' });
        
        // Check if this was a client-initiated redirect
        const clientRedirect = state && state.includes('clientRedirect=true');

        // Exchange code for tokens
        const { data: tokens } = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            code,
            redirect_uri: `${process.env.BACKEND_URL}/api/auth/google/callback`,
            grant_type: 'authorization_code'
        });

        // Get user info
        const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });

        // Find or create user
        let user = await User.findOne({ email: profile.email });
        if (!user) {
            user = new User({
                google_id: profile.id,
                email: profile.email,
                name: profile.name,
                authentication_method: 'google',
                role: 'user' // Default role for new users
            });
            await user.save();
        }

        // Generate and set cookie
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE_TIME }
        );

        // Set the cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            domain: process.env.COOKIE_DOMAIN,
            path: '/',
        });

        // Redirect based on the user's role
        if (clientRedirect) {
            // For client-initiated auth, return to login with success flag for frontend handling
            res.redirect(`${process.env.CLIENT_URL}/login?googleAuth=success`);
        } else {
            // For server-side flow, redirect based on role
            const redirectPath = user.role === 'admin' ? '/dashboard' : '/acceuil';
            res.redirect(`${process.env.CLIENT_URL}${redirectPath}`);
        }

    } catch (error) {
        console.error('Google OAuth error:', error);
        res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
    }
};
exports.verifyEmail = async (req, res) => {
    try {
        const { userId, verificationToken } = req.body;
        
        // Hash the token for comparison
        const hashedToken = crypto
            .createHash('sha256')
            .update(verificationToken)
            .digest('hex');
        
        // Find the user with this token and check expiration
        const user = await User.findOne({
            _id: userId,
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({ error: 'Token invalide ou expiré.' });
        }
        
        // Update the user
        user.isVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();
        
        // Generate and set JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            {expiresIn: process.env.JWT_EXPIRE_TIME}
        );
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            domain: process.env.COOKIE_DOMAIN || 'localhost',
            path: '/',
        }).status(200).json({
            message: 'Adresse email vérifiée avec succès.',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.initiateGithubLinking = (req, res) => {
  try {
    const userId = req.user._id;
    
    // Add a timestamp to prevent caching
    const timestamp = Date.now();
    
    // Simple, well-defined state parameter
    const state = JSON.stringify({
      userId: userId,
      isLinking: true,
      timestamp: timestamp
    });
    
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: `${process.env.BACKEND_URL}/api/auth/github/callback`,
      scope: 'user:email repo', // Make sure repo scope is included
      state: state,
      login: 'true', // Force GitHub to show the login page
      allow_signup: 'true'
    });
    
    console.log(`Initiating GitHub linking for user ID: ${userId} with timestamp ${timestamp}`);
    
    // Direct redirect without the logout step
    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    console.log("Redirecting to:", authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error("GitHub linking initiation error:", error);
    res.redirect(`${process.env.CLIENT_URL}/profile?error=github_link_failed&message=${encodeURIComponent(error.message)}`);
  }
};
exports.initiateGithubAuth = (req, res) => {
  try {
    const clientRedirect = req.query.clientRedirect === 'true';
    
    if (!process.env.GITHUB_CLIENT_ID) {
      console.error("Missing GitHub Client ID");
      return res.redirect(`${process.env.CLIENT_URL}/login?error=github_config_missing`);
    }
    
    // Create a proper state object like we do in the linking flow
    const state = JSON.stringify({
      clientRedirect: clientRedirect,
      timestamp: Date.now()
    });
    
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: `${process.env.BACKEND_URL}/api/auth/github/callback`,
      scope: 'user:email repo',
      state: state,
      login: 'true',
      allow_signup: 'true'
    });
    
    // Direct redirect instead of logout - this matches the linking function's approach
    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    console.log("Redirecting to GitHub auth:", authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error("GitHub auth initiation error:", error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=github_init_failed`);
  }
};
exports.handleGithubCallback = async (req, res) => {
  console.log("GitHub callback started");
  try {
    const { code, state } = req.query;
    console.log("GitHub callback received with code:", !!code);
    
    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL}/profile?error=no_code`);
    }
    
    // Parse state as before...
    let stateData = {};
    try {
      stateData = JSON.parse(state);
      console.log("Parsed state data:", JSON.stringify(stateData));
    } catch (e) {
      console.error("Could not parse state parameter:", state, e);
      if (req.query.userId) {
        stateData.userId = req.query.userId;
      }
    }
    
    // Token exchange and user fetch as before...
    console.log("Exchanging code for token...");
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code
      },
      { headers: { Accept: 'application/json' } }
    );
    
    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      console.error("No access token received from GitHub");
      return res.redirect(`${process.env.CLIENT_URL}/profile?error=no_token`);
    }
    
    // User fetch code as before...
    console.log("Fetching GitHub user data...");
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}` }
    });
    
    const User = require('../models/User');
    let user;
    
    if (stateData.userId) {
      console.log(`Looking for user with ID: ${stateData.userId}`);
      user = await User.findById(stateData.userId);
      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL}/profile?error=user_not_found`);
      }
      
      user.github_id = userResponse.data.id;
      if (!user.profile_picture) {
        user.profile_picture = userResponse.data.avatar_url;
      }
      await user.save();
    } else {
      return res.redirect(`${process.env.CLIENT_URL}/profile?error=missing_user_id`);
    }
    
    // This is where we fix the workspace and project creation
    console.log("Starting workspace creation...");
    try {
      const mongoose = require('mongoose');
      const Workspace = require('../models/Workspace');
      const Project = require('../models/Project');
      
      // FIRST FIX: Clean up existing projects with null workspace that have GitHub repo IDs
      // This will prevent duplicate key errors
      console.log("Cleaning up orphaned projects with GitHub IDs...");
      await Project.deleteMany({ 
        workspace: null,
        github_repo_id: { $exists: true, $ne: null }
      });
      
      // Create or find workspace with explicit ID handling
      let githubWorkspace = await Workspace.findOne({
        owner: user._id,
        name: "Github workspace" 
      });
      
      if (!githubWorkspace) {
        console.log("Creating new GitHub workspace");
        githubWorkspace = new Workspace({
          name: "Github workspace",
          description: "Your GitHub repositories",
          owner: user._id,
          members: [{ user: user._id, role: 'admin' }],
          projects: []
        });
        
        await githubWorkspace.save();
        console.log("Created new GitHub workspace with ID:", githubWorkspace._id);
      } else {
        console.log("Found existing GitHub workspace with ID:", githubWorkspace._id);
      }
      
      // Make sure we have a valid workspace ID before continuing
      if (!githubWorkspace || !githubWorkspace._id) {
        throw new Error("Failed to create or find valid workspace");
      }
      
      // Store the workspace ID as both string and ObjectId for safety
      const workspaceId = githubWorkspace._id;
      const workspaceIdStr = workspaceId.toString();
      
      console.log(`Using workspace ID: ${workspaceIdStr}`);
      
      // Fetch repositories - filter by ownership to avoid forks
      console.log("Fetching repositories from GitHub API...");
      const reposResponse = await axios.get('https://api.github.com/user/repos', {
        headers: { Authorization: `token ${accessToken}` },
        params: { 
          per_page: 100,
          visibility: 'all',
          sort: 'updated',
          affiliation: 'owner' // Only get repositories the user owns
        }
      });
      
      const repositories = reposResponse.data;
      console.log(`Successfully fetched ${repositories.length} owned repositories`);
      
      if (repositories.length === 0) {
        console.log("No repositories found to import");
      } else {
        let successCount = 0;
        let skipCount = 0;
        
        // Track existing projects for duplicate prevention
        const existingProjectIds = new Set();
        
        // First, get the current workspace projects
        if (githubWorkspace.projects && githubWorkspace.projects.length > 0) {
          for (const projectRef of githubWorkspace.projects) {
            try {
              if (typeof projectRef === 'object' && projectRef._id) {
                existingProjectIds.add(projectRef._id.toString());
              } else if (projectRef) {
                existingProjectIds.add(projectRef.toString());
              }
            } catch (err) {
              console.log(`Error processing existing project reference: ${projectRef}`);
            }
          }
        }
        
        console.log(`Found ${existingProjectIds.size} existing projects in workspace`);
        
        for (const repo of repositories) {
          try {
            console.log(`Processing repository: ${repo.name} (ID: ${repo.id})`);
            
            // Check if project already exists with this repo ID
            const existingProject = await Project.findOne({
              github_repo_id: String(repo.id)
            });
            
            if (existingProject) {
              console.log(`Project already exists for repo: ${repo.name}`);
              
              // SECOND FIX: Update existing project to ensure workspace is set correctly
              if (!existingProject.workspace || existingProject.workspace.toString() !== workspaceIdStr) {
                existingProject.workspace = workspaceId;
                await existingProject.save();
                console.log(`Updated existing project with correct workspace ID`);
              }
              
              // Add to workspace projects array if not already there
              const projectIdStr = existingProject._id.toString();
              if (!existingProjectIds.has(projectIdStr)) {
                githubWorkspace.projects.push(existingProject._id);
                existingProjectIds.add(projectIdStr);
              }
              
              skipCount++;
              continue;
            }
            
            // Create new project with explicit workspace ID
            const newProject = new Project({
              project_name: repo.name,
              description: repo.description || "No description",
              workspace: workspaceId, // THIRD FIX: Use the direct ObjectId, not a string that needs conversion
              status: 'not started',
              start_date: new Date(repo.created_at || Date.now()),
              end_date: new Date(new Date().setMonth(new Date().getMonth() + 3)),
              github_repo_id: String(repo.id),
              github_repo_url: repo.html_url || "",
              id_teamMembre: [user._id]
            });
            
            // Double-check the workspace is set
            console.log(`Project workspace set to: ${newProject.workspace}`);
            
            // Save the project
            const savedProject = await newProject.save();
            console.log(`Project saved with ID: ${savedProject._id}`);
            
            // Add to workspace projects array if not already there
            const newProjectIdStr = savedProject._id.toString();
            if (!existingProjectIds.has(newProjectIdStr)) {
              githubWorkspace.projects.push(savedProject._id);
              existingProjectIds.add(newProjectIdStr);
              successCount++;
            }
          } catch (error) {
            console.error(`Error importing repository ${repo.name}:`, error.message);
          }
        }
        
        // Save workspace with updated projects array
        await githubWorkspace.save();
        console.log(`GitHub workspace updated with ${githubWorkspace.projects.length} total projects`);
        console.log(`Repository import summary - Added: ${successCount}, Skipped: ${skipCount}`);
      }
    } catch (workspaceError) {
      console.error("Error in workspace creation process:", workspaceError);
    }
    
    // Token generation and redirect as before...
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE_TIME || '7d' }
    );
    
    res.cookie('token', token, {
      httpOnly: false, // Allow JS access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined
    });

    console.log("GitHub account linked successfully, redirecting to profile");
    return res.redirect(`${process.env.CLIENT_URL}/profile?token=${token}&githubLinked=success`);
  } catch (error) {
    console.error("GitHub callback error:", error);
    const errorMsg = error.response?.data?.message || error.message || 'unknown_error';
    return res.redirect(`${process.env.CLIENT_URL}/profile?error=${encodeURIComponent(errorMsg)}`);
  }
};