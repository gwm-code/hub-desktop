use std::net::{TcpListener, TcpStream};
use std::io::{Read, Write, ErrorKind};
use std::sync::{Arc, Mutex};
use std::thread;
use ssh2::Session;
use lazy_static::lazy_static;

lazy_static! {
    static ref SSH_HANDLE: Mutex<Option<thread::JoinHandle<()>>> = Mutex::new(None);
    static ref STOP_SIGNAL: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
}

#[tauri::command]
async fn start_ssh_tunnel(
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key: Option<String>,
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
        let mut sess = match Session::new() {
            Ok(s) => s,
            Err(_) => return,
        };
        sess.set_tcp_stream(tcp);
        if let Err(_) = sess.handshake() {
            return;
        }

        if let Some(key_content) = private_key {
            if let Err(_) = sess.userauth_pubkey_memory(&username, None, &key_content, None) {
                return;
            }
        } else if let Some(pw) = password {
            if let Err(_) = sess.userauth_password(&username, &pw) {
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

        // Make the session non-blocking for the proxy loop
        sess.set_blocking(false);

        while !*thread_stop_signal.lock().unwrap() {
            if let Ok((mut local_stream, _)) = listener.accept() {
                let mut remote_channel = match sess.channel_direct_tcpip("127.0.0.1", 4000, None) {
                    Ok(c) => c,
                    Err(_) => continue,
                };

                local_stream.set_nonblocking(true).ok();

                let mut buf_l2r = [0; 16384];
                let mut buf_r2l = [0; 16384];

                while !*thread_stop_signal.lock().unwrap() {
                    let mut acted = false;

                    // Local to Remote
                    match local_stream.read(&mut buf_l2r) {
                        Ok(0) => break,
                        Ok(n) => {
                            let _ = remote_channel.write_all(&buf_l2r[..n]);
                            acted = true;
                        }
                        Err(ref e) if e.kind() == ErrorKind::WouldBlock => {}
                        Err(_) => break,
                    }

                    // Remote to Local
                    match remote_channel.read(&mut buf_r2l) {
                        Ok(0) => break,
                        Ok(n) => {
                            let _ = local_stream.write_all(&buf_r2l[..n]);
                            acted = true;
                        }
                        Err(ref e) if e.kind() == ErrorKind::WouldBlock => {}
                        Err(_) => break,
                    }

                    if !acted {
                        thread::sleep(std::time::Duration::from_millis(10));
                    }
                }
            }
            thread::sleep(std::time::Duration::from_millis(100));
        }
    });

    *handle_lock = Some(handle);
    Ok(())
}

#[tauri::command]
fn stop_ssh_tunnel() -> Result<(), String> {
    let mut stop_signal = STOP_SIGNAL.lock().map_err(|e| e.to_string())?;
    *stop_signal = true;
    
    let mut handle_lock = SSH_HANDLE.lock().map_err(|e| e.to_string())?;
    if let Some(handle) = handle_lock.take() {
        drop(handle);
    }
    
    Ok(())
}

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
