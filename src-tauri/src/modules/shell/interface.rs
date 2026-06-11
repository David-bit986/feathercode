use std::path::PathBuf;
use std::process::Command;

use crate::modules::workspace::WorkspaceEnv;

pub struct CommandConfig {
    pub command: String,
    pub cwd: Option<PathBuf>,
    pub env: WorkspaceEnv,
    pub timeout_secs: Option<u64>,
}

impl CommandConfig {
    pub fn new(command: String, env: WorkspaceEnv) -> Self {
        Self {
            command,
            cwd: None,
            env,
            timeout_secs: None,
        }
    }

    pub fn with_cwd(mut self, cwd: PathBuf) -> Self {
        self.cwd = Some(cwd);
        self
    }

    pub fn with_timeout(mut self, secs: u64) -> Self {
        self.timeout_secs = Some(secs);
        self
    }

    pub fn build_command(&self) -> Result<Command, String> {
        #[cfg(windows)]
        if let WorkspaceEnv::Wsl { distro } = &self.env {
            crate::modules::workspace::validate_wsl_distro_name(distro)?;
            let mut cmd = Command::new("wsl.exe");
            cmd.arg("-d").arg(distro);
            if let Some(cwd) = &self.cwd {
                let cwd_str = cwd.to_string_lossy();
                if !cwd_str.is_empty() {
                    cmd.arg("--cd").arg(cwd_str.as_ref());
                }
            }
            cmd.arg("--exec").arg("sh").arg("-lc").arg(&self.command);
            return Ok(cmd);
        }
        #[cfg(unix)]
        {
            let mut cmd = Command::new("/bin/sh");
            cmd.arg("-c").arg(&self.command);
            Ok(cmd)
        }
        #[cfg(windows)]
        {
            let shell = crate::modules::pty::shell_init::windows_shell_path();
            let mut cmd = Command::new(&shell);
            let is_cmd = shell
                .file_name()
                .and_then(|s| s.to_str())
                .map(|s| s.eq_ignore_ascii_case("cmd.exe"))
                .unwrap_or(false);
            if is_cmd {
                cmd.arg("/C").arg(&self.command);
            } else {
                cmd.arg("-NoProfile").arg("-Command").arg(&self.command);
            }
            Ok(cmd)
        }
    }
}
