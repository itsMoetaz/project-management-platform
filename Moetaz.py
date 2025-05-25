import spacy
from sentence_transformers import SentenceTransformer, util
from pymongo import MongoClient
import argparse
import json
import sys
import time

# Modify the logging function to send logs only to stderr, not stdout
def log(message):
    """Log a message with timestamp to stderr only for debugging"""
    timestamp = time.strftime("%H:%M:%S", time.localtime())
    print(f"[{timestamp}] {message}", file=sys.stderr, flush=True)

# Log start time
log("Script started")

# Connexion MongoDB
log("Connecting to MongoDB...")
client = MongoClient("mongodb+srv://moetazbenkhedher:47ffYtsEXjONoywR@planify.ry411py.mongodb.net/")
db = client["planify"]  # nom de votre base
users_collection = db["users"]  # nom de votre collection utilisateurs
log("MongoDB connection established")

# Chargement des modèles NLP - this is the slow part
log("Loading NLP models... (this may take some time)")
start_time = time.time()
nlp = spacy.load("en_core_web_sm")
log(f"spaCy model loaded in {time.time() - start_time:.2f} seconds")

start_time = time.time()
semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
log(f"Sentence transformer model loaded in {time.time() - start_time:.2f} seconds")

# --------------------------------------------------
# Récupérer les profils depuis MongoDB
# --------------------------------------------------
def get_profiles_from_workspace(workspace_id):
    log(f"Getting profiles for workspace: {workspace_id}")
    profiles = []
    try:
        # Get the workspace document to access member IDs
        workspace_collection = db["workspaces"]
        workspace = workspace_collection.find_one({"_id": workspace_id})
        
        if not workspace:
            log(f"Workspace with ID {workspace_id} not found")
            return profiles
            
        # Extract member user IDs
        member_ids = []
        
        # Add the owner
        if workspace.get("owner"):
            member_ids.append(workspace["owner"])
            
        # Add regular members
        for member in workspace.get("members", []):
            if isinstance(member, dict) and "user" in member:
                member_ids.append(member["user"])
            elif isinstance(member, str):
                member_ids.append(member)
                
        # Query only users who are members of the workspace
        for user in users_collection.find({"_id": {"$in": member_ids}}):
            profile = {
                "id": user["_id"],
                "name": user["name"],
                "skills": user.get("skills", []),
                "role": "owner" if user["_id"] == workspace["owner"] else next(
                    (m["role"] for m in workspace["members"] if isinstance(m, dict) and m.get("user") == user["_id"]),
                    "viewer"
                )
            }
            profiles.append(profile)
            
        log(f"Found {len(profiles)} member profiles")
        
    except Exception as e:
        log(f"Error retrieving workspace profiles: {e}")
    
    return profiles

# --------------------------------------------------
# Score sémantique
# --------------------------------------------------
def compute_semantic_score(task_description, candidate):
    candidate_text = candidate["name"] + " " + " ".join(candidate["skills"])
    embedding_task = semantic_model.encode(task_description, convert_to_tensor=True)
    embedding_candidate = semantic_model.encode(candidate_text, convert_to_tensor=True)
    cosine_score = util.cos_sim(embedding_task, embedding_candidate).item()
    return cosine_score

# --------------------------------------------------
# Score rule‑based
# --------------------------------------------------
def compute_rule_based_score(task_description, candidate):
    task_lower = task_description.lower()
    num_matches = sum(skill.lower() in task_lower for skill in candidate["skills"])
    return num_matches / len(candidate["skills"]) if candidate["skills"] else 0

# --------------------------------------------------
# Combiner les deux scores
# --------------------------------------------------
def compute_final_score(task_description, candidate, weight_semantic=0.6, weight_rule=0.4):
    semantic = compute_semantic_score(task_description, candidate)
    rule = compute_rule_based_score(task_description, candidate)
    combined_score = weight_semantic * semantic + weight_rule * rule
    return combined_score

# --------------------------------------------------
# Matching des profils
# --------------------------------------------------
def match_profiles(task_description, profiles):
    log(f"Matching profiles for task: {task_description[:50]}...")
    
    matches = []
    for profile in profiles:
        score = compute_final_score(task_description, profile)
        profile_with_score = profile.copy()  # Create a copy to avoid modifying the original
        profile_with_score["score"] = score
        matches.append(profile_with_score)
    
    # Sort by score in descending order
    matches.sort(key=lambda x: x["score"], reverse=True)
    log(f"Found {len(matches)} matches, top score: {matches[0]['score'] if matches else 'N/A'}")
    return matches

# --------------------------------------------------
# Programme principal
# --------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Match profiles for task assignment')
    parser.add_argument('--workspace_id', type=str, required=True, help='Workspace ID')
    parser.add_argument('--task_description', type=str, required=True, help='Task description')
    
    # Always parse arguments when running as a script
    if '--workspace_id' in sys.argv and '--task_description' in sys.argv:
        args = parser.parse_args()
        from bson.objectid import ObjectId
        
        try:
            log(f"Processing workspace ID: {args.workspace_id}")
            log(f"Task description length: {len(args.task_description)}")
            
            # Convert string ID to ObjectId
            workspace_id = ObjectId(args.workspace_id)
            task_description = args.task_description

            # Get profiles from the workspace
            profiles = get_profiles_from_workspace(workspace_id)
            
            if not profiles:
                print(json.dumps([]))
            else:
                # Calculate matches and sort by score
                matched_profiles = match_profiles(task_description, profiles)
                # Convert ObjectId to string for JSON serialization
                for profile in matched_profiles:
                    profile['id'] = str(profile['id'])
                
                # Print as JSON for the API to parse
                print(json.dumps(matched_profiles))
                
        except Exception as e:
            error_message = f"Error in Python script: {str(e)}"
            log(error_message)
            print(json.dumps({"error": str(e)}))
            sys.exit(1)
    else:
        from bson.objectid import ObjectId
        
        print("\n🔍 Entrer l'ID du workspace :")
        workspace_id_str = input("> ")
        
        try:
            # Convert string ID to ObjectId
            workspace_id = ObjectId(workspace_id_str)
            
            print("\n🔍 Entrer la description de la tâche :")
            task_description = input("> ")

            # Récupération des profils du workspace
            profiles = get_profiles_from_workspace(workspace_id)
            
            if not profiles:
                print("Aucun membre trouvé dans ce workspace.")
            else:
                # Calcul et classement
                matched_profiles = match_profiles(task_description, profiles)

                # Affichage des résultats
                print("\n🧑‍💻 Classement des candidats :")
                print("{:<5} {:<24} {:<30} {:<10} {:<10}".format("Rank", "ID", "Name", "Role", "Score"))
                print("-" * 80)
                for idx, candidate in enumerate(matched_profiles, start=1):
                    print("{:<5} {:<24} {:<30} {:<10} {:.2f}".format(
                        idx,
                        str(candidate["id"]),
                        candidate["name"],
                        candidate["role"],
                        candidate["score"]
                    ))
        except Exception as e:
            log(f"Error: {e}")