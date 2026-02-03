use std::net::{TcpListener, TcpStream};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use ssh2::Session;
use lazy_static::lazy_static;

lazy_static! {
    static ref SSH_HANDLE: Mutex<Option<thread::JoinHandle<()>>> = Mutex::new(None);
    static ref STOP_SIGNAL: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
}

#[tauri::command]
pub async fn start_ssh_tunnel(
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key_path: Option<String>,
) -> Result<(), String> {
    let mut stop_signal = STOP_SIGNAL.lock().map_err(|e| e.to_string())?;
    *stop_signal = false;
    drop(stop_signal);

    let mut handle_lock = SSH_HANDLE.lock().map_err(|e| e.to_string())?;
    if handle_lock.is_some() {
        return Err("Tunnel already running".into());
    }

    let thread_stop_signal = STOP_SIGNAL.clone();
    
    let handle = thread::spawn(move || {
        let tcp = match TcpStream::connect(format!("{}:{}", host, port)) {
            Ok(t) => t,
            Err(_) => return,
        };
        let sess = match Session::new() {
            Ok(s) => s,
            Err(_) => return,
        };
        let mut sess = sess;
        sess.set_tcp_stream(tcp);
        if let Err(_) = sess.handshake() {
            return;
        }

        if let Some(pw) = password {
            if let Err(_) = sess.userauth_password(&username, &pw) {
                return;
            }
        } else if let Some(path) = private_key_path {
            if let Err(_) = sess.userauth_pubkey_file(&username, None, std::path::Path::new(&path), None) {
                return;
            }
        }

        if !sess.authenticated() {
            return;
        }

        let listener = match TcpListener::bind("127.0.0.1:4000") {
            Ok(l) => l,
            Err(_) => return,
        };
        listener.set_nonblocking(true).ok();

        while !*thread_stop_signal.lock().unwrap() {
            if let Ok((mut local_stream, _)) = listener.accept() {
                let mut remote_channel = match sess.channel_direct_tcpip("127.0.0.1", 4000, None) {
                    Ok(c) => c,
                    Err(_) => continue,
                };

                let mut local_clone = local_stream.try_clone().unwrap();
                
                // Use a scope to manage channel streaming without thread safety issues
                let mut remote_stream = remote_channel.stream(0);
                let mut remote_read = remote_channel.stream(0);
                
                // Copy local to remote
                thread::spawn(move || {
                    let mut buf = [0; 16384];
                    while let Ok(n) = local_clone.read(&mut buf) {
                        if n == 0 { break; }
                        if remote_stream.write_all(&buf[..n]).is_err() { break; }
                    }
                });

                // Copy remote to local
                thread::spawn(move || {
                    let mut buf = [0; 16384];
                    while let Ok(n) = remote_read.read(&mut buf) {
                        if n == 0 { break; }
                        if local_stream.write_all(&buf[..n]).is_err() { break; }
                    }
                });
            }
            thread::sleep(std::time::Duration::from_millis(100));
        }
    });

    *handle_lock = Some(handle);
    Ok(())
}

#[tauri::command]
pub fn stop_ssh_tunnel() -> Result<(), String> {
    let mut stop_signal = STOP_SIGNAL.lock().map_err(|e| e.to_string())?;
    *stop_signal = true;
    
    let mut handle_lock = SSH_HANDLE.lock().map_err(|e| e.to_string())?;
    if let Some(handle) = handle_lock.take() {
        // We don't join to avoid blocking the main thread if the listener is stuck
        // But in a real app we might want to be cleaner.
        drop(handle);
    }
    
    Ok(())
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, start_ssh_tunnel, stop_ssh_tunnel])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
