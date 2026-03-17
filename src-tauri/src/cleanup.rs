use std::fs;
use tauri::api::path::{app_data_dir, document_dir};

pub fn cleanup_on_uninstall(app_handle: &tauri::AppHandle) {
    // Option 1: Laisser les fichiers (par défaut)
    // L'utilisateur pourra décider de les garder ou non

    // Option 2: Proposer de supprimer (à implémenter dans l'UI)
    // "Voulez-vous supprimer tous vos enregistrements ?"

    // Afficher où sont les fichiers
    if let Some(doc_dir) = document_dir() {
        let recordings_dir = doc_dir.join("Recordings").join("VocalAssistant");
        println!("Vos enregistrements sont dans : {:?}", recordings_dir);
    }
}
