const fs = require('fs');
const { execSync } = require('child_process');

const iconMap = {
  AbsoluteIcon: "Sparkles",
  Add01Icon: "Plus",
  AiBookIcon: "LibraryBig",
  AiContentGenerator02Icon: "Wand2",
  AiScanIcon: "ScanSearch",
  Alert02Icon: "TriangleAlert",
  AlertCircleIcon: "CircleAlert",
  AppleIcon: "Command",
  ArrowDown01Icon: "ChevronDown",
  ArrowLeft01Icon: "ChevronLeft",
  ArrowReloadHorizontalIcon: "RefreshCw",
  ArrowRight01Icon: "ChevronRight",
  ArrowTurnBackwardIcon: "CornerUpLeft",
  ArrowUp01Icon: "ChevronUp",
  ArrowUpIcon: "ArrowUp",
  ArrowUpRight01Icon: "ArrowUpRight",
  BrainIcon: "Brain",
  BubbleChatIcon: "MessageSquare",
  Cancel01Icon: "X",
  ChatGptIcon: "Bot",
  CheckListIcon: "ListChecks",
  CheckmarkCircle01Icon: "CircleCheck",
  CheckmarkCircle02Icon: "CircleCheckBig",
  CheckmarkSquare02Icon: "SquareCheck",
  ChevronDown: "ChevronDown",
  ClaudeIcon: "BotMessageSquare",
  Clock01Icon: "Clock",
  CodeIcon: "Code",
  CoinsDollarIcon: "Coins",
  ComputerIcon: "Monitor",
  ComputerTerminal02Icon: "TerminalSquare",
  Copy01Icon: "Copy",
  CopyIcon: "Copy",
  CpuIcon: "Cpu",
  DeepseekIcon: "Bot",
  Delete02Icon: "Trash2",
  Download01Icon: "Download",
  Edit02Icon: "FileEdit",
  EyeIcon: "Eye",
  FavouriteIcon: "Heart",
  File01Icon: "File",
  File02Icon: "FileText",
  FileAddIcon: "FilePlus",
  FileEditIcon: "FilePenLine",
  FilePlusIcon: "FilePlus",
  FlashIcon: "Zap",
  Folder01Icon: "Folder",
  FolderAddIcon: "FolderPlus",
  FolderCloudIcon: "FolderSync",
  FolderGitTwoIcon: "GitBranch",
  FolderOpenIcon: "FolderOpen",
  FolderShared01Icon: "FolderSymlink",
  FolderTreeIcon: "Network",
  GitBranchIcon: "GitBranch",
  GitCompareIcon: "GitCompare",
  GithubIcon: "Github",
  GlobalSearchIcon: "Globe",
  Globe02Icon: "Globe",
  GlobeIcon: "Globe",
  GoogleGeminiIcon: "Sparkles",
  Grok02Icon: "Bot",
  HashtagIcon: "Hash",
  Home03Icon: "Home",
  IncognitoIcon: "VenetianMask",
  InformationCircleIcon: "Info",
  Key01Icon: "Key",
  KeyboardIcon: "Keyboard",
  LinkSquare02Icon: "ExternalLink",
  Loading03Icon: "Loader2",
  Message01Icon: "MessageCircle",
  Mic01Icon: "Mic",
  MinusSignIcon: "Minus",
  MistralIcon: "Bot",
  Moon02Icon: "Moon",
  MoreHorizontalCircle01Icon: "MoreHorizontal",
  MoreHorizontalIcon: "MoreHorizontal",
  Notification01Icon: "Bell",
  Notification03Icon: "BellRing",
  PaintBoardIcon: "Palette",
  PaintBrush04Icon: "Paintbrush",
  PencilEdit02Icon: "Pencil",
  PlugIcon: "Plug",
  PlusSignIcon: "Plus",
  Refresh01Icon: "RefreshCcw",
  RemoveSquareIcon: "MinusSquare",
  RobotIcon: "Bot",
  RoboticIcon: "Bot",
  Search01Icon: "Search",
  SearchIcon: "Search",
  ServerStack01Icon: "Server",
  ServerStack03Icon: "Database",
  Settings01Icon: "Settings",
  ShieldUserIcon: "ShieldCheck",
  SidebarBottomIcon: "PanelBottom",
  SidebarLeftIcon: "PanelLeft",
  SparklesIcon: "Sparkles",
  SquareIcon: "Square",
  StarIcon: "Star",
  StopCircleIcon: "CircleStop",
  Sun03Icon: "Sun",
  TerminalIcon: "Terminal",
  Tick01Icon: "Check",
  Tick02Icon: "Check",
  ToolsIcon: "Wrench",
  UnfoldMoreIcon: "ChevronsUpDown",
  UserMultiple02Icon: "Users",
  ViewIcon: "Eye",
  ViewOffSlashIcon: "EyeOff"
};

const files = execSync('findstr /m /s /c:"@hugeicons/react" "src\\*.tsx" "src\\*.ts"', {encoding: 'utf8'}).trim().split('\r\n');

files.forEach(f => {
  if (!f.trim()) return;
  let content = fs.readFileSync(f, 'utf8');

  // Find the import statement from @hugeicons/core-free-icons
  const coreMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+["']@hugeicons\/core-free-icons["'];?/);
  const reactMatch = content.match(/import\s+\{\s*HugeiconsIcon\s*\}\s+from\s+["']@hugeicons\/react["'];?/);

  let usedIcons = [];
  if (coreMatch) {
    usedIcons = coreMatch[1].split(',').map(i => i.trim()).filter(Boolean);
    content = content.replace(coreMatch[0], ''); // remove the import
  }
  if (reactMatch) {
    content = content.replace(reactMatch[0], ''); // remove the import
  }

  // Replace <HugeiconsIcon icon={IconName} ... /> with <MappedIcon ... />
  // We'll use a regex to find all <HugeiconsIcon ... /> instances
  const hugeiconRegex = /<HugeiconsIcon\s+icon=\{([^}]+)\}([^>]*)\/>/g;
  content = content.replace(hugeiconRegex, (match, iconVar, restAttrs) => {
    const mapped = iconMap[iconVar] || "AlertTriangle";
    if (!usedIcons.includes(iconVar)) usedIcons.push(iconVar);
    return `<${mapped}${restAttrs}/>`;
  });

  // Also replace any manual references to the icon names in data structures (like SLASH_COMMANDS)
  // We'll just replace the exact variable names
  usedIcons.forEach(iconVar => {
    const mapped = iconMap[iconVar] || "AlertTriangle";
    const varRegex = new RegExp(`(?<!<\\s*|import\\s+\\{\\s*|\\w)${iconVar}(?!\\w)`, 'g');
    content = content.replace(varRegex, mapped);
  });

  // Now prepend the lucide-react import
  if (usedIcons.length > 0) {
    const lucideImports = Array.from(new Set(usedIcons.map(i => iconMap[i] || "AlertTriangle"))).sort();
    content = `import { ${lucideImports.join(', ')} } from "lucide-react";\n` + content.replace(/^\s+/, '');
  }

  fs.writeFileSync(f, content, 'utf8');
});

console.log("Done refactoring icons!");
