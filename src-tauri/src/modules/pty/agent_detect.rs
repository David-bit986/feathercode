const ESC: u8 = 0x1b;
const BEL: u8 = 0x07;
const OSC_INTRO: u8 = b']';
const ST_FINAL: u8 = b'\\';

const OSC_MAX: usize = 2048;

const DEFAULT_AGENTS: &[&str] = &["claude", "codex"];

const FC_MARKER: &[u8] = b"notify;FeatherCode;";

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum State {
    Ground,
    Esc,
    Osc,
    OscEsc,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum Status {
    Working,
    Waiting,
}

#[derive(Clone, PartialEq, Eq, Debug)]
pub enum AgentEvent {
    Started { agent: String },
    Working,
    Attention,
    Finished,
    Exited,
}

#[derive(Clone, serde::Serialize)]
pub struct AgentSignal {
    pub id: u32,
    pub kind: &'static str,
    pub agent: Option<String>,
}

impl AgentEvent {
    pub fn into_signal(self, id: u32) -> AgentSignal {
        match self {
            AgentEvent::Started { agent } => {
                AgentSignal { id, kind: "started", agent: Some(agent) }
            }
            AgentEvent::Working => AgentSignal { id, kind: "working", agent: None },
            AgentEvent::Attention => AgentSignal { id, kind: "attention", agent: None },
            AgentEvent::Finished => AgentSignal { id, kind: "finished", agent: None },
            AgentEvent::Exited => AgentSignal { id, kind: "exited", agent: None },
        }
    }
}

pub struct AgentDetector {
    #[allow(dead_code)]
    session_id: u32,
    agents: Vec<String>,
    state: State,
    osc: Vec<u8>,
    armed: bool,
    status: Status,
}

impl AgentDetector {
    pub fn new(session_id: u32) -> Self {
        Self {
            session_id,
            agents: DEFAULT_AGENTS.iter().map(|s| s.to_string()).collect(),
            state: State::Ground,
            osc: Vec::new(),
            armed: false,
            status: Status::Working,
        }
    }

    pub fn feed(&mut self, byte: u8) -> Vec<AgentEvent> {
        let mut events = Vec::new();
        match self.state {
            State::Ground => {
                if byte == ESC {
                    self.state = State::Esc;
                }
            }
            State::Esc => match byte {
                OSC_INTRO => {
                    self.state = State::Osc;
                    self.osc.clear();
                }
                ESC => {}
                _ => self.state = State::Ground,
            },
            State::Osc => match byte {
                BEL => {
                    self.finish_osc(&mut events);
                    self.state = State::Ground;
                }
                ESC => self.state = State::OscEsc,
                _ => {
                    if self.osc.len() < OSC_MAX {
                        self.osc.push(byte);
                    } else {
                        self.osc.clear();
                        self.state = State::Ground;
                    }
                }
            },
            State::OscEsc => match byte {
                ST_FINAL => {
                    self.finish_osc(&mut events);
                    self.state = State::Ground;
                }
                ESC => {}
                _ => {
                    self.osc.clear();
                    self.state = State::Ground;
                }
            },
        }
        events
    }

    pub fn arm(&mut self) {
        self.armed = true;
    }

    pub fn finish(&mut self) -> Vec<AgentEvent> {
        let mut events = Vec::new();
        if self.armed {
            self.disarm();
            events.push(AgentEvent::Exited);
        }
        events
    }

    fn disarm(&mut self) {
        self.armed = false;
        self.status = Status::Working;
    }

    fn finish_osc(&mut self, events: &mut Vec<AgentEvent>) {
        let body = std::mem::take(&mut self.osc);
        let (ps, pt) = match body.iter().position(|&c| c == b';') {
            Some(i) => (&body[..i], &body[i + 1..]),
            None => (&body[..], &body[0..0]),
        };
        match ps {
            b"133" => self.handle_osc133(pt, events),
            b"9" if !pt.starts_with(b"4;") && pt != b"4" => self.generic_attention(events),
            b"777" => self.handle_osc777(pt, events),
            _ => {}
        }
    }

    fn handle_osc777(&mut self, pt: &[u8], events: &mut Vec<AgentEvent>) {
        if let Some(event) = pt.strip_prefix(FC_MARKER) {
            match event {
                b"working" => {
                    self.ensure_armed(events);
                    self.set_working(events);
                }
                b"attention" => {
                    self.ensure_armed(events);
                    self.status = Status::Waiting;
                    events.push(AgentEvent::Attention);
                }
                b"finished" => {
                    self.ensure_armed(events);
                    self.status = Status::Waiting;
                    events.push(AgentEvent::Finished);
                }
                _ => {}
            }
            return;
        }
        self.generic_attention(events);
    }

    fn handle_osc133(&mut self, pt: &[u8], events: &mut Vec<AgentEvent>) {
        match pt.first() {
            Some(b'C') => {
                if self.armed {
                    return;
                }
                let cmd = pt.strip_prefix(b"C;").unwrap_or(b"");
                if let Some(agent) = self.match_agent(cmd) {
                    self.armed = true;
                    self.status = Status::Working;
                    events.push(AgentEvent::Started { agent });
                }
            }
            Some(b'D') if self.armed => {
                self.disarm();
                events.push(AgentEvent::Exited);
            }
            _ => {}
        }
    }

    fn ensure_armed(&mut self, events: &mut Vec<AgentEvent>) {
        if !self.armed {
            self.armed = true;
            self.status = Status::Working;
            events.push(AgentEvent::Started { agent: "claude".into() });
        }
    }

    fn set_working(&mut self, events: &mut Vec<AgentEvent>) {
        if self.status != Status::Working {
            self.status = Status::Working;
            events.push(AgentEvent::Working);
        }
    }

    fn generic_attention(&mut self, events: &mut Vec<AgentEvent>) {
        if self.armed {
            self.status = Status::Waiting;
            events.push(AgentEvent::Attention);
        }
    }

    fn match_agent(&self, cmd: &[u8]) -> Option<String> {
        let cmd = std::str::from_utf8(cmd).ok()?;
        for token in cmd.split_whitespace() {
            if token.starts_with('-') {
                continue;
            }
            let base = token.rsplit(['/', '\\']).next().unwrap_or(token);
            if let Some(agent) = self.agents.iter().find(|a| {
                base.strip_prefix(a.as_str())
                    .is_some_and(|rest| rest.is_empty() || rest.starts_with('-'))
            }) {
                return Some(agent.clone());
            }
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(d: &mut AgentDetector, input: &[u8]) -> Vec<AgentEvent> {
        let mut out = Vec::new();
        for &b in input {
            out.extend(d.feed(b));
        }
        out
    }

    fn osc(body: &str) -> Vec<u8> {
        let mut v = vec![ESC, OSC_INTRO];
        v.extend_from_slice(body.as_bytes());
        v.extend_from_slice(&[ESC, ST_FINAL]);
        v
    }

    fn started(agent: &str) -> AgentEvent {
        AgentEvent::Started { agent: agent.into() }
    }

    #[test]
    fn test_osc_133_c_arms_claude() {
        let mut d = AgentDetector::new(1);
        assert_eq!(run(&mut d, &osc("133;C;claude -p hello")), vec![started("claude")]);
    }

    #[test]
    fn test_osc_133_d_disarms() {
        let mut d = AgentDetector::new(1);
        run(&mut d, &osc("133;C;claude"));
        assert_eq!(run(&mut d, &osc("133;D;0")), vec![AgentEvent::Exited]);
        assert!(run(&mut d, &osc("133;D;0")).is_empty());
    }

    #[test]
    fn test_osc_777_notify_working() {
        let mut d = AgentDetector::new(1);
        run(&mut d, &osc("133;C;claude"));
        assert_eq!(
            run(&mut d, &osc("777;notify;FeatherCode;working")),
            vec![AgentEvent::Working]
        );
        assert!(run(&mut d, &osc("777;notify;FeatherCode;working")).is_empty());
    }

    #[test]
    fn test_osc_777_self_arms() {
        let mut d = AgentDetector::new(1);
        assert_eq!(
            run(&mut d, &osc("777;notify;FeatherCode;attention")),
            vec![started("claude"), AgentEvent::Attention]
        );
    }

    #[test]
    fn test_ignores_non_osc_bytes() {
        let mut d = AgentDetector::new(1);
        assert!(run(&mut d, b"hello world").is_empty());
        assert!(run(&mut d, b"\x07plain\x07text").is_empty());
    }

    #[test]
    fn arms_on_agent_command() {
        let mut d = AgentDetector::new(1);
        assert_eq!(run(&mut d, &osc("133;C;claude -p hello")), vec![started("claude")]);
    }

    #[test]
    fn arms_on_pathed_and_wrapped_command() {
        let mut d = AgentDetector::new(1);
        assert_eq!(
            run(&mut d, &osc("133;C;/usr/local/bin/codex exec")),
            vec![started("codex")]
        );
        let mut d2 = AgentDetector::new(1);
        assert_eq!(run(&mut d2, &osc("133;C;npx claude")), vec![started("claude")]);
    }

    #[test]
    fn arms_on_dash_suffixed_alias() {
        let mut d = AgentDetector::new(1);
        assert_eq!(run(&mut d, &osc("133;C;claude-enigma")), vec![started("claude")]);
    }

    #[test]
    fn does_not_arm_on_other_commands() {
        let mut d = AgentDetector::new(1);
        assert!(run(&mut d, &osc("133;C;vim src/main.rs")).is_empty());
        assert!(run(&mut d, &osc("133;C;cat claude.txt")).is_empty());
        assert!(run(&mut d, &osc("133;C;claudexyz")).is_empty());
    }

    #[test]
    fn ignores_bell_and_plain_output() {
        let mut d = AgentDetector::new(1);
        run(&mut d, &osc("133;C;claude"));
        assert!(run(&mut d, &[BEL]).is_empty());
        assert!(run(&mut d, b"thinking...\x07more").is_empty());
    }

    #[test]
    fn fc_marker_drives_status() {
        let mut d = AgentDetector::new(1);
        run(&mut d, &osc("133;C;claude"));
        assert_eq!(
            run(&mut d, &osc("777;notify;FeatherCode;attention")),
            vec![AgentEvent::Attention]
        );
        assert_eq!(
            run(&mut d, &osc("777;notify;FeatherCode;working")),
            vec![AgentEvent::Working]
        );
        assert!(run(&mut d, &osc("777;notify;FeatherCode;working")).is_empty());
        assert_eq!(
            run(&mut d, &osc("777;notify;FeatherCode;finished")),
            vec![AgentEvent::Finished]
        );
    }

    #[test]
    fn fc_marker_auto_arms_without_preexec() {
        let mut d = AgentDetector::new(1);
        assert_eq!(
            run(&mut d, &osc("777;notify;FeatherCode;attention")),
            vec![started("claude"), AgentEvent::Attention]
        );
    }

    #[test]
    fn generic_osc777_and_osc9_attention_only_when_armed() {
        let mut d = AgentDetector::new(1);
        assert!(run(&mut d, &osc("777;notify;Other;ready")).is_empty());
        run(&mut d, &osc("133;C;codex"));
        assert_eq!(
            run(&mut d, &osc("777;notify;Codex;ready")),
            vec![AgentEvent::Attention]
        );
        assert_eq!(run(&mut d, &osc("9;needs you")), vec![AgentEvent::Attention]);
        assert!(run(&mut d, &osc("9;4;1;50")).is_empty());
    }

    #[test]
    fn exits_on_133d() {
        let mut d = AgentDetector::new(1);
        run(&mut d, &osc("133;C;claude"));
        assert_eq!(run(&mut d, &osc("133;D;0")), vec![AgentEvent::Exited]);
        assert!(run(&mut d, &osc("133;D;0")).is_empty());
    }

    #[test]
    fn bel_terminator_inside_osc_is_not_attention() {
        let mut d = AgentDetector::new(1);
        run(&mut d, &osc("133;C;claude"));
        let mut seq = vec![ESC, OSC_INTRO];
        seq.extend_from_slice(b"0;set title");
        seq.push(BEL);
        assert!(run(&mut d, &seq).is_empty());
    }

    #[test]
    fn started_split_across_chunks() {
        let mut d = AgentDetector::new(1);
        assert!(run(&mut d, &[ESC, OSC_INTRO]).is_empty());
        assert!(run(&mut d, b"133;C;cla").is_empty());
        let mut out = run(&mut d, b"ude");
        out.extend(run(&mut d, &[ESC, ST_FINAL]));
        assert_eq!(out, vec![started("claude")]);
    }

    #[test]
    fn finish_reports_exited_when_armed() {
        let mut d = AgentDetector::new(1);
        run(&mut d, &osc("133;C;claude"));
        assert_eq!(d.finish(), vec![AgentEvent::Exited]);
        assert!(d.finish().is_empty());
    }

    #[test]
    fn oversized_osc_does_not_panic() {
        let mut d = AgentDetector::new(1);
        run(&mut d, &osc("133;C;claude"));
        let mut seq = vec![ESC, OSC_INTRO];
        seq.extend(std::iter::repeat_n(b'x', OSC_MAX + 100));
        seq.extend_from_slice(&[ESC, ST_FINAL]);
        assert!(run(&mut d, &seq).is_empty());
        assert_eq!(
            run(&mut d, &osc("777;notify;FeatherCode;attention")),
            vec![AgentEvent::Attention]
        );
    }
}
