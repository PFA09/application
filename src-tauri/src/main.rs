#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use chrono::Local;
use tauri::path::BaseDirectory;
use tauri::Manager;

#[derive(Serialize, Deserialize, Clone)]
struct Recording {
    name: String,
    path: String,
    size: u64,
    created: String,
}

// Obtenir le dossier de stockage dans l'application
fn get_recordings_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    // Utiliser le dossier de données de l'application
    // Sur Windows: C:\Users\NomUtilisateur\AppData\Local\com.handicap.vocal\data\recordings
    // Sur macOS: ~/Library/Application Support/com.handicap.vocal/recordings
    // Sur Linux: ~/.local/share/com.handicap.vocal/recordings
    let app_dir = app_handle.path()
        .app_data_dir()
        .expect("Impossible d'obtenir le dossier de l'application");

    let recordings_dir = app_dir.join("recordings");

    // Créer le dossier s'il n'existe pas
    if !recordings_dir.exists() {
        let _ = std::fs::create_dir_all(&recordings_dir);
    }

    recordings_dir
}

#[tauri::command]
fn save_audio_file(app_handle: tauri::AppHandle, audio_data: Vec<u8>, filename: String) -> Result<String, String> {
    let recordings_dir = get_recordings_dir(&app_handle);

    // Générer un nom unique avec timestamp
    let timestamp = Local::now().format("%Y%m%d_%H%M%S");
    let final_filename = format!("recording_{}_{}", timestamp, filename);
    let filepath = recordings_dir.join(final_filename);

    // Sauvegarder le fichier
    fs::write(&filepath, audio_data).map_err(|e| e.to_string())?;

    Ok(filepath.to_string_lossy().to_string())
}

#[tauri::command]
fn list_recordings(app_handle: tauri::AppHandle) -> Result<Vec<Recording>, String> {
    let recordings_dir = get_recordings_dir(&app_handle);

    if !recordings_dir.exists() {
        return Ok(vec![]);
    }

    let mut recordings = Vec::new();

    for entry in fs::read_dir(recordings_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.extension().and_then(|e| e.to_str()) == Some("wav") {
            let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;

            // Récupérer la date de création/modification
            let created = metadata.created()
                .or_else(|_| metadata.modified())
                .map(|time| {
                    let datetime: chrono::DateTime<chrono::Local> = time.into();
                    datetime.to_rfc3339()
                })
                .unwrap_or_else(|_| "Unknown".to_string());

            recordings.push(Recording {
                name: path.file_name().unwrap().to_string_lossy().to_string(),
                path: path.to_string_lossy().to_string(),
                size: metadata.len(),
                created,
            });
        }
    }

    // Trier par date (plus récent d'abord)
    recordings.sort_by(|a, b| b.created.cmp(&a.created));

    Ok(recordings)
}

#[tauri::command]
fn delete_recording(app_handle: tauri::AppHandle, filepath: String) -> Result<(), String> {
    fs::remove_file(filepath).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_recordings_folder(app_handle: tauri::AppHandle) -> Result<String, String> {
    let path = get_recordings_dir(&app_handle);
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn open_recordings_folder(app_handle: tauri::AppHandle) -> Result<(), String> {
    let path = get_recordings_dir(&app_handle);

    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer")
        .arg(path)
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(path)
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(path)
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_audio_file,
            list_recordings,
            delete_recording,
            get_recordings_folder,
            open_recordings_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
